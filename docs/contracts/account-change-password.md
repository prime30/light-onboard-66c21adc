# Account Change-Password Contract

## Source modules (theme side)

- `snippets/dd-account-details.liquid` — renders the password row + disclosure panel
- `assets/dd-account-password.js` — toggle, client validation, `fetch` to the App Proxy
- `assets/dd-account-details.css` — panel styles

## Scope

Allows a logged-in storefront customer to change their own password
inline on `/account` without an email round-trip and without
re-entering their current password. The trust chain is:

1. Customer is on `/account` → Shopify session cookie is valid.
2. Theme JS calls the App Proxy at `/apps/apply/change-password`.
3. Shopify appends a signed query string with `logged_in_customer_id`.
4. Backend verifies the HMAC, trusts the customer id, and calls the
   Admin API to set the new password.

## Existing app + proxy (already provisioned)

- App: `lovable-registration-dawn-4` ("Lovable Registration (Dawn)")
- Scopes: `read_customers, write_customers, read_discounts, write_discounts, read_orders`
  (`write_customers` is the one that authorises password updates — already granted)
- App Proxy:
  - prefix: `apps`
  - subpath: `apply`
  - url: `https://apply.dropdeadextensions.com`
  - effect: `https://dropdeadextensions.com/apps/apply/*` → `https://apply.dropdeadextensions.com/*`

The backend at `apply.dropdeadextensions.com` already serves the
registration overlay SPA (`/login`, `/register`, `/reset-password`,
etc.). This contract adds **one new route**: `POST /change-password`.

---

## Request

### Path

```
POST /change-password
```

(via the proxy at `https://dropdeadextensions.com/apps/apply/change-password`)

### Headers

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |
| `Accept` | `application/json` |
| `X-Requested-With` | `XMLHttpRequest` |

### Body

```json
{ "new_password": "string" }
```

### Query parameters (added by Shopify, do not trust without verification)

| Param | Source of truth |
|---|---|
| `shop` | Always `drop-dead-2428.myshopify.com` for this storefront |
| `path_prefix` | `/apps/apply` |
| `timestamp` | Unix seconds |
| `signature` | HMAC-SHA256 of all other params, hex-encoded |
| `logged_in_customer_id` | Customer id (numeric string) — present iff a customer session cookie is attached to the request |

---

## HMAC verification (mandatory)

**Reject the request unless the signature verifies.** Reference
recipe (Node.js, but the algorithm is identical in any language):

```js
const crypto = require('crypto');

function verifyAppProxySignature(query, appSecret) {
  const { signature, ...rest } = query;
  if (!signature) return false;

  // Sort params alphabetically by key, concatenate as `key=value`
  // with NO separator (Shopify's documented format — note: this
  // differs from the webhook HMAC and from OAuth's HMAC).
  const message = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${rest[k]}`)
    .join('');

  const expected = crypto
    .createHmac('sha256', appSecret)
    .update(message)
    .digest('hex');

  // Constant-time comparison to defeat timing attacks.
  const sigBuf = Buffer.from(signature, 'utf8');
  const expBuf = Buffer.from(expected, 'utf8');
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}
```

`appSecret` = the app's API secret key from the Shopify app's
"App credentials" tab (already present in the existing backend env
since the SPA's auth flows depend on it).

Shopify docs: <https://shopify.dev/docs/apps/build/online-store/display-dynamic-data#calculate-a-digital-signature>

## Required additional checks

After verifying the signature:

1. **`logged_in_customer_id` must be present and numeric.** If
   missing, the customer is not actually logged in — return `401`
   with `{ ok: false, error: "unauthenticated" }`.
2. **`shop` must equal `drop-dead-2428.myshopify.com`.** Defends
   against a copy of the proxy being pointed at the same backend
   from a different shop.
3. **`timestamp` must be within ±60 seconds of now.** Mitigates
   replay attacks; the App Proxy signature itself doesn't expire.
4. **`new_password.length >= 8`.** Server-side is the source of
   truth — the client also enforces this for instant feedback but
   must not be trusted.
5. **(Recommended) Rate-limit by `logged_in_customer_id`** to
   ~5 attempts per minute. Prevents a hijacked session from
   trivially brute-iterating new passwords.

---

## Admin API call

### Endpoint

```
PUT https://drop-dead-2428.myshopify.com/admin/api/2026-04/customers/{logged_in_customer_id}.json
```

(API version `2026-04` matches the app's `api_version` shown in the
app config; bump in lockstep when the app upgrades.)

### Headers

| Header | Value |
|---|---|
| `X-Shopify-Access-Token` | The app's admin API access token (from app credentials, env var on the backend) |
| `Content-Type` | `application/json` |

### Body

```json
{
  "customer": {
    "id": <logged_in_customer_id>,
    "password": "<new_password>",
    "password_confirmation": "<new_password>"
  }
}
```

### Expected responses

| Status | Meaning | Map to client error code |
|---|---|---|
| `200` | Password updated | `{ ok: true }` |
| `422` with `errors.password` | Password too weak / failed validation | `weak_password` |
| `401`/`403` | Admin token expired or scope revoked | `shopify_error` (log + alert) |
| `429` | Admin API rate limit | `rate_limited` |
| `5xx` | Shopify outage | `shopify_error` |

---

## Response shape

### Success

```http
HTTP/1.1 200 OK
Content-Type: application/json

