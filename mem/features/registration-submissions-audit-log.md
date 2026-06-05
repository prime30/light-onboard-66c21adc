---
name: Registration submissions audit log
description: Append-only backup of every signup attempt; surfaced in admin panel for replaying failed Helium/Shopify syncs
type: feature
---
Every signup writes to `public.registration_submissions` from inside `create-customer` EF:
- Insert `pending` row right after Zod validation passes (payload has password stripped)
- Update to `helium_ok` after Helium succeeds (records helium_customer_id + shopify_customer_id if returned)
- Final update: `succeeded` (clean), `shopify_ok` (Helium fine, Shopify enrichment soft-failed), `helium_ok`, or `failed`
- `error_log` jsonb is an append array of `{ step, status, message, at }` populated via `recordAuditFailure()`
- Table is RLS deny-all; only service_role writes/reads

Admin UI: `SubmissionsLogPanel` on `AdminSettingsPage` calls `admin-list-submissions` EF (same email+ADMIN_PANEL_PASSWORD auth pattern as `admin-toggle-setting`). Status filters: needs_attention (default), succeeded, failed, shopify_ok, helium_ok, pending, all. Each row expands to show errors + full JSON payload for manual replay.

**Why:** Helium + Shopify writes can fail/timeout. This is the only persistent record we control — files are URLs to `registration-documents` bucket, so as long as that bucket is intact we can fully replay any failed submission.
