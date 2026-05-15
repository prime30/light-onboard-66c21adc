// POST /update-tax-exempt — invoked via Shopify App Proxy at
// https://dropdeadextensions.com/apps/account/update-tax-exempt
//
// Pivot 1: storage moved from Supabase Storage to Shopify Files.
//   - One platform (Shopify) for all customer-uploaded compliance docs.
//   - No SUPABASE_SERVICE_ROLE_KEY exposure inside this function.
//   - Files browseable by merchant in Shopify admin → Content → Files.
//
// Flow:
//   1. Verify Shopify App Proxy HMAC; extract logged_in_customer_id.
//   2. Validate uploaded file (size, MIME, magic bytes, filename).
//   3. Read prior tax_exempt_document GID from the customer metafield
//      (best-effort; failure does not block the upload).
//   4. stagedUploadsCreate (FILE, POST) → staged target URL + parameters.
//   5. POST file bytes as multipart/form-data to the staged target;
//      Shopify requires parameters BEFORE the file part, file LAST.
//   6. fileCreate (contentType FILE for pdf, IMAGE for jpg/png) → new file GID.
//   7. customerUpdate: taxExempt = true, metafield
//      custom.tax_exempt_document (type file_reference) = new file GID.
//   8. On success, best-effort fileDelete on the prior document GID.
//   9. Partial-failure: if customerUpdate fails after fileCreate succeeded,
//      best-effort fileDelete the new file so we never have a metafield
//      pointing at a deleted file or a flagged customer with no document.
//
// All error responses are 4xx (Shopify App Proxy renders 5xx as HTML).
// Admin API error bodies are NEVER echoed to the client; tags only.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-requested-with, accept",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_SHOP = "drop-dead-2428.myshopify.com";
const DEFAULT_ADMIN_API_VERSION = "2026-04";
const TIMESTAMP_SKEW_SECONDS = 60;
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
]);
const METAFIELD_NAMESPACE = "custom";
const METAFIELD_KEY = "tax_exempt_document";

type ErrorCode =
  | "unauthenticated"
  | "invalid_file"
  | "rate_limited"
  | "shopify_error";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fail(error: ErrorCode, status: number, message?: string): Response {
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

function sniffMimeMatches(bytes: Uint8Array, declared: string): boolean {
  if (bytes.length < 8) return false;
  if (declared === "application/pdf") {
    return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  }
  if (declared === "image/jpeg" || declared === "image/jpg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (declared === "image/png") {
    return (
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
    );
  }
  return false;
}

// ────────── Shopify Admin GraphQL helpers ──────────

interface AdminCtx {
  shop: string;
  version: string;
  token: string;
}

async function adminGraphQL<T = any>(
  ctx: AdminCtx,
  query: string,
  variables: Record<string, unknown>,
): Promise<
  | { ok: true; data: T }
  | { ok: false; status: number; tag?: string; userMessage?: string }
> {
  const url = `https://${ctx.shop}/admin/api/${ctx.version}/graphql.json`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": ctx.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch (e) {
    console.error("[update-tax-exempt] Admin fetch threw:", (e as Error).message);
    return { ok: false, status: 502 };
  }

  if (res.status === 429) return { ok: false, status: 429 };

  let bodyText = "";
  try { bodyText = await res.text(); } catch { /* ignore */ }

  if (!res.ok) {
    console.error(
      `[update-tax-exempt] Admin HTTP ${res.status}: ${bodyText.slice(0, 500)}`,
    );
    const tag = res.status === 401 || res.status === 403 ? "admin_scope_or_auth" : undefined;
    return { ok: false, status: res.status, tag };
  }

  let parsed: any = null;
  try { parsed = JSON.parse(bodyText); } catch {
    console.error("[update-tax-exempt] Admin returned non-JSON:", bodyText.slice(0, 500));
    return { ok: false, status: 502 };
  }

  if (parsed?.errors?.length) {
    const code = parsed.errors[0]?.extensions?.code;
    console.error(
      `[update-tax-exempt] GraphQL errors: ${JSON.stringify(parsed.errors).slice(0, 500)}`,
    );
    const tag = code === "ACCESS_DENIED" ? "admin_scope" : undefined;
    return { ok: false, status: 400, tag };
  }

  return { ok: true, data: parsed.data as T };
}

