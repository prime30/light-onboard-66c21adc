import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "alex@dropdeadhair.com";

interface RequestBody {
  email?: string;
  password?: string;
  autoApprovalEnabled?: boolean;
  welcomeOfferEnabled?: boolean;
  discountMetafieldsEnabled?: boolean;
  founderCallHighVolumeOnly?: boolean;
  founderCallEnabled?: boolean;
  extraCustomerTags?: string[];
}

function sanitizeTags(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null;
  const cleaned = input
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && t.length <= 80)
    // Shopify tags can't contain commas
    .map((t) => t.replace(/,/g, " "))
    .slice(0, 50);
  // De-dupe case-insensitively, preserve first-seen casing
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of cleaned) {
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
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
  if (!adminPassword) {
    console.error("ADMIN_PANEL_PASSWORD is not configured");
    return json({ success: false, error: "Server configuration error" }, 500);
  }
  let _authed = false;
  let _authedEmail = email;
  let _issuedToken: { token: string; expiresAt: number } | null = null;
  if (providedToken) {
    _authed = await verifyAdminToken(providedToken, adminPassword);
    if (_authed) _authedEmail = ADMIN_EMAIL;
  } else {
    const password = body.password ?? "";
    _authed = email === ADMIN_EMAIL && password === adminPassword;
    if (_authed) {
      _issuedToken = await issueAdminToken(ADMIN_EMAIL, adminPassword);
    }
  }
  if (!_authed) {
    return json({ success: false, error: "Invalid credentials" }, 401);
  }
  const _adminEmail = _authedEmail;


  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ success: false, error: "Server configuration error" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const hasToggle = typeof body.autoApprovalEnabled === "boolean";
  const hasWelcomeToggle = typeof body.welcomeOfferEnabled === "boolean";
  const hasMetafieldsToggle = typeof body.discountMetafieldsEnabled === "boolean";
  const hasFounderHighVolumeToggle = typeof body.founderCallHighVolumeOnly === "boolean";
  const sanitizedTags = sanitizeTags(body.extraCustomerTags);
  const hasTags = sanitizedTags !== null;

  // Verify-only request (no changes)
  if (!hasToggle && !hasWelcomeToggle && !hasMetafieldsToggle && !hasFounderHighVolumeToggle && !hasTags) {
    const { data: current, error: readErr } = await supabase
      .from("app_settings")
      .select("auto_approval_enabled, welcome_offer_enabled, discount_metafields_enabled, founder_call_high_volume_only, extra_customer_tags")
      .eq("singleton", true)
      .single();
    if (readErr) {
      console.error("Failed to read app_settings:", readErr);
      return json({ success: true, verified: true, token: _issuedToken?.token, expiresAt: _issuedToken?.expiresAt });
    }
    return json({ success: true, verified: true, setting: current, token: _issuedToken?.token, expiresAt: _issuedToken?.expiresAt });
  }

  const update: Record<string, unknown> = { updated_by: _adminEmail };
  if (hasToggle) update.auto_approval_enabled = body.autoApprovalEnabled;
  if (hasWelcomeToggle) update.welcome_offer_enabled = body.welcomeOfferEnabled;
  if (hasMetafieldsToggle) update.discount_metafields_enabled = body.discountMetafieldsEnabled;
  if (hasFounderHighVolumeToggle) update.founder_call_high_volume_only = body.founderCallHighVolumeOnly;
  if (hasTags) update.extra_customer_tags = sanitizedTags;

  const { data, error } = await supabase
    .from("app_settings")
    .update(update)
    .eq("singleton", true)
    .select()
    .single();

  if (error) {
    console.error("Failed to update app_settings:", error);
    return json({ success: false, error: "Failed to update setting" }, 500);
  }

  return json({ success: true, setting: data, token: _issuedToken?.token, expiresAt: _issuedToken?.expiresAt });

});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
