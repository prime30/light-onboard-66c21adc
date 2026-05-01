// Persists the email a user typed into the "Forgot password?" or
// activation-related flow so the reset/activate page can recover it
// when Shopify's Storefront API returns `customer.email = null`
// (a known quirk for legacy customer accounts and certain access
// scopes — see ResetPasswordForm/ActivateAccountForm fallback paths).
//
// sessionStorage scope is intentional: same-browser, same-session only,
// auto-cleared on tab close. The reset link the user clicks lands in the
// same browser session that requested it, so the hint is reliably present.

const KEY = "dd:reset-email-hint";

export function setResetEmailHint(email: string): void {
  if (!email) return;
  try {
    sessionStorage.setItem(KEY, email);
  } catch {
    // Private mode / disabled storage — fall through, callers handle null.
  }
}

export function getResetEmailHint(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearResetEmailHint(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Best-effort cleanup.
  }
}
