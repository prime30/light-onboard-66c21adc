import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

const bodySchema = z.object({ email: z.string().email("Valid email is required") });

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

  // Reuse an existing storefront token when possible - Shopify caps stores at
  // 100 storefront tokens; minting per cold start eventually exhausts the pool.
  const existing = await listExistingStorefrontToken(domain, adminToken, adminVersion);
  if (existing) {
    cachedStorefrontToken = existing;
    return existing;
  }

  const mutation = `mutation { storefrontAccessTokenCreate(input: { title: "lovable-recover-${Date.now()}" }) { storefrontAccessToken { accessToken } userErrors { field message } } }`;
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
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return sendError(400, parsed.error.issues.map((i) => i.message), "Validation failed");
  const { email } = parsed.data;

  // Step 1: look up the customer's Shopify state. If they're "invited"
  // (account created but activation URL never consumed), Storefront
  // customerRecover silently no-ops - Shopify will not send a reset
  // email to an unactivated account. We have to use the Admin
  // send_invite endpoint instead, which re-issues the original account
  // invite email. This is the exact failure mode that left
  // saraannfox97@yahoo.com stranded with no way to set a password.
  try {
    const lookupRes = await fetch(
      `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${ADMIN_VERSION}/customers/search.json?query=${encodeURIComponent(`email:${email}`)}`,
      { headers: { "X-Shopify-Access-Token": ADMIN_TOKEN } }
    );
    if (lookupRes.ok) {
      const lookupJson = await lookupRes.json();
      const cust = lookupJson?.customers?.[0];
      if (cust?.state === "invited" && cust?.id) {
        const inviteRes = await fetch(
          `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${ADMIN_VERSION}/customers/${cust.id}/send_invite.json`,
          {
            method: "POST",
            headers: {
              "X-Shopify-Access-Token": ADMIN_TOKEN,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ customer_invite: {} }),
          }
        );
        if (inviteRes.ok) {
          console.log("Re-sent account invite for invited customer:", email);
          return sendSuccess({ sent: true, channel: "invite" }, "We've sent you a fresh account-setup email.");
        }
        const inviteTxt = await inviteRes.text();
        console.error(
          "send_invite failed for invited customer:",
          email,
          inviteRes.status,
          inviteTxt.substring(0, 300)
        );
        // Fall through to customerRecover attempt below - better than nothing.
      }
    } else {
      console.warn("Admin customer lookup failed (non-blocking):", lookupRes.status);
    }
  } catch (lookupErr) {
    console.warn("Admin customer lookup threw (non-blocking):", lookupErr);
  }

  // Step 2: enabled / unknown customers → Storefront customerRecover.
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
    }

    return sendSuccess({ sent: true, channel: "recover" }, "Reset email sent if an account exists.");
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
});
