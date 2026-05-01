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

// Accept either:
//   - activationUrl: full Shopify activation URL (preferred — matches
//     `customer.account_activation_url` in the invite email Liquid)
//   - customerId + token: legacy shape, reconstructed below
const bodySchema = z
  .object({
    activationUrl: z.string().url().optional(),
    customerId: z.string().min(1).optional(),
    token: z.string().min(1).optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),
  })
  .refine(
    (v) => !!v.activationUrl || (!!v.customerId && !!v.token),
    { message: "activationUrl or (customerId and token) is required" }
  );

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return sendError(405, ["Method not allowed"]);
  }

  const SHOPIFY_STORE_DOMAIN = Deno.env.get("SHOPIFY_STORE_DOMAIN");

  if (!SHOPIFY_STORE_DOMAIN) {
    console.error("Missing Shopify store domain");
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

  const { token, password } = parsed.data;

  try {
    // Use Shopify's account activation endpoint
    const activateUrl = `https://${SHOPIFY_STORE_DOMAIN}/account/activate`;

    const activateResponse = await fetch(activateUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "customer[activation_token]": token,
        "customer[password]": password,
        "customer[password_confirmation]": password,
      }).toString(),
      redirect: "manual",
    });

    // Shopify returns a 302 redirect on success
    if (activateResponse.status === 302 || activateResponse.status === 200) {
      return sendSuccess({ activated: true }, "Account has been activated successfully");
    }

    const responseText = await activateResponse.text();

    if (responseText.includes("already been activated") || responseText.includes("already active")) {
      return sendError(400, [
        "This account has already been activated. You can log in with your existing password.",
      ], "Already activated");
    }

    if (responseText.includes("is invalid") || responseText.includes("invalid")) {
      return sendError(400, [
        "This activation link is invalid or has already been used.",
      ], "Invalid activation link");
    }

    if (responseText.includes("expired")) {
      return sendError(400, [
        "This activation link has expired. Please contact support for a new activation link.",
      ], "Link expired");
    }

    console.error("Shopify activate response:", activateResponse.status, responseText.substring(0, 500));
    return sendError(400, [
      "Unable to activate account. The link may be expired or invalid.",
    ], "Activation failed");

  } catch (error) {
    console.error("Activate account error:", error);

    if (error instanceof TypeError && error.message.includes("fetch")) {
      return sendError(503, [
        "Unable to connect to the store. Please try again in a moment.",
      ], "Connection error");
    }

    return sendError(500, ["An unexpected error occurred. Please try again."]);
  }
});
