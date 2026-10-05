import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Bumped by every PR that changes this function, so a probe can tell which
// version is live (GitHub merges do not redeploy functions).
const FUNCTION_VERSION = "B-20261005";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "X-Function-Version": FUNCTION_VERSION,
};

function sendError(statusCode: number, errors: string[], message?: string) {
  return new Response(
    JSON.stringify({
      success: false,
      statusCode,
      message: message || "Error",
      errorMessage: errors,
      error: errors[0],
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
  // Honored only for service-role callers (support tools).
  force: z.boolean().optional(),
  source: z.string().max(40).optional(),
});

const DEFAULT_COOLDOWN_SECONDS = 600;

// RESET_EMAIL_COOLDOWN_SECONDS: unset -> 600, "0" -> no cooldown (kill switch).
// Read per request so a settings change applies without a redeploy.
function cooldownSeconds(): number {
  const raw = (Deno.env.get("RESET_EMAIL_COOLDOWN_SECONDS") ?? "").trim();
  if (raw === "") return DEFAULT_COOLDOWN_SECONDS;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : DEFAULT_COOLDOWN_SECONDS;
}

type Claim = { kind: "claimed"; at: string } | { kind: "recent" } | { kind: "unavailable" };

async function claimResetSend(email: string, cooldown: number, source: string | null): Promise<Claim> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return { kind: "unavailable" };
  try {
    const res = await fetch(`${url}/rest/v1/rpc/claim_reset_send`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ _email: email, _cooldown_seconds: cooldown, _source: source }),
    });
    if (!res.ok) {
      console.error("RESET_CLAIM_UNAVAILABLE", JSON.stringify({ email, status: res.status, body: (await res.text()).slice(0, 200) }));
      return { kind: "unavailable" };
    }
    const at = await res.json();
    if (typeof at === "string" && at) return { kind: "claimed", at };
    return { kind: "recent" };
  } catch (e) {
    console.error("RESET_CLAIM_UNAVAILABLE", JSON.stringify({ email, error: e instanceof Error ? e.message : String(e) }));
    return { kind: "unavailable" };
  }
}

async function releaseResetSend(email: string, claimedAt: string): Promise<void> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(`${url}/rest/v1/rpc/release_reset_send`, {
        method: "POST",
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ _email: email, _claimed_at: claimedAt }),
      });
      if (res.ok) return;
      if (attempt === 2) console.error("RESET_RELEASE_FAILED", JSON.stringify({ email, status: res.status }));
    } catch (e) {
      if (attempt === 2) console.error("RESET_RELEASE_FAILED", JSON.stringify({ email, error: e instanceof Error ? e.message : String(e) }));
    }
  }
}

const STOREFRONT_API_VERSION = "2024-10";

const RECOVER_MUTATION = `
  mutation customerRecover($email: String!) {
    customerRecover(email: $email) {
      customerUserErrors { code field message }
    }
  }
`;

// In-memory cache so we don't mint a new token on every invocation.
let cachedStorefrontToken: string | null = null;
let inflightStorefrontToken: Promise<string | null> | null = null;

