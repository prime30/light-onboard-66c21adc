// POST /change-password — invoked via Shopify App Proxy at
// https://dropdeadextensions.com/apps/apply/change-password
//
// Trust chain (see docs/contracts/account-change-password.md):
//   1. Customer is on /account → Shopify session cookie is valid.
//   2. Theme JS calls the proxy; Shopify appends a signed query string
//      with logged_in_customer_id.
//   3. We HMAC-verify the query, then call the Admin API to set the
//      new password.
//
// Forbidden behaviors enforced here:
//   - Never trust logged_in_customer_id without HMAC verification.
//   - Never accept customer id from the request body.
//   - Never log the new password value.
//   - Never echo Admin API error bodies verbatim to the client.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-requested-with, accept",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EXPECTED_SHOP = "drop-dead-2428.myshopify.com";
const ADMIN_API_VERSION = "2026-04";
const TIMESTAMP_SKEW_SECONDS = 60;

type ErrorCode =
  | "unauthenticated"
  | "weak_password"
  | "rate_limited"
  | "shopify_error";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fail(error: ErrorCode, status: number, message?: string): Response {
  return jsonResponse({ ok: false, error, message }, status);
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message)
  );
  return bytesToHex(new Uint8Array(sig));
}

/**
 * App Proxy HMAC verification — Shopify's documented format:
 *   - Sort all params (except `signature`) alphabetically by key
 *   - Concatenate as `key=value` with NO separator (differs from
 *     webhook HMAC and OAuth HMAC, which join with `&`)
 *   - HMAC-SHA256 with the app's API secret, hex-encoded
 *
 * Repeated keys (rare for the App Proxy) are joined with `,`.
 * Reference: https://shopify.dev/docs/apps/build/online-store/display-dynamic-data#calculate-a-digital-signature
 */
async function verifyAppProxySignature(
  url: URL,
  appSecret: string
): Promise<{ ok: true; params: Record<string, string> } | { ok: false }> {
  const signature = url.searchParams.get("signature");
  if (!signature) return { ok: false };

  // Collapse repeated keys by joining values with "," (Shopify convention).
  const grouped = new Map<string, string[]>();
  for (const [k, v] of url.searchParams.entries()) {
    if (k === "signature") continue;
    const list = grouped.get(k) ?? [];
    list.push(v);
    grouped.set(k, list);
  }

  const sortedKeys = Array.from(grouped.keys()).sort();
  const message = sortedKeys
    .map((k) => `${k}=${grouped.get(k)!.join(",")}`)
    .join("");

  const expected = await hmacSha256Hex(appSecret, message);
  if (!timingSafeEqualHex(signature, expected)) return { ok: false };

  // Flatten back to a simple record for downstream checks.
  const params: Record<string, string> = {};
  for (const [k, list] of grouped.entries()) {
    params[k] = list.join(",");
  }
  return { ok: true, params };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return fail("shopify_error", 405, "Method not allowed");
  }

  const APP_SECRET = Deno.env.get("SHOPIFY_APP_API_SECRET");
  const ADMIN_TOKEN = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN");
  const STORE_DOMAIN = Deno.env.get("SHOPIFY_STORE_DOMAIN") ?? EXPECTED_SHOP;

  if (!APP_SECRET || !ADMIN_TOKEN) {
    console.error("[change-password] Missing SHOPIFY_APP_API_SECRET or SHOPIFY_ADMIN_ACCESS_TOKEN");
    return fail("shopify_error", 500, "Server configuration error");
  }

  const url = new URL(req.url);

  // 1. HMAC verification — anything before this point is untrusted.
  const verified = await verifyAppProxySignature(url, APP_SECRET);
  if (!verified.ok) {
    return fail("unauthenticated", 401);
  }
  const params = verified.params;

  // 2. logged_in_customer_id must be present and numeric.
  const customerId = params["logged_in_customer_id"];
  if (!customerId || !/^\d+$/.test(customerId)) {
    return fail("unauthenticated", 401);
  }

  // 3. Shop allowlist — defends against a copy of the proxy on a different shop.
  const shop = params["shop"];
  if (shop !== STORE_DOMAIN) {
    return fail("unauthenticated", 401);
  }

  // 4. Timestamp window (±60s) — defeats replay of a captured signed query.
  const tsRaw = params["timestamp"];
  const ts = tsRaw ? Number(tsRaw) : NaN;
  if (!Number.isFinite(ts)) {
    return fail("unauthenticated", 401);
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - ts) > TIMESTAMP_SKEW_SECONDS) {
    return fail("unauthenticated", 401);
  }

  // 5. Body validation — server-side is source of truth on length.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("weak_password", 400, "Invalid request body");
  }
  const newPassword =
    body && typeof body === "object" && "new_password" in body
      ? (body as { new_password: unknown }).new_password
      : undefined;
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return fail("weak_password", 400, "Password must be at least 8 characters.");
  }
  if (newPassword.length > 256) {
    // Hard upper bound — Shopify's own cap is well below this; reject early.
    return fail("weak_password", 400, "Password is too long.");
  }

  // 6. Admin API: PUT /admin/api/{ver}/customers/{id}.json
  const adminUrl = `https://${STORE_DOMAIN}/admin/api/${ADMIN_API_VERSION}/customers/${customerId}.json`;
  let adminRes: Response;
  try {
    adminRes = await fetch(adminUrl, {
      method: "PUT",
      headers: {
        "X-Shopify-Access-Token": ADMIN_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customer: {
          id: Number(customerId),
          password: newPassword,
          password_confirmation: newPassword,
        },
      }),
    });
  } catch (e) {
    console.error("[change-password] Admin API fetch threw:", e);
    return fail("shopify_error", 500);
  }

  if (adminRes.ok) {
    return jsonResponse({ ok: true }, 200);
  }

  if (adminRes.status === 429) {
    return fail("rate_limited", 429);
  }

  if (adminRes.status === 422) {
    // Try to detect a password-specific validation failure without echoing
    // the Admin API body to the client.
    try {
      const j = await adminRes.json();
      if (j?.errors?.password) {
        return fail("weak_password", 400, "That password isn't accepted. Try a stronger one.");
      }
    } catch {
      // fall through to generic
    }
    return fail("shopify_error", 500);
  }

  // 401/403/5xx — log status only (no body echo) for debugging.
  console.error(
    `[change-password] Admin API returned ${adminRes.status} for customer ${customerId}`
  );
  return fail("shopify_error", 500);
});
