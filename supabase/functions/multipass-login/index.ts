import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Multipass login: verify the customer's password via the Storefront API,
// then mint a Shopify Multipass URL that logs them into the store directly.
// This bypasses the storefront login form entirely (no bot/human check).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function sendError(statusCode: number, errors: string[], message?: string, kind?: string) {
  return new Response(
    JSON.stringify({
      success: false,
      statusCode,
      message: message || "Error",
      errorMessage: errors,
      error: errors[0],
      kind,
    }),
    { status: statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

function sendSuccess<T>(data: T, message?: string) {
  return new Response(
    JSON.stringify({ success: true, statusCode: 200, data, message }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

const bodySchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
  return_to: z.string().max(500).optional(),
});

const STOREFRONT_API_VERSION = "2024-10";

let cachedStorefrontToken: string | null = null;
let inflightStorefrontToken: Promise<string | null> | null = null;

async function listExistingStorefrontToken(domain: string, adminToken: string, adminVersion: string): Promise<string | null> {
  try {
    const res = await fetch(`https://${domain}/admin/api/${adminVersion}/storefront_access_tokens.json`, {
      headers: { "X-Shopify-Access-Token": adminToken, "Content-Type": "application/json" },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const tokens: Array<{ access_token: string; title?: string }> = json?.storefront_access_tokens ?? [];
    if (!tokens.length) return null;
    const preferred = tokens.find((t) => (t.title || "").startsWith("lovable-")) ?? tokens[0];
    return preferred?.access_token ?? null;
  } catch {
    return null;
  }
}

async function getStorefrontToken(domain: string, adminToken: string, adminVersion: string): Promise<string | null> {
  if (cachedStorefrontToken) return cachedStorefrontToken;
  const envToken = Deno.env.get("SHOPIFY_STOREFRONT_ACCESS_TOKEN");
  if (envToken && envToken.length === 32 && /^[a-f0-9]+$/i.test(envToken)) {
    cachedStorefrontToken = envToken;
    return envToken;
  }
  if (inflightStorefrontToken) return inflightStorefrontToken;
  inflightStorefrontToken = (async () => {
    const existing = await listExistingStorefrontToken(domain, adminToken, adminVersion);
    if (existing) {
      cachedStorefrontToken = existing;
      return existing;
    }
    const res = await fetch(`https://${domain}/admin/api/${adminVersion}/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": adminToken },
      body: JSON.stringify({
        query: `mutation StorefrontTokenCreate($title: String!) {
          storefrontAccessTokenCreate(input: { title: $title }) {
            storefrontAccessToken { accessToken }
            userErrors { field message }
          }
        }`,
        variables: { title: `lovable-storefront-${Date.now()}` },
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const token = json?.data?.storefrontAccessTokenCreate?.storefrontAccessToken?.accessToken;
    if (token) cachedStorefrontToken = token;
    return token ?? null;
  })();
  try {
    return await inflightStorefrontToken;
  } finally {
    inflightStorefrontToken = null;
  }
}

const ACCESS_TOKEN_CREATE_MUTATION = `
  mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
    customerAccessTokenCreate(input: $input) {
      customerAccessToken { accessToken expiresAt }
      customerUserErrors { code field message }
    }
  }
`;

// Permanent record of every sign-in outcome (same sink customer-login uses).
async function recordLoginOutcome(opts: {
  email: string;
  reason: string;
  code?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return;
  try {
    await fetch(`${url}/rest/v1/rpc/record_reset_failure`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        _email: opts.email.trim().toLowerCase(),
        _reason: opts.reason.slice(0, 60),
        _code: (opts.code || "").slice(0, 60) || null,
        _user_agent: (opts.userAgent || "")?.slice(0, 400) || null,
      }),
    });
  } catch { /* telemetry only */ }
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Shopify Multipass token: AES-256-CBC encrypt the customer JSON with the
// first half of SHA256(secret), then HMAC-SHA256 the ciphertext with the
// second half. URL-safe base64 of ciphertext+signature.
async function buildMultipassUrl(
  domain: string,
  secret: string,
  customerData: Record<string, unknown>
): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.digest("SHA-256", enc.encode(secret));
  const keyBytes = new Uint8Array(keyMaterial);
  const encryptionKey = keyBytes.slice(0, 16);
  const signatureKey = keyBytes.slice(16, 32);

  const iv = crypto.getRandomValues(new Uint8Array(16));
  const aesKey = await crypto.subtle.importKey("raw", encryptionKey, { name: "AES-CBC" }, false, ["encrypt"]);
  const plaintext = enc.encode(JSON.stringify(customerData));
  const cipherBuf = await crypto.subtle.encrypt({ name: "AES-CBC", iv }, aesKey, plaintext);
  const ciphertext = new Uint8Array(cipherBuf);

  // Shopify expects IV prepended to the ciphertext.
  const payload = new Uint8Array(iv.length + ciphertext.length);
  payload.set(iv, 0);
  payload.set(ciphertext, iv.length);

  const hmacKey = await crypto.subtle.importKey(
    "raw",
    signatureKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", hmacKey, payload);
  const signature = new Uint8Array(sigBuf);

  const token = new Uint8Array(payload.length + signature.length);
  token.set(payload, 0);
  token.set(signature, payload.length);

  return `https://${domain}/account/login/multipass/${toBase64Url(token)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return sendError(405, ["Method not allowed"]);
  }

  const SHOPIFY_STORE_DOMAIN = Deno.env.get("SHOPIFY_STORE_DOMAIN");
  const ADMIN_TOKEN = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN");
  const ADMIN_VERSION = Deno.env.get("SHOPIFY_ADMIN_API_VERSION") || "2024-10";
  const MULTIPASS_SECRET = Deno.env.get("SHOPIFY_MULTIPASS_SECRET");

  if (!SHOPIFY_STORE_DOMAIN || !ADMIN_TOKEN) {
    return sendError(500, ["Server configuration error"]);
  }
  if (!MULTIPASS_SECRET) {
    return sendError(500, ["Multipass is not configured"], "Configuration error", "multipass_not_configured");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return sendError(400, ["Invalid JSON body"]);
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return sendError(400, parsed.error.issues.map((i) => i.message), "Validation failed");
  }

  const { email, password, return_to } = parsed.data;
  const normEmail = email.trim().toLowerCase();
  const userAgent = req.headers.get("user-agent");
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || null;

  const SB_URL = Deno.env.get("SUPABASE_URL")!;
  const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sbHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

  // Gate 1: only mint for an email whose password the app just confirmed as
  // correct while the store's background sign-in failed (recorded by
  // customer-login as login_rejected_password_valid in the last 3 minutes).
  try {
    const since = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    const r = await fetch(
      `${SB_URL}/rest/v1/registration_leads?select=reset_failure_reason,reset_failure_last_at&email=eq.${encodeURIComponent(normEmail)}&limit=1`,
      { headers: sbHeaders }
    );
    const rows = (await r.json()) as Array<{ reset_failure_reason: string | null; reset_failure_last_at: string | null }>;
    const row = rows?.[0];
    if (!row || row.reset_failure_reason !== "login_rejected_password_valid" || !row.reset_failure_last_at || row.reset_failure_last_at < since) {
      return sendError(403, ["Sign-in link not available."], "Not eligible", "not_eligible");
    }
  } catch {
    return sendError(403, ["Sign-in link not available."], "Not eligible", "not_eligible");
  }

  // Gate 2: cap attempts per email (5/hour) and per IP (20/hour).
  try {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const countOf = async (filter: string) => {
      const r = await fetch(`${SB_URL}/rest/v1/multipass_attempts?select=id&${filter}&created_at=gte.${hourAgo}`, {
        headers: { ...sbHeaders, Prefer: "count=exact", Range: "0-0" },
      });
      const cr = r.headers.get("content-range") || "*/0";
      return parseInt(cr.split("/")[1] || "0", 10) || 0;
    };
    const emailCount = await countOf(`email=eq.${encodeURIComponent(normEmail)}`);
    const ipCount = ip ? await countOf(`ip=eq.${encodeURIComponent(ip)}`) : 0;
    await fetch(`${SB_URL}/rest/v1/multipass_attempts`, {
      method: "POST",
      headers: sbHeaders,
      body: JSON.stringify({ email: normEmail, ip, outcome: emailCount >= 5 || ipCount >= 20 ? "capped" : "attempt" }),
    });
    if (emailCount >= 5 || ipCount >= 20) {
      await recordLoginOutcome({ email, reason: "multipass_capped", userAgent });
      return sendError(429, ["Too many attempts. Please wait a while and try again."], "Rate limited", "rate_limited");
    }
  } catch { /* fail closed below is too strict; gate 1 already passed */ }

  // Step 1: verify the password against the store. Never mint a Multipass
  // URL for credentials the store itself rejects.
  const storefrontToken = await getStorefrontToken(SHOPIFY_STORE_DOMAIN, ADMIN_TOKEN, ADMIN_VERSION);
  if (!storefrontToken) {
    return sendError(500, ["Server configuration error"]);
  }

  try {
    const response = await fetch(
      `https://${SHOPIFY_STORE_DOMAIN}/api/${STOREFRONT_API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": storefrontToken,
        },
        body: JSON.stringify({
          query: ACCESS_TOKEN_CREATE_MUTATION,
          variables: { input: { email, password } },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) cachedStorefrontToken = null;
      if (response.status === 429) {
        return sendError(429, ["Too many login attempts. Please wait a moment."], "Rate limited", "rate_limited");
      }
      return sendError(502, ["Unable to reach the store. Please try again."], "Upstream error");
    }

    const json = await response.json();
    const result = json.data?.customerAccessTokenCreate;
    const userErrors = result?.customerUserErrors ?? [];
    const topErrors: Array<{ message?: string; extensions?: { code?: string } }> = json.errors ?? [];
    const isThrottle = (code: string, msg: string) =>
      code === "THROTTLED" || /throttl|limit exceeded|too many/i.test(msg);

    if (topErrors.some((e) => isThrottle(e.extensions?.code || "", e.message || ""))) {
      await recordLoginOutcome({ email, reason: "multipass_throttled", userAgent });
      return sendError(429, ["Too many login attempts. Please wait a moment."], "Rate limited", "rate_limited");
    }

    if (userErrors.length > 0) {
      const first = userErrors[0];
      const code: string = first.code || "";
      const msg: string = (first.message || "").toLowerCase();
      if (isThrottle(code, msg)) {
        await recordLoginOutcome({ email, reason: "multipass_throttled", code, userAgent });
        return sendError(429, ["Too many login attempts. Please wait a moment."], "Rate limited", "rate_limited");
      }
      await recordLoginOutcome({ email, reason: "multipass_rejected", code: `${code}:${(first.message || "").slice(0, 40)}`, userAgent });
      if (code === "UNIDENTIFIED_CUSTOMER" || msg.includes("unidentified")) {
        return sendError(401, ["Incorrect email or password."], "Invalid credentials", "invalid_credentials");
      }
      if (code === "CUSTOMER_DISABLED" || msg.includes("disabled") || msg.includes("activate")) {
        return sendError(403, ["Your account isn't activated yet. Check your email for an activation link."], "Unactivated", "unactivated");
      }
      return sendError(400, [first.message || "Unable to log in."], "Login failed");
    }

    if (!result?.customerAccessToken?.accessToken) {
      await recordLoginOutcome({ email, reason: "multipass_no_token", userAgent });
      return sendError(502, ["Unable to reach the store. Please try again."], "Upstream error", "upstream");
    }

    // Step 2: password verified. Mint the Multipass URL.
    const customerData: Record<string, unknown> = {
      email: normEmail,
      created_at: new Date().toISOString(),
    };
    // Same-site paths only: "/x" ok; "//host" and "/\host" are off-site.
    if (return_to && /^\/(?![\/\\])/.test(return_to) && !/[\\\s]/.test(return_to)) {
      customerData.return_to = return_to;
    }

    const multipassUrl = await buildMultipassUrl(SHOPIFY_STORE_DOMAIN, MULTIPASS_SECRET, customerData);

    await recordLoginOutcome({ email, reason: "multipass_ok", userAgent });

    return sendSuccess({ multipassUrl }, "Multipass URL created");
  } catch (error) {
    console.error("Multipass login error:", error);
    try {
      const u = Deno.env.get("SUPABASE_URL");
      const k = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (u && k) {
        void fetch(`${u}/functions/v1/notify-error`, {
          method: "POST",
          headers: { Authorization: `Bearer ${k}`, apikey: k, "Content-Type": "application/json" },
          body: JSON.stringify({
            source: "multipass-login",
            message: error instanceof Error ? error.message : String(error),
            context: { stack: error instanceof Error ? error.stack?.slice(0, 2000) : null },
          }),
        }).catch(() => {});
      }
    } catch { /* never throw */ }
    return sendError(500, ["An unexpected error occurred. Please try again."]);
  }
});
