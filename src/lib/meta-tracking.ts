/**
 * Meta (Facebook) conversion tracking context for the registration SPA.
 *
 * Why this exists:
 *   The SPA runs inside an iframe on the Shopify theme (and first-party at
 *   /apps/apply). Third-party cookie access inside the iframe is unreliable,
 *   so we never try to read `_fbp` / `_fbc` cookies ourselves. Instead:
 *
 *     1. The parent theme reads its own first-party `_fbp` / `_fbc` cookies
 *        (plus `fbclid` from the landing URL) and forwards them, either as
 *        query params on the iframe src or via a `META_CONTEXT` postMessage.
 *     2. We cache whatever we receive in sessionStorage for the visit.
 *     3. On submit we send that context, plus a single `eventId`, to
 *        create-customer, which fires the server-side Conversions API
 *        `CompleteRegistration` event.
 *     4. The same `eventId` rides on the APPLICATION_SUBMITTED postMessage so
 *        the theme's browser Pixel event dedupes against the CAPI event.
 *
 * Nothing here is required for registration to work. Every read is guarded.
 */

const STORAGE_KEY = "dde_meta_ctx";
const EVENT_ID_KEY = "dde_meta_event_id";

export type MetaContext = {
  /** Shared dedupe key for Pixel + Conversions API. */
  eventId: string;
  /** Meta click id cookie value (`fb.1.<ts>.<fbclid>`), when known. */
  fbc?: string | null;
  /** Meta browser id cookie value (`fb.1.<ts>.<random>`), when known. */
  fbp?: string | null;
  /** Raw fbclid, when the theme forwarded it without a built `_fbc`. */
  fbclid?: string | null;
  /** Page the conversion happened on (theme URL when we know it). */
  eventSourceUrl?: string | null;
};

type CachedContext = Omit<MetaContext, "eventId">;

function readCache(): CachedContext {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CachedContext;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeCache(next: CachedContext): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // sessionStorage unavailable (private mode / blocked) - tracking degrades.
  }
}

const clean = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 400) return null;
  return trimmed;
};

/** Build a `_fbc`-shaped value from a bare fbclid, per Meta's spec. */
function fbcFromFbclid(fbclid: string): string {
  return `fb.1.${Date.now()}.${fbclid}`;
}

/**
 * Merge newly discovered signals into the cached visit context.
 * Existing values win: the first `_fbc` we see is the closest to the click.
 */
export function recordMetaSignals(input: {
  fbc?: unknown;
  fbp?: unknown;
  fbclid?: unknown;
  eventSourceUrl?: unknown;
}): void {
  const cached = readCache();
  const fbclid = clean(input.fbclid) ?? cached.fbclid ?? null;
  const next: CachedContext = {
    fbc: cached.fbc ?? clean(input.fbc) ?? (fbclid ? fbcFromFbclid(fbclid) : null),
    fbp: cached.fbp ?? clean(input.fbp) ?? null,
    fbclid,
    eventSourceUrl: cached.eventSourceUrl ?? clean(input.eventSourceUrl) ?? null,
  };
  writeCache(next);
}

/** Pull fbclid / _fbc / _fbp / source URL off our own query string. */
export function captureMetaSignalsFromUrl(): void {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    recordMetaSignals({
      fbc: params.get("fbc") || params.get("_fbc"),
      fbp: params.get("fbp") || params.get("_fbp"),
      fbclid: params.get("fbclid"),
      eventSourceUrl: params.get("parent_url") || params.get("source_url"),
    });
  } catch {
    // Malformed URL - ignore.
  }
}

/** Stable per-visit event id shared by the Pixel and the Conversions API. */
export function getMetaEventId(): string {
  try {
    const existing = sessionStorage.getItem(EVENT_ID_KEY);
    if (existing) return existing;
  } catch {
    // fall through
  }
  const generated =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `dde-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  try {
    sessionStorage.setItem(EVENT_ID_KEY, generated);
  } catch {
    // ignore
  }
  return generated;
}

/** Everything create-customer needs to fire a deduped CAPI event. */
export function getMetaContext(): MetaContext {
  const cached = readCache();
  const eventSourceUrl =
    cached.eventSourceUrl ??
    (typeof window !== "undefined" ? window.location.href : null);
  return {
    eventId: getMetaEventId(),
    fbc: cached.fbc ?? null,
    fbp: cached.fbp ?? null,
    fbclid: cached.fbclid ?? null,
    eventSourceUrl,
  };
}
