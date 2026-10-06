---
name: customerRecover needs invited/disabled accounts prepared, not send_invite
description: recover-password moves invited/disabled Shopify customers to enabled with a random password, then customerRecover sends a normal reset link; one email per address per 10 minutes via reset_email_sends
type: constraint
---
Shopify Storefront `customerRecover` only delivers a reset email when the customer is `state: "enabled"`. For `state: "invited"` (account created, activation URL never consumed) or `state: "disabled"`, the mutation returns success with no userErrors and **sends no email**. That Shopify behavior is unchanged and is the reason the function still cannot just call customerRecover for everyone.

What `supabase/functions/recover-password/index.ts` does now:

1. Looks the customer up by email through the Admin API to read `state` (read-only; a failed lookup is non-blocking and is treated as "unknown").
2. Claims a send slot for the address (cooldown below). Only when the lookup found a customer: an unknown email never claims a slot, so a not-yet-prepared account is never locked out.
3. If `state` is `invited` or `disabled`: Admin `PUT /admin/api/{version}/customers/{id}.json` sets a random, unknown password with `send_email_welcome: false`, which moves the account to `enabled`. A second read then verifies `state === "enabled"`. If the PUT fails or the state is not confirmed, the function returns 502 and sends nothing.
4. Calls Storefront `customerRecover`, which emails a normal password reset link.

`POST /admin/api/{version}/customers/{id}/send_invite.json` is no longer used. Neither `recover-password` nor `create-customer` calls send_invite (verified by grep on both). The old advice to route invited accounts to send_invite is obsolete: it re-issued the storefront activation email, which has repeatedly produced links that do not open a working setup UI.

**One reset email per address per window:**

- RPC `claim_reset_send(_email, _cooldown_seconds, _source)` on the `reset_email_sends` table, claimed before any Shopify write, because every new reset email kills the previous link.
- Inside the window: 200 success with `data.reason = "recently_sent"` and nothing sent.
- `RESET_EMAIL_COOLDOWN_SECONDS`: unset = 600, `"0"` = cooldown disabled (kill switch). Read per request, so a settings change applies without a redeploy.
- If Shopify does not accept the send, `release_reset_send(_email, _claimed_at)` gives the slot back (retried once), so a failed attempt does not burn the customer's window.
- `force: true` skips the cooldown, honored only for service-role callers (used by `admin-stranded-accounts` to reissue setup emails).

Shopify's own per-address reset throttle arrives as a top-level GraphQL error ("Resetting password limit exceeded", code THROTTLED) or a THROTTLED userError. Both map to 429, so the app says "wait a moment" instead of claiming an email went out.

**Why the history matters:** the send_invite routing was the original fix for a real incident (saraannfox97@yahoo.com, 2026-06-11), where a customer left `invited` with no password had every "forgot password" silently no-op. The prepare-then-recover flow above replaced it, so do not re-add send_invite.
