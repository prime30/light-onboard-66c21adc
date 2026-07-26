// One-shot admin backfill: marks every existing Shopify customer as
// `registration_completed: true` in Klaviyo and fires a synthetic
// "Completed Registration" event. This drops legacy customers out of
// the "Finish your registration" Klaviyo flow that filters on
// `Completed Registration = 0 AND registration_completed is false`.
//
// Design mirrors backfill-first-orders: same admin auth pattern, same
// Shopify Admin REST pagination via Link headers, dryRun supported.
//
// Klaviyo:
//   - POST /profile-import  { registration_completed: true, ... }
//   - POST /events          "Completed Registration" (backdated to Shopify created_at)
// Uses the same KLAVIYO_PRIVATE_API_KEY and revision as track-registration-lead.
//
// Safety:
//   - dryRun defaults to true. Nothing hits Klaviyo unless dryRun=false.
//   - Optional `limit` param caps how many customers to process per invocation.
//   - Optional `sinceIso` / `pageCursor` (Shopify page_info) lets you resume.
//   - Rate limits: 250 ms between Shopify pages, 60 ms between Klaviyo calls.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "alex@dropdeadhair.com";
const ADMIN_API_VERSION = Deno.env.get("SHOPIFY_ADMIN_API_VERSION") ?? "2026-04";
const KLAVIYO_REVISION = "2025-04-15";
const KLAVIYO_BASE = "https://a.klaviyo.com/api";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type ShopifyCustomer = {
  id: number;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  created_at: string;
  tags: string | null;
  state: string | null;
};

function parseLinkHeader(link: string | null): string | null {
  if (!link) return null;
  const parts = link.split(",");
  for (const p of parts) {
    const m = p.match(/<([^>]+)>;\s*rel="next"/);
    if (m) return m[1];
  }
  return null;
}

