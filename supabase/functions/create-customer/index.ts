import z from "zod";
import { parsePhoneNumberFromString } from "npm:libphonenumber-js@1.11.0";


// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
};

// ------------------------------------------------------------------
// Spam prevention: disposable email blocklist (inlined for edge fn)
// ------------------------------------------------------------------
const DISPOSABLE_EMAIL_DOMAINS = new Set<string>([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "guerrillamail.org",
  "guerrillamail.biz", "guerrillamail.de", "sharklasers.com", "grr.la",
  "10minutemail.com", "10minutemail.net", "20minutemail.com", "tempmail.com",
  "temp-mail.com", "temp-mail.org", "tempmailo.com", "tempmail.net", "tempmail.plus",
  "tempmailaddress.com", "throwawaymail.com", "throwawaymail.org", "yopmail.com",
  "yopmail.fr", "yopmail.net", "trashmail.com", "trashmail.net", "trashmail.de",
  "getnada.com", "nada.email", "dispostable.com", "fakeinbox.com", "fake-mail.net",
  "maildrop.cc", "mailnesia.com", "mintemail.com", "moakt.com", "spam4.me",
  "spambox.us", "spamgourmet.com", "mvrht.com", "mytemp.email", "mohmal.com",
  "emailondeck.com", "fakemail.net", "inboxbear.com", "mailcatch.com",
  "harakirimail.com", "incognitomail.com", "jetable.org", "mailexpire.com",
  "discard.email", "discardmail.com", "trashymail.com", "tempinbox.com",
  "tempemail.net", "tempemail.co", "tempr.email", "wegwerfmail.de",
  "wegwerfmail.net", "wegwerfmail.org", "yopmail.gq", "yopmail.ml",
  "temporaryinbox.com", "temporarymailaddress.com", "throwawaymail.com",
]);

// ------------------------------------------------------------------
// AU geo-verification token (minted by verify-au-geo edge function).
// Validates the applicant is physically in Australia, not spoofing via
// VPN. Token format: base64url(payload) + "." + base64url(HMAC(payload))
// Payload: "AU|<email>|<method>|<expMs>"
// ------------------------------------------------------------------
async function validateAuGeoToken(
  token: string,
  email: string,
): Promise<{ ok: boolean; reason?: string }> {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!secret) return { ok: false, reason: "no_secret" };
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return { ok: false, reason: "malformed" };
  }
  const [payloadB64, sig] = token.split(".");
  try {
    const payloadBytes = Uint8Array.from(
      atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0),
    );
    const payload = new TextDecoder().decode(payloadBytes);
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sigBytes = new Uint8Array(
      await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)),
    );
    const expected = btoa(String.fromCharCode(...sigBytes))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    if (expected !== sig) return { ok: false, reason: "bad_signature" };
    const parts = payload.split("|");
    if (parts.length !== 4 || parts[0] !== "AU") return { ok: false, reason: "bad_payload" };
    if (parts[1] !== email.toLowerCase()) return { ok: false, reason: "email_mismatch" };
    const exp = Number(parts[3]);
    if (!Number.isFinite(exp) || Date.now() > exp) return { ok: false, reason: "expired" };
    return { ok: true };
  } catch {
    return { ok: false, reason: "decode_error" };
  }
}

function isDisposableEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const at = email.lastIndexOf("@");
  if (at === -1) return false;
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!domain) return false;
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return true;
  const parts = domain.split(".");
  for (let i = 1; i < parts.length - 1; i++) {
    if (DISPOSABLE_EMAIL_DOMAINS.has(parts.slice(i).join("."))) return true;
  }
  return false;
}


// Define action interface
interface ErrorAction {
  type: string;
  label: string;
  url?: string;
}

