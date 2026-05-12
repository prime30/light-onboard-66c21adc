// POST /orders/<id>/note — invoked via Shopify App Proxy at
// https://dropdeadextensions.com/apps/account/orders/<id>/note
//
// Mirrors the change-password function pattern:
//   1. Customer is on /account → Shopify session cookie is valid.
//   2. Theme JS calls the proxy; Shopify appends a signed query string
//      with logged_in_customer_id.
//   3. We HMAC-verify the query, ownership-check the order, then call
//      the Admin GraphQL API to update the note.
//
// Forbidden behaviors enforced here:
//   - Never trust logged_in_customer_id without HMAC verification.
//   - Never skip the order-ownership re-check after HMAC verifies.
//   - Never accept order id from the request body — only from the path.
//   - Never echo Admin API error bodies verbatim to the client.
//   - Never log full note contents at INFO (PII).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-requested-with, accept",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EXPECTED_SHOP = "drop-dead-2428.myshopify.com";
const ADMIN_API_VERSION = "2026-04";
const TIMESTAMP_SKEW_SECONDS = 60;
const RATE_LIMIT_WINDOW_MS = 5_000;

type ErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "validation"
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
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  return bytesToHex(new Uint8Array(sig));
}

async function verifyAppProxySignature(
  url: URL,
  appSecret: string,
): Promise<{ ok: true; params: Record<string, string> } | { ok: false }> {
  const signature = url.searchParams.get("signature");
  if (!signature) return { ok: false };

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

  const params: Record<string, string> = {};
  for (const [k, list] of grouped.entries()) {
    params[k] = list.join(",");
  }
  return { ok: true, params };
}

// In-memory per-customer rate limit (1 save / 5s).
// Edge functions can be cold-started across instances; this is best-effort.
const lastSaveByCustomer = new Map<string, number>();
function rateLimited(customerId: string): boolean {
  const now = Date.now();
  const prev = lastSaveByCustomer.get(customerId) ?? 0;
  if (now - prev < RATE_LIMIT_WINDOW_MS) return true;
  lastSaveByCustomer.set(customerId, now);
  // Opportunistic GC — drop entries older than the window.
  if (lastSaveByCustomer.size > 1000) {
    for (const [k, t] of lastSaveByCustomer) {
      if (now - t > RATE_LIMIT_WINDOW_MS) lastSaveByCustomer.delete(k);
    }
  }
  return false;
}

// Shopify App Proxy strips the configured prefix+subpath, so by the time
// the request reaches us pathname is `/orders/<id>/note` (functions-v1
// also normalises the `/orders` function-name slug into the route).
const ORDER_NOTE_PATH = /^\/(?:functions\/v1\/)?orders\/(\d+)\/note\/?$/;

