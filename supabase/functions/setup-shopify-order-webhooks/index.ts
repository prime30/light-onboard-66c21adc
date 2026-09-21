// Registers (or lists) the Shopify order webhooks that feed `shop_orders`.
//
// POST { email, password }            -> register all topics (idempotent)
// POST { token, action: "list" }      -> list currently registered webhooks
// POST { token, action: "delete", id } -> remove one webhook
//
// Auth: admin email + ADMIN_PANEL_PASSWORD, or an admin session token, or the
// service role key as a bearer (same pattern as the other admin functions).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "alex@dropdeadhair.com";
const ADMIN_API_VERSION = Deno.env.get("SHOPIFY_ADMIN_API_VERSION") ?? "2026-04";

const TOPICS = [
  "orders/create",
  "orders/paid",
  "orders/updated",
  "orders/cancelled",
  "orders/delete",
  "refunds/create",
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function _hmacB64u(key: string, msg: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function verifyAdminToken(token: string, secret: string): Promise<boolean> {
  if (!token || !token.includes(".")) return false;
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  let body: { email?: string; password?: string; token?: string; action?: string; id?: string | number };
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "Invalid JSON" }, 400);
  }

  const adminPassword = Deno.env.get("ADMIN_PANEL_PASSWORD");
  if (!adminPassword) return json({ success: false, error: "Server misconfigured" }, 500);

  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  let authed = false;
  if (bearer && serviceRoleKey && bearer === serviceRoleKey) authed = true;
  else if (body.token) authed = await verifyAdminToken(body.token, adminPassword);
  else authed = (body.email ?? "").trim().toLowerCase() === ADMIN_EMAIL && (body.password ?? "") === adminPassword;
  if (!authed) return json({ success: false, error: "Invalid credentials" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const shopDomain = Deno.env.get("SHOPIFY_STORE_DOMAIN") ?? Deno.env.get("SHOPIFY_SHOP_DOMAIN");
  const adminToken = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN");
  if (!supabaseUrl) return json({ success: false, error: "Server misconfigured" }, 500);
  if (!shopDomain || !adminToken) return json({ success: false, error: "Shopify admin not configured" }, 500);

  const base = `https://${shopDomain}/admin/api/${ADMIN_API_VERSION}/webhooks`;
  const headers = {
    "X-Shopify-Access-Token": adminToken,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const address = `${supabaseUrl}/functions/v1/shopify-orders-webhook`;

  // Existing webhooks
  const listRes = await fetch(`${base}.json?limit=250`, { headers });
  if (!listRes.ok) {
    const text = await listRes.text().catch(() => "");
    console.error("[setup-shopify-order-webhooks] list failed", listRes.status, text.slice(0, 300));
    return json({ success: false, error: `Shopify list failed (${listRes.status})` }, 502);
  }
  const existing = ((await listRes.json()) as {
    webhooks?: { id: number; topic: string; address: string }[];
  }).webhooks ?? [];

  const action = body.action ?? "register";

  if (action === "list") {
    return json({ success: true, address, webhooks: existing });
  }

  if (action === "delete") {
    if (!body.id) return json({ success: false, error: "Missing id" }, 400);
    const del = await fetch(`${base}/${body.id}.json`, { method: "DELETE", headers });
    return json({ success: del.ok, status: del.status });
  }

  const created: string[] = [];
  const alreadyThere: string[] = [];
  const failed: { topic: string; status: number; detail: string }[] = [];

  for (const topic of TOPICS) {
    const match = existing.find((w) => w.topic === topic && w.address === address);
    if (match) {
      alreadyThere.push(topic);
      continue;
    }
    const res = await fetch(`${base}.json`, {
      method: "POST",
      headers,
      body: JSON.stringify({ webhook: { topic, address, format: "json" } }),
    });
    if (res.ok) {
      created.push(topic);
    } else {
      const text = await res.text().catch(() => "");
      failed.push({ topic, status: res.status, detail: text.slice(0, 200) });
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  return json({ success: failed.length === 0, address, created, alreadyThere, failed });
});
