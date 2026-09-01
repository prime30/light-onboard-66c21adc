// Durable stash for password reset / activation link parameters.
//
// The storefront hands the reset (or activation) URL to this SPA through the
// theme. In social in-app browsers the handoff can be lost the moment the
// page re-navigates, or sessionStorage can be unavailable entirely, leaving
// the user on a "link incomplete" dead end even though the email was valid.
//
// So: whenever we see the params in the URL we persist them (localStorage
// first for cross-session survival, sessionStorage as a fallback), and when
// the URL has none we read them back. Params are short lived on purpose.

const KEY = "dd:reset-params";
const MAX_AGE_MS = 60 * 60 * 1000; // 1 hour, matches Shopify link lifetime.

export interface ResetParams {
  resetUrl?: string | null;
  activationUrl?: string | null;
  token?: string | null;
  customerId?: string | null;
  emailHint?: string | null;
}

interface StoredResetParams extends ResetParams {
  savedAt: number;
}

function stores(): Storage[] {
  const list: Storage[] = [];
  try {
    if (typeof localStorage !== "undefined") list.push(localStorage);
  } catch {
    // Blocked storage, ignore.
  }
  try {
    if (typeof sessionStorage !== "undefined") list.push(sessionStorage);
  } catch {
    // Blocked storage, ignore.
  }
  return list;
}

function hasAny(params: ResetParams): boolean {
  return !!(params.resetUrl || params.activationUrl || (params.token && params.customerId));
}

export function saveResetParams(params: ResetParams): void {
  if (!hasAny(params)) return;
  const payload: StoredResetParams = { ...params, savedAt: Date.now() };
  const serialized = JSON.stringify(payload);
  for (const store of stores()) {
    try {
      store.setItem(KEY, serialized);
    } catch {
      // Quota or private mode, best effort.
    }
  }
}

export function readResetParams(): ResetParams | null {
  for (const store of stores()) {
    try {
      const raw = store.getItem(KEY);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as StoredResetParams;
      if (!parsed?.savedAt || Date.now() - parsed.savedAt > MAX_AGE_MS) {
        store.removeItem(KEY);
        continue;
      }
      if (!hasAny(parsed)) continue;
      return parsed;
    } catch {
      // Corrupt entry, skip.
    }
  }
  return null;
}

export function clearResetParams(): void {
  for (const store of stores()) {
    try {
      store.removeItem(KEY);
    } catch {
      // Best effort.
    }
  }
}

/**
 * Merges the params found in the URL with anything previously stashed.
 * URL always wins. Anything present is re-persisted so a mid-flow reload or
 * an in-app browser session reset does not strand the user.
 */
export function resolveResetParams(fromUrl: ResetParams): ResetParams {
  if (hasAny(fromUrl)) {
    saveResetParams(fromUrl);
    return fromUrl;
  }
  const stored = readResetParams();
  if (!stored) return fromUrl;
  return {
    resetUrl: fromUrl.resetUrl ?? stored.resetUrl ?? null,
    activationUrl: fromUrl.activationUrl ?? stored.activationUrl ?? null,
    token: fromUrl.token ?? stored.token ?? null,
    customerId: fromUrl.customerId ?? stored.customerId ?? null,
    emailHint: fromUrl.emailHint ?? stored.emailHint ?? null,
  };
}
