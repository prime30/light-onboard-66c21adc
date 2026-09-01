/**
 * Ad / campaign attribution for the registration SPA.
 *
 * Same plumbing story as meta-tracking.ts: the SPA runs in an iframe on the
 * Shopify theme, so campaign params can arrive three ways:
 *
 *   1. On our own query string (legacy apply subdomain, or a direct link).
 *   2. Forwarded by the theme via the META_CONTEXT postMessage (utm_* fields
 *      plus parent_url / referrer of the storefront landing page).
 *   3. Not at all, in which case the registration counts as direct/organic.
 *
 * Whatever we see first for the visit is cached in sessionStorage and sent to
 * create-customer on submit, which classifies the channel, writes it to the
 * Shopify customer note, posts it to Slack, and stores it for admin analytics.
 *
 * Everything here is best-effort: registration never depends on it.
 */

const STORAGE_KEY = "dde_attribution_ctx";

export type AttributionContext = {
  /** Coarse channel bucket, computed from the raw signals below. */
  channel: AttributionChannel;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  /** Meta / Google / TikTok click ids, when present. */
  fbclid?: string | null;
  gclid?: string | null;
  ttclid?: string | null;
  /** Storefront page (or referrer) the applicant came from. */
  landingUrl?: string | null;
  referrer?: string | null;
};

export type AttributionChannel =
  | "meta_ads"
  | "meta_click"
  | "google_ads"
  | "tiktok_ads"
  | "pinterest_ads"
  | "other_paid"
  | "email"
  | "organic_social"
  | "campaign"
  | "direct";

type CachedAttribution = Omit<AttributionContext, "channel">;

const clean = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 400) return null;
  return trimmed;
};

function readCache(): CachedAttribution {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CachedAttribution;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeCache(next: CachedAttribution): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // sessionStorage unavailable - attribution degrades to direct.
  }
}

/** Merge new signals in. First value seen for the visit wins. */
export function recordAttributionSignals(input: {
  utmSource?: unknown;
  utmMedium?: unknown;
  utmCampaign?: unknown;
  utmContent?: unknown;
  utmTerm?: unknown;
  fbclid?: unknown;
  gclid?: unknown;
  ttclid?: unknown;
  landingUrl?: unknown;
  referrer?: unknown;
}): void {
  const cached = readCache();
  const next: CachedAttribution = {
    utmSource: cached.utmSource ?? clean(input.utmSource),
    utmMedium: cached.utmMedium ?? clean(input.utmMedium),
    utmCampaign: cached.utmCampaign ?? clean(input.utmCampaign),
    utmContent: cached.utmContent ?? clean(input.utmContent),
    utmTerm: cached.utmTerm ?? clean(input.utmTerm),
    fbclid: cached.fbclid ?? clean(input.fbclid),
    gclid: cached.gclid ?? clean(input.gclid),
    ttclid: cached.ttclid ?? clean(input.ttclid),
    landingUrl: cached.landingUrl ?? clean(input.landingUrl),
    referrer: cached.referrer ?? clean(input.referrer),
  };
  writeCache(next);
}

/** Read campaign params off a query string (ours, or the parent's URL). */
function signalsFromSearch(search: string, landingUrl?: string | null) {
  const p = new URLSearchParams(search);
  return {
    utmSource: p.get("utm_source"),
    utmMedium: p.get("utm_medium"),
    utmCampaign: p.get("utm_campaign"),
    utmContent: p.get("utm_content"),
    utmTerm: p.get("utm_term"),
    fbclid: p.get("fbclid"),
    gclid: p.get("gclid") ?? p.get("gbraid") ?? p.get("wbraid"),
    ttclid: p.get("ttclid"),
    landingUrl: landingUrl ?? null,
  };
}

/** Capture whatever the SPA URL and referrer already carry. */
export function captureAttributionFromUrl(): void {
  if (typeof window === "undefined") return;
  try {
    recordAttributionSignals({
      ...signalsFromSearch(window.location.search),
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
    });
  } catch {
    // Malformed URL - ignore.
  }
}

