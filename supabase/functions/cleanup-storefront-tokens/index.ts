// Delete Shopify Storefront API access tokens minted by this SPA
// (title prefix `lovable-`). Keeps the newest N per kind (login/reset/recover)
// so cold-start reuse still works. Admin-only. Defaults to dryRun=true.

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

interface Body {
  token?: string;
  dryRun?: boolean;
  keepPerKind?: number; // keep newest N per (login/reset/recover). Default 1.
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  let body: Body;
  try { body = await req.json(); } catch { return json({ success: false, error: "Invalid JSON" }, 400); }

  const adminPassword = Deno.env.get("ADMIN_PANEL_PASSWORD");
  if (!adminPassword) return json({ success: false, error: "Server configuration error" }, 500);
  const authed = await verifyAdminToken(body.token || "", adminPassword);
  if (!authed) return json({ success: false, error: "Invalid credentials" }, 401);

  const dryRun = body.dryRun !== false; // default true for safety
  const keepPerKind = Math.max(1, Math.min(10, body.keepPerKind ?? 1));

  const domain = Deno.env.get("SHOPIFY_SHOP_DOMAIN") || Deno.env.get("SHOPIFY_STORE_DOMAIN");
  const adminToken = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN");
  const version = Deno.env.get("SHOPIFY_ADMIN_API_VERSION") || "2024-10";
  if (!domain || !adminToken) return json({ success: false, error: "Shopify env missing" }, 500);

  const listRes = await fetch(`https://${domain}/admin/api/${version}/storefront_access_tokens.json`, {
    headers: { "X-Shopify-Access-Token": adminToken, "Content-Type": "application/json" },
  });
  if (!listRes.ok) {
    return json({ success: false, error: `Shopify list ${listRes.status}`, detail: (await listRes.text()).slice(0, 500) }, 502);
  }
  const listJson = await listRes.json();
  const all: Array<{ id: number; title: string; created_at: string }> = listJson?.storefront_access_tokens ?? [];

  // Only touch our own tokens.
  const ours = all.filter((t) => (t.title || "").startsWith("lovable-"));

  // Bucket by kind (login/reset/recover/other-lovable) and sort newest-first.
  const buckets: Record<string, typeof ours> = {};
  for (const t of ours) {
    const m = /^lovable-(login|reset|recover)-/i.exec(t.title || "");
    const kind = m ? m[1].toLowerCase() : "other";
    (buckets[kind] ||= []).push(t);
  }
  for (const k of Object.keys(buckets)) {
    buckets[k].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }

  const toKeep: typeof ours = [];
  const toDelete: typeof ours = [];
  for (const [_kind, arr] of Object.entries(buckets)) {
    toKeep.push(...arr.slice(0, keepPerKind));
    toDelete.push(...arr.slice(keepPerKind));
  }

  const deleted: number[] = [];
  const failed: Array<{ id: number; status: number; detail: string }> = [];

  if (!dryRun) {
    for (const t of toDelete) {
      const r = await fetch(`https://${domain}/admin/api/${version}/storefront_access_tokens/${t.id}.json`, {
        method: "DELETE",
        headers: { "X-Shopify-Access-Token": adminToken },
      });
      if (r.ok) deleted.push(t.id);
      else failed.push({ id: t.id, status: r.status, detail: (await r.text()).slice(0, 200) });
      // Shopify REST rate limit: 2 req/sec. Space deletes a bit.
      await new Promise((res) => setTimeout(res, 250));
    }
  }

  return json({
    success: true,
    dryRun,
    keepPerKind,
    totals: {
      allTokens: all.length,
      lovableTokens: ours.length,
      wouldKeep: toKeep.length,
      wouldDelete: toDelete.length,
    },
    keep: toKeep.map((t) => ({ id: t.id, title: t.title, created_at: t.created_at })),
    delete: toDelete.map((t) => ({ id: t.id, title: t.title, created_at: t.created_at })),
    deleted,
    failed,
  });
});
