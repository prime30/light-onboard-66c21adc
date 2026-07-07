// Returns Helium backfill customer records within a date range so admins can
// inspect what drove a signup spike (emails, tags, account type, state, etc).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "alex@dropdeadhair.com";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

  let body: {
    email?: string;
    password?: string;
    createdAtMin?: string;
    createdAtMax?: string;
    limit?: number;
  };
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

  if (!body.createdAtMin || !body.createdAtMax)
    return json({ success: false, error: "createdAtMin and createdAtMax required" }, 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ success: false, error: "Server misconfigured" }, 500);

  const supabase = createClient(supabaseUrl, serviceKey);
  const limit = Math.min(Math.max(body.limit ?? 1000, 1), 2000);

  const { data, error } = await supabase
    .from("helium_customers_backfill")
    .select("helium_id, email, shopify_id, created_at, raw")
    .gte("created_at", body.createdAtMin)
    .lt("created_at", body.createdAtMax)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) return json({ success: false, error: error.message }, 500);

  const records = (data ?? []).map((row) => {
    const raw = (row.raw ?? {}) as Record<string, unknown>;
    return {
      helium_id: row.helium_id,
      email: row.email,
      shopify_id: row.shopify_id,
      created_at: row.created_at,
      first_name: (raw.first_name as string) ?? null,
      last_name: (raw.last_name as string) ?? null,
      i_am_a: (raw.i_am_a as string) ?? null,
      account_type: (raw.account_type as string) ?? null,
      state: (raw.state as string) ?? (raw.stateprovince as string) ?? null,
      city: (raw.city as string) ?? null,
      country: (raw.country as string) ?? null,
      business_or_salon_name: (raw.business_or_salon_name as string) ?? null,
      instagram_handle: (raw.instagram_handle as string) ?? null,
      tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
      form_ids: Array.isArray(raw.form_ids) ? (raw.form_ids as string[]) : [],
      note: (raw.note as string) ?? null,
      accepts_marketing: raw.accepts_marketing ?? null,
      orders_count: (raw.orders_count as number) ?? null,
      total_spent: (raw.total_spent as string) ?? null,
    };
  });

  // Aggregate breakdowns to surface the spike's signature
  const byDay = new Map<string, number>();
  const byIAmA = new Map<string, number>();
  const byState = new Map<string, number>();
  const byDomain = new Map<string, number>();
  const byHour = new Map<string, number>();
  for (const r of records) {
    const day = r.created_at.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
    const hr = r.created_at.slice(0, 13);
    byHour.set(hr, (byHour.get(hr) ?? 0) + 1);
    const k = r.i_am_a ?? "(unknown)";
    byIAmA.set(k, (byIAmA.get(k) ?? 0) + 1);
    const s = r.state ?? "(unknown)";
    byState.set(s, (byState.get(s) ?? 0) + 1);
    const d = (r.email ?? "").split("@")[1] ?? "(unknown)";
    byDomain.set(d, (byDomain.get(d) ?? 0) + 1);
  }
  const sortDesc = (m: Map<string, number>) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).map(([key, count]) => ({ key, count }));

  return json({
    success: true,
    total: records.length,
    records,
    breakdowns: {
      byDay: [...byDay.entries()].sort().map(([key, count]) => ({ key, count })),
      byHour: [...byHour.entries()].sort().map(([key, count]) => ({ key, count })),
      byIAmA: sortDesc(byIAmA),
      byState: sortDesc(byState).slice(0, 20),
      byDomain: sortDesc(byDomain).slice(0, 20),
    },
  });
});
