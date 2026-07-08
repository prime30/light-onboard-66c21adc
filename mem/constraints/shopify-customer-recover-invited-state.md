---
name: customerRecover does NOT work on invited customers
description: Shopify Storefront customerRecover silently no-ops for state=invited; use Admin send_invite instead
type: constraint
---
Shopify Storefront `customerRecover` mutation only delivers a reset email when the customer is `state: "enabled"`. For `state: "invited"` (account created but activation URL never consumed), the mutation returns success with no userErrors and **sends no email**.

For invited customers, use the Admin REST endpoint instead:
`POST /admin/api/{version}/customers/{id}/send_invite.json` with body `{ "customer_invite": {} }` - this re-issues the original account invite email.

**Why:** auto-approval Chain C in create-customer (and recover-password) used to fall back to customerRecover for ALL failure modes. That left brand-new customers (whose activation POST failed mid-flow) permanently stranded: invited in Shopify, no password, every "forgot password" silently no-oping. Real incident: saraannfox97@yahoo.com, 2026-06-11.

Both `create-customer` (Chain C fallback) and `recover-password` now look up the customer's `state` first and route invited → send_invite, enabled → customerRecover.
