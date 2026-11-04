// Module-level queue for credentials we want the parent Shopify theme to log
// in with. We post USER_LOGIN immediately when the iframe success screen
// renders so the parent can reload in the background, AND we re-fire it on
// CLOSE_IFRAME as a safety net - covering two edge cases the immediate path
// can't:
//
//   1. The parent's USER_LOGIN handler was momentarily gated (e.g. iframe
//      route hadn't ack'd as "logged-in-eligible" yet, or a transient race).
//   2. The first USER_LOGIN was dropped/ignored and the user is about to
//      close - without a flush, the user lands on a logged-out storefront.
//
// One pending entry at a time is sufficient - only one auth flow can be on
// screen at once. Cleared after flush so the next mount starts clean.

type PendingLogin = { email: string; password: string };

let pending: PendingLogin | null = null;

export function setPendingLogin(creds: PendingLogin): void {
  pending = creds;
}

export function takePendingLogin(): PendingLogin | null {
  const value = pending;
  pending = null;
  return value;
}

export function clearPendingLogin(): void {
  pending = null;
}

// A backend-minted Multipass link that replaces the credential handoff, for
// signups whose new password the store refuses. Shopify tokens last 15
// minutes, so an older link falls back to the queued credentials.
const MULTIPASS_MAX_AGE_MS = 10 * 60 * 1000;

let pendingMultipass: { url: string; at: number; promoted?: boolean } | null = null;

export function setPendingMultipass(url: string): void {
  pendingMultipass = { url, at: Date.now() };
}

// True only for the refused-password link the success screen opens at once.
// A promoted standby link waits for the customer to close the screen.
export function hasPendingMultipass(now = Date.now()): boolean {
  return !!pendingMultipass && !pendingMultipass.promoted && now - pendingMultipass.at < MULTIPASS_MAX_AGE_MS;
}

export function takePendingMultipass(now = Date.now()): string | null {
  const value = pendingMultipass;
  pendingMultipass = null;
  standbyMultipass = null;
  return value && now - value.at < MULTIPASS_MAX_AGE_MS ? value.url : null;
}

// A link for a signup whose password the store verified at activation. It is
// held back while the theme signs in with the password and used only if that
// sign-in fails, so a working sign-in keeps its normal landing page.
let standbyMultipass: { url: string; at: number } | null = null;

export function setStandbyMultipass(url: string): void {
  standbyMultipass = { url, at: Date.now() };
}

export function promoteStandbyMultipass(): boolean {
  if (!standbyMultipass) return false;
  pendingMultipass = { ...standbyMultipass, promoted: true };
  standbyMultipass = null;
  return true;
}

export function clearStandbyMultipass(): void {
  standbyMultipass = null;
}
