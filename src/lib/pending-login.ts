/**
 * Pending parent-theme login store.
 *
 * After a successful registration in iframe mode we used to immediately
 * postMessage USER_LOGIN to the parent Shopify theme — which would log the
 * user in on the storefront before they had even seen the success screen
 * (or chosen to close the modal). That meant cart state could change while
 * they're still mid-flow and the theme could trigger redirects underfoot.
 *
 * Instead, we stash the credentials here and only flush them when the
 * iframe is actually being closed (CloseButton, success-screen close, or
 * any other path that calls closeIframe()).
 */

export type PendingLogin = { email: string; password: string };

let pending: PendingLogin | null = null;

export function setPendingLogin(login: PendingLogin): void {
  pending = login;
}

export function takePendingLogin(): PendingLogin | null {
  const value = pending;
  pending = null;
  return value;
}

export function hasPendingLogin(): boolean {
  return pending !== null;
}
