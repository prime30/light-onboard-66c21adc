---
name: Shopify account invite path (verified working)
description: How the Shopify account invite/activation link reaches the SPA, verified end to end, and the sessionStorage handoff weak point
type: feature
---

The Shopify classic account invite link works end to end (verified 2026-08-26 with real minted activation tokens on desktop and mobile: password saved, customer.state disabled -> enabled, storefront login succeeded).

Chain:
1. Invite email link: `https://dropdeadextensions.com/account/activate/<id>/<token>`
2. Shopify serves the theme `customers/activate_account` template (server-side 200, native `activate_customer_password` form present).
3. Theme script (class `dd-auth-mode-redirect`) stashes the canonical activation URL in `sessionStorage.dd_auth_activation_url` and redirects to `/?auth=activate`.
4. The homepage opens the SPA iframe at `/apps/apply/activate-account?activation_url=...` (App Proxy, first party).
5. SPA `ActivateAccountForm` posts to the `activate-account` edge function, then auto signs in.

Weak point: step 3's sessionStorage handoff. If storage does not survive the navigation (some in-app email browsers), the SPA loads without a token. Theme only falls back to `?fallback=1` when `setItem` throws. Because the theme lives in Shopify (not this repo), the SPA covers this: `ActivationRecovery` on the expired, invalid, and missing-params states lets the customer request a fresh verified setup email via `recover-password`.

Do not conclude the invite email is broken without reproducing it with a freshly minted `account_activation_url`. Minting a new activation URL invalidates any earlier one, so never mint against a customer who still holds a live invite email.
