# Honeypot timing + password min 8 + delete update-tax-exempt

Three small, safe changes. No new dependencies, no new secrets, no UX risk.

## 1. Honeypot min-time-on-form check (3s)

Catches bots that fill+submit faster than any human possibly could.

**`src/components/registration/HoneypotField.tsx`**
- Capture `formStartedAt = Date.now()` at module load (once per page load)
- Add a hidden `company_website_start` input alongside the existing honeypot
- Export `readFormStartedAt(): number` companion to `readHoneypotValue()`

**`src/components/registration/context/FormDataContext.tsx`**
- Import `readFormStartedAt` and include `formStartedAt` in the `create-customer` POST body alongside `honeypot`

**`supabase/functions/create-customer/index.ts`**
- Right after the existing honeypot check, validate `formStartedAt`:
  - Must be a finite number
  - `Date.now() - formStartedAt` must be `>= 3000` ms and not negative
  - Otherwise return the same generic 400 ("Submission blocked"), log `min-time triggered`

Only applied to `create-customer`. Sign-in / reset-password don't need it.

## 2. Password minimum length 8

Currently 5 in three places — bump all to 8 with matching error message.

- `src/lib/validations/password-schemas.ts` — `resetPasswordSchema` and `activateAccountSchema`: `.min(5)` → `.min(8, "Password must be at least 8 characters")`
- `supabase/functions/reset-password/index.ts` (line 45) — same change
- `supabase/functions/activate-account/index.ts` (line 42) — same change

Sign-in stays at `min(1)` (we don't enforce policy on existing passwords during login).

## 3. Delete `update-tax-exempt` edge function

Verified: zero frontend callers (`rg "update-tax-exempt|updateTaxExempt"` returns nothing). The TaxExemptionStep uploads via the regular `upload-file` flow and stores intent in form state; the actual Shopify `tax_exempt` flip happens elsewhere.

- Delete `supabase/functions/update-tax-exempt/` directory
- Call `delete_edge_functions` to remove the deployed function

Removes a privileged endpoint (writes Shopify customer data) with no legitimate caller — pure attack surface reduction.

## Files

Edited:
- `src/components/registration/HoneypotField.tsx`
- `src/components/registration/context/FormDataContext.tsx`
- `src/lib/validations/password-schemas.ts`
- `supabase/functions/create-customer/index.ts`
- `supabase/functions/reset-password/index.ts`
- `supabase/functions/activate-account/index.ts`

Deleted:
- `supabase/functions/update-tax-exempt/index.ts`