// Send error response
function sendError(
  statusCode: number,
  errors: string[],
  message?: string,
  actions?: ErrorAction[]
) {
  return new Response(
    JSON.stringify({
      success: false,
      statusCode,
      message: message || "Error",
      errorMessage: errors,
      actions: actions || [],
    }),
    {
      status: statusCode,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

// Standalone audit-row write for early-reject paths that fail BEFORE the
// per-request audit pipeline (lines ~780+) is initialised - disposable
// email, pre-check email collision, phone validation, phone uniqueness.
// Without this, admin's Submissions Log can't see those rejections.
// Best-effort: never throw, never block the user-facing response.
async function writeStandaloneAuditFailure(args: {
  email: string | null | undefined;
  accountType: string | null | undefined;
  step: string;
  field: string;
  message: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: Record<string, any> | null;
  req: Request;
}): Promise<void> {
  try {
    const _url = Deno.env.get("SUPABASE_URL");
    const _key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const email = (args.email ?? "").toString().toLowerCase().trim() || null;
    if (!_url || !_key || !email) return;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pw, confirmPassword: _cpw, ...payloadForLog } = (args.payload ?? {}) as Record<string, unknown>;
    await fetch(`${_url}/rest/v1/registration_submissions`, {
      method: "POST",
      headers: {
        apikey: _key,
        Authorization: `Bearer ${_key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        email,
        account_type: args.accountType ?? null,
        status: "failed",
        payload: payloadForLog,
        error_log: [
          { step: args.step, status: "error", field: args.field, message: args.message, at: new Date().toISOString() },
        ],
        ip_address:
          args.req.headers.get("cf-connecting-ip") ??
          args.req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          null,
        user_agent: args.req.headers.get("user-agent") ?? null,
      }),
    });
  } catch (e) {
    console.warn("Standalone audit-failure write threw (non-blocking):", e);
  }
}

// ------------------------------------------------------------------
// 429-aware Shopify Admin API fetch. One retry honoring Retry-After
// (capped so a wedged upstream can't blow the function timeout).
// Shopify's leaky bucket rarely fires for this app's volume, but when it
// does it returns 429 with Retry-After - surviving that gracefully is
// the difference between a clean re-submit and a failed registration.
// ------------------------------------------------------------------
async function shopifyFetch(input: string | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status !== 429) return res;
  const retryAfter = Number(res.headers.get("Retry-After") ?? "1");
  const waitMs = Math.min(Math.max(retryAfter, 1), 4) * 1000;
  console.warn(`Shopify 429 - retrying after ${waitMs}ms`);
  await new Promise((r) => setTimeout(r, waitMs));
  return fetch(input, init);
}

// Run a non-critical task after the response is sent, when the edge
// runtime supports it. Falls back to fire-and-forget. Either way the
// user isn't blocked on tail-end writes (final audit-row PATCH, etc.).
function runInBackground(promise: Promise<unknown>): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const er = (globalThis as any).EdgeRuntime;
  if (er && typeof er.waitUntil === "function") {
    er.waitUntil(promise.catch((e) => console.warn("background task failed:", e)));
  } else {
    promise.catch((e) => console.warn("background task failed:", e));
  }
}

// Combined app_settings fetch - one RTT for both auto_approval_enabled
// and extra_customer_tags. Previously the enrichment and activation tails
// each did their own RTT. Returns safe defaults if anything fails.
async function loadAppSettings(): Promise<{
  autoApprovalEnabled: boolean;
  extraCustomerTags: string[];
}> {
  const fallback = { autoApprovalEnabled: false, extraCustomerTags: [] as string[] };
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return fallback;
  try {
    const r = await fetch(
      `${supabaseUrl}/rest/v1/app_settings?singleton=eq.true&select=auto_approval_enabled,extra_customer_tags`,
      { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } }
    );
    if (!r.ok) {
      console.warn("app_settings fetch failed:", r.status);
      return fallback;
    }
    const rows = (await r.json()) as Array<{
      auto_approval_enabled?: boolean;
      extra_customer_tags?: string[];
    }>;
    const row = rows?.[0] ?? {};
    const tagsRaw = Array.isArray(row.extra_customer_tags) ? row.extra_customer_tags : [];
    return {
      autoApprovalEnabled: row.auto_approval_enabled === true,
      extraCustomerTags: tagsRaw
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.trim().replace(/,/g, " "))
        .filter(Boolean),
    };
  } catch (e) {
    console.warn("app_settings fetch threw:", e);
    return fallback;
  }
}

// ------------------------------------------------------------------
// ------------------------------------------------------------------
// Ad / campaign attribution. The SPA caches utm_* params, click ids and the
// storefront landing URL for the visit (src/lib/attribution.ts) and sends them
// on submit. We re-classify server-side so the channel label can never be
// spoofed into something the raw signals do not support.
// ------------------------------------------------------------------
type AttributionClientContext = {
  channel?: unknown;
  utmSource?: unknown;
  utmMedium?: unknown;
  utmCampaign?: unknown;
  utmContent?: unknown;
  utmTerm?: unknown;
  fbclid?: unknown;
  gclid?: unknown;
  gbraid?: unknown;
  wbraid?: unknown;
  ttclid?: unknown;
  landingUrl?: unknown;
  referrer?: unknown;
};

type NormalizedAttribution = {
  channel: string;
  channelLabel: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  fbclid: string | null;
  gclid: string | null;
  gbraid: string | null;
  wbraid: string | null;
  ttclid: string | null;
  landingUrl: string | null;
  referrer: string | null;
  isPaidAds: boolean;
};

const ATTRIBUTION_LABELS: Record<string, string> = {
  meta_ads: "Meta ads (Facebook / Instagram)",
  meta_click: "Facebook / Instagram link click (not an ad)",
  google_ads: "Google ads",
  google_click: "Google click id, no campaign tag (unverified ad)",
  tiktok_ads: "TikTok ads",
  tiktok_click: "TikTok link click (not an ad)",
  pinterest_ads: "Pinterest ads",
  other_paid: "Other paid campaign",
  email: "Email / Klaviyo",
  organic_social: "Organic social",
  campaign: "Tagged link (non-paid)",
  direct: "Direct / organic",
};

const PAID_MEDIUMS = new Set([
  "cpc", "ppc", "paid", "paidsocial", "paid_social", "paid-social",
  "cpm", "display", "retargeting", "remarketing", "ads", "ad",
]);

function normalizeAttribution(raw: AttributionClientContext | null | undefined): NormalizedAttribution {
  const str = (v: unknown): string | null => {
    if (typeof v !== "string") return null;
    const t = v.trim();
    return t && t.length <= 400 ? t : null;
  };
  // Campaign params usually land on the storefront URL, not on the registration
  // app URL, so the referrer is often the only surviving copy of them.
  const referrer = str(raw?.referrer);
  const landingUrl = str(raw?.landingUrl);
  const paramsFrom = (url: string | null): URLSearchParams | null => {
    if (!url) return null;
    try {
      const parsed = new URL(url);
      return parsed.search ? parsed.searchParams : null;
    } catch {
      return null;
    }
  };
  const fallbacks = [paramsFrom(landingUrl), paramsFrom(referrer)].filter(
    (p): p is URLSearchParams => Boolean(p),
  );
  const pick = (value: string | null, key: string): string | null => {
    if (value) return value;
    for (const params of fallbacks) {
      const found = str(params.get(key));
      if (found) return found;
    }
    return null;
  };

  const utmSource = pick(str(raw?.utmSource), "utm_source");
  const utmMedium = pick(str(raw?.utmMedium), "utm_medium");
  const utmCampaign = pick(str(raw?.utmCampaign), "utm_campaign");
  const fbclid = pick(str(raw?.fbclid), "fbclid");
  const gclid = pick(str(raw?.gclid), "gclid");
  const gbraid = pick(str(raw?.gbraid), "gbraid");
  const wbraid = pick(str(raw?.wbraid), "wbraid");
  const googleClickId = gbraid ?? wbraid;
  const ttclid = pick(str(raw?.ttclid), "ttclid");


  const source = (utmSource ?? "").toLowerCase();
  const medium = (utmMedium ?? "").toLowerCase();
  const campaign = (utmCampaign ?? "").toLowerCase();
  const paid = PAID_MEDIUMS.has(medium) || /(^|[_-])ads?([_-]|$)/.test(campaign);
  const isMetaSource = /facebook|fb|instagram|^ig$|meta/.test(source);

  let channel = "direct";
  // fbclid is appended to any link clicked inside Facebook or Instagram,
  // including organic posts, bio links and DMs. Only call it an ad when the
  // campaign params actually say paid.
  if (isMetaSource && paid) channel = "meta_ads";
  else if (gclid || (/google|youtube|gdn/.test(source) && paid)) channel = "google_ads";
  // gbraid / wbraid arrive on consent-limited Google clicks and can appear
  // with no campaign tags at all, so they only count as ads when the params
  // confirm paid traffic.
  else if (googleClickId && paid) channel = "google_ads";
  // ttclid behaves like fbclid: TikTok appends it to organic in-app link
  // clicks too, so it only counts as an ad with paid campaign params.
  else if (/tiktok/.test(source) && paid) channel = "tiktok_ads";
  else if (/pinterest/.test(source) && paid) channel = "pinterest_ads";
  else if (medium === "email" || /klaviyo|newsletter/.test(source)) channel = "email";
  else if (paid) channel = "other_paid";
  else if (isMetaSource || /tiktok|pinterest|youtube/.test(source)) channel = "organic_social";
  else if (fbclid) channel = "meta_click";
  else if (ttclid) channel = "tiktok_click";
  else if (googleClickId) channel = "google_click";
  else if (source || medium || campaign) channel = "campaign";

  return {
    channel,
    channelLabel: ATTRIBUTION_LABELS[channel] ?? channel,
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent: str(raw?.utmContent),
    utmTerm: str(raw?.utmTerm),
    fbclid,
    gclid,
    gbraid,
    wbraid,
    ttclid,
    landingUrl: str(raw?.landingUrl),
    referrer: str(raw?.referrer),
    isPaidAds: ["meta_ads", "google_ads", "tiktok_ads", "pinterest_ads", "other_paid"].includes(channel),
  };
}

/** One-line summary used in the Shopify note and the Slack message. */
function attributionSummary(a: NormalizedAttribution): string {
  const bits: string[] = [a.channelLabel];
  if (a.utmCampaign) bits.push(`campaign: ${a.utmCampaign}`);
  if (a.utmContent) bits.push(`ad: ${a.utmContent}`);
  else if (a.utmTerm) bits.push(`term: ${a.utmTerm}`);
  if (!a.utmCampaign && a.utmSource) bits.push(`source: ${a.utmSource}`);
  return bits.join(" · ");
}

// Slack notification: post every registration to the #applications
// channel with the Instagram handle so the team can follow immediately.
// Best-effort: failures are logged but never block the applicant.
// ------------------------------------------------------------------
async function sendSlackApplicantsNotification(payload: {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  countryCode?: string | null;
  accountType?: string | null;
  socialMediaHandle?: string | null;
  attribution?: NormalizedAttribution | null;
}): Promise<void> {
  const webhookUrl = Deno.env.get("SLACK_APPLICANTS_WEBHOOK");
  if (!webhookUrl) {
    console.warn("SLACK_APPLICANTS_WEBHOOK not set; skipping Slack notification");
    return;
  }

  const handle = payload.socialMediaHandle?.trim();
  const normalizedHandle = handle ? handle.replace(/^@/, "") : null;
  const instagramLink = normalizedHandle ? `https://instagram.com/${normalizedHandle}` : null;
  const fullName = [payload.firstName, payload.lastName].filter(Boolean).join(" ") || "N/A";
  const displayName = payload.firstName || payload.email.split("@")[0] || "Applicant";

  const blocks: Record<string, unknown>[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "New application submitted",
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Name:*\n${fullName}`,
        },
        {
          type: "mrkdwn",
          text: `*Email:*\n<mailto:${payload.email}|${payload.email}>`,
        },
        {
          type: "mrkdwn",
          text: `*Country:*\n${payload.countryCode?.toUpperCase() || "N/A"}`,
        },
        {
          type: "mrkdwn",
          text: `*Account type:*\n${payload.accountType || "N/A"}`,
        },
        {
          type: "mrkdwn",
          text: `*Came from:*\n${
            payload.attribution
              ? `${payload.attribution.isPaidAds ? ":dollar: " : ""}${attributionSummary(payload.attribution)}`
              : "Unknown"
          }`,
        },
      ],
    },
  ];

  if (payload.attribution?.landingUrl) {
    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Landed on: ${payload.attribution.landingUrl}`,
        },
      ],
    });
  }

  if (normalizedHandle) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Instagram:* @${normalizedHandle}`,
      },
    });
  }

  const actions: Record<string, unknown>[] = [];
  if (instagramLink) {
    actions.push({
      type: "button",
      text: {
        type: "plain_text",
        text: "View Instagram profile",
        emoji: true,
      },
      url: instagramLink,
      action_id: "view_instagram_profile",
    });
  }
  actions.push({
    type: "button",
    text: {
      type: "plain_text",
      text: "Email applicant",
      emoji: true,
    },
    url: `mailto:${payload.email}`,
    action_id: "email_applicant",
  });

  if (actions.length > 0) {
    blocks.push({
      type: "actions",
      elements: actions,
    });
  }

  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `Drop Dead Extensions - ${new Date().toLocaleString("en-US", {
          timeZone: "America/Los_Angeles",
          dateStyle: "medium",
          timeStyle: "short",
        })} PT`,
      },
    ],
  });

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `New application from ${displayName} (${payload.email})`,
        blocks,
      }),
    });
    if (!res.ok) {
      console.warn("Slack applicants webhook returned non-OK:", res.status, await res.text());
    }
  } catch (err) {
    console.warn("Slack applicants notification threw (non-blocking):", err);
  }
}

// Convert camelCase to snake_case
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

// Convert object keys from camelCase to snake_case
function objectKeysToSnake<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = camelToSnake(key);
      const value = obj[key];
      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        result[snakeKey] = objectKeysToSnake(value as Record<string, unknown>);
      } else {
        result[snakeKey] = value;
      }
    }
  }
  return result;
}

// Format phone number with country code. Accepts either a dial code ("+1",
// "1") or an ISO-3166-alpha-2 region ("US", "CA"); resolves the latter via
// libphonenumber so we never produce bogus E.164 like "+US…".
function formatPhoneNumber(countryCode?: string, phoneNumber?: string): string | undefined {
  if (!phoneNumber) return undefined;
  const cleanPhone = phoneNumber.replace(/\D/g, "");
  if (!cleanPhone) return undefined;
  const cc = (countryCode ?? "").trim();
  // Dial code path: "+1" or bare digits like "1".
  if (cc.startsWith("+") || /^\d+$/.test(cc)) {
    const code = cc.startsWith("+") ? cc : `+${cc || "1"}`;
    return `${code}${cleanPhone}`;
  }
  // ISO region path: let libphonenumber attach the right dial code.
  if (/^[A-Za-z]{2}$/.test(cc)) {
    try {
      const parsed = parsePhoneNumberFromString(cleanPhone, cc.toUpperCase() as never);
      if (parsed) return parsed.number; // E.164
    } catch {
      /* fall through */
    }
  }
  // Last resort: assume NANP.
  return `+1${cleanPhone}`;
}

// Inline the registration schema for edge function
const PREFERRED_METHOD_OPTIONS = [
  "SuperWeft",
  "Keratin Tips",
  "SecreTapes",
  "Volume Weft",
] as const;
// May be absent when the admin hides the preferred-method step.
const preferredMethodsSchema = z.array(z.enum(PREFERRED_METHOD_OPTIONS)).nullish();
const MONTHLY_ORDER_VOLUME_OPTIONS = ["None", "1-5", "6-10", "10+"] as const;
const monthlyOrderVolumeSchema = z.enum(MONTHLY_ORDER_VOLUME_OPTIONS).nullish();

const registrationSchema = z.discriminatedUnion("accountType", [
  z.object({
    accountType: z.literal("professional"),
    businessOperationType: z.enum(["commission", "independent"]).nullish(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    preferredName: z.string().nullish(),
    email: z.email(),
    phoneNumber: z.string().min(7),
    phoneCountryCode: z.string().default("+1"),
    businessName: z.string().nullish().default(""),
    businessAddress: z.string().nullish().default(""),
    suiteNumber: z.string().nullish(),
    countryCode: z.string().min(1).default("US"),
    city: z.string().nullish().default(""),
    provinceCode: z.string().nullish().default(""),
    zipCode: z.string().nullish().default(""),
    // AU has no licence/qualification requirement, so licenseNumber is
    // optional server-side. Non-AU flows already enforce presence on the
    // client via registrationSchema.superRefine.
    licenseNumber: z.string().nullish().default(""),
    licenseProofFiles: z.array(z.string()).nullish().default([]),
    qualification: z.string().nullish(),
    taxExempt: z.boolean().default(false),
    taxExemptFile: z.array(z.string()).nullish().default([]),
    wholesaleAgreed: z.boolean().optional().default(true),
    preferredMethods: preferredMethodsSchema,
    monthlyOrderVolume: monthlyOrderVolumeSchema,
    birthdayMonth: z.string().nullish(),
    birthdayDay: z.string().nullish(),
    socialMediaHandle: z.string().nullish(),
    referralSource: z.string().nullish(),
    subscribeOrderUpdates: z.boolean().nullish().default(false),
    acceptsMarketing: z.boolean().nullish().default(false),
    acceptsSmsMarketing: z.boolean().nullish().default(false),
    password: z.string().min(8).optional(),
  }),
  z.object({
    accountType: z.literal("salon"),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    preferredName: z.string().nullish(),
    email: z.email(),
    phoneNumber: z.string().min(7),
    phoneCountryCode: z.string().default("+1"),
    businessName: z.string().nullish().default(""),
    businessAddress: z.string().nullish().default(""),
    suiteNumber: z.string().nullish(),
    countryCode: z.string().min(1).default("US"),
    city: z.string().nullish().default(""),
    provinceCode: z.string().nullish().default(""),
    zipCode: z.string().nullish().default(""),
    // AU salons have no licensing/qualification/proof requirement; keep
    // these optional and enforce for non-AU on the client.
    salonSize: z.string().nullish().default(""),
    salonStructure: z.string().nullish().default(""),
    licenseNumber: z.string().nullish().default(""),
    licenseProofFiles: z.array(z.string()).nullish().default([]),
    qualification: z.string().nullish(),
    taxExempt: z.boolean().default(false),
    taxExemptFile: z.array(z.string()).nullish().default([]),
    wholesaleAgreed: z.boolean().optional().default(true),
    preferredMethods: preferredMethodsSchema,
    monthlyOrderVolume: monthlyOrderVolumeSchema,
    birthdayMonth: z.string().nullish(),
    birthdayDay: z.string().nullish(),
    socialMediaHandle: z.string().nullish(),
    referralSource: z.string().nullish(),
    subscribeOrderUpdates: z.boolean().nullish().default(false),
    acceptsMarketing: z.boolean().nullish().default(false),
    acceptsSmsMarketing: z.boolean().nullish().default(false),
    password: z.string().min(8).optional(),
  }),
  z.object({
    accountType: z.literal("student"),
    schoolName: z.string().min(1),
    schoolState: z.string().min(1),
    enrollmentProofFiles: z.array(z.string()).min(1),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    preferredName: z.string().nullish(),
    email: z.email(),
    phoneNumber: z.string().min(7),
    phoneCountryCode: z.string().default("+1"),
    taxExempt: z.boolean().default(false),
    taxExemptFile: z.array(z.string()).nullish().default([]),
    wholesaleAgreed: z.boolean().optional().default(true),
    preferredMethods: preferredMethodsSchema,
    birthdayMonth: z.string().nullish(),
    birthdayDay: z.string().nullish(),
    socialMediaHandle: z.string().nullish(),
    referralSource: z.string().nullish(),
    subscribeOrderUpdates: z.boolean().nullish().default(false),
    acceptsMarketing: z.boolean().nullish().default(false),
    acceptsSmsMarketing: z.boolean().nullish().default(false),
    password: z.string().min(8).optional(),
  }),
]);

// ---------------------------------------------------------------------------
// Meta (Facebook) Conversions API - server-side CompleteRegistration
// ---------------------------------------------------------------------------
// The SPA runs in an iframe on the theme, where browser-Pixel attribution is
// unreliable (blocked third-party cookies, ad blockers). We therefore send the
// conversion server-side with hashed PII, and the theme fires the browser Pixel
// with the SAME event_id so Meta dedupes the pair instead of double-counting.
//
// Secrets: META_PIXEL_ID, META_CAPI_ACCESS_TOKEN (both required to send),
//          META_TEST_EVENT_CODE (optional, for Events Manager test tab).
type MetaClientContext = {
  eventId?: unknown;
  fbc?: unknown;
  fbp?: unknown;
  eventSourceUrl?: unknown;
};

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Meta requires lowercase, trimmed values hashed with SHA-256. */
async function hashNormalized(value: string | null | undefined): Promise<string | null> {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) return null;
  return await sha256Hex(normalized);
}

/** Phones are hashed digits-only, including country code, no punctuation. */
async function hashPhone(value: string | null | undefined): Promise<string | null> {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length < 7) return null;
  return await sha256Hex(digits);
}

async function sendMetaCompleteRegistration(args: {
  req: Request;
  meta: MetaClientContext | null | undefined;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phoneE164?: string | null;
  city?: string | null;
  provinceCode?: string | null;
  zip?: string | null;
  countryCode?: string | null;
  accountType?: string | null;
}): Promise<void> {
  const pixelId = Deno.env.get("META_PIXEL_ID");
  const accessToken = Deno.env.get("META_CAPI_ACCESS_TOKEN");
  if (!pixelId || !accessToken) return; // Tracking not configured - no-op.

  const str = (v: unknown): string | null =>
    typeof v === "string" && v.trim() && v.length < 500 ? v.trim() : null;

  const eventId = str(args.meta?.eventId) ?? crypto.randomUUID();
  const fbc = str(args.meta?.fbc);
  const fbp = str(args.meta?.fbp);
  const eventSourceUrl =
    str(args.meta?.eventSourceUrl) ?? "https://dropdeadextensions.com/apps/apply";

  const headers = args.req.headers;
  const clientIp =
    (headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    headers.get("cf-connecting-ip") ||
    null;
  const userAgent = headers.get("user-agent");

  const [em, fn, ln, ph, ct, st, zp, country] = await Promise.all([
    hashNormalized(args.email),
    hashNormalized(args.firstName),
    hashNormalized(args.lastName),
    hashPhone(args.phoneE164),
    hashNormalized(args.city?.replace(/\s+/g, "")),
    hashNormalized(args.provinceCode),
    hashNormalized(args.zip?.replace(/\s+/g, "")),
    hashNormalized(args.countryCode),
  ]);

  const userData: Record<string, unknown> = {};
  if (em) userData.em = [em];
  if (ph) userData.ph = [ph];
  if (fn) userData.fn = [fn];
  if (ln) userData.ln = [ln];
  if (ct) userData.ct = [ct];
  if (st) userData.st = [st];
  if (zp) userData.zp = [zp];
  if (country) userData.country = [country];
  if (fbc) userData.fbc = fbc;
  if (fbp) userData.fbp = fbp;
  if (clientIp) userData.client_ip_address = clientIp;
  if (userAgent) userData.client_user_agent = userAgent;

  const testEventCode = Deno.env.get("META_TEST_EVENT_CODE");
  const body: Record<string, unknown> = {
    data: [
      {
        event_name: "CompleteRegistration",
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        event_source_url: eventSourceUrl,
        action_source: "website",
        user_data: userData,
        custom_data: {
          content_name: "Pro account application",
          status: "approved_pending_verification",
          account_type: args.accountType ?? null,
        },
      },
    ],
  };
  if (testEventCode) body.test_event_code = testEventCode;

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      const text = await res.text();
      console.error("Meta CAPI CompleteRegistration failed", res.status, text.slice(0, 500));
    } else {
      console.log("Meta CAPI CompleteRegistration sent", { eventId, hasFbc: !!fbc, hasFbp: !!fbp });
    }
  } catch (err) {
    console.warn("Meta CAPI CompleteRegistration threw (non-blocking):", err);
  }
}


// Interface for function response
type FunctionResponse<T> = {
  success: boolean;
  statusCode: number;
  message?: string;
  data?: T;
  errorMessage?: string[];
};

// Interface for the incoming request payload
interface CustomerCreateRequest {
  action: "CREATE_CUSTOMER";
  data: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

type CustomerCreateInput = {
  account_type?: string;
  business_operation_type?: string;
  first_name: string;
  last_name: string;
  preferred_name?: string;
  email: string;
  default_address: {
    company?: string;
    address1?: string;
    address2?: string;
    city?: string;
    province_code?: string;
    zip?: string;
    country_code?: string;
    phone?: string;
  };
  school_name?: string;
  school_state?: string;
  proof_file_1?: string;
  proof_file_2?: string;
  proof_file_3?: string;
  license_number?: string;
  salon_size?: string;
  salon_structure?: string;
  tax_exempt?: boolean;
  tax_exempt_file?: string;
  birthday_month?: number;
  birthday_day?: number;
  wholesale_agreed?: boolean;
  accepts_marketing?: boolean;
  accepts_sms_marketing?: boolean;
  subscribe_order_updates?: boolean;
  social_media_handle?: string;
  referral_source?: string;
};

const defaultCustomerCreateInput: Partial<CustomerCreateInput> = {
  accepts_marketing: false,
  accepts_sms_marketing: false,
  subscribe_order_updates: false,
  tax_exempt: false,
};

// Interface for the Customer Fields API request
interface CustomerFieldsRequest {
  form_id: string;
  customer: CustomerCreateInput;
}

// Interface for the Customer Fields API response
interface CustomerFieldsResponse {
  customer: {
    id: string;
    shopify_id?: number;
    first_name: string;
    last_name: string;
    email: string;
  };
}

// Interface for the Customer Fields Search API response
interface CustomerSearchResponse {
  customers: {
    id: string;
    shopify_id?: number;
    first_name: string;
    last_name: string;
    email: string;
    created_at: string;
    updated_at: string;
  }[];
}

// Function to search for existing customer by email
async function searchCustomerByEmail(
  email: string,
  apiKey: string
): Promise<CustomerSearchResponse | null> {
  const searchUrl = `https://app.customerfields.com/api/v2/customers/search.json?page=1&limit=1&sort_by=updated_at&sort_order=desc&email=${encodeURIComponent(email)}`;

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  try {
    console.log("Searching for existing customer with email:", email);
    const response = await fetch(searchUrl, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      console.error("Customer search API request failed:", response.status);
      return null;
    }

    const searchData: CustomerSearchResponse = await response.json();
    return searchData;
  } catch (error) {
    console.error("Error searching for customer:", error);
    return null;
  }
}

Deno.serve(async (req: Request) => {
  console.log("Customer create function called");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate request method
  if (req.method !== "POST") {
    return sendError(405, ["Method not allowed"]);
  }

  // Get environment variables for Customer Fields API
  const customerFieldsApiUrl = "https://app.customerfields.com/api/v2/customers";
  const customerFieldsFormId = Deno.env.get("HELIUM_PRIVATE_FORM_ID");
  const customerFieldsApiKey = Deno.env.get("HELIUM_PRIVATE_ACCESS_TOKEN");

  // Validate required environment variables
  if (!customerFieldsFormId) {
    console.error("HELIUM_PRIVATE_FORM_ID environment variable is not set");
    return sendError(500, ["Server configuration error: Missing form ID"]);
  }

  if (!customerFieldsApiKey) {
    console.error("HELIUM_PRIVATE_ACCESS_TOKEN environment variable is not set");
    return sendError(500, ["Server configuration error"]);
  }

  // Fire-and-forget alert whenever an anti-spam gate blocks a submission, so a
  // false positive on a real applicant surfaces to ops instead of dying in logs.
  const notifyBlocked = (
    reason: string,
    detail: Record<string, unknown>,
    body: { data?: { email?: unknown; firstName?: unknown; lastName?: unknown } }
  ) => {
    try {
      const u = Deno.env.get("SUPABASE_URL");
      const k = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!u || !k) return;
      void fetch(`${u}/functions/v1/notify-error`, {
        method: "POST",
        headers: { Authorization: `Bearer ${k}`, apikey: k, "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "create-customer-spam-block",
          message: `Submission blocked by ${reason} gate`,
          context: {
            reason,
            ...detail,
            email: body?.data?.email ?? null,
            name: `${body?.data?.firstName ?? ""} ${body?.data?.lastName ?? ""}`.trim() || null,
          },
        }),
      }).catch(() => {});
    } catch {
      /* never throw */
    }
  };

  // Parse the request body
  let requestBody: CustomerCreateRequest & {
    honeypot?: unknown;
    formStartedAt?: unknown;
    meta?: MetaClientContext;
    attribution?: AttributionClientContext;
  };
  try {
    requestBody = await req.json();
  } catch {
    return sendError(400, ["Invalid JSON in request body"]);
  }


  // Spam: min-time-on-form check. Only catches instant bot POSTs. Kept at 1s
  // because a restored session (sessionStorage resume) legitimately reaches the
  // summary and submits seconds after page load - formStartedAt is captured at
  // page load, so a returning user's elapsed time can be very small.
  const MIN_FORM_FILL_MS = 1000;
  const formStartedAtRaw = (requestBody as { formStartedAt?: unknown }).formStartedAt;
  const formStartedAt = typeof formStartedAtRaw === "number" ? formStartedAtRaw : NaN;
  const elapsed = Date.now() - formStartedAt;
  if (!Number.isFinite(formStartedAt) || elapsed < MIN_FORM_FILL_MS || elapsed < 0) {
    console.log("Form-fill timing check failed - rejecting request", { elapsed, formStartedAt });
    notifyBlocked("timing", { elapsed, formStartedAt }, requestBody);
    return sendError(400, [
      "Your application was submitted before the page finished loading, so we couldn't process it (error SPAM-TIME). Please refresh the page and press Submit again. If it keeps happening, email hello@dropdeadextensions.com and we'll finish your application for you.",
    ]);
  }



  // Spam: honeypot field. NOT a standalone hard block: browser autofill and
  // password managers can populate a hidden input, and that was rejecting real
  // applicants. Corroboration is CONTENT-based, never time-based: a restored
  // session (sessionStorage resume) can legitimately submit seconds after page
  // load, so elapsed time says nothing about this request.
  //
  // Autofill copies data the user themselves typed (email, name, phone, salon
  // name, address, handle). A bot injects text unrelated to the form payload.
  // So: if the honeypot value echoes any submitted field, treat it as autofill
  // and let it through. Otherwise reject.
  const honeypotValue = (requestBody as { honeypot?: unknown }).honeypot;
  if (typeof honeypotValue === "string" && honeypotValue.trim() !== "") {
    const v = honeypotValue.trim();
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9@.]/g, "");
    const vNorm = norm(v);

    // Collect every string the user submitted (shallow + one level of arrays).
    const submitted: string[] = [];
    const collect = (val: unknown, depth = 0) => {
      if (depth > 2) return;
      if (typeof val === "string") {
        if (val.trim().length >= 3) submitted.push(val);
      } else if (Array.isArray(val)) {
        val.forEach((x) => collect(x, depth + 1));
      } else if (val && typeof val === "object") {
        Object.values(val as Record<string, unknown>).forEach((x) => collect(x, depth + 1));
      }
    };
    collect((requestBody as { data?: unknown }).data);

    const echoesUserData =
      vNorm.length >= 3 &&
      submitted.some((s) => {
        const sn = norm(s);
        return sn.length >= 3 && (sn.includes(vNorm) || vNorm.includes(sn));
      });

    console.log(
      "Honeypot filled",
      JSON.stringify({
        preview: v.slice(0, 40),
        length: v.length,
        email: (requestBody as { data?: { email?: unknown } }).data?.email,
        elapsedMs: elapsed,
        echoesUserData,
        blocked: !echoesUserData,
      })
    );

    if (!echoesUserData) {
      notifyBlocked("honeypot", { preview: v.slice(0, 60), length: v.length }, requestBody);
      return sendError(400, [
        "Something on this page filled in a hidden field we use to block bots, so your application was held (error SPAM-HP). This is almost always a browser extension or password manager auto-filling the form. To get through: turn off autofill for this page, or open the application in a private/incognito window and re-enter your details. Still stuck? Email hello@dropdeadextensions.com with the code SPAM-HP and we'll complete your application manually.",
      ]);
    }

  }



  // Validate the request body against the schema
  const parseResult = registrationSchema.safeParse(requestBody.data);
  if (!parseResult.success) {
    // Prefix each error with the field path so the client can map it back
    // to a specific form field / step. "schoolName: School name is required"
    // is infinitely more useful than "Invalid input: expected string, received null".
    //
    // discriminatedUnion failures arrive with an empty path (`code:
    // "invalid_union_discriminator"`) because the discriminator itself is
    // what failed. Attribute those to `accountType` so the client can
    // auto-navigate the user to the account-type step instead of showing
    // an unactionable generic banner on the final submit.
    const issues = parseResult.error.issues.map((e) => {
        const path = Array.isArray(e.path) ? e.path.filter((p) => p !== undefined) : [];
        let fieldPath = path.length > 0 ? path.join(".") : "form";
        if (
          fieldPath === "form" &&
          ["invalid_union_discriminator", "invalid_union"].includes(String(e.code))
        ) {
          fieldPath = "accountType";
        }
        return { field: fieldPath, message: e.message };
      }
    );
    const validationErrors = issues.map((i) =>
      i.field === "form" ? i.message : `${i.field}: ${i.message}`
    );
    console.log("Request body validation failed:", validationErrors);

    // Best-effort audit-row write so we have a persistent record of WHICH
    // field failed for this user. Mirrors the audit insert that happens
    // post-validation but flagged `failed` and with the issue list inlined.
    try {
      const _url = Deno.env.get("SUPABASE_URL");
      const _key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = (requestBody.data ?? {}) as Record<string, any>;
      const auditEmail = typeof raw.email === "string" ? raw.email.toLowerCase().trim() : null;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _pw, confirmPassword: _cpw, ...payloadForLog } = raw;
      if (_url && _key && auditEmail) {
        await fetch(`${_url}/rest/v1/registration_submissions`, {
          method: "POST",
          headers: {
            apikey: _key,
            Authorization: `Bearer ${_key}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            email: auditEmail,
            account_type: typeof raw.accountType === "string" ? raw.accountType : null,
            status: "failed",
            payload: payloadForLog,
            error_log: issues.map((i) => ({
              step: "zod_validation",
              status: "error",
              field: i.field,
              message: i.message,
              at: new Date().toISOString(),
            })),
            ip_address:
              req.headers.get("cf-connecting-ip") ??
              req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
              null,
            user_agent: req.headers.get("user-agent") ?? null,
          }),
        });
      }
    } catch (e) {
      console.warn("Zod-failure audit write threw (non-blocking):", e);
    }

    return sendError(400, validationErrors);
  }

  // Spam: disposable email blocklist. Belt-and-braces server check
  // (client also enforces this, but never trust the client).
  if (isDisposableEmail(parseResult.data.email)) {
    console.log("Disposable email rejected:", parseResult.data.email);
    await writeStandaloneAuditFailure({
      email: parseResult.data.email,
      accountType: parseResult.data.accountType,
      step: "disposable_email",
      field: "email",
      message: "Disposable email domain blocked",
      payload: parseResult.data as unknown as Record<string, unknown>,
      req,
    });
    // Prefix with `email:` so the client routes the error to the email
    // field on the contact-basics step instead of showing a generic banner.
    return sendError(400, [
      "email: Please use a permanent email address - disposable inboxes aren't accepted",
    ]);
  }

  // Competitor domain blocklist (admin-editable via app_settings).
  // Server-side backstop: the client enforces this too, but never trust it.
  {
    const competitorEmail = parseResult.data.email;
    const at = competitorEmail.lastIndexOf("@");
    const emailDomain = at === -1 ? "" : competitorEmail.slice(at + 1).trim().toLowerCase();
    const _url = Deno.env.get("SUPABASE_URL");
    const _key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    let blockedDomain: string | null = null;

    if (emailDomain && _url && _key) {
      const headers = {
        "Content-Type": "application/json",
        apikey: _key,
        Authorization: `Bearer ${_key}`,
      };
      try {
        const res = await fetch(`${_url}/rest/v1/rpc/get_competitor_email_domains`, {
          method: "POST",
          headers,
          body: "{}",
        });
        if (res.ok) {
          const list = (await res.json()) as string[] | null;
          const set = new Set((list ?? []).map((d) => String(d).trim().toLowerCase()).filter(Boolean));
          if (set.has(emailDomain)) {
            blockedDomain = emailDomain;
          } else {
            const parts = emailDomain.split(".");
            for (let i = 1; i < parts.length - 1; i++) {
              const candidate = parts.slice(i).join(".");
              if (set.has(candidate)) {
                blockedDomain = candidate;
                break;
              }
            }
          }
        } else {
          console.warn("competitor domain lookup failed:", res.status);
        }
      } catch (e) {
        console.warn("competitor domain lookup threw (fail open):", e);
      }

      if (blockedDomain) {
        console.log("Competitor email rejected:", competitorEmail, blockedDomain);
        try {
          await fetch(`${_url}/rest/v1/rpc/record_competitor_block`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              _email: competitorEmail,
              _domain: blockedDomain,
              _user_agent: req.headers.get("user-agent") ?? null,
            }),
          });
        } catch (e) {
          console.warn("record_competitor_block threw (non-blocking):", e);
        }
        // Internal alert once a single competitor domain has tried 3+ times.
        try {
          const q =
            `${_url}/rest/v1/registration_leads?select=email,competitor_block_count` +
            `&competitor_block_domain=eq.${encodeURIComponent(blockedDomain)}&limit=500`;
          const cRes = await fetch(q, { headers });
          if (cRes.ok) {
            const rows = (await cRes.json()) as { email: string; competitor_block_count: number | null }[];
            const attempts = rows.reduce((n, r) => n + (r.competitor_block_count ?? 1), 0);
            if (attempts >= 3) {
              void fetch(`${_url}/functions/v1/notify-error`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                  source: "create-customer",
                  message: `Competitor domain ${blockedDomain} has attempted registration ${attempts} times across ${rows.length} email(s).`,
                  context: {
                    domain: blockedDomain,
                    attempts,
                    uniqueEmails: rows.length,
                    sampleEmails: rows.slice(0, 10).map((r) => r.email),
                    flow: "create-customer",
                  },
                }),
              }).catch(() => {});
            }
          }
        } catch (e) {
          console.warn("competitor alert check threw (non-blocking):", e);
        }

        await writeStandaloneAuditFailure({
          email: competitorEmail,
          accountType: parseResult.data.accountType,
          step: "competitor_email",
          field: "email",
          message: `Competitor email domain blocked: ${blockedDomain}`,
          payload: parseResult.data as unknown as Record<string, unknown>,
          req,
        });
        return sendError(400, [
          "email: We don't allow direct competitors to purchase our products. Please use a different email if this is a mistake.",
        ]);
      }
    }
  }

  // ----------------------------------------------------------------
  // AU geo enforcement. If the applicant claims countryCode "AU" they
  // MUST present a valid HMAC token from verify-au-geo (IP or GPS).
  // Blocks VPN-based spoofing where a US/EU user picks AU to bypass
  // license requirements.
  // ----------------------------------------------------------------
  if (((parseResult.data as { countryCode?: string }).countryCode || "").toUpperCase() === "AU") {
    const auToken = typeof (requestBody as { auGeoToken?: unknown }).auGeoToken === "string"
      ? ((requestBody as { auGeoToken?: string }).auGeoToken as string)
      : "";
    const geoCheck = await validateAuGeoToken(auToken, parseResult.data.email);
    if (!geoCheck.ok) {
      console.log("AU geo token invalid:", geoCheck.reason, parseResult.data.email);
      await writeStandaloneAuditFailure({
        email: parseResult.data.email,
        accountType: parseResult.data.accountType,
        step: "au_geo_failed",
        field: "countryCode",
        message: `AU geo verification failed: ${geoCheck.reason ?? "unknown"}`,
        payload: parseResult.data as unknown as Record<string, unknown>,
        req,
      });
      return sendError(
        403,
        [
          "countryCode: We couldn't verify you're located in Australia. Please disable any VPN and try again, or allow location access.",
        ],
        "Forbidden",
      );
    }

    // Instagram handle is required for every registration (contact basics
    // step). We validate format here as a backstop; the client also runs a
    // live profile-existence check via verify-instagram-handle.
    {
      const handle = ((parseResult.data as { socialMediaHandle?: string | null })
        .socialMediaHandle ?? "")
        .trim()
        .replace(/^@+/, "");
      if (!handle) {
        return sendError(400, [
          "socialMediaHandle: Instagram handle is required",
        ]);
      }
      if (!/^[A-Za-z0-9._]{1,30}$/.test(handle)) {
        return sendError(400, [
          "socialMediaHandle: Enter a valid Instagram handle (letters, numbers, periods, and underscores only)",
        ]);
      }
    }
  }

  console.log("Processing customer sync for:", requestBody.data.email);

  // Kick off app_settings (auto_approval_enabled + extra_customer_tags) in
  // parallel with the Helium write - both the enrichment and activation
  // tails need it later, but we don't want to block on it sequentially.
  const appSettingsPromise = loadAppSettings();

  // First, check if customer already exists in Helium / Customer Fields.
  const existingCustomerSearch = await searchCustomerByEmail(
    requestBody.data.email,
    customerFieldsApiKey
  );

  const existingCustomer = existingCustomerSearch?.customers?.[0];
  // Mutable: may be reassigned to the Shopify customer id below when Helium
  // hasn't yet synced a Shopify-only customer (Klaviyo / storefront signup).
  // Helium's PUT /customers/{id}.json accepts a shopify_id in the URL and
  // lazily imports the record, so using shopify_id as the soft-merge target
  // works the same as using a native Helium id.
  let existingCustomerId: string | number | undefined = existingCustomer?.id;
  let existingShopifyId: number | string | undefined = existingCustomer?.shopify_id;

  const shopifyDomain = Deno.env.get("SHOPIFY_STORE_DOMAIN");
  const shopifyAdminToken = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN");

  // Fallback: if Helium search returned nothing, the customer may still
  // exist in Shopify (created by Klaviyo subscription, storefront signup,
  // or a support agent) and Helium's sync hasn't caught up. A naive POST
  // to Helium would then fail 422 "email has already been taken" because
  // Shopify enforces unique emails. Look directly in Shopify Admin so we
  // can soft-merge via shopify_id instead.
  if (!existingCustomer && shopifyDomain && shopifyAdminToken) {
    try {
      const sres = await fetch(
        `https://${shopifyDomain}/admin/api/2024-10/customers/search.json?query=${encodeURIComponent(
          `email:${requestBody.data.email}`
        )}`,
        {
          method: "GET",
          headers: {
            "X-Shopify-Access-Token": shopifyAdminToken,
            "Content-Type": "application/json",
          },
        }
      );
      if (sres.ok) {
        const sjson = await sres.json();
        const sCust = sjson?.customers?.[0];
        if (sCust?.id) {
          console.log(
            "Helium search missed but Shopify has a customer - using shopify_id for soft-merge:",
            sCust.id
          );
          existingShopifyId = sCust.id;
          // Helium accepts shopify_id in the PUT URL; this avoids the 422.
          existingCustomerId = sCust.id;
        }
      } else {
        console.warn("Shopify email-fallback search failed:", sres.status);
      }
    } catch (e) {
      console.warn("Shopify email-fallback search threw (non-blocking):", e);
    }
  }

  // If a customer already exists, decide whether to soft-merge or block.
  // We treat the presence of an "Account type:" Shopify tag as proof the
  // customer has already completed a B2B application. Anything else
  // (e.g. an order-only customer, or a Klaviyo-synced support contact)
  // is fair game to soft-merge: we PUT the new application data onto
  // the existing record instead of creating a duplicate.
  // `isGhostShell` is hoisted so the enrichment block below can append a
  // marker tag ("ghost-shell-recovered") to the Shopify customer.
  let isGhostShell = false;
  if (existingCustomerId) {
    let alreadyApplied = false;
    if (existingShopifyId && shopifyDomain && shopifyAdminToken) {
      try {
        const tagRes = await fetch(
          `https://${shopifyDomain}/admin/api/2024-10/customers/${existingShopifyId}.json`,
          {
            method: "GET",
            headers: {
              "X-Shopify-Access-Token": shopifyAdminToken,
              "Content-Type": "application/json",
            },
          }
        );
        if (tagRes.ok) {
          const json = await tagRes.json();
          const tagStr: string = json?.customer?.tags ?? "";
          const tagList = tagStr.split(",").map((t: string) => t.trim());
          alreadyApplied = tagList.some((t: string) => /^account type:/i.test(t));

          // Ghost-shell detection: third-party apps (Smile.io, Klaviyo,
          // Yotpo, Loox) auto-provision Shopify customers in state=disabled
          // when an email enters their funnel - BEFORE the person has ever
          // registered with us. These shells have:
          //   - state=disabled (no password ever set, no invite consumed)
          //   - orders_count=0 (never bought anything)
          //   - no "Account type:" tag (never completed our application)
          // Treat them as brand-new applicants: Chain C activation below
          // already targets account_activation_url on the resolved
          // shopifyCustomerId, which works on disabled shells and sets the
          // user's chosen password directly - no invite email needed when
          // auto-approval is on. We just need to surface that this happened.
          const custState: string | null = json?.customer?.state ?? null;
          const ordersCount: number = Number(json?.customer?.orders_count ?? 0);
          if (!alreadyApplied && custState === "disabled" && ordersCount === 0) {
            isGhostShell = true;
            console.log(
              "Detected ghost-shell (third-party auto-provisioned Shopify customer) - treating as brand-new applicant:",
              {
                email: requestBody.data.email,
                shopify_customer_id: existingShopifyId,
                state: custState,
                orders_count: ordersCount,
                existing_tags: tagStr.substring(0, 200),
              }
            );
          }
        } else {
          console.warn("Could not fetch Shopify tags for soft-merge check:", tagRes.status);
          // Fail OPEN - Klaviyo / storefront-synced contacts (no prior
          // application) are far more common than legit duplicate
          // applications. A transient Shopify API hiccup should not block
          // a legit recovery; we'd rather soft-merge than 409.
          alreadyApplied = false;
        }
      } catch (e) {
        console.warn("Error checking Shopify tags for soft-merge (failing open):", e);
        alreadyApplied = false;
      }
    }

    if (alreadyApplied) {
      console.log("Existing customer has prior application - blocking:", requestBody.data.email);
      await writeStandaloneAuditFailure({
        email: parseResult.data.email,
        accountType: parseResult.data.accountType,
        step: "email_already_applied",
        field: "email",
        message: "Customer already has a prior application",
        payload: parseResult.data as unknown as Record<string, unknown>,
        req,
      });
      return sendError(409, ["Customer already exists with this email address"], "Conflict", [
        {
          type: "LOGIN",
          label: "Go to Login",
          url: "/login",
        },
      ]);
    }

    console.log(
      `Existing un-applied customer found - ${isGhostShell ? "ghost-shell recovery" : "soft-merging"} onto:`,
      existingCustomerId
    );
  }

  // ----------------------------------------------------------------
  // Phone validation + uniqueness - block early, BEFORE any writes.
  // We require every applicant to have a valid, unique phone (real
  // contact channel for B2B verification). Mirrors check-phone EF.
  // ----------------------------------------------------------------
  const submittedPhone = formatPhoneNumber(
    parseResult.data.phoneCountryCode,
    parseResult.data.phoneNumber
  );
  if (submittedPhone) {
    let phoneIsValid = false;
    try {
      const parsed = parsePhoneNumberFromString(submittedPhone);
      phoneIsValid = !!parsed && parsed.isValid();
    } catch {
      phoneIsValid = false;
    }
    if (!phoneIsValid) {
      console.log("Phone failed validation:", submittedPhone);
      await writeStandaloneAuditFailure({
        email: parseResult.data.email,
        accountType: parseResult.data.accountType,
        step: "phone_invalid",
        field: "phoneNumber",
        message: `Invalid phone format: ${submittedPhone}`,
        payload: parseResult.data as unknown as Record<string, unknown>,
        req,
      });
      return sendError(
        400,
        ["Please enter a valid phone number."],
        "PHONE_INVALID"
      );
    }

    // Uniqueness: does another Shopify customer already own this E.164?
    // Skip the colliding-id when it's the soft-merge target (same email).
    const shopifyDomain = Deno.env.get("SHOPIFY_STORE_DOMAIN");
    const shopifyAdminToken = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN");
    if (shopifyDomain && shopifyAdminToken) {
      try {
        const pres = await fetch(
          `https://${shopifyDomain}/admin/api/2024-10/customers/search.json?query=${encodeURIComponent(
            `phone:${submittedPhone}`
          )}`,
          {
            method: "GET",
            headers: {
              "X-Shopify-Access-Token": shopifyAdminToken,
              "Content-Type": "application/json",
            },
          }
        );
        if (pres.ok) {
          const pjson = (await pres.json()) as {
            customers?: Array<{ id?: number }>;
          };
          const owners = pjson.customers ?? [];
          const collidingId = owners.find(
            (c) => typeof c?.id === "number" && c.id !== existingShopifyId
          )?.id;
          if (collidingId) {
            console.log("Phone already in use by another customer:", {
              phone: submittedPhone,
              collidingId,
            });
            await writeStandaloneAuditFailure({
              email: parseResult.data.email,
              accountType: parseResult.data.accountType,
              step: "phone_in_use",
              field: "phoneNumber",
              message: `Phone already linked to Shopify customer ${collidingId}`,
              payload: parseResult.data as unknown as Record<string, unknown>,
              req,
            });
            return sendError(
              409,
              ["This phone number is already linked to another account."],
              "PHONE_IN_USE"
            );
          }
        } else {
          console.warn("Phone-uniqueness search failed (non-blocking):", pres.status);
        }
      } catch (e) {
        console.warn("Phone-uniqueness search threw (non-blocking):", e);
      }
    }
  }


  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customer = objectKeysToSnake(parseResult.data) as any;

  // ----------------------------------------------------------------
  // Audit log - write a `pending` row to public.registration_submissions
  // BEFORE we hit Helium/Shopify so we can replay failures even if the
  // EF crashes mid-flight. Best-effort: never block on a log write.
  // Password is stripped from the stored payload (PII / hashed elsewhere).
  // ----------------------------------------------------------------
  const _supabaseUrl = Deno.env.get("SUPABASE_URL");
  const _serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const auditIp =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;
  const auditUa = req.headers.get("user-agent") ?? null;
  const auditErrors: Array<{ step: string; status: string; message: string; at: string }> = [];
  let auditSubmissionId: string | null = null;

  // Where this signup came from (ads, campaign, direct). Re-derived server-side.
  const attribution = normalizeAttribution(
    (requestBody as { attribution?: AttributionClientContext }).attribution ?? null
  );

  const auditPayloadForLog = (() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pw, confirm_password: _cpw, ...rest } = customer ?? {};
    return rest;
  })();

  const recordAuditFailure = (step: string, message: string) => {
    auditErrors.push({ step, status: "error", message, at: new Date().toISOString() });
  };

  const updateAuditRow = async (patch: Record<string, unknown>) => {
    if (!auditSubmissionId || !_supabaseUrl || !_serviceRoleKey) return;
    try {
      const r = await fetch(
        `${_supabaseUrl}/rest/v1/registration_submissions?id=eq.${auditSubmissionId}`,
        {
          method: "PATCH",
          headers: {
            apikey: _serviceRoleKey,
            Authorization: `Bearer ${_serviceRoleKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify(patch),
        }
      );
      if (!r.ok) {
        console.warn("Audit log update failed (non-blocking):", r.status, await r.text());
      }
    } catch (e) {
      console.warn("Audit log update threw (non-blocking):", e);
    }
  };

  if (_supabaseUrl && _serviceRoleKey) {
    try {
      const insRes = await fetch(`${_supabaseUrl}/rest/v1/registration_submissions`, {
        method: "POST",
        headers: {
          apikey: _serviceRoleKey,
          Authorization: `Bearer ${_serviceRoleKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          email: customer.email,
          account_type: customer.account_type ?? null,
          status: "pending",
          payload: auditPayloadForLog,
          ip_address: auditIp,
          user_agent: auditUa,
          attribution,
        }),
      });
      if (insRes.ok) {
        const rows = (await insRes.json()) as Array<{ id?: string }>;
        auditSubmissionId = rows?.[0]?.id ?? null;
      } else {
        console.warn("Audit log insert failed (non-blocking):", insRes.status, await insRes.text());
      }
    } catch (e) {
      console.warn("Audit log insert threw (non-blocking):", e);
    }
  }

  // The business-location step is disabled by default, so `country_code` may
  // arrive empty or as the schema default. Derive it from the phone country
  // dial code so the Shopify default address still carries a country.
  const dialToCountry: Record<string, string> = {
    "+1": "US",
    "+61": "AU",
    "+64": "NZ",
    "+44": "GB",
  };
  // Canadian NANP area codes. +1 alone can't distinguish US from CA, so use
  // the area code to split them before falling back to US.
  const CA_AREA_CODES = new Set([
    "204", "226", "236", "249", "250", "263", "289", "306", "343", "354", "365", "367", "368",
    "382", "403", "416", "418", "428", "431", "437", "438", "450", "468", "474", "506", "514",
    "519", "548", "579", "581", "584", "587", "604", "613", "639", "647", "672", "683", "705",
    "709", "742", "753", "778", "780", "782", "807", "819", "825", "867", "873", "879", "902",
    "905",
  ]);
  const dial = (customer.phone_country_code ?? "").toString().trim();
  const localDigits = (customer.phone_number ?? "").toString().replace(/\D/g, "");
  let derivedCountry = dialToCountry[dial] ?? undefined;
  if (dial === "+1") {
    const areaCode = localDigits.length === 11 && localDigits.startsWith("1")
      ? localDigits.slice(1, 4)
      : localDigits.slice(0, 3);
    if (CA_AREA_CODES.has(areaCode)) derivedCountry = "CA";
  }
  const resolvedCountryCode =
    (customer.country_code ?? "").toString().trim().toUpperCase() || derivedCountry || "US";
  customer.country_code = resolvedCountryCode;

  // AU landline area codes map to a state. Mobiles (04x) are nationwide and
  // carry no state signal, so those stay blank for manual review.
  if (resolvedCountryCode === "AU" && !(customer.province_code ?? "").toString().trim()) {
    const auArea = localDigits.replace(/^61/, "").replace(/^0/, "").slice(0, 1);
    const auStateMap: Record<string, string> = { "2": "NSW", "3": "VIC", "7": "QLD", "8": "SA" };
    const auState = auStateMap[auArea];
    if (auState) customer.province_code = auState;
  }




  // Handle tax exempt files (common to all account types)
  const taxExemptFiles = Array.isArray(customer.tax_exempt_file)
    ? customer.tax_exempt_file || []
    : [customer.tax_exempt_file];
  const parseTaxExemptFiles = taxExemptFiles
    .filter(Boolean)
    .map((item: string | { url?: string }) => {
      if (typeof item === "string") return item;
      return item?.url;
    }) as string[];

  // Create base customer input with common fields
  const customerCreateInput: CustomerCreateInput = {
    ...defaultCustomerCreateInput,
    account_type: customer.account_type,
    first_name: customer.first_name,
    last_name: customer.last_name,
    preferred_name: customer.preferred_name,
    email: customer.email,
    default_address: {},
    tax_exempt: customer.tax_exempt || false,
    tax_exempt_file: parseTaxExemptFiles?.[0],
    birthday_month: customer.birthday_month ? parseInt(customer.birthday_month) : undefined,
    birthday_day: customer.birthday_day ? parseInt(customer.birthday_day) : undefined,
    wholesale_agreed: customer.wholesale_agreed ?? true,
    accepts_marketing: customer.accepts_marketing,
    accepts_sms_marketing: customer.accepts_sms_marketing,
    subscribe_order_updates: customer.subscribe_order_updates,
    social_media_handle: customer.social_media_handle,
    referral_source: customer.referral_source,
  };

  // Handle account-type specific fields with type narrowing
  if (customer.account_type === "professional") {
    customerCreateInput.business_operation_type = customer.business_operation_type;

    customerCreateInput.default_address = {
      company: customer.business_name,
      address1: customer.business_address,
      address2: customer.suite_number,
      city: customer.city,
      province_code: customer.province_code,
      zip: customer.zip_code,
      country_code: customer.country_code,
      phone: formatPhoneNumber(customer.phone_country_code, customer.phone_number),
    };

    customerCreateInput.license_number = customer.license_number;

    const licenseFiles = Array.isArray(customer.license_proof_files)
      ? customer.license_proof_files || []
      : [customer.license_proof_files];
    const files = licenseFiles.filter(Boolean).map((item: string | { url?: string }) => {
      if (typeof item === "string") return item;
      return item?.url;
    });
    customerCreateInput.proof_file_1 = files?.[0];
    customerCreateInput.proof_file_2 = files?.[1];
    customerCreateInput.proof_file_3 = files?.[2];
  } else if (customer.account_type === "salon") {
    customerCreateInput.default_address = {
      company: customer.business_name,
      address1: customer.business_address,
      address2: customer.suite_number,
      city: customer.city,
      province_code: customer.province_code,
      zip: customer.zip_code,
      country_code: customer.country_code,
      phone: formatPhoneNumber(customer.phone_country_code, customer.phone_number),
    };

    customerCreateInput.salon_size = customer.salon_size;
    customerCreateInput.salon_structure = customer.salon_structure;
    customerCreateInput.license_number = customer.license_number;

    const licenseFiles = Array.isArray(customer.license_proof_files)
      ? customer.license_proof_files || []
      : [customer.license_proof_files];
    const files = licenseFiles.filter(Boolean).map((item: string | { url?: string }) => {
      if (typeof item === "string") return item;
      return item?.url;
    });
    customerCreateInput.proof_file_1 = files?.[0];
    customerCreateInput.proof_file_2 = files?.[1];
    customerCreateInput.proof_file_3 = files?.[2];
  } else if (customer.account_type === "student") {
    customerCreateInput.default_address = {
      country_code: customer.country_code,
      phone: formatPhoneNumber(customer.phone_country_code, customer.phone_number),
    };


    customerCreateInput.school_name = customer.school_name;
    customerCreateInput.school_state = customer.school_state;

    const enrollmentFiles = Array.isArray(customer.enrollment_proof_files)
      ? customer.enrollment_proof_files || []
      : [customer.enrollment_proof_files];
    const files = enrollmentFiles.filter(Boolean).map((item: string | { url?: string }) => {
      if (typeof item === "string") return item;
      return item?.url;
    });
    customerCreateInput.proof_file_1 = files?.[0];
    customerCreateInput.proof_file_2 = files?.[1];
    customerCreateInput.proof_file_3 = files?.[2];
  }

  // Prepare the Customer Fields API request
  const customerFieldsRequest: CustomerFieldsRequest = {
    form_id: customerFieldsFormId,
    customer: customerCreateInput,
  };

  // Prepare headers for the Customer Fields API request
  const apiHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${customerFieldsApiKey}`,
  };

  try {
    const isSoftMerge = !!existingCustomerId;
    const targetUrl = isSoftMerge
      ? `${customerFieldsApiUrl}/${existingCustomerId}.json`
      : customerFieldsApiUrl;
    const targetMethod = isSoftMerge ? "PUT" : "POST";
    console.log(
      `Sending ${targetMethod} to Customer Fields API (${isSoftMerge ? "soft-merge" : "create"})...`
    );
    const apiResponse = await fetch(targetUrl, {
      method: targetMethod,
      headers: apiHeaders,
      body: JSON.stringify(customerFieldsRequest),
    });

    const responseText = await apiResponse.text();

    if (!apiResponse.ok) {
      // Log full upstream detail server-side only; never echo raw API
      // response back to the client (may leak internals/stack traces).
      console.error("Customer Fields API request failed:", apiResponse.status, responseText);
      recordAuditFailure(
        "helium_create",
        `HTTP ${apiResponse.status}: ${responseText.substring(0, 500)}`
      );
      await updateAuditRow({ status: "failed", error_log: auditErrors });

      // Translate known upstream validation errors into specific client codes
      // so the SPA can highlight the right field. The pre-checks earlier
      // catch most of these, but if the pre-check is skipped (env missing)
      // or races with another signup, Helium/Shopify still enforce them.
      if (apiResponse.status === 422) {
        const lower = responseText.toLowerCase();
        if (lower.includes('"phone"') && lower.includes("already")) {
          return sendError(
            409,
            ["This phone number is already linked to another account."],
            "PHONE_IN_USE"
          );
        }
        if (lower.includes('"email"') && lower.includes("already")) {
          return sendError(409, ["Customer already exists with this email address"], "Conflict", [
            { type: "LOGIN", label: "Go to Login", url: "/login" },
          ]);
        }
      }

      const safeStatus = apiResponse.status >= 400 && apiResponse.status < 500 ? 400 : 502;
      return sendError(safeStatus, [
        "We couldn't complete your registration right now. Please try again in a moment.",
      ]);
    }



    let customerFieldsData: CustomerFieldsResponse;
    try {
      customerFieldsData = JSON.parse(responseText);
    } catch {
      console.error("Failed to parse Customer Fields API response:", responseText);
      recordAuditFailure("helium_parse", responseText.substring(0, 500));
      await updateAuditRow({ status: "failed", error_log: auditErrors });
      return sendError(502, ["Invalid response from Customer Fields API"]);
    }

    console.log("Customer Fields API request successful:", customerFieldsData.customer.id);

    // Audit: Helium write succeeded.
    await updateAuditRow({
      status: "helium_ok",
      helium_customer_id: customerFieldsData.customer.id,
      shopify_customer_id: customerFieldsData.customer.shopify_id ?? null,
    });

    // Tag Shopify customer with "Preferred method: X" for each selected method,
    // plus any admin-configured extra tags from app_settings. Fire-and-forget  - 
    // failures here must not block account creation.
    let shopifyCustomerId: number | undefined = customerFieldsData.customer.shopify_id;
    const preferredMethods = (parseResult.data as { preferredMethods?: string[] }).preferredMethods;

    const shopifyDomain = Deno.env.get("SHOPIFY_STORE_DOMAIN");
    const shopifyAdminToken = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN");

    // Fallback: if Helium didn't return a shopify_id (race / async link),
    // resolve it via Shopify Admin search by email so we still get tags and
    // native fields written.
    //
    // Retry strategy: Helium → Shopify sync is async. A miss on the first
    // search often clears on the second attempt 1-2s later. We try up to
    // 3 times with exponential backoff (0ms, 1.2s, 2.5s) before giving up
    // and falling through to the `shopify_enrichment_skipped` audit.
    if (!shopifyCustomerId && shopifyDomain && shopifyAdminToken) {
      const delays = [0, 1200, 2500];
      for (let attempt = 0; attempt < delays.length; attempt++) {
        if (delays[attempt] > 0) {
          await new Promise((r) => setTimeout(r, delays[attempt]));
        }
        try {
          const searchRes = await fetch(
            `https://${shopifyDomain}/admin/api/2024-10/customers/search.json?query=${encodeURIComponent(`email:${customer.email}`)}`,
            {
              method: "GET",
              headers: {
                "X-Shopify-Access-Token": shopifyAdminToken,
                "Content-Type": "application/json",
              },
            }
          );
          if (searchRes.ok) {
            const sjson = await searchRes.json();
            const sid = sjson?.customers?.[0]?.id;
            if (typeof sid === "number") {
              shopifyCustomerId = sid;
              console.log(
                "Resolved shopify_id via email fallback:",
                sid,
                "(attempt " + (attempt + 1) + "/" + delays.length + ")"
              );
              break;
            }
            console.log(
              "Shopify email-fallback miss (attempt " + (attempt + 1) + "/" + delays.length + "), retrying..."
            );
          } else {
            console.warn(
              "Shopify email-fallback search failed (attempt " + (attempt + 1) + "/" + delays.length + "):",
              searchRes.status
            );
          }
        } catch (e) {
          console.warn(
            "Error in Shopify email-fallback search (attempt " + (attempt + 1) + "/" + delays.length + ", non-blocking):",
            e
          );
        }
      }
    }


    // Admin-configured extra tags come from the shared app_settings fetch
    // (kicked off in parallel with the Helium write at the top of the
    // handler). By the time we get here it's already resolved or close to.
    const { extraCustomerTags: extraAdminTags } = await appSettingsPromise;

    const preferredMethodTags = (preferredMethods ?? []).map((m) => `Preferred method: ${m}`);

    const accountTypeLabelMap: Record<string, string> = {
      professional: "Licensed stylist",
      salon: "Salon owner or manager",
      student: "Cosmetology student or apprentice",
    };
    const accountTypeTags: string[] = [];
    if (customer.account_type) {
      const label = accountTypeLabelMap[customer.account_type] ?? customer.account_type;
      accountTypeTags.push(`Account type: ${label}`);
    }

    const taxExemptFlag = customer.tax_exempt === true;
    if (taxExemptFlag) {
      accountTypeTags.push("Tax exempt");
    }

    const ghostShellTags = isGhostShell ? ["ghost-shell-recovered"] : [];

    // International tags: country + qualification (+ NSW jurisdiction marker).
    // Inline qualification->tag map (edge functions can't import from src/).
    const QUALIFICATION_TAG_MAP: Record<string, string> = {
      // AU (training.gov.au SHB package)
      cert3: "qualification-cert3",
      cert3_barbering: "qualification-cert3-barbering",
      cert4: "qualification-cert4",
      // UK (Ofqual RQF + DfE)
      diploma2: "qualification-diploma-l2",
      diploma3: "qualification-diploma-l3",
      svq: "qualification-svq",
      apprentice_std: "qualification-apprentice-standard",
      srh: "qualification-srh",
      // Legacy UK values (kept for backwards compat with saved sessions)
      tlevel: "qualification-tlevel",
      nvq2: "qualification-diploma-l2",
      nvq3: "qualification-diploma-l3",
      // IE (QQI / SOLAS)
      qqi5: "qualification-qqi5",
      nha: "qualification-nha",
      // Legacy IE value
      qqi6: "qualification-nha",
      // NZ (NZQA)
      nzcert3: "qualification-nzcert3",
      nzcert4: "qualification-nzcert4",
      // ZA (QCTO / SAQA / C&G)
      qcto_hairdresser: "qualification-qcto-hairdresser",
      nc_hairdressing: "qualification-nc-hairdressing",
      cg_diploma: "qualification-cg-diploma",
      // Shared
      apprentice: "qualification-apprentice",
    };
    const QUALIFICATION_LABEL_MAP: Record<string, string> = {
      cert3: "Certificate III in Hairdressing (SHB30416)",
      cert3_barbering: "Certificate III in Barbering (SHB30516)",
      cert4: "Certificate IV in Hairdressing (SHB40216)",
      diploma2: "Level 2 NVQ Diploma / Diploma in Hairdressing (RQF)",
      diploma3: "Level 3 NVQ Diploma / Diploma in Hairdressing (RQF)",
      svq: "SVQ in Hairdressing (Scotland, SCQF Level 6, GV3V 23)",
      apprentice_std: "Diploma for Hair Professionals (Level 2 apprenticeship, ST0213)",
      srh: "Hair Council State Registration (voluntary)",
      tlevel: "T Level in Hairdressing, Barbering & Beauty (cancelled UK route)",
      nvq2: "Legacy Level 2 NVQ Diploma in Hairdressing",
      nvq3: "Legacy Level 3 NVQ Diploma in Hairdressing",
      qqi5: "QQI Level 5 in Hairdressing (5M3351)",
      nha: "QQI Level 6 Advanced Certificate in Hairdressing (National Hairdressing Apprenticeship, 6M22525)",
      qqi6: "Legacy QQI Level 6 Hairdressing selection",
      nzcert3: "NZ Certificate in Hairdressing - Salon Support (Level 3, NZQA 2411)",
      nzcert4: "NZ Certificate in Hairdressing - Professional Stylist (Level 4, NZQA 2413)",
      qcto_hairdresser: "QCTO Occupational Certificate: Hairdresser (NQF 4, SAQA 102497)",
      nc_hairdressing: "Legacy SAQA hairdressing certificate (NQF 3/4)",
      cg_diploma: "City & Guilds International Diploma (non-SAQA)",
      apprentice: "Apprentice / in training",
    };
    const COUNTRY_TAG_MAP: Record<string, string> = {
      US: "country-us",
      CA: "country-ca",
      AU: "country-au",
      UK: "country-uk",
      GB: "country-uk",
      IE: "country-ie",
      NZ: "country-nz",
      ZA: "country-za",
    };
    const internationalTags: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cust = customer as any;
    const custCountry = (cust.country_code ?? "").toString().toUpperCase();
    if (custCountry && COUNTRY_TAG_MAP[custCountry]) {
      internationalTags.push(COUNTRY_TAG_MAP[custCountry]);
    }
    const qual = cust.qualification;
    if (qual && QUALIFICATION_TAG_MAP[qual]) {
      internationalTags.push(QUALIFICATION_TAG_MAP[qual]);
    }
    // NSW: no separate licence number is issued by NSW - the Hairdressers
    // Act 2003 requires Cert III, which is already captured via
    // qualification tags. Tag NSW residents with a jurisdiction marker only.
    if (custCountry === "AU" && (cust.province_code ?? "").toString().toUpperCase() === "NSW") {
      internationalTags.push("au-nsw");
    }

    // Attribution tags so Shopify segments can filter paid-ad signups without
    // parsing the customer note. Campaign tag is added only when tagged.
    const attributionTags: string[] = [];
    if (attribution.channel !== "direct") {
      attributionTags.push(`source-${attribution.channel.replace(/_/g, "-")}`);
    }
    if (attribution.isPaidAds) attributionTags.push("paid-ads");
    if (attribution.utmCampaign) {
      const campaignTag = attribution.utmCampaign
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40);
      if (campaignTag) attributionTags.push(`campaign-${campaignTag}`);
    }

    const newTags = [...accountTypeTags, ...preferredMethodTags, ...extraAdminTags, ...ghostShellTags, ...internationalTags, ...attributionTags];

    // Marketing consent - email and SMS are tracked separately for TCPA / GDPR
    // compliance. Each channel needs its own explicit opt-in checkbox in the UI;
    // we never derive one from the other.
    const acceptsEmailMarketingFlag = customer.accepts_marketing === true;
    const acceptsSmsMarketingFlag = customer.accepts_sms_marketing === true;
    const customerPhone = formatPhoneNumber(
      customer.phone_country_code,
      customer.phone_number
    );

    // Server-side phone validation (libphonenumber). Shopify uses
    // libphonenumber too and rejects the whole PUT on bad NANP / impossible
    // numbers, so skip sending phone when it's clearly invalid.
    let phoneValid = false;
    if (customerPhone) {
      try {
        const parsed = parsePhoneNumberFromString(customerPhone);
        phoneValid = !!parsed && parsed.isValid();
        if (!phoneValid) {
          console.warn("Phone failed libphonenumber validation; will not send to Shopify:", customerPhone);
        }
      } catch (e) {
        console.warn("libphonenumber threw; treating phone as invalid:", e);
      }
    }

    // Phone-collision check happens later (needs shopifyDomain/token + the
    // current shopifyCustomerId). We optimistically allow phone now and may
    // flip this to false if Shopify returns a different customer for the
    // same E.164 phone.
    let phoneSafeToSend = phoneValid;
    let canCollectSms = acceptsSmsMarketingFlag && phoneSafeToSend;

    const consentTimestamp = new Date().toISOString();

    // Build a human-readable note summarizing the application - lands in
    // the native Shopify customer `note` field so support can see context
    // without opening Helium.
    const noteLines: string[] = [];
    if (customer.account_type) {
      const label = accountTypeLabelMap[customer.account_type] ?? customer.account_type;
      noteLines.push(`Account type: ${label}`);
    }
    if (customer.business_name) noteLines.push(`Business: ${customer.business_name}`);
    if (customer.license_number) noteLines.push(`License #: ${customer.license_number}`);
    if (customer.qualification) {
      noteLines.push(`Qualification: ${QUALIFICATION_LABEL_MAP[customer.qualification] ?? customer.qualification}`);
    }
    if (customer.salon_size) noteLines.push(`Salon size: ${customer.salon_size}`);
    if (customer.salon_structure) noteLines.push(`Salon structure: ${customer.salon_structure}`);
    if (customer.school_name) noteLines.push(`School: ${customer.school_name}`);
    if (customer.school_state) noteLines.push(`School state: ${customer.school_state}`);
    if (customer.referral_source) noteLines.push(`Referral: ${customer.referral_source}`);
    if (taxExemptFlag) {
      noteLines.push("Tax exempt: yes (resale certificate claimed)");
      if (parseTaxExemptFiles?.[0]) {
        noteLines.push(`Tax exempt document: ${parseTaxExemptFiles[0]}`);
      } else {
        noteLines.push("Tax exempt document: none uploaded");
      }
    }
    if (customer.social_media_handle) noteLines.push(`Social: ${customer.social_media_handle}`);
    noteLines.push(`Came from: ${attributionSummary(attribution)}`);
    if (attribution.landingUrl) noteLines.push(`Landing page: ${attribution.landingUrl}`);
    const applicationNote = noteLines.length
      ? `Application submitted ${consentTimestamp}\n${noteLines.join("\n")}`
      : "";

    // Native fields we always want mirrored onto the Shopify customer record,
    // so they're populated regardless of Helium field-mapping configuration.
    // Note: country_code is now always resolved (derived from the phone dial
    // code when the address step is off), so it does not count as a real
    // address signal here.
    const hasNativeAddress = !!(
      customer.business_address ||
      customer.city ||
      customer.province_code ||
      customer.zip_code
    );


    const needsShopifyUpdate =
      !!shopifyCustomerId &&
      (newTags.length > 0 ||
        taxExemptFlag ||
        acceptsEmailMarketingFlag ||
        canCollectSms ||
        !!customer.first_name ||
        !!customer.last_name ||
        !!customerPhone ||
        !!applicationNote ||
        hasNativeAddress);


    // Defensive log: catch the case where a soft-merge produced no
    // shopify_id (or no tags were generated) and the whole Shopify
    // enrichment block - including tags - gets skipped silently.
    if (!needsShopifyUpdate) {
      const skipReason = !shopifyCustomerId
        ? "no shopify_customer_id resolved (Helium PUT returned none AND email-fallback failed)"
        : "no enrichment fields to write";
      console.warn("Skipping Shopify enrichment:", {
        skipReason,
        isSoftMerge: !!existingCustomerId,
        shopifyCustomerId: shopifyCustomerId ?? null,
        newTagsCount: newTags.length,
        email: customer.email,
      });
      recordAuditFailure(
        "shopify_enrichment_skipped",
        `${skipReason} (soft-merge=${!!existingCustomerId}, newTags=${newTags.length})`
      );
    }

    // ----------------------------------------------------------------
    // Post-Helium tail: three independent chains that previously ran
    // strictly serially (~600-1200ms wall time). They share no mutable
    // state, so we run them concurrently and Promise.allSettled the
    // group - one failure can't poison the others, and `recordAuditFailure`
    // is already idempotent.
    //
    //   A) Shopify enrichment  - GET customer → PUT merged update
    //   B) Marketing consent   - POST marketing_consent_log
    //   C) Auto-approval       - POST activation URL → POST password
    //                           (with soft-merge Storefront customerRecover fallback)
    // ----------------------------------------------------------------
    const tailTasks: Promise<unknown>[] = [];
    // null means password activation was not required for this submission.
    // When required, this must become true before we return success.
    let accountPasswordVerified: boolean | null = null;

    // ---- Chain A: Shopify enrichment -------------------------------
    if (needsShopifyUpdate) {
      tailTasks.push((async () => {
      if (shopifyDomain && shopifyAdminToken) {
        try {
          // Fetch existing customer to merge tags and detect whether a
          // default_address already exists (avoid clobbering it).
          let existingTags: string[] = [];
          let existingHasDefaultAddress = false;
          const getRes = await shopifyFetch(
            `https://${shopifyDomain}/admin/api/2024-10/customers/${shopifyCustomerId}.json`,
            {
              method: "GET",
              headers: {
                "X-Shopify-Access-Token": shopifyAdminToken,
                "Content-Type": "application/json",
              },
            }
          );
          if (getRes.ok) {
            const existing = await getRes.json();
            const tagStr: string = existing?.customer?.tags ?? "";
            existingTags = tagStr
              .split(",")
              .map((t: string) => t.trim())
              .filter(Boolean);
            existingHasDefaultAddress = !!existing?.customer?.default_address?.address1;
          } else {
            console.warn("Could not fetch existing Shopify customer:", getRes.status);
          }

          // Phone validity + uniqueness are enforced earlier (before any
          // writes), so by the time we get here phoneSafeToSend reflects
          // libphonenumber validity only. The early check returns 409
          // PHONE_IN_USE if a different customer owns the number.


          const mergedTags = Array.from(new Set([...existingTags, ...newTags]));

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const customerUpdate: Record<string, any> = { id: shopifyCustomerId };

          // Native identity fields - always mirror so the Shopify record
          // isn't blank regardless of Helium field-mapping config.
          if (customer.first_name) customerUpdate.first_name = customer.first_name;
          if (customer.last_name) customerUpdate.last_name = customer.last_name;
          if (phoneSafeToSend && customerPhone) customerUpdate.phone = customerPhone;
          if (applicationNote) customerUpdate.note = applicationNote;


          if (newTags.length > 0) customerUpdate.tags = mergedTags.join(", ");
          if (taxExemptFlag) customerUpdate.tax_exempt = true;

          // Native default address - only set if the customer doesn't
          // already have one (don't overwrite a customer-edited address).
          if (hasNativeAddress && !existingHasDefaultAddress) {
            customerUpdate.addresses = [
              {
                first_name: customer.first_name,
                last_name: customer.last_name,
                company: customer.business_name,
                address1: customer.business_address,
                address2: customer.suite_number,
                city: customer.city,
                province_code: customer.province_code,
                zip: customer.zip_code,
                country_code: customer.country_code,
                phone: phoneSafeToSend ? customerPhone : undefined,

                default: true,
              },
            ];
          }

          // Email marketing - independent of SMS
          if (acceptsEmailMarketingFlag) {
            customerUpdate.email_marketing_consent = {
              state: "subscribed",
              opt_in_level: "single_opt_in",
              consent_updated_at: consentTimestamp,
            };
          }

          // SMS marketing - requires its own opt-in AND a valid E.164 phone.
          if (canCollectSms) {
            customerUpdate.phone = customerPhone;
            customerUpdate.sms_marketing_consent = {
              state: "subscribed",
              opt_in_level: "single_opt_in",
              consent_updated_at: consentTimestamp,
              consent_collected_from: "OTHER",
            };
          }

          const putCustomer = async (payload: Record<string, unknown>) =>
            shopifyFetch(
              `https://${shopifyDomain}/admin/api/2024-10/customers/${shopifyCustomerId}.json`,
              {
                method: "PUT",
                headers: {
                  "X-Shopify-Access-Token": shopifyAdminToken,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ customer: payload }),
              }
            );

          let updRes = await putCustomer(customerUpdate);
          let updResBodyText = "";

          if (!updRes.ok) {
            updResBodyText = await updRes.text();
            // Shopify rejects the whole PUT if any single field is invalid
            // (commonly `phone` - bad NANP area code, duplicate, etc.). Retry
            // without phone/SMS so tags/note/tax_exempt/address still land.
            const phoneRejected =
              updRes.status === 422 && /"phone"/i.test(updResBodyText);
            if (phoneRejected && ("phone" in customerUpdate || "sms_marketing_consent" in customerUpdate)) {
              console.warn(
                "Shopify rejected phone on customer update; retrying without phone/SMS:",
                updResBodyText
              );
              const { phone: _p, sms_marketing_consent: _s, ...retryPayload } = customerUpdate;
              updRes = await putCustomer(retryPayload);
              if (!updRes.ok) {
                updResBodyText = await updRes.text();
              }
            }
          }

          if (!updRes.ok) {
            console.warn("Failed to update Shopify customer:", updRes.status, updResBodyText);
            recordAuditFailure(
              "shopify_customer_update",
              `HTTP ${updRes.status}: ${updResBodyText.substring(0, 500)}`
            );
          } else {
            console.log("Updated Shopify customer:", {
              shopifyCustomerId,
              fields: Object.keys(customerUpdate).filter((k) => k !== "id"),
              tags: newTags,
            });
          }

        } catch (updErr) {
          console.warn("Error updating Shopify customer (non-blocking):", updErr);
          recordAuditFailure(
            "shopify_customer_update",
            updErr instanceof Error ? updErr.message : String(updErr)
          );
        }
      } else {
        console.warn("SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN not set; skipping update");
      }
      })());
    }


    // ---- Chain B: Marketing consent log (TCPA / GDPR) --------------
    // Writes one row per channel the user opted into so we can later
    // prove (a) they ticked the box, (b) when, (c) from what IP/UA,
    // (d) what disclosure text they saw. Best-effort.
    tailTasks.push((async () => {
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

      if (supabaseUrl && serviceRoleKey && (acceptsEmailMarketingFlag || canCollectSms)) {
        const ipAddress =
          req.headers.get("cf-connecting-ip") ??
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          null;
        const userAgent = req.headers.get("user-agent") ?? null;
        const sourceUrl = req.headers.get("origin") ?? req.headers.get("referer") ?? null;

        const EMAIL_DISCLOSURE =
          "Email me about promotions, new products & deals - Marketing emails from Drop Dead Extensions. Unsubscribe anytime.";
        const SMS_DISCLOSURE =
          "By checking this box, you agree to receive recurring automated marketing text messages (cart reminders, new drops, restocks) from Drop Dead Extensions at the phone number you provided. Consent is not a condition of purchase. Msg frequency varies. Msg & data rates may apply. Reply STOP to cancel, HELP for help.";

        const consentRows: Array<Record<string, unknown>> = [];
        if (acceptsEmailMarketingFlag) {
          consentRows.push({
            shopify_customer_id: shopifyCustomerId ? String(shopifyCustomerId) : null,
            email: customer.email ?? null,
            phone_e164: null,
            channel: "email",
            granted: true,
            opt_in_level: "single_opt_in",
            disclosure_text: EMAIL_DISCLOSURE,
            source_url: sourceUrl,
            ip_address: ipAddress,
            user_agent: userAgent,
          });
        }
        if (canCollectSms) {
          consentRows.push({
            shopify_customer_id: shopifyCustomerId ? String(shopifyCustomerId) : null,
            email: customer.email ?? null,
            phone_e164: customerPhone,
            channel: "sms",
            granted: true,
            opt_in_level: "single_opt_in",
            disclosure_text: SMS_DISCLOSURE,
            source_url: sourceUrl,
            ip_address: ipAddress,
            user_agent: userAgent,
          });
        }

        if (consentRows.length > 0) {
          const logRes = await fetch(
            `${supabaseUrl}/rest/v1/marketing_consent_log`,
            {
              method: "POST",
              headers: {
                apikey: serviceRoleKey,
                Authorization: `Bearer ${serviceRoleKey}`,
                "Content-Type": "application/json",
                Prefer: "return=minimal",
              },
              body: JSON.stringify(consentRows),
            }
          );
          if (!logRes.ok) {
            console.warn(
              "Failed to write marketing_consent_log:",
              logRes.status,
              await logRes.text()
            );
          } else {
            console.log("Logged marketing consent:", {
              channels: consentRows.map((r) => r.channel),
            });
          }
        }
      }
    } catch (logErr) {
      console.warn("Error writing marketing consent log (non-blocking):", logErr);
    }
    })());



    // ---- Chain C: Auto-approval Shopify activation -----------------
    // If a password was sent AND auto_approval_enabled = true, activate
    // the Shopify customer server-side so they can sign in immediately.
    // Without this they stay in "invited" state. Every failure mode is
    // appended to the audit log so admin can see exactly what happened
    // (otherwise the user gets a "success" screen but ends up stranded
    // in Shopify's "invited" state with no password and no recovery).
    const submittedPassword = (parseResult.data as { password?: string }).password;
    if (submittedPassword && shopifyCustomerId) {
      tailTasks.push((async () => {
      try {
        const { autoApprovalEnabled } = await appSettingsPromise;

        if (autoApprovalEnabled) {
          accountPasswordVerified = false;
          if (shopifyDomain && shopifyAdminToken) {
            // Step 1: ask Shopify Admin API for the activation URL.
            const urlRes = await shopifyFetch(
              `https://${shopifyDomain}/admin/api/2024-10/customers/${shopifyCustomerId}/account_activation_url.json`,
              {
                method: "POST",
                headers: {
                  "X-Shopify-Access-Token": shopifyAdminToken,
                  "Content-Type": "application/json",
                },
              }
            );

            let activated = false;
            let activationFailureDetail = "";

            if (urlRes.ok) {
              const json = await urlRes.json();
              const activationUrl: string | undefined = json?.account_activation_url;
              if (activationUrl) {
                const activateRes = await fetch(activationUrl, {
                  method: "POST",
                  headers: { "Content-Type": "application/x-www-form-urlencoded" },
                  body: new URLSearchParams({
                    "customer[password]": submittedPassword,
                    "customer[password_confirmation]": submittedPassword,
                  }).toString(),
                  redirect: "manual",
                });

                if (activateRes.status === 302 || activateRes.status === 200) {
                  // Shopify can return 302/200 even when the password was not
                  // persisted. Never treat the response status as proof. Read
                  // the customer back, then use an Admin password write as the
                  // deterministic fallback and verify the final state.
                  let verifiedState = "";
                  const verifyCustomerState = async (): Promise<string> => {
                    const verifyRes = await shopifyFetch(
                      `https://${shopifyDomain}/admin/api/2024-10/customers/${shopifyCustomerId}.json?fields=id,state`,
                      {
                        method: "GET",
                        headers: {
                          "X-Shopify-Access-Token": shopifyAdminToken,
                          "Content-Type": "application/json",
                        },
                      }
                    );
                    if (!verifyRes.ok) return "";
                    const verifyJson = await verifyRes.json();
                    return verifyJson?.customer?.state ?? "";
                  };

                  const verifySubmittedCredentials = async (): Promise<boolean> => {
                    const backendUrl = Deno.env.get("SUPABASE_URL");
                    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
                    if (!backendUrl || !serviceKey) return false;
                    const loginRes = await fetch(`${backendUrl}/functions/v1/customer-login`, {
                      method: "POST",
                      headers: {
                        Authorization: `Bearer ${serviceKey}`,
                        apikey: serviceKey,
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({ email: customer.email, password: submittedPassword }),
                    });
                    if (!loginRes.ok) return false;
                    const loginJson = await loginRes.json();
                    return loginJson?.success === true && !!loginJson?.data?.accessToken;
                  };

                  verifiedState = await verifyCustomerState();
                  let credentialsVerified =
                    verifiedState === "enabled" && await verifySubmittedCredentials();
                  if (!credentialsVerified) {
                    const passwordWriteRes = await shopifyFetch(
                      `https://${shopifyDomain}/admin/api/2024-10/customers/${shopifyCustomerId}.json`,
                      {
                        method: "PUT",
                        headers: {
                          "X-Shopify-Access-Token": shopifyAdminToken,
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          customer: {
                            id: Number(shopifyCustomerId),
                            password: submittedPassword,
                            password_confirmation: submittedPassword,
                            send_email_welcome: false,
                          },
                        }),
                      }
                    );

                    if (!passwordWriteRes.ok) {
                      const writeText = await passwordWriteRes.text();
                      activationFailureDetail = `Admin password write returned ${passwordWriteRes.status}: ${writeText.substring(0, 200)}`;
                      recordAuditFailure("auto_activation", activationFailureDetail);
                    } else {
                      verifiedState = await verifyCustomerState();
                      credentialsVerified =
                        verifiedState === "enabled" && await verifySubmittedCredentials();
                    }
                  }

                  if (verifiedState === "enabled" && credentialsVerified) {
                    console.log("Verified Shopify customer password by storefront sign-in:", shopifyCustomerId);
                    activated = true;
                    accountPasswordVerified = true;
                  } else {
                    activationFailureDetail = `Password activation could not be verified by storefront sign-in; customer state=${verifiedState || "unknown"}`;
                    recordAuditFailure("auto_activation", activationFailureDetail);
                  }
                } else {
                  const txt = await activateRes.text();
                  activationFailureDetail = `activation POST returned ${activateRes.status}: ${txt.substring(0, 200)}`;
                  recordAuditFailure("auto_activation", activationFailureDetail);
                }
              } else {
                activationFailureDetail = "no account_activation_url returned by Shopify Admin API";
                recordAuditFailure("auto_activation", activationFailureDetail);
              }
            } else {
              const txt = await urlRes.text();
              activationFailureDetail = `account_activation_url fetch returned ${urlRes.status}: ${txt.substring(0, 200)}`;
              recordAuditFailure("auto_activation", activationFailureDetail);
            }

            // If direct password setup failed, send the customer through the
            // verified recovery function. That function prepares and verifies
            // invited/disabled accounts before sending a reset email. It never
            // uses the broken storefront account-invite template.
            if (!activated) {
              try {
                const backendUrl = Deno.env.get("SUPABASE_URL");
                const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
                if (!backendUrl || !serviceKey) throw new Error("Backend recovery configuration missing");
                const recoveryRes = await fetch(`${backendUrl}/functions/v1/recover-password`, {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${serviceKey}`,
                    apikey: serviceKey,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ email: customer.email }),
                });
                if (!recoveryRes.ok) {
                  recordAuditFailure(
                    "activation_fallback",
                    `verified recovery HTTP ${recoveryRes.status}: ${(await recoveryRes.text()).substring(0, 200)}`
                  );
                }
              } catch (recoverErr) {
                recordAuditFailure(
                  "activation_fallback",
                  `fallback threw: ${recoverErr instanceof Error ? recoverErr.message : String(recoverErr)}`
                );
              }
            }
          } else {
            accountPasswordVerified = false;
            recordAuditFailure(
              "auto_activation",
              "Auto-approval enabled but SHOPIFY_STORE_DOMAIN/SHOPIFY_ADMIN_ACCESS_TOKEN missing"
            );
          }
        }
      } catch (activationErr) {
        accountPasswordVerified = false;
        recordAuditFailure(
          "auto_activation",
          `activation chain threw: ${activationErr instanceof Error ? activationErr.message : String(activationErr)}`
        );
      }
      })());
    }

    // Slack notification to the applications channel with the applicant's
    // Instagram handle so the team can follow them immediately.
    tailTasks.push((async () => {
      try {
        await sendSlackApplicantsNotification({
          firstName: (parseResult.data as { firstName?: string }).firstName ?? null,
          lastName: (parseResult.data as { lastName?: string }).lastName ?? null,
          email: parseResult.data.email,
          countryCode: (parseResult.data as { countryCode?: string }).countryCode ?? null,
          accountType: parseResult.data.accountType ?? null,
          socialMediaHandle: (parseResult.data as { socialMediaHandle?: string }).socialMediaHandle ?? null,
          attribution,
        });
      } catch (err) {
        console.warn("Slack applicants notification tail threw (non-blocking):", err);
      }
    })());

    // Wait for all independent tails to complete before finalizing
    // the audit row. allSettled - one failure mustn't poison the others.
    await Promise.allSettled(tailTasks);

    // A completed registration must never be reported when the customer still
    // cannot sign in. This was the silent failure that stranded accounts while
    // Shopify returned a successful-looking redirect without saving the
    // password. Keep the audit row actionable and stop the success screen.
    if (accountPasswordVerified === false) {
      await updateAuditRow({
        status: "shopify_ok",
        shopify_customer_id: shopifyCustomerId ?? null,
        error_log: auditErrors,
      });
      return sendError(502, [
        "Your professional account was created, but we could not confirm your password was saved. Please contact hello@dropdeadextensions.com so we can finish setup before you try to sign in.",
      ]);
    }

    // Mark completion only after password setup has passed its required
    // storefront sign-in verification. This prevents failed accounts from
    // being removed from the abandoned-registration recovery flow.
    try {
      const backendUrl = Deno.env.get("SUPABASE_URL");
      if (backendUrl) {
        const { autoApprovalEnabled } = await appSettingsPromise;
        await fetch(`${backendUrl}/functions/v1/track-registration-lead`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: parseResult.data.email,
            phase: "completed",
            accountType: parseResult.data.accountType,
            lastStep: "submitted",
            emailValidated: true,
            emailMarketingConsent:
              (parseResult.data as { acceptsMarketing?: boolean }).acceptsMarketing === true,
            firstName: (parseResult.data as { firstName?: string }).firstName ?? null,
            lastName: (parseResult.data as { lastName?: string }).lastName ?? null,
            phoneE164: (parseResult.data as { phoneE164?: string }).phoneE164 ?? null,
            preferredMethods: (parseResult.data as { preferredMethods?: string[] }).preferredMethods ?? null,
            monthlyOrderVolume: (parseResult.data as { monthlyOrderVolume?: string }).monthlyOrderVolume ?? null,
            autoApproved: !!autoApprovalEnabled && !!submittedPassword,
          }),
        });
      }
    } catch (err) {
      console.warn("track-registration-lead completion threw (non-blocking):", err);
    }

    // Meta ads: report the conversion server-side, only once the registration
    // is genuinely complete (password verified above). Non-blocking.
    try {
      const d = parseResult.data as Record<string, unknown>;
      await sendMetaCompleteRegistration({
        req,
        meta: (requestBody as { meta?: MetaClientContext }).meta ?? null,
        email: parseResult.data.email,
        firstName: (d.firstName as string) ?? null,
        lastName: (d.lastName as string) ?? null,
        phoneE164: (d.phoneE164 as string) ?? null,
        city: (d.city as string) ?? null,
        provinceCode: (d.provinceCode as string) ?? null,
        zip: (d.zipCode as string) ?? null,
        countryCode: (d.countryCode as string) ?? null,
        accountType: parseResult.data.accountType ?? null,
      });
    } catch (err) {
      console.warn("Meta CAPI tail threw (non-blocking):", err);
    }



    // Welcome-offer minting moved server-side: generate-discount is now an
    // internal-only edge function (gated by service-role bearer header) so
    // the public can no longer mint unlimited discount codes by hitting it
    // directly. We invoke it here so the client gets the code in the same
    // create-customer response and never needs to call generate-discount.
    //
    // Two independent toggles drive this:
    //   - welcome_offer_enabled - SPA success screen shows the code
    //   - discount_metafields_enabled - write code to customer metafields so
    //     the Shopify theme can keep surfacing the discount elsewhere even
    //     when the SPA welcome-offer screen is off.
    // If either is true we mint, but we only return `welcomeOffer` on the
    // response when the SPA flag is on (otherwise the SPA would render it).
    let welcomeOffer: { code: string; endsAt: string | null } | null = null;
    try {
      let welcomeEnabled = false;
      let metafieldsEnabled = false;
      if (_supabaseUrl && _serviceRoleKey) {
        const headers = {
          "Content-Type": "application/json",
          apikey: _serviceRoleKey,
          Authorization: `Bearer ${_serviceRoleKey}`,
        };
        const [welcomeRes, metaRes] = await Promise.all([
          fetch(`${_supabaseUrl}/rest/v1/rpc/get_welcome_offer_enabled`, {
            method: "POST",
            headers,
            body: "{}",
          }),
          fetch(`${_supabaseUrl}/rest/v1/rpc/get_discount_metafields_enabled`, {
            method: "POST",
            headers,
            body: "{}",
          }),
        ]);
        if (welcomeRes.ok) welcomeEnabled = (await welcomeRes.json()) === true;
        if (metaRes.ok) metafieldsEnabled = (await metaRes.json()) === true;
      }
      const shouldMint = welcomeEnabled || metafieldsEnabled;
      if (shouldMint && _supabaseUrl && _serviceRoleKey) {
        const discountUrl = `${_supabaseUrl}/functions/v1/generate-discount`;
        const discountRes = await fetch(discountUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-key": _serviceRoleKey,
          },
          body: JSON.stringify({
            email: parseResult.data.email,
            shopifyCustomerId: shopifyCustomerId ?? null,
          }),
        });
        if (discountRes.ok) {
          const j = await discountRes.json();
          if (welcomeEnabled && j?.success && j?.code) {
            welcomeOffer = { code: j.code, endsAt: j.endsAt ?? null };
          }
        } else {
          console.warn("generate-discount internal call failed:", discountRes.status);
        }
      }
    } catch (err) {
      console.warn("generate-discount internal call threw (non-blocking):", err);
    }

    const response: FunctionResponse<CustomerFieldsResponse & { welcomeOffer?: typeof welcomeOffer }> = {
      success: true,
      data: { ...customerFieldsData, welcomeOffer },
      statusCode: 200,
    };



    // Audit: finalize. `succeeded` even if some non-blocking soft failures
    // were recorded (Shopify-side enrichments) - the applicant has a Helium
    // record and the error_log lets us replay just the failed pieces.
    // Run in the background - the user doesn't need to wait on the audit
    // PATCH (~80-150ms) to see their success screen.
    runInBackground(updateAuditRow({
      status: auditErrors.length > 0 ? "shopify_ok" : "succeeded",
      shopify_customer_id: shopifyCustomerId ?? null,
      error_log: auditErrors,
    }));

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error in customer sync function:", error);
    await updateAuditRow({
      status: "failed",
      error_log: [
        ...auditErrors,
        {
          step: "unhandled",
          status: "error",
          message: error instanceof Error ? error.message : String(error),
          at: new Date().toISOString(),
        },
      ],
    });
    // Fire ops alert (best-effort, never blocks the response).
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrl && serviceKey) {
        void fetch(`${supabaseUrl}/functions/v1/notify-error`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source: "create-customer",
            message: error instanceof Error ? error.message : String(error),
            context: {
              stack: error instanceof Error ? error.stack?.slice(0, 2000) : null,
            },
          }),
        }).catch(() => { /* non-blocking */ });
      }
    } catch { /* never let reporter throw */ }
    return sendError(500, [
      error instanceof Error ? error.message : "Unknown internal server error",
    ]);
  }
});
