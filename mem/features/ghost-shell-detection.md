---
name: Ghost-shell detection for third-party auto-provisioned Shopify customers
description: create-customer detects Smile/Klaviyo/Yotpo disabled shells and treats them as brand-new applicants so Chain C activation sets the password directly
type: feature
---
Third-party apps (Smile.io, Klaviyo, Yotpo, Loox) auto-provision Shopify customers in `state=disabled` the moment an email enters their funnel — long before the person registers with us. A naive soft-merge onto these shells used to leave users stranded because Storefront `customerRecover` silently no-ops on `disabled` customers (no email sent).

**Detection** (in `create-customer/index.ts` soft-merge branch, ~line 698):
- `state === "disabled"` AND
- `orders_count === 0` AND
- no `"Account type:"` tag (never completed our application)

When matched, sets `isGhostShell = true` and logs the recovery explicitly. The enrichment block appends a `"ghost-shell-recovered"` tag so admin/Helium can see which records were salvaged.

**Why it works without an invite email:** Chain C auto-approval activation already POSTs to Shopify Admin's `account_activation_url` for the resolved `shopifyCustomerId`. That endpoint accepts `state=disabled` shells and converts them to `enabled` with the user's chosen password. So when **auto-approval is ON + password was submitted**, the user can log in immediately — no invite email, no recover-password roundtrip.

When auto-approval is OFF (no password collected), the customer stays disabled until admin approves; the existing approval flow then sends the invite via Admin `send_invite` (the state-aware Chain C fallback at line ~1646 already routes `disabled → send_invite`).

**Related:**
- `mem/features/activation-fallback-state-aware.md` — state-aware Chain C fallback
- `mem/constraints/shopify-customer-recover-invited-state.md` — why customerRecover fails on disabled/invited
