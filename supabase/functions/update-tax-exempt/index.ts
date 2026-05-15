// POST /update-tax-exempt — invoked via Shopify App Proxy at
// https://dropdeadextensions.com/apps/account/tax-exempt
//
// Trust chain (mirrors change-password and orders):
//   1. Customer is signed into /account → Shopify session cookie valid.
//   2. Theme JS POSTs multipart form-data through the App Proxy.
//      Shopify appends a signed query string with logged_in_customer_id.
//   3. We HMAC-verify the query, upload the file to Supabase Storage
//      (service role), then call Admin API customerUpdate to set
//      taxExempt: true and write the document path metafield.
//   4. If Admin update fails after upload, best-effort delete the
//      orphaned Storage object.
//
// Forbidden:
//   - Never trust logged_in_customer_id without HMAC verification.
//   - Never accept customer id from request body / form.
//   - Never echo Admin API error bodies verbatim to the client.
//   - Never return 5xx — App Proxy masks 5xx with HTML.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-requested-with, accept",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_SHOP = "drop-dead-2428.myshopify.com";
const DEFAULT_ADMIN_API_VERSION = "2026-04";
const TIMESTAMP_SKEW_SECONDS = 60;
const STORAGE_BUCKET = "registration-documents";
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
]);
const METAFIELD_NAMESPACE = "custom";
const METAFIELD_KEY = "tax_exempt_document_url";

type ErrorCode =
  | "unauthenticated"
  | "invalid_file"
  | "rate_limited"
  | "shopify_error"
  | "storage_error";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fail(error: ErrorCode, status: number, message?: string): Response {
  // Clamp to 4xx — App Proxy turns 5xx into HTML error pages.
  const safeStatus = status >= 500 ? 400 : status;
  return jsonResponse({ ok: false, error, message }, safeStatus);
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
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
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
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
  const message = sortedKeys.map((k) => `${k}=${grouped.get(k)!.join(",")}`).join("");

  const expected = await hmacSha256Hex(appSecret, message);
  if (!timingSafeEqualHex(signature, expected)) return { ok: false };

  const params: Record<string, string> = {};
  for (const [k, list] of grouped.entries()) params[k] = list.join(",");
  return { ok: true, params };
}

function safeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "file";
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";
}

/**
 * Magic-byte sniff. Confirms the declared MIME matches the actual bytes for
 * PDF / JPEG / PNG. Defense against a renamed .exe with a forged Content-Type.
 */
