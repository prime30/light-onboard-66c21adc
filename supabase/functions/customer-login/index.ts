import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

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
    {
      status: statusCode,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

function sendSuccess<T>(data: T, message?: string) {
  return new Response(
    JSON.stringify({
      success: true,
      statusCode: 200,
      data,
      message,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

const bodySchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

const STOREFRONT_API_VERSION = "2024-10";

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

  const res = await fetch(`https://${domain}/admin/api/${adminVersion}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": adminToken,
    },
    body: JSON.stringify({
      query: `mutation StorefrontTokenCreate($title: String!) {
        storefrontAccessTokenCreate(input: { title: $title }) {
          storefrontAccessToken { accessToken }
          userErrors { field message }
        }
      }`,
      variables: { title: `lovable-login-${Date.now()}` },
    }),
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

const ACCESS_TOKEN_CREATE_MUTATION = `
  mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
    customerAccessTokenCreate(input: $input) {
      customerAccessToken { accessToken expiresAt }
      customerUserErrors { code field message }
    }
  }
`;

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

  if (!SHOPIFY_STORE_DOMAIN || !ADMIN_TOKEN) {
    console.error("Missing Shopify config", {
      hasDomain: !!SHOPIFY_STORE_DOMAIN,
      hasAdmin: !!ADMIN_TOKEN,
    });
    return sendError(500, ["Server configuration error"]);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return sendError(400, ["Invalid JSON body"]);
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => i.message);
    return sendError(400, errors, "Validation failed");
  }

  const { email, password } = parsed.data;
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
      const text = await response.text();
      console.error("Storefront API HTTP error:", response.status, text.substring(0, 500));
      if (response.status === 401 || response.status === 403) {
        cachedStorefrontToken = null;
      }
      if (response.status === 429) {
        return sendError(429, ["Too many login attempts. Please wait a moment."], "Rate limited", "rate_limited");
      }
      return sendError(502, ["Unable to reach the store. Please try again."], "Upstream error");
    }

    const json = await response.json();

    if (json.errors?.length) {
      console.error("Storefront GraphQL errors:", JSON.stringify(json.errors));
      return sendError(400, ["Unable to log in. Please try again."], "Login failed");
    }

    const result = json.data?.customerAccessTokenCreate;
    const userErrors = result?.customerUserErrors ?? [];

    if (userErrors.length > 0) {
      const first = userErrors[0];
      const code: string = first.code || "";
      const msg: string = (first.message || "").toLowerCase();

      if (code === "UNIDENTIFIED_CUSTOMER" || msg.includes("unidentified")) {
        // Shopify intentionally does not distinguish wrong password from
        // missing account at this endpoint. Return a generic message.
        return sendError(401, ["Incorrect email or password."], "Invalid credentials", "invalid_credentials");
      }
      if (code === "CUSTOMER_DISABLED" || msg.includes("disabled") || msg.includes("activate")) {
        return sendError(403, [
          "Your account isn't activated yet. Check your email for an activation link.",
        ], "Unactivated", "unactivated");
      }
      return sendError(400, [first.message || "Unable to log in."], "Login failed");
    }

    const tokenObj = result?.customerAccessToken;
    if (!tokenObj?.accessToken) {
      console.error("Storefront returned no token:", JSON.stringify(result));
      return sendError(401, ["Incorrect email or password."], "Invalid credentials", "invalid_credentials");
    }

    return sendSuccess(
      {
        accessToken: tokenObj.accessToken,
        expiresAt: tokenObj.expiresAt,
      },
      "Logged in successfully"
    );
  } catch (error) {
    console.error("Customer login error:", error);
    try {
      const u = Deno.env.get("SUPABASE_URL");
      const k = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (u && k) {
        void fetch(`${u}/functions/v1/notify-error`, {
          method: "POST",
          headers: { Authorization: `Bearer ${k}`, apikey: k, "Content-Type": "application/json" },
          body: JSON.stringify({
            source: "customer-login",
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
