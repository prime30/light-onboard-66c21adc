// Admin-only: list recent rows from public.registration_submissions.
// Mirrors the auth pattern in admin-toggle-setting (email + ADMIN_PANEL_PASSWORD).
// Table is RLS-locked (deny-all); reads go via service_role here.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "alex@dropdeadhair.com";
const VALID_STATUSES = ["pending", "helium_ok", "shopify_ok", "succeeded", "failed"] as const;
type StatusFilter = (typeof VALID_STATUSES)[number] | "all" | "needs_attention";

interface RequestBody {
  email?: string;
  password?: string;
  status?: StatusFilter;
  search?: string;
  limit?: number;
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405);
  }

  let body: RequestBody;
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
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ success: false, error: "Server configuration error" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const limit = Math.min(Math.max(Number(body.limit ?? 100), 1), 500);
  const status: StatusFilter = body.status ?? "needs_attention";
  const search = (body.search ?? "").trim().toLowerCase();

  let query = supabase
    .from("registration_submissions")
    .select(
      "id, email, account_type, status, helium_customer_id, shopify_customer_id, error_log, ip_address, created_at, updated_at, payload"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status === "needs_attention") {
    query = query.in("status", ["pending", "helium_ok", "shopify_ok", "failed"]);
  } else if (status !== "all") {
    query = query.eq("status", status);
  }
  if (search) {
    query = query.ilike("email", `%${search}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Failed to list submissions:", error);
    return json({ success: false, error: "Failed to query submissions" }, 500);
  }

  // Aggregate counts for the header
  const { data: counts } = await supabase
    .from("registration_submissions")
    .select("status");
  const tally: Record<string, number> = {};
  for (const row of counts ?? []) {
    const s = (row as { status?: string }).status ?? "unknown";
    tally[s] = (tally[s] ?? 0) + 1;
  }

  return json({ success: true, submissions: data ?? [], counts: tally });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
