/**
 * Standalone (non-iframe) Shopify Storefront session helpers.
 *
 * In iframe mode, the parent Shopify theme owns the customer session and
 * pushes CUSTOMER_DATA to us via postMessage. In standalone mode there's no
 * parent — we hold the Storefront access token in localStorage ourselves and
 * hydrate `customerAtom` from it on boot.
 */

export const STOREFRONT_TOKEN_KEY = "shopify_customer_access_token";

export type StoredSession = {
  accessToken: string;
  expiresAt: string; // ISO timestamp
  email?: string | null;
  firstName?: string | null;
};

const isExpired = (expiresAt: string | null | undefined): boolean => {
  if (!expiresAt) return true;
  const ts = Date.parse(expiresAt);
  if (Number.isNaN(ts)) return true;
  return ts <= Date.now();
};

export function loadStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STOREFRONT_TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (!parsed?.accessToken || !parsed?.expiresAt) return null;
    if (isExpired(parsed.expiresAt)) {
      localStorage.removeItem(STOREFRONT_TOKEN_KEY);
      return null;
    }
    return {
      accessToken: parsed.accessToken,
      expiresAt: parsed.expiresAt,
      email: parsed.email ?? null,
      firstName: parsed.firstName ?? null,
    };
  } catch {
    return null;
  }
}

export function saveStoredSession(session: StoredSession): void {
  try {
    localStorage.setItem(STOREFRONT_TOKEN_KEY, JSON.stringify(session));
  } catch {
    // localStorage unavailable — session is still useful in-memory.
  }
}

export function clearStoredSession(): void {
  try {
    localStorage.removeItem(STOREFRONT_TOKEN_KEY);
  } catch {
    // ignore
  }
}
