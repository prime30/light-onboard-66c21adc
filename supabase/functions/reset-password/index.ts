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
  customerId: z.string().min(1, "Customer ID is required"),
  token: z.string().min(1, "Token is required"),
  password: z.string().min(5, "Password must be at least 5 characters"),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return sendError(405, ["Method not allowed"]);
  }

  const SHOPIFY_ADMIN_ACCESS_TOKEN = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN");
  const SHOPIFY_STORE_DOMAIN = Deno.env.get("SHOPIFY_STORE_DOMAIN");

  if (!SHOPIFY_ADMIN_ACCESS_TOKEN || !SHOPIFY_STORE_DOMAIN) {
    console.error("Missing Shopify secrets");
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

  const { customerId, token, password } = parsed.data;

  try {
    // Use Shopify Admin REST API to reset the customer password
    const shopifyUrl = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/customers/${customerId}.json`;

    // First, verify the account by attempting the reset via the Storefront-style endpoint
    // Shopify doesn't have a direct Admin API for token-based password reset,
    // so we use the account activation/reset URL approach
    const resetUrl = `https://${SHOPIFY_STORE_DOMAIN}/account/reset`;

    const resetResponse = await fetch(resetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "customer[reset_password_token]": token,
        "customer[password]": password,
        "customer[password_confirmation]": password,
      }).toString(),
      redirect: "manual",
    });

    // Shopify returns a 302 redirect on success
    if (resetResponse.status === 302 || resetResponse.status === 200) {
      return sendSuccess({ reset: true }, "Password has been reset successfully");
    }

    // Try to extract error from response
    const responseText = await resetResponse.text();

    if (responseText.includes("is invalid") || responseText.includes("invalid")) {
      return sendError(400, [
        "This reset link is invalid or has already been used. Please request a new password reset.",
      ], "Invalid reset link");
    }

    if (responseText.includes("expired")) {
      return sendError(400, [
        "This reset link has expired. Please request a new password reset email.",
      ], "Link expired");
    }

    console.error("Shopify reset response:", resetResponse.status, responseText.substring(0, 500));
    return sendError(400, [
      "Unable to reset password. The link may be expired or invalid.",
    ], "Reset failed");

  } catch (error) {
    console.error("Reset password error:", error);

    if (error instanceof TypeError && error.message.includes("fetch")) {
      return sendError(503, [
        "Unable to connect to the store. Please try again in a moment.",
      ], "Connection error");
    }

    return sendError(500, ["An unexpected error occurred. Please try again."]);
  }
});