/**
 * Capture campaign signals out of a META_CONTEXT payload. The theme sends the
 * storefront landing URL as `parent_url`, which is where the utm_* params live
 * on the first-party App Proxy path (our iframe URL has none).
 */
export function captureAttributionFromParentPayload(data: Record<string, unknown>): void {
  const parentUrl = clean(data.parent_url) ?? clean(data.landing_url) ?? clean(data.pageUrl);
  let fromParentUrl: ReturnType<typeof signalsFromSearch> | null = null;
  if (parentUrl) {
    try {
      fromParentUrl = signalsFromSearch(new URL(parentUrl).search, parentUrl);
    } catch {
      fromParentUrl = null;
    }
  }
  recordAttributionSignals({
    // Explicit fields the theme forwards win over parsing its URL.
    utmSource: data.utm_source ?? data.utmSource ?? fromParentUrl?.utmSource,
    utmMedium: data.utm_medium ?? data.utmMedium ?? fromParentUrl?.utmMedium,
    utmCampaign: data.utm_campaign ?? data.utmCampaign ?? fromParentUrl?.utmCampaign,
    utmContent: data.utm_content ?? data.utmContent ?? fromParentUrl?.utmContent,
    utmTerm: data.utm_term ?? data.utmTerm ?? fromParentUrl?.utmTerm,
    fbclid: data.fbclid ?? fromParentUrl?.fbclid,
    gclid: data.gclid ?? fromParentUrl?.gclid,
    ttclid: data.ttclid ?? fromParentUrl?.ttclid,
    landingUrl: parentUrl,
    referrer: data.referrer,
  });
}

const PAID_MEDIUMS = new Set([
  "cpc",
  "ppc",
  "paid",
  "paidsocial",
  "paid_social",
  "paid-social",
  "cpm",
  "display",
  "retargeting",
  "remarketing",
  "ads",
  "ad",
]);

/** Classify the visit into one channel bucket. Shared with the backend. */
export function classifyAttribution(signals: CachedAttribution): AttributionChannel {
  const source = (signals.utmSource ?? "").toLowerCase();
  const medium = (signals.utmMedium ?? "").toLowerCase();
  const campaign = (signals.utmCampaign ?? "").toLowerCase();
  const paid = PAID_MEDIUMS.has(medium) || /(^|[_-])ads?([_-]|$)/.test(campaign);

  const isMetaSource = /facebook|fb|instagram|^ig$|meta/.test(source);
  // fbclid rides along on every link click from inside Facebook or Instagram
  // (organic posts, bio links, DMs), so it alone does not mean paid traffic.
  if (isMetaSource && paid) return "meta_ads";
  if (signals.gclid || (/google|youtube|gdn/.test(source) && paid)) return "google_ads";
  if (signals.ttclid || (/tiktok/.test(source) && paid)) return "tiktok_ads";
  if (/pinterest/.test(source) && paid) return "pinterest_ads";
  if (medium === "email" || /klaviyo|newsletter/.test(source)) return "email";
  if (paid) return "other_paid";
  if (isMetaSource || /tiktok|pinterest|youtube/.test(source)) return "organic_social";
  if (signals.fbclid) return "meta_click";
  if (source || medium || campaign) return "campaign";
  return "direct";
}

/** Everything create-customer needs to record where this signup came from. */
export function getAttributionContext(): AttributionContext {
  const cached = readCache();
  return { ...cached, channel: classifyAttribution(cached) };
}

/**
 * Flat fields for track-registration-lead so the completion funnel can be
 * broken down by ad channel (leads are recorded before submission).
 */
export function getLeadAttributionFields(): {
  attributionChannel: string;
  attributionCampaign: string | null;
} {
  const ctx = getAttributionContext();
  return {
    attributionChannel: ctx.channel,
    attributionCampaign: ctx.utmCampaign ?? ctx.utmSource ?? null,
  };
}
