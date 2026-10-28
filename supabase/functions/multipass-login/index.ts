import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Multipass login: verify the customer's password via the Storefront API,
// then mint a Shopify Multipass URL that logs them into the store directly.
// This bypasses the storefront login form entirely (no bot/human check).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Bumped by every PR that changes this function, so a probe can tell which
// version is live (GitHub merges do not redeploy functions).
const FUNCTION_VERSION = "RETURN2K-20261028";

// Per-request stage durations, returned as a Server-Timing header.
class Timing {
  private last = performance.now();
  private parts: string[] = [];
  mark(stage: string) {
    const now = performance.now();
    this.parts.push(`${stage};dur=${Math.round(now - this.last)}`);
    this.last = now;
  }
  header() {
    return this.parts.join(", ");
  }
}
// Bookkeeping the customer doesn't need to wait for. waitUntil keeps the
// worker alive until it finishes after the response is sent.
function runInBackground(promise: Promise<unknown>): void {
  // deno-lint-ignore no-explicit-any
  const er = (globalThis as any).EdgeRuntime;
  const safe = promise.catch((e) => console.warn("background task failed:", e));
  if (er && typeof er.waitUntil === "function") er.waitUntil(safe);
}

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json", "X-Function-Version": FUNCTION_VERSION };

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
    { status: statusCode, headers: jsonHeaders }
  );
}

function sendSuccess<T>(data: T, message?: string) {
  return new Response(
    JSON.stringify({ success: true, statusCode: 200, data, message }),
    { status: 200, headers: jsonHeaders }
  );
}

// Same-site paths only: "/x" ok; "//host" and "/\host" are off-site.
// Must match currentStorePath() in src/components/registration/steps/SignInForm.tsx:
// a path the SPA sends that fails here is rejected with 400.
function isSameSitePath(p: string): boolean {
  return /^\/(?![\/\\])/.test(p) && !/[\\\s]/.test(p);
}

const bodySchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
  attemptId: z.string().uuid().optional(),
  passwordSource: z.enum(["unknown", "typed", "autofill", "paste", "mixed", "new_password"]).optional(),
  evidence: z.enum(["unknown", "input_event", "browser_autofill", "new_password"]).optional(),
  // Ad landings carry long click ids (fbclid, gclid) on the page the
  // customer signs in from; a short cap pushes them off Multipass.
  return_to: z.string().max(2000).optional(),
  context: z.enum(["password_reset", "sign_in"]).optional(),
});

const STOREFRONT_API_VERSION = "2024-10";

// Server-side Storefront calls must carry the buyer's IP, or Shopify counts
// every customer as one client and throttles sign-ins for everyone. Shopify
// only reads Shopify-Storefront-Buyer-IP alongside a private token, so the
// public token stays as the fallback until SHOPIFY_STOREFRONT_PRIVATE_TOKEN is set.
function storefrontHeaders(publicToken: string | null, buyerIp: string | null): Record<string, string> {
  const privateToken = Deno.env.get("SHOPIFY_STOREFRONT_PRIVATE_TOKEN");
  if (privateToken) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Shopify-Storefront-Private-Token": privateToken,
    };
    if (buyerIp) headers["Shopify-Storefront-Buyer-IP"] = buyerIp;
    return headers;
  }
  return { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": publicToken ?? "" };
}

// Admin state for a storefront "wrong password": invited/disabled accounts
// have no password yet. null on any lookup problem, so the caller keeps the
// plain 401. Same lookup customer-login uses.
async function lookupCustomerState(domain: string, adminToken: string, adminVersion: string, email: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://${domain}/admin/api/${adminVersion}/customers/search.json?query=${encodeURIComponent(`email:${email}`)}&fields=id,email,state`,
      { headers: { "X-Shopify-Access-Token": adminToken } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const wanted = email.trim().toLowerCase();
    const cust = (json?.customers ?? []).find((c: { email?: string }) => (c.email || "").toLowerCase() === wanted);
    return cust?.state ?? "not_found";
  } catch {
    return null;
  }
}

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
    if (opts.reason.endsWith("_throttled")) {
      await fetch(`${url}/rest/v1/multipass_attempts`, {
        method: "POST",
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ email: opts.email.trim().toLowerCase(), outcome: "throttled" }),
      }).catch(() => {});
    }
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

