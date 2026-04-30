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
});

const STOREFRONT_API_VERSION = "2024-10";

const RECOVER_MUTATION = `
  mutation customerRecover($email: String!) {
    customerRecover(email: $email) {
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

  const { email } = parsed.data;

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
          query: RECOVER_MUTATION,
          variables: { email },
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("Storefront API HTTP error:", response.status, text.substring(0, 500));
      if (response.status === 429) {
        return sendError(429, ["Too many requests. Please wait a moment."], "Rate limited");
      }
      // Don't leak upstream details; treat as success-shape to avoid enumeration.
      return sendSuccess({ sent: true }, "If an account exists, a reset email has been sent.");
    }

    const json = await response.json();

    if (json.errors?.length) {
      console.error("Storefront GraphQL errors:", JSON.stringify(json.errors));
      // Same: avoid leaking. Caller already pre-checked existence via customer-gate.
      return sendSuccess({ sent: true }, "If an account exists, a reset email has been sent.");
    }

    const userErrors = json.data?.customerRecover?.customerUserErrors ?? [];
    // Shopify intentionally returns no error for non-existent accounts; throttled
    // requests come back as a userError. Surface only throttling explicitly.
    const throttled = userErrors.find((e: { code?: string; message?: string }) =>
      (e.code || "").includes("THROTTLED") || (e.message || "").toLowerCase().includes("throttle")
    );
    if (throttled) {
      return sendError(429, ["Too many requests. Please wait a moment before trying again."], "Rate limited");
    }

    return sendSuccess({ sent: true }, "Reset email sent if an account exists.");
  } catch (error) {
    console.error("Recover password error:", error);
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return sendError(503, ["Unable to connect to the store. Please try again."], "Connection error");
    }
    return sendError(500, ["An unexpected error occurred. Please try again."]);
  }
});
