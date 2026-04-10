

## Edge Case Analysis for Password Reset & Account Activation via Shopify Modal

The plan from the previous conversation covers the core happy path well. Here are edge cases that need to be addressed, grouped by category:

### Missing Edge Cases

**1. Expired or Invalid Tokens**
- Shopify reset/activation tokens expire. The edge functions must handle Shopify API returning a "token expired" or "token invalid" error.
- Each page needs a clear "expired link" state with a CTA to request a new reset email (for password reset) or contact support (for activation).

**2. Already-Used Tokens**
- If a user clicks a reset/activation link a second time after already completing the flow, the token is consumed. Need a friendly "already completed" state rather than a generic error.

**3. Already-Activated Accounts**
- If the customer account is already active and they hit the `/activate-account` URL, show a message like "Your account is already active" with a button to open the login form or close the modal.

**4. Already-Logged-In Users**
- If `CUSTOMER_DATA` from the parent says the user is already logged in, redirect to the existing `AlreadyLoggedInPage` instead of showing reset/activate forms.

**5. Missing or Malformed Query Params**
- If `token` or `customer_id` is missing from the URL, show an error state with instructions (e.g., "Please use the link from your email").

**6. Non-Iframe Access**
- Users might open `apply.dropdeadextensions.com/reset-password?token=...` directly in a browser (not in the modal). The pages should still work standalone — the edge function handles the API call regardless, but the "close modal" button should become "Go to store" or similar when `isInIframe` is false.

**7. Password Validation Failures**
- Shopify has password requirements (minimum 5 characters). Client-side validation should match, and server-side errors from Shopify (e.g., "password too short") need to be surfaced clearly.

**8. Network Errors / Timeouts**
- Edge function calls can fail. Need retry-able error states on both pages.

**9. Rate Limiting**
- Shopify Admin API has rate limits. The edge functions should handle 429 responses gracefully and return a user-friendly "try again in a moment" message.

**10. CORS / X-Frame-Options**
- The new routes must work within the iframe. The existing app already handles this, but the Liquid template must pass the correct URL with query params to the iframe `src`.

### Updated Plan

All original items from the previous plan remain. Add the following:

**New files:**
| File | Purpose |
|------|---------|
| `src/components/registration/ResetPasswordForm.tsx` | Form with password + confirm, expired/invalid/success states |
| `src/components/registration/ActivateAccountForm.tsx` | Form with password setup, already-active/expired/success states |

**Edge function error handling** (in both `reset-password` and `activate-account`):
- Parse Shopify API error responses and map to user-friendly messages
- Handle: expired token, invalid token, already used, already activated, rate limited, network failure
- Return structured errors matching existing `sendError` pattern from `docs/api-error-handling.md`

**Route-level guards:**
- Check for required query params (`token`, `customer_id`); show error UI if missing
- Check `isInIframe` to adjust CTA text (close modal vs. navigate to store)
- Check `CUSTOMER_DATA` for already-logged-in redirect

**Password validation:**
- Minimum 5 characters (Shopify requirement)
- Confirm password match
- Zod schema for both forms

**New message types in `use-iframe-comm.ts`:**
- `PASSWORD_RESET_SUCCESS`
- `ACCOUNT_ACTIVATED`
- `TOKEN_EXPIRED` (optional — parent could show a toast)

**Liquid template considerations** (for you to add in Shopify):
- Extract `token` and `id` from Shopify's URL format (`/account/reset/{id}/{token}` and `/account/activate/{id}/{token}`)
- Pass as query params to iframe URL
- Listen for success messages AND `TOKEN_EXPIRED` to show appropriate feedback after modal closes

### Summary of all states each page must handle

```text
ResetPasswordPage:
├── Loading (validating token)
├── Form (valid token → enter new password)
├── Success (password changed → close modal / go to store)
├── Token Expired (CTA: request new reset email)
├── Token Invalid / Already Used (CTA: request new reset)
├── Missing Params (CTA: use link from email)
├── Already Logged In (redirect)
├── Network Error (retry button)
└── Rate Limited (wait message)

ActivateAccountPage:
├── Loading (validating token)
├── Form (valid token → set password)
├── Success (account activated → close modal / go to store)
├── Already Activated (CTA: login or close)
├── Token Expired (CTA: contact support)
├── Token Invalid (CTA: contact support)
├── Missing Params (CTA: use link from email)
├── Already Logged In (redirect)
├── Network Error (retry button)
└── Rate Limited (wait message)
```

This covers all the edge cases. Shall I proceed with implementation?