async function handleRequest(req: Request, timing: Timing): Promise<Response> {
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

  const { email, password, return_to, context } = parsed.data;
  if (return_to && !isSameSitePath(return_to)) {
    return sendError(400, ["Invalid return path."], "Invalid return_to", "invalid_return_to");
  }
  const normEmail = email.trim().toLowerCase();
  const userAgent = req.headers.get("user-agent");
  const ip = req.headers.get("cf-connecting-ip") || (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || null;

  const SB_URL = Deno.env.get("SUPABASE_URL")!;
  const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sbHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

  // Cap failed attempts per email (5/hour) and per IP (20/hour). This is the
  // primary sign-in path, so successful sign-ins are marked "ok" below and
  // don't count: a customer signing in on several devices is never capped.
  // The password check in step 1 is what authorizes a mint; Multipass would
  // otherwise re-enable a disabled (pending approval) account.
  // The attempt row is written while the store checks the password; only
  // the success path needs its id (to mark it "ok").
  let attemptId: Promise<string | null> = Promise.resolve(null);
  try {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const countOf = async (filter: string) => {
      const r = await fetch(`${SB_URL}/rest/v1/multipass_attempts?select=id&${filter}&outcome=neq.ok&created_at=gte.${hourAgo}`, {
        headers: { ...sbHeaders, Prefer: "count=exact", Range: "0-0" },
      });
      const cr = r.headers.get("content-range") || "*/0";
      return parseInt(cr.split("/")[1] || "0", 10) || 0;
    };
    const [emailCount, ipCount] = await Promise.all([
      countOf(`email=eq.${encodeURIComponent(normEmail)}`),
      ip ? countOf(`ip=eq.${encodeURIComponent(ip)}`) : Promise.resolve(0),
    ]);
    const capped = emailCount >= 5 || ipCount >= 20;
    attemptId = fetch(`${SB_URL}/rest/v1/multipass_attempts?select=id`, {
      method: "POST",
      headers: { ...sbHeaders, Prefer: "return=representation" },
      body: JSON.stringify({ email: normEmail, ip, outcome: capped ? "capped" : "attempt" }),
    })
      .then((r) => r.json())
      .then((rows: Array<{ id?: string }>) => rows?.[0]?.id ?? null)
      .catch(() => null);
    runInBackground(attemptId);
    if (capped) {
      runInBackground(recordLoginOutcome({ email, reason: "multipass_capped", userAgent }));
      return sendError(429, ["Too many attempts. Please wait a while and try again."], "Rate limited", "rate_limited");
    }
  } catch { /* cap bookkeeping is best effort; step 1 still checks the password */ }
  timing.mark("cap");

  // Step 1: verify the password against the store. Never mint a Multipass
  // URL for credentials the store itself rejects.
  const usePrivateToken = !!Deno.env.get("SHOPIFY_STOREFRONT_PRIVATE_TOKEN");
  const storefrontToken = usePrivateToken ? null : await getStorefrontToken(SHOPIFY_STORE_DOMAIN, ADMIN_TOKEN, ADMIN_VERSION);
  if (!usePrivateToken && !storefrontToken) {
    return sendError(500, ["Server configuration error"]);
  }

  try {
    const response = await fetch(
      `https://${SHOPIFY_STORE_DOMAIN}/api/${STOREFRONT_API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: storefrontHeaders(storefrontToken, ip),
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
    timing.mark("storefront");
    const result = json.data?.customerAccessTokenCreate;
    const userErrors = result?.customerUserErrors ?? [];
    const topErrors: Array<{ message?: string; extensions?: { code?: string } }> = json.errors ?? [];
    const isThrottle = (code: string, msg: string) =>
      code === "THROTTLED" || /throttl|limit exceeded|too many/i.test(msg);

    if (topErrors.some((e) => isThrottle(e.extensions?.code || "", e.message || ""))) {
      runInBackground(recordLoginOutcome({ email, reason: "multipass_throttled", userAgent }));
      return sendError(429, ["Too many login attempts. Please wait a moment."], "Rate limited", "rate_limited");
    }

    if (userErrors.length > 0) {
      const first = userErrors[0];
      const code: string = first.code || "";
      const msg: string = (first.message || "").toLowerCase();
      if (isThrottle(code, msg)) {
        runInBackground(recordLoginOutcome({ email, reason: "multipass_throttled", code, userAgent }));
        return sendError(429, ["Too many login attempts. Please wait a moment."], "Rate limited", "rate_limited");
      }
      runInBackground(recordLoginOutcome({ email, reason: "multipass_rejected", code: `${code}:${(first.message || "").slice(0, 40)}`, userAgent }));
      if (code === "UNIDENTIFIED_CUSTOMER" || msg.includes("unidentified")) {
        // Storefront answers the same for a wrong password and for an account
        // that never set one. Only the sign-in form asks Admin which.
        if (context === "sign_in") {
          const state = await lookupCustomerState(SHOPIFY_STORE_DOMAIN, ADMIN_TOKEN, ADMIN_VERSION, email);
          if (state === "invited" || state === "disabled") {
            runInBackground(recordLoginOutcome({ email, reason: "login_unactivated", code: state, userAgent }));
            return sendError(403, ["Your account isn't activated yet. Request a setup link to set your password."], "Unactivated", "unactivated");
          }
        }
        return sendError(401, ["Incorrect email or password."], "Invalid credentials", "invalid_credentials");
      }
      if (code === "CUSTOMER_DISABLED" || msg.includes("disabled") || msg.includes("activate")) {
        // Same text as customer-login's `unactivated`: one kind, one message.
        return sendError(403, ["Your account isn't activated yet. Request a setup link to set your password."], "Unactivated", "unactivated");
      }
      return sendError(400, [first.message || "Unable to log in."], "Login failed");
    }

    if (!result?.customerAccessToken?.accessToken) {
      runInBackground(recordLoginOutcome({ email, reason: "multipass_no_token", userAgent }));
      return sendError(502, ["Unable to reach the store. Please try again."], "Upstream error", "upstream");
    }

    // Step 2: password verified. Mint the Multipass URL.
    const customerData: Record<string, unknown> = {
      email: normEmail,
      created_at: new Date().toISOString(),
    };
    if (return_to) customerData.return_to = return_to;

    const multipassUrl = await buildMultipassUrl(SHOPIFY_STORE_DOMAIN, MULTIPASS_SECRET, customerData);
    timing.mark("mint");

    runInBackground(attemptId.then((id) => {
      if (!id) return;
      return fetch(`${SB_URL}/rest/v1/multipass_attempts?id=eq.${id}`, {
        method: "PATCH",
        headers: sbHeaders,
        body: JSON.stringify({ outcome: "ok" }),
      });
    }));
    runInBackground(recordLoginOutcome({ email, reason: "multipass_ok", userAgent }));

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
}

Deno.serve(async (req: Request) => {
  const timing = new Timing();
  const body = req.method === "POST" ? await req.clone().json().catch(() => null) : null;
  const response = await handleRequest(req, timing);
  const parsed = bodySchema.safeParse(body);
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (parsed.success && url && key) {
    const resultPromise = response.clone().json().catch(() => ({}));
    runInBackground((async () => {
      const result = await resultPromise;
      try {
        const recorded = await fetch(`${url}/rest/v1/sign_in_events`, {
          method: "POST",
          headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            email: parsed.data.email.trim().toLowerCase(),
            attempt_id: parsed.data.attemptId ?? null,
            source: "multipass-login",
            outcome: result.success ? "multipass_issued" : (result.kind || (response.status === 429 ? "rate_limited" : "error")),
            code: String(response.status),
            password_source: parsed.data.passwordSource ?? "unknown",
            evidence: parsed.data.evidence ?? "unknown",
            user_agent: req.headers.get("user-agent")?.slice(0, 400) ?? null,
          }),
        });
        if (!recorded.ok) console.warn("SIGN_IN_HISTORY_FAILED", recorded.status);
      } catch { console.warn("SIGN_IN_HISTORY_UNAVAILABLE"); }
    })());
  }
  const headers = new Headers(response.headers);
  headers.set("Server-Timing", timing.header());
  headers.set("Access-Control-Expose-Headers", "Server-Timing, X-Function-Version");
  return new Response(response.body, { status: response.status, headers });
});