async function readPriorDocumentGid(
  ctx: AdminCtx,
  customerId: string,
): Promise<string | null> {
  const query = `
    query PriorTaxExemptDoc($id: ID!) {
      customer(id: $id) {
        metafield(namespace: "${METAFIELD_NAMESPACE}", key: "${METAFIELD_KEY}") {
          value
          type
        }
      }
    }
  `;
  const result = await adminGraphQL<{ customer: { metafield: { value: string; type: string } | null } | null }>(
    ctx,
    query,
    { id: `gid://shopify/Customer/${customerId}` },
  );
  if (!result.ok) return null;
  const value = result.data?.customer?.metafield?.value ?? null;
  if (typeof value === "string" && value.startsWith("gid://shopify/")) return value;
  return null;
}

interface StagedTarget {
  url: string;
  resourceUrl: string | null;
  parameters: Array<{ name: string; value: string }>;
}

async function stagedUploadsCreate(
  ctx: AdminCtx,
  filename: string,
  mimeType: string,
  size: number,
): Promise<{ ok: true; target: StagedTarget } | { ok: false; status: number; tag?: string }> {
  const mutation = `
    mutation StagedUploads($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets { url resourceUrl parameters { name value } }
        userErrors { field message }
      }
    }
  `;
  const variables = {
    input: [{
      filename,
      mimeType,
      resource: "FILE",
      httpMethod: "POST",
      fileSize: String(size),
    }],
  };
  const result = await adminGraphQL<{ stagedUploadsCreate: { stagedTargets: StagedTarget[]; userErrors: Array<{ message: string }> } }>(
    ctx,
    mutation,
    variables,
  );
  if (!result.ok) return result;
  const userErrors = result.data?.stagedUploadsCreate?.userErrors ?? [];
  if (userErrors.length) {
    console.error(`[update-tax-exempt] stagedUploadsCreate userErrors: ${JSON.stringify(userErrors).slice(0, 500)}`);
    return { ok: false, status: 400 };
  }
  const target = result.data?.stagedUploadsCreate?.stagedTargets?.[0];
  if (!target?.url) return { ok: false, status: 502 };
  return { ok: true, target };
}

async function uploadToStagedTarget(
  target: StagedTarget,
  bytes: Uint8Array,
  filename: string,
  mimeType: string,
): Promise<{ ok: true } | { ok: false; status: number }> {
  const fd = new FormData();
  // Parameters MUST come before the file part.
  for (const p of target.parameters) fd.append(p.name, p.value);
  fd.append("file", new Blob([bytes], { type: mimeType }), filename);

  let res: Response;
  try {
    res = await fetch(target.url, { method: "POST", body: fd });
  } catch (e) {
    console.error("[update-tax-exempt] staged upload fetch threw:", (e as Error).message);
    return { ok: false, status: 502 };
  }
  if (!res.ok && res.status !== 201) {
    let body = "";
    try { body = await res.text(); } catch { /* ignore */ }
    console.error(`[update-tax-exempt] staged upload HTTP ${res.status}: ${body.slice(0, 300)}`);
    return { ok: false, status: res.status };
  }
  return { ok: true };
}

async function fileCreate(
  ctx: AdminCtx,
  resourceUrl: string,
  filename: string,
  mimeType: string,
): Promise<{ ok: true; gid: string } | { ok: false; status: number; tag?: string }> {
  const contentType = mimeType === "application/pdf" ? "FILE" : "IMAGE";
  const mutation = `
    mutation FileCreate($files: [FileCreateInput!]!) {
      fileCreate(files: $files) {
        files { id fileStatus ... on GenericFile { url } ... on MediaImage { id } }
        userErrors { field message code }
      }
    }
  `;
  const variables = {
    files: [{
      alt: filename,
      contentType,
      originalSource: resourceUrl,
    }],
  };
  const result = await adminGraphQL<{ fileCreate: { files: Array<{ id: string }>; userErrors: Array<{ message: string }> } }>(
    ctx,
    mutation,
    variables,
  );
  if (!result.ok) return result;
  const userErrors = result.data?.fileCreate?.userErrors ?? [];
  if (userErrors.length) {
    console.error(`[update-tax-exempt] fileCreate userErrors: ${JSON.stringify(userErrors).slice(0, 500)}`);
    return { ok: false, status: 400 };
  }
  const gid = result.data?.fileCreate?.files?.[0]?.id;
  if (!gid) return { ok: false, status: 502 };
  return { ok: true, gid };
}

async function fileDelete(ctx: AdminCtx, gid: string): Promise<void> {
  const mutation = `
    mutation FileDelete($ids: [ID!]!) {
      fileDelete(fileIds: $ids) { deletedFileIds userErrors { message } }
    }
  `;
  try {
    await adminGraphQL(ctx, mutation, { ids: [gid] });
  } catch (e) {
    console.error("[update-tax-exempt] fileDelete threw:", (e as Error).message);
  }
}

