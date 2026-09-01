// Admin-only: 30 day view of blocked competitor registration attempts.
//
// Reads the competitor_block_* fields written on public.registration_leads by
// check-email and create-customer whenever a blocklisted domain tries to
// register. Auth pattern copied from admin-stranded-accounts (token or password).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "alex@dropdeadhair.com";

interface RequestBody {
  email?: string;
  password?: string;
  token?: string;
  days?: number;
}

interface LeadRow {
  email: string;
  competitor_block_count: number | null;
  competitor_block_last_at: string | null;
  competitor_block_domain: string | null;
}

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
  } catch {
    return false;
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const adminPassword = Deno.env.get("ADMIN_PANEL_PASSWORD");
  if (!supabaseUrl || !serviceKey || !adminPassword) return json({ error: "Server misconfigured" }, 500);

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const tokenOk = body.token ? await verifyAdminToken(body.token, adminPassword) : false;
  const passwordOk =
    !!body.password && body.password === adminPassword && (body.email ?? ADMIN_EMAIL) === ADMIN_EMAIL;
  if (!tokenOk && !passwordOk) return json({ error: "Unauthorized" }, 401);

  const days = Math.min(Math.max(Number(body.days) || 30, 1), 180);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  let rows: LeadRow[] = [];
  try {
    const select = "email,competitor_block_count,competitor_block_last_at,competitor_block_domain";
    const res = await fetch(
      `${supabaseUrl}/rest/v1/registration_leads?select=${select}` +
        `&competitor_block_last_at=gte.${since}&order=competitor_block_last_at.desc&limit=1000`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
    );
    if (!res.ok) {
      console.error("admin-competitor-attempts query failed:", res.status, (await res.text()).slice(0, 300));
      return json({ error: "Query failed" }, 502);
    }
    rows = (await res.json()) as LeadRow[];
  } catch (e) {
    console.error("admin-competitor-attempts query threw:", e);
    return json({ error: "Query threw" }, 500);
  }

  const byDomain: Record<string, number> = {};
  let attempts = 0;
  for (const r of rows) {
    const n = r.competitor_block_count ?? 1;
    attempts += n;
    const key = r.competitor_block_domain || "unknown";
    byDomain[key] = (byDomain[key] ?? 0) + n;
  }

  const repeatDomains = Object.entries(byDomain)
    .filter(([, n]) => n >= 3)
    .map(([domain]) => domain);

  return json({
    success: true,
    report: {
      windowDays: days,
      windowStart: since,
      attempts,
      uniqueEmails: rows.length,
      uniqueDomains: Object.keys(byDomain).length,
      byDomain,
      repeatDomains,
      recent: rows.slice(0, 20).map((r) => ({
        email: r.email,
        domain: r.competitor_block_domain,
        count: r.competitor_block_count ?? 1,
        lastAt: r.competitor_block_last_at,
      })),
    },
  });
});