{ "ok": true }
```

### Error

```http
HTTP/1.1 4xx
Content-Type: application/json

{ "ok": false, "error": "<code>", "message": "<optional human string>" }
```

### Error codes (must match `ERROR_COPY` in `dd-account-password.js`)

| Code | When | HTTP status |
|---|---|---|
| `unauthenticated` | HMAC invalid, missing `logged_in_customer_id`, or expired timestamp | `401` |
| `weak_password` | Server-side length/strength validation failed, or Admin API returned 422 with `errors.password` | `400` |
| `rate_limited` | Local rate-limit tripped, or Admin API returned 429 | `429` |
| `shopify_error` | Anything else (Admin API 5xx, network, unexpected) | `500` |

The client maps unknown codes to `shopify_error` copy. New codes
require a coordinated theme update — keep the list narrow.

---

## Threat model

| Attack | Defense |
|---|---|
| Attacker hits `apply.dropdeadextensions.com/change-password` directly with a forged body | HMAC verification fails (no app secret) → 401 |
| Attacker copies a real signed query from DevTools and replays | Timestamp window check (±60s) → 401 |
| Attacker copies a real signed query and points at a different shop | `shop` whitelist check → 401 |
| Stolen session cookie used to brute-force passwords | Per-customer-id rate limit → 429 |
| Customer types weak password | Server-side length check + Admin API 422 → `weak_password` |
| Admin token leaked | Out of scope — rotate via Shopify app admin |

---

## Side effects worth knowing

- **Existing storefront customer sessions remain valid** after an
  Admin-API password change. The customer is NOT logged out of
  `/account`. They only need the new password the next time they
  authenticate from a fresh session (logout, new browser, checkout
  re-auth).
- **No email is sent** when changing the password via Admin API
  `PUT /customers/{id}.json`. If you want a "your password was
  changed" notification, that has to be sent explicitly (e.g., via
  a transactional email service) — Shopify won't do it for you.
  Recommended to add post-launch.

---

## Verification

| Check | How | Expected |
|---|---|---|
| Happy path | Logged-in customer types new password (twice), submits | Panel collapses, "Password updated." in green; logout/login with new password succeeds |
| Wrong-length client-side | Enter `1234567` (7 chars) | Submit blocked with "Password must be at least 8 characters." |
| Mismatch | Enter `password1` and `password2` | Submit blocked with "Passwords don't match." |
| Forged direct call | `curl -X POST https://apply.dropdeadextensions.com/change-password -d '{"new_password":"x"}'` | `401 { error: "unauthenticated" }` |
| Replay (old timestamp) | Save a real signed query from network tab, replay 5 minutes later | `401 { error: "unauthenticated" }` |
| Brute force | 6 rapid valid submits in 60s | 6th returns `429 { error: "rate_limited" }` |
| Logged out | Visit `/account` → redirected to login → can't reach the form | N/A (defense in depth — the proxy also drops `logged_in_customer_id` if no session) |

---

## Forbidden behaviors (backend)

- Trusting `logged_in_customer_id` without HMAC verification.
- Accepting a customer id from the **request body** instead of from
  the signed query string.
- Logging the new password value (even at debug).
- Returning Admin API error bodies verbatim — they sometimes echo
  customer email or internal ids.
- Sending an email confirmation containing the new password (some
  legacy patterns do this — never).

---

## Refinement Log

- **Pass 1 (Architecture):** Considered Storefront API
  `customerUpdate({ customerAccessToken })`, rejected because it
  requires the customer to re-enter the current password (UX goal
  was no friction since the dashboard is already session-gated).
- **Pass 2 (Trust chain):** Confirmed App Proxy HMAC + Shopify
  session cookie is sufficient — `logged_in_customer_id` is signed
  by Shopify, can't be forged without the app secret.
- **Pass 3 (Reuse):** Existing `lovable-registration-dawn-4` app
  already has `write_customers` scope and an active App Proxy at
  `/apps/apply/*` → `apply.dropdeadextensions.com`. New endpoint
  is one route on existing infra, not a new app or new proxy.
- **Pass 4 (Failure modes):** Mapped every error code to client
  copy in `ERROR_COPY` (dd-account-password.js) so adding new
  codes requires a coordinated update. Network/parse failures
  fall through to a generic message — never leak server detail.
- **Pass 5 (Side effects):** Verified Admin API password updates
  do NOT invalidate existing storefront sessions, so the customer
  stays logged in on /account after submit (clean UX).