async function customerSetTaxExempt(
  ctx: AdminCtx,
  customerId: string,
  fileGid: string,
): Promise<{ ok: true } | { ok: false; status: number; tag?: string; userMessage?: string }> {
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
      id: `gid://shopify/Customer/${customerId}`,
      taxExempt: true,
      metafields: [{
        namespace: METAFIELD_NAMESPACE,
        key: METAFIELD_KEY,
        type: "file_reference",
        value: fileGid,
      }],
    },
  };
  const result = await adminGraphQL<{ customerUpdate: { userErrors: Array<{ message: string }> } }>(
    ctx,
    mutation,
    variables,
  );
  if (!result.ok) return result;
  const userErrors = result.data?.customerUpdate?.userErrors ?? [];
  if (userErrors.length) {
    console.error(`[update-tax-exempt] customerUpdate userErrors: ${JSON.stringify(userErrors).slice(0, 500)}`);
    return { ok: false, status: 400, userMessage: userErrors[0]?.message };
  }
  return { ok: true };
}

// ────────── Handler ──────────

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return fail("shopify_error", 405, "Method not allowed");

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

    if (!APP_SECRET || !ADMIN_TOKEN) {
      console.error("[update-tax-exempt] Missing required env vars");
      return fail("shopify_error", 400, "Server configuration error");
    }

    const url = new URL(req.url);

    // 1. HMAC.
    const verified = await verifyAppProxySignature(url, APP_SECRET);
    if (!verified.ok) return fail("unauthenticated", 401);
    const params = verified.params;

    // 2. Customer id.
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
    try { form = await req.formData(); }
    catch { return fail("invalid_file", 400, "Invalid form data"); }
    const file = form.get("file");
    if (!(file instanceof File)) return fail("invalid_file", 400, "Missing file");
    if (file.size === 0) return fail("invalid_file", 400, "Empty file");
    if (file.size > MAX_FILE_BYTES) return fail("invalid_file", 400, "File exceeds 10 MB");
    if (!ALLOWED_MIME.has(file.type)) {
      return fail("invalid_file", 400, "File must be PDF, JPG, or PNG");
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!sniffMimeMatches(bytes, file.type)) {
      return fail("invalid_file", 400, "File contents do not match its declared type");
    }
    const filename = safeFilename(file.name);

    const ctx: AdminCtx = {
      shop: STORE_DOMAIN,
      version: ADMIN_API_VERSION,
      token: ADMIN_TOKEN,
    };

    // 6. Best-effort prior document GID for post-success cleanup.
    const priorGid = await readPriorDocumentGid(ctx, customerId);

    // 7. stagedUploadsCreate.
    const staged = await stagedUploadsCreate(ctx, filename, file.type, file.size);
    if (!staged.ok) {
      if (staged.status === 429) return fail("rate_limited", 429);
      return fail("shopify_error", 400, staged.tag);
    }

    // 8. POST bytes to staged target.
    const uploaded = await uploadToStagedTarget(staged.target, bytes, filename, file.type);
    if (!uploaded.ok) return fail("shopify_error", 400);

    // 9. fileCreate using resourceUrl.
    const resourceUrl = staged.target.resourceUrl;
    if (!resourceUrl) return fail("shopify_error", 400);
    const created = await fileCreate(ctx, resourceUrl, filename, file.type);
    if (!created.ok) {
      if (created.status === 429) return fail("rate_limited", 429);
      return fail("shopify_error", 400, created.tag);
    }
    const newFileGid = created.gid;

    // 10. customerUpdate (taxExempt + metafield). Orphan-cleanup on failure.
    const updated = await customerSetTaxExempt(ctx, customerId, newFileGid);
    if (!updated.ok) {
      await fileDelete(ctx, newFileGid);
      if (updated.status === 429) return fail("rate_limited", 429);
      return fail("shopify_error", 400, updated.tag ?? updated.userMessage);
    }

    // 11. Best-effort delete prior doc (single-active-doc policy).
    if (priorGid && priorGid !== newFileGid) {
      await fileDelete(ctx, priorGid);
    }

    return jsonResponse({ ok: true, file_gid: newFileGid }, 200);
  } catch (e) {
    console.error("[update-tax-exempt] Unhandled exception:", e);
    return jsonResponse(
      { ok: false, error: "shopify_error", message: "internal_error" },
      400,
    );
  }
});
