// POST /update-tax-exempt — invoked via Shopify App Proxy at
// https://dropdeadextensions.com/apps/account/tax-exempt
//
// Trust chain (mirrors change-password and orders):
//   1. Customer is signed into /account → Shopify session cookie valid.
//   2. Theme JS POSTs multipart form-data through the App Proxy.
//      Shopify appends a signed query string with logged_in_customer_id.
//   3. We HMAC-verify the query, upload the file to Supabase Storage
//      using the service role key, then call Admin API customerUpdate
//      to set taxExempt: true and write the document path metafield.
//
// Forbidden behaviors:
//   - Never trust logged_in_customer_id without HMAC verification.
//   - Never accept customer id from the request body / form.
//   - Never echo Admin API error bodies verbatim to the client.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-requested-with, accept",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EXPECTED_SHOP = "drop-dead-2428.myshopify.com";
const ADMIN_API_VERSION = "2026-04";
const TIMESTAMP_SKEW_SECONDS = 60;
const STORAGE_BUCKET = "registration-documents";
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
]);
const METAFIELD_NAMESPACE = "compliance";
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
  return jsonResponse({ ok: false, error, message }, status);
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
  // Strip path components, keep alphanum/dash/dot/underscore.
  const base = name.split(/[\\/]/).pop() ?? "file";
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return fail("shopify_error", 405, "Method not allowed");

    const APP_SECRET =
      Deno.env.get("SHOPIFY_ACCOUNT_APP_SECRET") ?? Deno.env.get("SHOPIFY_APP_API_SECRET");
    const ADMIN_TOKEN = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN");
    const STORE_DOMAIN = Deno.env.get("SHOPIFY_STORE_DOMAIN") ?? EXPECTED_SHOP;
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
    if (file.size > MAX_FILE_BYTES) {
      return fail("invalid_file", 400, "File exceeds 10 MB");
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return fail("invalid_file", 400, "File must be PDF, JPG, or PNG");
    }

    // 6. Upload to Supabase Storage (service role bypasses RLS).
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const objectPath = `shopify/${customerId}/tax-exempt/${Date.now()}-${safeFilename(file.name)}`;
    const { error: uploadErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(objectPath, file, {
        contentType: file.type,
        upsert: false,
      });
    if (uploadErr) {
      console.error("[update-tax-exempt] Storage upload failed:", uploadErr.message);
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
      return fail("shopify_error", 400);
    }

    if (adminRes.status === 429) return fail("rate_limited", 429);

    let bodyText = "";
    try {
      bodyText = await adminRes.text();
    } catch {
      /* ignore */
    }

    if (!adminRes.ok) {
      console.error(
        `[update-tax-exempt] Admin HTTP ${adminRes.status} for customer ${customerId}: ${bodyText.slice(0, 500)}`,
      );
      const tag =
        adminRes.status === 401 || adminRes.status === 403 ? "admin_scope_or_auth" : undefined;
      return fail("shopify_error", 400, tag);
    }

    let parsed: any = null;
    try {
      parsed = JSON.parse(bodyText);
    } catch {
      console.error("[update-tax-exempt] Admin returned non-JSON:", bodyText.slice(0, 500));
      return fail("shopify_error", 400);
    }

    if (parsed?.errors?.length) {
      const code = parsed.errors[0]?.extensions?.code;
      console.error(
        `[update-tax-exempt] GraphQL errors for ${customerId}: ${JSON.stringify(parsed.errors).slice(0, 500)}`,
      );
      const tag = code === "ACCESS_DENIED" ? "admin_scope" : undefined;
      return fail("shopify_error", 400, tag);
    }

    const userErrors = parsed?.data?.customerUpdate?.userErrors ?? [];
    if (userErrors.length) {
      console.error(
        `[update-tax-exempt] userErrors for ${customerId}: ${JSON.stringify(userErrors).slice(0, 500)}`,
      );
      return fail("shopify_error", 400, userErrors[0]?.message ?? undefined);
    }

    return jsonResponse({ ok: true, path: objectPath }, 200);
  } catch (e) {
    console.error("[update-tax-exempt] Unhandled exception:", e);
    return jsonResponse(
      { ok: false, error: "shopify_error", message: "internal_error" },
      400,
    );
  }
});
