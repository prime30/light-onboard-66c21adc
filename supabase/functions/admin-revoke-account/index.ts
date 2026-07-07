// Admin-only: mark an account as rejected and revoke B2B approval in Shopify.
// - Updates public.profiles.application_status = 'rejected'
// - Fetches Shopify customer, strips tags matching app_settings.extra_customer_tags
//   (the configured B2B approval tags), and adds a "review-rejected" tag so
//   Helium/Klaviyo can react.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "alex@dropdeadhair.com";
const REJECT_TAG = "review-rejected";

interface ReqBody {
  email?: string;
  password?: string;
  profileId?: string;
  shopifyCustomerId?: number | string | null;
  reason?: string;
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

  let body: ReqBody;
  try { body = await req.json(); } catch { return json({ success: false, error: "Invalid JSON" }, 400); }

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
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ success: false, error: "Server config error" }, 500);

  const profileId = (body.profileId ?? "").trim();
  if (!profileId) return json({ success: false, error: "Missing profileId" }, 400);

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Mark profile rejected
  const { error: upErr } = await supabase
    .from("profiles")
    .update({ application_status: "rejected" })
    .eq("id", profileId);
  if (upErr) {
    console.error("Profile update failed:", upErr);
    return json({ success: false, error: "Failed to update profile" }, 500);
  }

  // Best-effort Shopify revoke
  let shopifyResult: { updated: boolean; removedTags?: string[]; message?: string } = { updated: false };
  const shopId = String(body.shopifyCustomerId ?? "").replace(/\D+/g, "");
  const shopDomain = Deno.env.get("SHOPIFY_SHOP_DOMAIN") ?? Deno.env.get("SHOPIFY_STORE_DOMAIN");
  const adminToken = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN");
  const apiVersion = Deno.env.get("SHOPIFY_ADMIN_API_VERSION") ?? "2024-10";

  if (shopId && shopDomain && adminToken) {
    try {
      const { data: settings } = await supabase
        .from("app_settings")
        .select("extra_customer_tags")
        .eq("singleton", true)
        .maybeSingle();
      const approvalTags = ((settings?.extra_customer_tags ?? []) as string[]).map((t) => t.trim()).filter(Boolean);

      const getRes = await fetch(
        `https://${shopDomain}/admin/api/${apiVersion}/customers/${shopId}.json`,
        { headers: { "X-Shopify-Access-Token": adminToken } },
      );
      if (getRes.ok) {
        const cur = await getRes.json();
        const existing = String(cur?.customer?.tags ?? "")
          .split(",")
          .map((t: string) => t.trim())
          .filter(Boolean);
        const lower = new Set(approvalTags.map((t) => t.toLowerCase()));
        const removed: string[] = [];
        const kept = existing.filter((t) => {
          if (lower.has(t.toLowerCase())) { removed.push(t); return false; }
          return true;
        });
        if (!kept.some((t) => t.toLowerCase() === REJECT_TAG)) kept.push(REJECT_TAG);

        const putRes = await fetch(
          `https://${shopDomain}/admin/api/${apiVersion}/customers/${shopId}.json`,
          {
            method: "PUT",
            headers: {
              "X-Shopify-Access-Token": adminToken,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ customer: { id: Number(shopId), tags: kept.join(", ") } }),
          },
        );
        if (putRes.ok) {
          shopifyResult = { updated: true, removedTags: removed };
        } else {
          shopifyResult = { updated: false, message: `Shopify PUT ${putRes.status}` };
        }
      } else {
        shopifyResult = { updated: false, message: `Shopify GET ${getRes.status}` };
      }
    } catch (e) {
      console.warn("Shopify revoke failed:", e);
      shopifyResult = { updated: false, message: e instanceof Error ? e.message : "Shopify error" };
    }
  } else if (shopId) {
    shopifyResult = { updated: false, message: "Shopify credentials missing" };
  }

  return json({ success: true, profileId, shopify: shopifyResult });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
