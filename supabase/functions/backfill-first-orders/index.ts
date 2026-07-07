// Pulls Shopify orders and stamps registration_leads.first_order_at /
// first_order_value / first_order_id so the analytics panel can compare
// founder-call cohorts on first-purchase conversion and time-to-first-purchase.
//
// Auth: same admin email + ADMIN_PANEL_PASSWORD pattern used elsewhere.
//
// Strategy: paginate Shopify Admin REST `orders.json` (status=any) since
// `daysBack` (default 365) and keep the earliest order per lowercased email.
// Then upsert that earliest order into matching registration_leads rows.
// Only writes when the discovered order is earlier than what's already stored
// (so re-running is safe and self-healing).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "alex@dropdeadhair.com";
const ADMIN_API_VERSION = Deno.env.get("SHOPIFY_ADMIN_API_VERSION") ?? "2026-04";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type ShopifyOrder = {
  id: number;
  email: string | null;
  created_at: string;
  total_price: string | null;
  customer?: { email?: string | null } | null;
};

function parseLinkHeader(link: string | null): string | null {
  if (!link) return null;
  // Format: <https://...>; rel="next", <https://...>; rel="previous"
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
async function issueAdminToken(email: string, secret: string, ttlSeconds = 60 * 60 * 8): Promise<{ token: string; expiresAt: number }> {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const b = btoa(JSON.stringify({ email, exp: expiresAt })).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const s = await _hmacB64u(secret, b);
  return { token: `${b}.${s}`, expiresAt };
}
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  let body: { email?: string; password?: string; daysBack?: number; dryRun?: boolean };
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "Invalid JSON" }, 400);
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const providedToken = typeof (body as { token?: unknown }).token === "string" ? (body as { token?: string }).token! : "";
  const adminPassword = Deno.env.get("ADMIN_PANEL_PASSWORD");
  if (!adminPassword) return json({ success: false, error: "Server misconfigured" }, 500);
  let _authed = false;
  let _authedEmail = email;
  if (providedToken) {
    _authed = await verifyAdminToken(providedToken, adminPassword);
    if (_authed) _authedEmail = ADMIN_EMAIL;
  } else {
    const password = body.password ?? "";
    _authed = email === ADMIN_EMAIL && password === adminPassword;
  }
  if (!_authed) return json({ success: false, error: "Invalid credentials" }, 401);
  const _adminEmail = _authedEmail;
  return json({ success: false, error: "Invalid credentials" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const shopDomain = Deno.env.get("SHOPIFY_STORE_DOMAIN") ?? Deno.env.get("SHOPIFY_SHOP_DOMAIN");
  const adminToken = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN");
  if (!supabaseUrl || !serviceKey)
    return json({ success: false, error: "Server misconfigured" }, 500);
  if (!shopDomain || !adminToken)
    return json({ success: false, error: "Shopify admin not configured" }, 500);

  const daysBack = Math.min(Math.max(body.daysBack ?? 365, 1), 365 * 3);
  const dryRun = !!body.dryRun;
  const sinceIso = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

  const supabase = createClient(supabaseUrl, serviceKey);

  // 1) Page through Shopify orders, capturing earliest per email.
  const earliest = new Map<string, { id: string; created_at: string; total: number }>();

  let url: string | null =
    `https://${shopDomain}/admin/api/${ADMIN_API_VERSION}/orders.json` +
    `?status=any&limit=250` +
    `&created_at_min=${encodeURIComponent(sinceIso)}` +
    `&fields=id,email,created_at,total_price,customer`;

  let pages = 0;
  let totalOrdersSeen = 0;
  const MAX_PAGES = 200; // safety cap (~50k orders)

  while (url && pages < MAX_PAGES) {
    pages += 1;
    const res = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": adminToken,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[backfill-first-orders] shopify error", res.status, text.slice(0, 500));
      return json(
        { success: false, error: `Shopify request failed (${res.status})` },
        502,
      );
    }
    const data = (await res.json()) as { orders?: ShopifyOrder[] };
    const orders = data.orders ?? [];
    totalOrdersSeen += orders.length;

    for (const o of orders) {
      const e = (o.email ?? o.customer?.email ?? "").trim().toLowerCase();
      if (!e) continue;
      const total = Number(o.total_price ?? 0);
      const cur = earliest.get(e);
      if (!cur || o.created_at < cur.created_at) {
        earliest.set(e, {
          id: String(o.id),
          created_at: o.created_at,
          total: Number.isFinite(total) ? total : 0,
        });
      }
    }

    url = parseLinkHeader(res.headers.get("link") ?? res.headers.get("Link"));
    // Be polite to Shopify rate limits.
    if (url) await new Promise((r) => setTimeout(r, 250));
  }

  // 2) Pull matching registration_leads.
  const emails = Array.from(earliest.keys());
  if (emails.length === 0) {
    return json({
      success: true,
      pages,
      totalOrdersSeen,
      uniqueEmails: 0,
      matchedLeads: 0,
      updated: 0,
      skipped: 0,
      dryRun,
    });
  }

  // Supabase .in() has a practical limit, chunk to 500.
  const leadsByEmail = new Map<string, { first_order_at: string | null; first_order_id: string | null }>();
  for (let i = 0; i < emails.length; i += 500) {
    const chunk = emails.slice(i, i + 500);
    const { data, error } = await supabase
      .from("registration_leads")
      .select("email, first_order_at, first_order_id")
      .in("email", chunk);
    if (error) {
      console.error("[backfill-first-orders] lead lookup failed", error);
      return json({ success: false, error: "Lead lookup failed" }, 500);
    }
    for (const r of data ?? []) {
      leadsByEmail.set((r.email as string).toLowerCase(), {
        first_order_at: (r.first_order_at as string | null) ?? null,
        first_order_id: (r.first_order_id as string | null) ?? null,
      });
    }
  }

  // 3) Compute updates (only when earlier than existing, or never set).
  const nowIso = new Date().toISOString();
  type Upd = {
    email: string;
    first_order_at: string;
    first_order_value: number;
    first_order_id: string;
    first_order_synced_at: string;
  };
  const updates: Upd[] = [];
  let skipped = 0;
  for (const [e, lead] of leadsByEmail.entries()) {
    const o = earliest.get(e)!;
    if (lead.first_order_at && lead.first_order_at <= o.created_at) {
      skipped += 1;
      continue;
    }
    updates.push({
      email: e,
      first_order_at: o.created_at,
      first_order_value: o.total,
      first_order_id: o.id,
      first_order_synced_at: nowIso,
    });
  }

  let updated = 0;
  if (!dryRun) {
    for (const u of updates) {
      const { error } = await supabase
        .from("registration_leads")
        .update({
          first_order_at: u.first_order_at,
          first_order_value: u.first_order_value,
          first_order_id: u.first_order_id,
          first_order_synced_at: u.first_order_synced_at,
        })
        .eq("email", u.email);
      if (error) {
        console.error("[backfill-first-orders] update failed", u.email, error);
        continue;
      }
      updated += 1;
    }
  } else {
    updated = updates.length;
  }

  return json({
    success: true,
    dryRun,
    pages,
    totalOrdersSeen,
    uniqueEmails: emails.length,
    matchedLeads: leadsByEmail.size,
    updated,
    skipped,
    daysBack,
  });
});
