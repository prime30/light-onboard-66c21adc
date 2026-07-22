// List all Shopify Storefront API access tokens on the store.
// Admin-only. Used to inspect the 100-token cap and identify SPA-minted tokens
// (title prefix `lovable-`).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "alex@dropdeadhair.com";

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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  let body: { token?: string };
  try { body = await req.json(); } catch { return json({ success: false, error: "Invalid JSON" }, 400); }

  const adminPassword = Deno.env.get("ADMIN_PANEL_PASSWORD");
  if (!adminPassword) return json({ success: false, error: "Server configuration error" }, 500);
  const authed = await verifyAdminToken(body.token || "", adminPassword);
  if (!authed) return json({ success: false, error: "Invalid credentials" }, 401);

  const domain = Deno.env.get("SHOPIFY_SHOP_DOMAIN") || Deno.env.get("SHOPIFY_STORE_DOMAIN");
  const adminToken = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN");
  const version = Deno.env.get("SHOPIFY_ADMIN_API_VERSION") || "2024-10";
  if (!domain || !adminToken) return json({ success: false, error: "Shopify env missing" }, 500);

  const res = await fetch(`https://${domain}/admin/api/${version}/storefront_access_tokens.json`, {
    headers: { "X-Shopify-Access-Token": adminToken, "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const text = await res.text();
    return json({ success: false, error: `Shopify ${res.status}`, detail: text.slice(0, 500) }, 502);
  }
  const data = await res.json();
  const raw: Array<{ id: number; title: string; access_scope?: string; created_at: string }> =
    data?.storefront_access_tokens ?? [];

  const tokens = raw
    .map((t) => ({
      id: t.id,
      title: t.title,
      created_at: t.created_at,
      lovable_prefix: (t.title || "").startsWith("lovable-"),
      lovable_kind: (() => {
        const m = /^lovable-(login|reset|recover)-/i.exec(t.title || "");
        return m ? m[1].toLowerCase() : null;
      })(),
    }))
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  const lovable = tokens.filter((t) => t.lovable_prefix);
  const other = tokens.filter((t) => !t.lovable_prefix);

  return json({
    success: true,
    total: tokens.length,
    cap: 100,
    lovableCount: lovable.length,
    otherCount: other.length,
    tokens,
  });
});