function sniffMimeMatches(bytes: Uint8Array, declared: string): boolean {
  if (bytes.length < 4) return false;
  // PDF: %PDF
  if (declared === "application/pdf") {
    return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  }
  // JPEG: FF D8 FF
  if (declared === "image/jpeg" || declared === "image/jpg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (declared === "image/png") {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }
  return false;
}

async function uploadToStorage(
  supabaseUrl: string,
  serviceRoleKey: string,
  objectPath: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<{ ok: true } | { ok: false; status: number; body: string }> {
  const endpoint = `${supabaseUrl}/storage/v1/object/${STORAGE_BUCKET}/${objectPath}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": contentType,
      "x-upsert": "false",
      "cache-control": "3600",
    },
    body: bytes,
  });
  if (res.ok) return { ok: true };
  let body = "";
  try { body = await res.text(); } catch { /* ignore */ }
  return { ok: false, status: res.status, body };
}

async function deleteFromStorage(
  supabaseUrl: string,
  serviceRoleKey: string,
  objectPath: string,
): Promise<void> {
  try {
    await fetch(`${supabaseUrl}/storage/v1/object/${STORAGE_BUCKET}/${objectPath}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${serviceRoleKey}` },
    });
  } catch (e) {
    console.error("[update-tax-exempt] orphan cleanup failed:", (e as Error).message);
  }
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return fail("shopify_error", 405, "Method not allowed");

    // Secrets — prefer the Account API Proxy names, fall back to legacy.
    const APP_SECRET =
      Deno.env.get("SHOPIFY_CUSTOMERS_PROXY_SECRET") ??
      Deno.env.get("SHOPIFY_ACCOUNT_APP_SECRET") ??
      Deno.env.get("SHOPIFY_APP_API_SECRET");
    const ADMIN_TOKEN =
      Deno.env.get("SHOPIFY_ADMIN_API_TOKEN") ??
      Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN");
    const STORE_DOMAIN =
      Deno.env.get("SHOPIFY_SHOP_DOMAIN") ??
      Deno.env.get("SHOPIFY_STORE_DOMAIN") ??
      DEFAULT_SHOP;
    const ADMIN_API_VERSION =
      Deno.env.get("SHOPIFY_ADMIN_API_VERSION") ?? DEFAULT_ADMIN_API_VERSION;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!APP_SECRET || !ADMIN_TOKEN || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error("[update-tax-exempt] Missing required env vars");
      return fail("shopify_error", 400, "Server configuration error");
    }

    const url = new URL(req.url);

    // 1. HMAC verification.
    const verified = await verifyAppProxySignature(url, APP_SECRET);
    if (!verified.ok) return fail("unauthenticated", 401);
    const params = verified.params;

    // 2. logged_in_customer_id.
    const customerId = params["logged_in_customer_id"];
    if (!customerId || !/^\d+$/.test(customerId)) return fail("unauthenticated", 401);

    // 3. Shop allowlist.
    if (params["shop"] !== STORE_DOMAIN) return fail("unauthenticated", 401);

    // 4. Timestamp window.
    const ts = Number(params["timestamp"]);
    if (!Number.isFinite(ts)) return fail("unauthenticated", 401);
    if (Math.abs(Math.floor(Date.now() / 1000) - ts) > TIMESTAMP_SKEW_SECONDS) {
      return fail("unauthenticated", 401);
    }

    // 5. Multipart parse.
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return fail("invalid_file", 400, "Invalid form data");
    }
    const file = form.get("file");
    if (!(file instanceof File)) return fail("invalid_file", 400, "Missing file");
    if (file.size === 0) return fail("invalid_file", 400, "Empty file");
    if (file.size > MAX_FILE_BYTES) return fail("invalid_file", 400, "File exceeds 10 MB");
    if (!ALLOWED_MIME.has(file.type)) {
      return fail("invalid_file", 400, "File must be PDF, JPG, or PNG");
    }

    // 5b. Magic-byte sniff.
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!sniffMimeMatches(bytes, file.type)) {
      return fail("invalid_file", 400, "File contents do not match its declared type");
    }

    // 6. Upload via Storage REST.
    const objectPath = `shopify/${customerId}/tax-exempt/${Date.now()}-${safeFilename(file.name)}`;
    const uploadResult = await uploadToStorage(
      SUPABASE_URL,
      SERVICE_ROLE_KEY,
      objectPath,
      bytes,
      file.type,
    );
    if (!uploadResult.ok) {
      console.error(
        `[update-tax-exempt] Storage ${uploadResult.status}: ${uploadResult.body.slice(0, 300)}`,
      );
      return fail("storage_error", 400, "Could not store the document");
    }

    // 7. Shopify Admin API: customerUpdate (taxExempt + metafield).
    const customerGid = `gid://shopify/Customer/${customerId}`;
    const mutation = `
      mutation TaxExemptUpdate($input: CustomerInput!) {
        customerUpdate(input: $input) {
          customer { id taxExempt }
          userErrors { field message code }
        }
      }
    `;
    const variables = {
      input: {
        id: customerGid,
        taxExempt: true,
        metafields: [
          {
            namespace: METAFIELD_NAMESPACE,
            key: METAFIELD_KEY,
            type: "single_line_text_field",
            value: objectPath,
          },
        ],
      },
    };

    const adminUrl = `https://${STORE_DOMAIN}/admin/api/${ADMIN_API_VERSION}/graphql.json`;
    let adminRes: Response;
    try {
      adminRes = await fetch(adminUrl, {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": ADMIN_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: mutation, variables }),
      });
    } catch (e) {
      console.error("[update-tax-exempt] Admin API fetch threw:", e);
      await deleteFromStorage(SUPABASE_URL, SERVICE_ROLE_KEY, objectPath);
      return fail("shopify_error", 400);
    }

    if (adminRes.status === 429) {
      await deleteFromStorage(SUPABASE_URL, SERVICE_ROLE_KEY, objectPath);
      return fail("rate_limited", 429);
    }

    let bodyText = "";
    try { bodyText = await adminRes.text(); } catch { /* ignore */ }

    if (!adminRes.ok) {
      console.error(
        `[update-tax-exempt] Admin HTTP ${adminRes.status} for customer ${customerId}: ${bodyText.slice(0, 500)}`,
      );
      await deleteFromStorage(SUPABASE_URL, SERVICE_ROLE_KEY, objectPath);
      const tag =
        adminRes.status === 401 || adminRes.status === 403 ? "admin_scope_or_auth" : undefined;
      return fail("shopify_error", 400, tag);
    }

    let parsed: any = null;
    try { parsed = JSON.parse(bodyText); } catch {
      console.error("[update-tax-exempt] Admin returned non-JSON:", bodyText.slice(0, 500));
      await deleteFromStorage(SUPABASE_URL, SERVICE_ROLE_KEY, objectPath);
      return fail("shopify_error", 400);
    }

    if (parsed?.errors?.length) {
      const code = parsed.errors[0]?.extensions?.code;
      console.error(
        `[update-tax-exempt] GraphQL errors for ${customerId}: ${JSON.stringify(parsed.errors).slice(0, 500)}`,
      );
      await deleteFromStorage(SUPABASE_URL, SERVICE_ROLE_KEY, objectPath);
      const tag = code === "ACCESS_DENIED" ? "admin_scope" : undefined;
      return fail("shopify_error", 400, tag);
    }

    const userErrors = parsed?.data?.customerUpdate?.userErrors ?? [];
    if (userErrors.length) {
      console.error(
        `[update-tax-exempt] userErrors for ${customerId}: ${JSON.stringify(userErrors).slice(0, 500)}`,
      );
      await deleteFromStorage(SUPABASE_URL, SERVICE_ROLE_KEY, objectPath);
      return fail("shopify_error", 400, userErrors[0]?.message ?? undefined);
    }

    return jsonResponse({ ok: true, file_path: objectPath }, 200);
  } catch (e) {
    console.error("[update-tax-exempt] Unhandled exception:", e);
    return jsonResponse(
      { ok: false, error: "shopify_error", message: "internal_error" },
      400,
    );
  }
});