async function listExistingStorefrontToken(domain: string, adminToken: string, adminVersion: string): Promise<string | null> {
  try {
    const res = await fetch(`https://${domain}/admin/api/${adminVersion}/storefront_access_tokens.json`, {
      headers: { "X-Shopify-Access-Token": adminToken, "Content-Type": "application/json" },
    });
    if (!res.ok) {
      console.error("Failed to list storefront tokens:", res.status, (await res.text()).slice(0, 300));
      return null;
    }
    const json = await res.json();
    const tokens: Array<{ access_token: string; title?: string }> = json?.storefront_access_tokens ?? [];
    if (!tokens.length) return null;
    const preferred = tokens.find((t) => (t.title || "").startsWith("lovable-")) ?? tokens[0];
    return preferred?.access_token ?? null;
  } catch (e) {
    console.error("List storefront tokens threw:", e);
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

    const mutation = `mutation { storefrontAccessTokenCreate(input: { title: "lovable-storefront-${Date.now()}" }) { storefrontAccessToken { accessToken } userErrors { field message } } }`;
    const res = await fetch(`https://${domain}/admin/api/${adminVersion}/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": adminToken },
      body: JSON.stringify({ query: mutation }),
    });
    if (!res.ok) {
      console.error("Failed to mint storefront token:", res.status, await res.text());
      return null;
    }
    const json = await res.json();
    const token = json?.data?.storefrontAccessTokenCreate?.storefrontAccessToken?.accessToken;
    if (!token) {
      console.error("No storefront token returned:", JSON.stringify(json));
      return null;
    }
    cachedStorefrontToken = token;
    return token;
  })();

  try {
    return await inflightStorefrontToken;
  } finally {
    inflightStorefrontToken = null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return sendError(405, ["Method not allowed"]);

  const SHOPIFY_STORE_DOMAIN = Deno.env.get("SHOPIFY_STORE_DOMAIN");
  const ADMIN_TOKEN = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN");
  const ADMIN_VERSION = Deno.env.get("SHOPIFY_ADMIN_API_VERSION") || "2024-10";

  if (!SHOPIFY_STORE_DOMAIN || !ADMIN_TOKEN) {
    console.error("Missing Shopify config", { hasDomain: !!SHOPIFY_STORE_DOMAIN, hasAdmin: !!ADMIN_TOKEN });
    return sendError(500, ["Server configuration error"]);
  }

  let body: unknown;
  try { body = await req.json(); } catch { return sendError(400, ["Invalid JSON body"]); }
  if (body && typeof body === "object" && typeof (body as { email?: unknown }).email === "string") {
    const b = body as { email: string };
    b.email = b.email.trim().toLowerCase();
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return sendError(400, parsed.error.issues.map((i) => i.message), "Validation failed");
  const { email } = parsed.data;
  const source = parsed.data.source ?? null;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const force = parsed.data.force === true && serviceKey !== "" && bearer === serviceKey;

  // Step 1: look up the customer's Shopify state (read-only).
  let lookup: "found" | "not_found" | "failed" = "failed";
  let cust: { id?: number | string; state?: string } | null = null;
  try {
    const lookupRes = await fetch(
      `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${ADMIN_VERSION}/customers/search.json?query=${encodeURIComponent(`email:${email}`)}`,
      { headers: { "X-Shopify-Access-Token": ADMIN_TOKEN } }
    );
    if (lookupRes.ok) {
      const lookupJson = await lookupRes.json();
      cust = lookupJson?.customers?.[0] ?? null;
      lookup = cust ? "found" : "not_found";
    } else {
      console.warn("Admin customer lookup failed (non-blocking):", lookupRes.status);
    }
  } catch (lookupErr) {
    console.warn("Admin customer lookup threw (non-blocking):", lookupErr);
  }

  // Step 2: one email per address per cooldown window. Claimed before any
  // Shopify write, because every new reset email kills the previous link.
  // Unknown emails and failed lookups never claim: an unprepared invited
  // account gets no email from customerRecover, so a claim would lock it out.
  const cooldown = cooldownSeconds();
  let claimedAt: string | null = null;
  if (lookup === "found" && cooldown > 0) {
    const claim = await claimResetSend(email, force ? 0 : cooldown, source);
    if (claim.kind === "recent") {
      console.log("RESET_RECENTLY_SENT", JSON.stringify({ email, source }));
      return sendSuccess(
        { sent: false, reason: "recently_sent" },
        "We just sent you a link. Use the newest email from us."
      );
    }
    if (claim.kind === "claimed") claimedAt = claim.at;
  }

  // Set only when Shopify accepted the send; otherwise the claim is released.
  let keepClaim = false;

  const prepareAndSend = async (): Promise<Response> => {
  // Step 3: recovery silently no-ops for invited/disabled customers. Move
  // those accounts to enabled with a random, unknown password first, verify
  // the state, then use Shopify's reset-password email. This bypasses the
  // storefront activation template, which has repeatedly produced links that
  // do not open a working setup UI.
  try {
    if (lookup === "found") {
      if ((cust?.state === "invited" || cust?.state === "disabled") && cust?.id) {
        const temporaryPassword = `${crypto.randomUUID()}Aa1!`;
        const enableRes = await fetch(
          `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${ADMIN_VERSION}/customers/${cust.id}.json`,
          {
            method: "PUT",
            headers: {
              "X-Shopify-Access-Token": ADMIN_TOKEN,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              customer: {
                id: Number(cust.id),
                password: temporaryPassword,
                password_confirmation: temporaryPassword,
                send_email_welcome: false,
              },
            }),
          }
        );
        if (!enableRes.ok) {
          console.error("Failed to prepare unactivated account for recovery:", email, enableRes.status);
          return sendError(502, [
            "We couldn't prepare this account for password setup. Please contact hello@dropdeadextensions.com.",
          ], "Account setup failed");
        }

        const verifyRes = await fetch(
          `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${ADMIN_VERSION}/customers/${cust.id}.json?fields=id,state`,
          { headers: { "X-Shopify-Access-Token": ADMIN_TOKEN } }
        );
        const verifyJson = verifyRes.ok ? await verifyRes.json() : null;
        if (verifyJson?.customer?.state !== "enabled") {
          console.error("Prepared account did not become enabled:", email, verifyJson?.customer?.state ?? "unknown");
          return sendError(502, [
            "We couldn't confirm this account is ready for password setup. Please contact hello@dropdeadextensions.com.",
          ], "Account setup unverified");
        }
        console.log("Prepared unactivated customer for verified password recovery:", email);
      }
    }
  } catch (prepareErr) {
    console.warn("Account prepare threw (non-blocking):", prepareErr);
  }

  // Step 4: enabled / unknown customers → Storefront customerRecover.
  const storefrontToken = await getStorefrontToken(SHOPIFY_STORE_DOMAIN, ADMIN_TOKEN, ADMIN_VERSION);
  if (!storefrontToken) return sendError(500, ["Server configuration error"]);

  try {
    const response = await fetch(
      `https://${SHOPIFY_STORE_DOMAIN}/api/${STOREFRONT_API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": storefrontToken },
        body: JSON.stringify({ query: RECOVER_MUTATION, variables: { email } }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("Storefront API HTTP error:", response.status, text.substring(0, 500));
      if (response.status === 401 || response.status === 403) {
        cachedStorefrontToken = null;
      }
      if (response.status === 429) return sendError(429, ["Too many requests. Please wait a moment."], "Rate limited");
      return sendSuccess({ sent: true }, "If an account exists, a reset email has been sent.");
    }

    const json = await response.json();
    if (json.errors?.length) {
      console.error("Storefront GraphQL errors for", email, ":", JSON.stringify(json.errors));
      return sendSuccess({ sent: true }, "If an account exists, a reset email has been sent.");
    }

    const userErrors = json.data?.customerRecover?.customerUserErrors ?? [];
    const throttled = userErrors.find((e: { code?: string; message?: string }) =>
      (e.code || "").includes("THROTTLED") || (e.message || "").toLowerCase().includes("throttle")
    );
    if (throttled) return sendError(429, ["Too many requests. Please wait a moment before trying again."], "Rate limited");

    if (userErrors.length > 0) {
      // Log per-email so support can correlate "I never got the reset"
      // complaints with what Shopify actually returned.
      console.error("customerRecover userErrors for", email, ":", JSON.stringify(userErrors));
    } else {
      keepClaim = true;
    }

    return sendSuccess({ sent: true, channel: "recover" }, "Password setup email sent if an account exists.");
  } catch (error) {
    console.error("Recover password error:", error);
    try {
      const u = Deno.env.get("SUPABASE_URL");
      const k = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (u && k) {
        void fetch(`${u}/functions/v1/notify-error`, {
          method: "POST",
          headers: { Authorization: `Bearer ${k}`, apikey: k, "Content-Type": "application/json" },
          body: JSON.stringify({
            source: "recover-password",
            message: error instanceof Error ? error.message : String(error),
            context: { stack: error instanceof Error ? error.stack?.slice(0, 2000) : null },
          }),
        }).catch(() => {});
      }
    } catch { /* never throw */ }
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return sendError(503, ["Unable to connect to the store. Please try again."], "Connection error");
    }
    return sendError(500, ["An unexpected error occurred. Please try again."]);
  }
  };

  try {
    return await prepareAndSend();
  } finally {
    if (claimedAt && !keepClaim) await releaseResetSend(email, claimedAt);
  }
});
