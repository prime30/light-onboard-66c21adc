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
  const STOREFRONT_TOKEN = Deno.env.get("SHOPIFY_STOREFRONT_ACCESS_TOKEN");

  if (!SHOPIFY_STORE_DOMAIN || !STOREFRONT_TOKEN) {
    console.error("Missing Shopify config", {
      hasDomain: !!SHOPIFY_STORE_DOMAIN,
      hasToken: !!STOREFRONT_TOKEN,
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

  try {
    const response = await fetch(
      `https://${SHOPIFY_STORE_DOMAIN}/api/${STOREFRONT_API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": STOREFRONT_TOKEN,
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
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return sendError(503, ["Unable to connect to the store. Please try again."], "Connection error");
    }
    return sendError(500, ["An unexpected error occurred. Please try again."]);
  }
});
