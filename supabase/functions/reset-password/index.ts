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

// Accept either:
//   - resetUrl: full Shopify reset URL (preferred — matches `customer.reset_password_url`)
//   - customerId + token: legacy shape, reconstructed below
const bodySchema = z
  .object({
    resetUrl: z.string().url().optional(),
    customerId: z.string().min(1).optional(),
    token: z.string().min(1).optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),
  })
  .refine(
    (v) => !!v.resetUrl || (!!v.customerId && !!v.token),
    { message: "resetUrl or (customerId and token) is required" }
  );

const STOREFRONT_API_VERSION = "2024-10";

const RESET_BY_URL_MUTATION = `
  mutation customerResetByUrl($resetUrl: URL!, $password: String!) {
    customerResetByUrl(resetUrl: $resetUrl, password: $password) {
      customer { id email firstName }
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

  const { resetUrl: providedResetUrl, customerId, token, password } = parsed.data;

  // Prefer the URL Shopify gave us verbatim (via `customer.reset_password_url`
  // in the email Liquid). Fall back to reconstructing for legacy callers.
  let resetUrl: string;
  if (providedResetUrl) {
    resetUrl = providedResetUrl;
  } else {
    const numericId = customerId!.includes("/") ? customerId!.split("/").pop() : customerId!;
    resetUrl = `https://${SHOPIFY_STORE_DOMAIN}/account/reset/${numericId}/${token}`;
  }

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
          query: RESET_BY_URL_MUTATION,
          variables: { resetUrl, password },
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("Storefront API HTTP error:", response.status, text.substring(0, 500));
      if (response.status === 429) {
        return sendError(429, ["Too many attempts. Please wait a moment."], "Rate limited");
      }
      return sendError(502, ["Unable to reach the store. Please try again."], "Upstream error");
    }

    const json = await response.json();

    if (json.errors?.length) {
      console.error("Storefront GraphQL errors:", JSON.stringify(json.errors));
      return sendError(400, ["Unable to reset password. The link may be expired or invalid."], "Reset failed");
    }

    const result = json.data?.customerResetByUrl;
    const userErrors = result?.customerUserErrors ?? [];

    if (userErrors.length > 0) {
      const first = userErrors[0];
      const code: string = first.code || "";
      const msg: string = (first.message || "").toLowerCase();

      // Map Shopify error codes to friendly states the client recognises.
      if (code === "TOKEN_INVALID" || msg.includes("invalid")) {
        return sendError(400, [
          "This reset link is invalid or has already been used. Please request a new password reset.",
        ], "Invalid reset link");
      }
      if (msg.includes("expired") || code === "EXPIRED") {
        return sendError(400, [
          "This reset link has expired. Please request a new password reset email.",
        ], "Link expired");
      }
      if (code === "PASSWORD_STARTS_OR_ENDS_WITH_WHITESPACE") {
        return sendError(400, ["Password cannot start or end with whitespace."], "Invalid password");
      }
      if (code === "TOO_SHORT" || msg.includes("too short")) {
        return sendError(400, ["Password must be at least 8 characters."], "Invalid password");
      }
      // Fallback — surface Shopify's message but keep it short.
      return sendError(400, [first.message || "Unable to reset password."], "Reset failed");
    }

    if (!result?.customer?.id) {
      console.error("Storefront returned no customer:", JSON.stringify(result));
      return sendError(400, [
        "Unable to reset password. The link may be expired or invalid.",
      ], "Reset failed");
    }

    let email: string | null = result.customer.email ?? null;
    let firstName: string | null = result.customer.firstName ?? null;

    // Storefront API quirk: customerResetByUrl can return a customer with
    // email/firstName as null for legacy accounts and certain access scopes.
    // Without an email the SPA can't auto-sign-in (it bails before sending
    // USER_LOGIN to the parent storefront and the user has to log in again
    // manually). Best-effort Admin API lookup mirrors what activate-account
    // already does — fail-open, the reset itself already succeeded.
    if (!email) {
      const adminToken = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN");
      if (adminToken) {
        const gid: string = result.customer.id || "";
        const numericId = gid.includes("/") ? gid.split("/").pop() : gid;
        if (numericId) {
          try {
            const adminRes = await fetch(
              `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-10/customers/${numericId}.json`,
              {
                headers: {
                  "X-Shopify-Access-Token": adminToken,
                  "Content-Type": "application/json",
                },
              }
            );
            if (adminRes.ok) {
              const j = await adminRes.json();
              const adminEmail = j?.customer?.email || null;
              const adminFirst = j?.customer?.first_name || null;
              if (!email && adminEmail) {
                // Visibility for the legacy-account quirk: Storefront returned
                // null email after a successful customerResetByUrl, and we
                // recovered it from Admin API. Useful for spotting frequency
                // of this fallback in edge function logs.
                console.warn(
                  "[reset-password] Email recovered via Admin API fallback (Storefront returned null) for customer",
                  numericId
                );
              }
              email = email || adminEmail;
              firstName = firstName || adminFirst;
            } else {
              console.warn("Admin customer lookup failed:", adminRes.status);
            }
          } catch (e) {
            console.warn("Admin customer lookup threw:", e);
          }
        }
      } else {
        console.warn(
          "Admin access token unset — cannot recover customer email; auto-sign-in will be skipped on the client."
        );
      }
    }

    return sendSuccess(
      {
        reset: true,
        email,
        firstName,
        accessToken: result.customerAccessToken?.accessToken ?? null,
        expiresAt: result.customerAccessToken?.expiresAt ?? null,
      },
      "Password has been reset successfully"
    );
  } catch (error) {
    console.error("Reset password error:", error);
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return sendError(503, ["Unable to connect to the store. Please try again in a moment."], "Connection error");
    }
    return sendError(500, ["An unexpected error occurred. Please try again."]);
  }
});