// --- Admin auth (token or password) -----------------------------------------
async function _hmacB64u(key: string, msg: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}
async function verifyAdminToken(token: string, secret: string): Promise<boolean> {
  if (!token || typeof token !== "string" || !token.includes(".")) return false;
  const [payload, sig] = token.split(".");
  const expected = await _hmacB64u(secret, payload);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return false;
  try {
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const pad = "===".slice((b64.length + 3) % 4);
    const j = JSON.parse(atob(b64 + pad));
    if (j.email !== ADMIN_EMAIL) return false;
    if (typeof j.exp !== "number" || j.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch { return false; }
}
// ---------------------------------------------------------------------------

const KLAVIYO_EMAIL_RE = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/;
const E164_RE = /^\+[1-9]\d{7,14}$/;

function isEmailAcceptable(email: string): boolean {
  if (!KLAVIYO_EMAIL_RE.test(email)) return false;
  if (email.includes("..")) return false;
  const [local, domain] = email.split("@");
  if (!local || !domain) return false;
  if (local.startsWith(".") || local.endsWith(".")) return false;
  if (domain.startsWith("-") || domain.endsWith("-")) return false;
  return true;
}

async function klaviyoPost(
  path: string,
  apiKey: string,
  body: unknown,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const res = await fetch(`${KLAVIYO_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Klaviyo-API-Key ${apiKey}`,
      revision: KLAVIYO_REVISION,
      accept: "application/vnd.api+json",
      "content-type": "application/vnd.api+json",
    },
    body: JSON.stringify(body),
  });
  let parsed: unknown = null;
  try { parsed = await res.json(); } catch { parsed = null; }
  return { ok: res.ok, status: res.status, body: parsed };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  let body: {
    email?: string;
    password?: string;
    token?: string;
    dryRun?: boolean;
    limit?: number;
    sinceIso?: string | null;
    pageUrl?: string | null;
  };
  try { body = await req.json(); } catch { return json({ success: false, error: "Invalid JSON" }, 400); }

  const adminPassword = Deno.env.get("ADMIN_PANEL_PASSWORD");
  if (!adminPassword) return json({ success: false, error: "Server misconfigured" }, 500);
  const email = (body.email ?? "").trim().toLowerCase();
  let authed = false;
  if (body.token) {
    authed = await verifyAdminToken(body.token, adminPassword);
  } else {
    authed = email === ADMIN_EMAIL && (body.password ?? "") === adminPassword;
  }
  if (!authed) return json({ success: false, error: "Invalid credentials" }, 401);

  const shopDomain = Deno.env.get("SHOPIFY_STORE_DOMAIN") ?? Deno.env.get("SHOPIFY_SHOP_DOMAIN");
  const adminToken = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN");
  const klaviyoKey = Deno.env.get("KLAVIYO_PRIVATE_API_KEY");
  if (!shopDomain || !adminToken) return json({ success: false, error: "Shopify admin not configured" }, 500);
  if (!klaviyoKey) return json({ success: false, error: "Klaviyo not configured" }, 500);

  const dryRun = body.dryRun !== false; // default true
  const limit = Math.min(Math.max(body.limit ?? 5000, 1), 50000);

  // Optional filter: only backfill customers created before this ISO date
  // (useful to skip customers that already went through the new tracker).
  const sinceIso = typeof body.sinceIso === "string" && body.sinceIso ? body.sinceIso : null;

  let url: string | null =
    body.pageUrl && typeof body.pageUrl === "string" && body.pageUrl.startsWith(`https://${shopDomain}/`)
      ? body.pageUrl
      : `https://${shopDomain}/admin/api/${ADMIN_API_VERSION}/customers.json` +
        `?limit=250` +
        `&fields=id,email,first_name,last_name,phone,created_at,tags,state`;

  let pages = 0;
  let customersSeen = 0;
  let eligible = 0;
  let profileOk = 0, profileFail = 0;
  let eventOk = 0, eventFail = 0;
  let nextPageUrl: string | null = null;
  const failures: Array<{ email: string; step: "profile" | "event"; status: number; detail: unknown }> = [];
  const MAX_PAGES = 40; // ~10k customers per invocation

  while (url && pages < MAX_PAGES && customersSeen < limit) {
    pages += 1;
    const res = await fetch(url, {
      headers: { "X-Shopify-Access-Token": adminToken, Accept: "application/json" },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[backfill-klaviyo-completion] shopify error", res.status, text.slice(0, 500));
      return json({ success: false, error: `Shopify request failed (${res.status})`, pages, customersSeen }, 502);
    }
    const data = (await res.json()) as { customers?: ShopifyCustomer[] };
    const customers = data.customers ?? [];
    customersSeen += customers.length;

    for (const c of customers) {
      const e = (c.email ?? "").trim().toLowerCase();
      if (!e || !isEmailAcceptable(e)) continue;
      if (sinceIso && c.created_at > sinceIso) continue;
      eligible += 1;

      if (dryRun) continue;

      const completedAt = c.created_at || new Date().toISOString();
      const profileAttrs: Record<string, unknown> = {
        email: e,
        properties: {
          registration_completed: true,
          registration_completed_at: completedAt,
          registration_status: "approved",
          registration_source: "backfill:shopify_customers",
          shopify_customer_id: String(c.id),
        },
      };
      if (c.first_name) profileAttrs.first_name = c.first_name;
      if (c.last_name) profileAttrs.last_name = c.last_name;
      if (c.phone && E164_RE.test(c.phone)) profileAttrs.phone_number = c.phone;

      const pRes = await klaviyoPost("/profile-import", klaviyoKey, {
        data: { type: "profile", attributes: profileAttrs },
      });
      if (pRes.ok) {
        profileOk += 1;
      } else {
        profileFail += 1;
        if (failures.length < 25) failures.push({ email: e, step: "profile", status: pRes.status, detail: pRes.body });
        // Skip event if profile failed - the flow filter only needs the property.
        await new Promise((r) => setTimeout(r, 60));
        continue;
      }

      await new Promise((r) => setTimeout(r, 60));

      const eRes = await klaviyoPost("/events", klaviyoKey, {
        data: {
          type: "event",
          attributes: {
            time: completedAt,
            properties: {
              phase: "completed",
              source: "backfill",
              shopify_customer_id: String(c.id),
            },
            metric: { data: { type: "metric", attributes: { name: "Completed Registration" } } },
            profile: { data: { type: "profile", attributes: { email: e } } },
          },
        },
      });
      if (eRes.ok) {
        eventOk += 1;
      } else {
        eventFail += 1;
        if (failures.length < 25) failures.push({ email: e, step: "event", status: eRes.status, detail: eRes.body });
      }

      await new Promise((r) => setTimeout(r, 60));
      if (customersSeen >= limit) break;
    }

    const next = parseLinkHeader(res.headers.get("link") ?? res.headers.get("Link"));
    if (!next || customersSeen >= limit) {
      nextPageUrl = next;
      break;
    }
    url = next;
    await new Promise((r) => setTimeout(r, 250));
  }

  return json({
    success: true,
    dryRun,
    pages,
    customersSeen,
    eligible,
    profileOk,
    profileFail,
    eventOk,
    eventFail,
    nextPageUrl,
    hasMore: !!nextPageUrl,
    failures,
  });
});
