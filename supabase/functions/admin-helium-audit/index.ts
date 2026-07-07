// Audits helium_customers_backfill vs the live Helium API by walking every
// customer via deterministic page chunks and comparing per-month counts.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "alex@dropdeadhair.com";
const PAGE_LIMIT = 250;
const HARD_ITER_CEILING = 200; // 200 * 250 = 50k customers, plenty of headroom
const LOCAL_PAGE_SIZE = 1000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type HeliumCustomer = { id: string; created_at?: string | null };


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

  let body: { email?: string; password?: string; createdAtMin?: string; createdAtMax?: string };
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const heliumToken = Deno.env.get("HELIUM_PRIVATE_ACCESS_TOKEN");
  if (!supabaseUrl || !serviceKey || !heliumToken)
    return json({ success: false, error: "Server misconfigured" }, 500);

  const createdAtMin = typeof body.createdAtMin === "string" ? body.createdAtMin : null;
  const createdAtMax = typeof body.createdAtMax === "string" ? body.createdAtMax : null;

  // 1) Walk the Helium API end-to-end with deterministic page pagination
  const heliumByMonth = new Map<string, number>();
  const heliumIds = new Set<string>();
  let page = 1;
  let pagesProcessed = 0;
  let heliumTotal = 0;

  while (pagesProcessed < HARD_ITER_CEILING) {
    const url = new URL("https://app.customerfields.com/api/v2/customers/search.json");
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(PAGE_LIMIT));
    url.searchParams.set("sort_by", "created_at");
    url.searchParams.set("sort_order", "asc");
    if (createdAtMin) url.searchParams.set("created_at_min", createdAtMin);
    if (createdAtMax) url.searchParams.set("created_at_max", createdAtMax);

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json", Authorization: `Bearer ${heliumToken}` },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return json(
        { success: false, error: `Helium ${res.status}`, page, heliumTotal, detail: text.slice(0, 200) },
        502,
      );
    }
    const data = (await res.json()) as { customers?: HeliumCustomer[] };
    const customers = Array.isArray(data.customers) ? data.customers : [];
    pagesProcessed += 1;
    if (customers.length === 0) break;

    for (const c of customers) {
      if (!c.id || !c.created_at) continue;
      if (heliumIds.has(c.id)) continue;
      heliumIds.add(c.id);
      heliumTotal += 1;
      const month = c.created_at.slice(0, 7); // YYYY-MM
      heliumByMonth.set(month, (heliumByMonth.get(month) ?? 0) + 1);
    }

    if (customers.length < PAGE_LIMIT) break;
    page += 1;
  }

  // 2) Per-month counts from local backfill
  const supabase = createClient(supabaseUrl, serviceKey);
  const localByMonth = new Map<string, number>();
  let localOffset = 0;
  while (true) {
    let localQuery = supabase
      .from("helium_customers_backfill")
      .select("created_at")
      .order("created_at", { ascending: true })
      .range(localOffset, localOffset + LOCAL_PAGE_SIZE - 1);
    if (createdAtMin && createdAtMax) {
      localQuery = localQuery.gte("created_at", createdAtMin).lt("created_at", createdAtMax);
    }
    const { data: localRows, error: localErr } = await localQuery;
    if (localErr) return json({ success: false, error: localErr.message }, 500);

    for (const row of localRows ?? []) {
      const month = (row.created_at as string).slice(0, 7);
      localByMonth.set(month, (localByMonth.get(month) ?? 0) + 1);
    }

    if (!localRows || localRows.length < LOCAL_PAGE_SIZE) break;
    localOffset += LOCAL_PAGE_SIZE;
  }

  // 3) Build comparison
  const allMonths = new Set<string>([...heliumByMonth.keys(), ...localByMonth.keys()]);
  const comparison = [...allMonths]
    .sort()
    .map((month) => {
      const helium = heliumByMonth.get(month) ?? 0;
      const local = localByMonth.get(month) ?? 0;
      return { month, helium, local, missing: helium - local };
    });

  const localTotal = [...localByMonth.values()].reduce((a, b) => a + b, 0);
  const missingTotal = comparison.reduce((a, r) => a + Math.max(0, r.missing), 0);
  const surplusTotal = comparison.reduce((a, r) => a + Math.max(0, -r.missing), 0);

  return json({
    success: true,
    heliumTotal,
    localTotal,
    missingTotal,
    surplusTotal,
    iterations: pagesProcessed,
    comparison,
  });
});