Deno.serve(async (req) => {
 try {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return fail("not_found", 404);
  }

  const url = new URL(req.url);

  // Path routing — must match /orders/<numeric>/note exactly.
  const match = url.pathname.match(ORDER_NOTE_PATH);
  if (!match) {
    return fail("not_found", 404);
  }
  const orderId = match[1];

  const APP_SECRET =
    Deno.env.get("SHOPIFY_ACCOUNT_APP_SECRET") ??
    Deno.env.get("SHOPIFY_APP_API_SECRET");
  const ADMIN_TOKEN =
    Deno.env.get("SHOPIFY_ADMIN_TOKEN_ORDERS") ??
    Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN") ??
    Deno.env.get("SHOPIFY_ADMIN_TOKEN");
  const STORE_DOMAIN = Deno.env.get("SHOPIFY_STORE_DOMAIN") ?? EXPECTED_SHOP;

  if (!APP_SECRET || !ADMIN_TOKEN) {
    console.error("[orders] Missing SHOPIFY_ACCOUNT_APP_SECRET or admin token");
    return fail("shopify_error", 400, "Server configuration error");
  }

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

  // 3. Shop allowlist.
  const shop = params["shop"];
  if (shop !== STORE_DOMAIN) {
    return fail("unauthenticated", 401);
  }

  // 4. Timestamp window (±60s).
  const tsRaw = params["timestamp"];
  const ts = tsRaw ? Number(tsRaw) : NaN;
  if (!Number.isFinite(ts)) {
    return fail("unauthenticated", 401);
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - ts) > TIMESTAMP_SKEW_SECONDS) {
    return fail("unauthenticated", 401);
  }

  // 5. Body validation.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("validation", 400, "Invalid request body");
  }
  const note =
    body && typeof body === "object" && "note" in body
      ? (body as { note: unknown }).note
      : undefined;
  if (typeof note !== "string") {
    return fail("validation", 400, "note must be a string");
  }
  // Shopify's order note has a practical upper bound; reject obviously
  // abusive payloads early without echoing them anywhere.
  if (note.length > 5000) {
    return fail("validation", 400, "Note is too long.");
  }

  // 6. Per-customer rate limit (1 save / 5s).
  if (rateLimited(customerId)) {
    return fail("rate_limited", 429);
  }

  const adminGraphqlUrl =
    `https://${STORE_DOMAIN}/admin/api/${ADMIN_API_VERSION}/graphql.json`;
  const orderGid = `gid://shopify/Order/${orderId}`;
  const customerGid = `gid://shopify/Customer/${customerId}`;

  // 7. Ownership check via Admin GraphQL.
  let ownershipRes: Response;
  try {
    ownershipRes = await fetch(adminGraphqlUrl, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": ADMIN_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query:
          "query OrderOwnership($id: ID!) { order(id: $id) { id customer { id } } }",
        variables: { id: orderGid },
      }),
    });
  } catch (e) {
    console.error("[orders] Ownership fetch threw:", e);
    return fail("shopify_error", 400);
  }

  if (!ownershipRes.ok) {
    let bodyText = "";
    try { bodyText = (await ownershipRes.text()).slice(0, 500); } catch {}
    console.error(
      `[orders] Ownership query non-2xx ${ownershipRes.status} for order ${orderId} body=${bodyText}`,
    );
    if (ownershipRes.status === 401 || ownershipRes.status === 403) {
      return fail("shopify_error", 400, "admin_scope_or_auth");
    }
    return fail("shopify_error", 400);
  }

  let ownershipJson: any;
  try {
    ownershipJson = await ownershipRes.json();
  } catch {
    return fail("shopify_error", 400);
  }

  const topErrs = ownershipJson?.errors;
  if (Array.isArray(topErrs) && topErrs.length > 0) {
    const code = topErrs[0]?.extensions?.code;
    if (code === "THROTTLED") return fail("rate_limited", 429);
    console.error(
      "[orders] Ownership GraphQL errors",
      JSON.stringify(topErrs).slice(0, 500),
    );
    return fail("shopify_error", 400, code === "ACCESS_DENIED" ? "admin_scope" : undefined);
  }

  const order = ownershipJson?.data?.order;
  if (!order) {
    return fail("not_found", 404);
  }
  if (order.customer?.id !== customerGid) {
    return fail("forbidden", 403);
  }

  // 8. Update mutation.
  let updateRes: Response;
  try {
    updateRes = await fetch(adminGraphqlUrl, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": ADMIN_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query:
          "mutation OrderUpdateNote($input: OrderInput!) { orderUpdate(input: $input) { order { id note } userErrors { field message } } }",
        variables: { input: { id: orderGid, note } },
      }),
    });
  } catch (e) {
    console.error("[orders] orderUpdate fetch threw:", e);
    return fail("shopify_error", 400);
  }

  if (!updateRes.ok) {
    let bodyText = "";
    try { bodyText = (await updateRes.text()).slice(0, 500); } catch {}
    console.error(
      `[orders] orderUpdate non-2xx ${updateRes.status} for order ${orderId} body=${bodyText}`,
    );
    if (updateRes.status === 401 || updateRes.status === 403) {
      return fail("shopify_error", 400, "admin_scope_or_auth");
    }
    return fail("shopify_error", 400);
  }

  let updateJson: any;
  try {
    updateJson = await updateRes.json();
  } catch {
    return fail("shopify_error", 400);
  }

  const updateTopErrs = updateJson?.errors;
  if (Array.isArray(updateTopErrs) && updateTopErrs.length > 0) {
    const code = updateTopErrs[0]?.extensions?.code;
    if (code === "THROTTLED") return fail("rate_limited", 429);
    console.error(
      "[orders] orderUpdate GraphQL errors",
      JSON.stringify(updateTopErrs).slice(0, 500),
    );
    return fail(
      "shopify_error",
      400,
      code === "ACCESS_DENIED"
        ? "admin_scope"
        : (typeof updateTopErrs[0]?.message === "string"
            ? updateTopErrs[0].message
            : undefined),
    );
  }

  const userErrors = updateJson?.data?.orderUpdate?.userErrors;
  if (Array.isArray(userErrors) && userErrors.length > 0) {
    const msg = typeof userErrors[0]?.message === "string"
      ? userErrors[0].message
      : "Note rejected.";
    console.error("[orders] orderUpdate userErrors", JSON.stringify(userErrors).slice(0, 500));
    return fail("validation", 400, msg);
  }

  const savedNote = updateJson?.data?.orderUpdate?.order?.note ?? note;
  return jsonResponse({ ok: true, note: savedNote }, 200);
 } catch (e) {
  console.error("[orders] Unhandled exception:", e);
  return jsonResponse(
    { ok: false, error: "shopify_error", message: "internal_error" },
    400,
  );
 }
});
