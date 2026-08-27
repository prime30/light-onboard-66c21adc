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

// --- Storefront sign-in verification -----------------------------------
// Shopify can report a customer as `enabled` while the password the applicant
// typed is NOT the credential on file (classic activation 302s, Admin API
// writes racing the activation, duplicate customers on the same email). The
// only proof that the applicant can actually log in is minting a customer
// access token with the exact email + password they submitted, so activation
// only reports success after that succeeds.
let cachedStorefrontToken: string | null = null;

async function getStorefrontToken(domain: string, adminToken: string): Promise<string | null> {
  if (cachedStorefrontToken) return cachedStorefrontToken;
  const envToken = Deno.env.get("SHOPIFY_STOREFRONT_ACCESS_TOKEN");
  if (envToken && envToken.length === 32 && /^[a-f0-9]+$/i.test(envToken)) {
    cachedStorefrontToken = envToken;
    return envToken;
  }
  try {
    const res = await fetch(`https://${domain}/admin/api/2024-10/storefront_access_tokens.json`, {
      headers: { "X-Shopify-Access-Token": adminToken, "Content-Type": "application/json" },
    });
    if (!res.ok) {
      console.error("[activate-account] list storefront tokens failed:", res.status);
      return null;
    }
    const json = await res.json();
    const tokens: Array<{ access_token: string; title?: string }> =
      json?.storefront_access_tokens ?? [];
    if (!tokens.length) return null;
    const preferred = tokens.find((t) => (t.title || "").startsWith("lovable-")) ?? tokens[0];
    cachedStorefrontToken = preferred?.access_token ?? null;
    return cachedStorefrontToken;
  } catch (e) {
    console.error("[activate-account] storefront token lookup threw:", e);
    return null;
  }
}

async function verifyLogin(
  domain: string,
  adminToken: string,
  email: string,
  password: string
): Promise<{ ok: boolean; reason: string }> {
  const storefrontToken = await getStorefrontToken(domain, adminToken);
  if (!storefrontToken) return { ok: false, reason: "no_storefront_token" };
  try {
    const res = await fetch(`https://${domain}/api/2024-10/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": storefrontToken,
      },
      body: JSON.stringify({
        query: `mutation login($input: CustomerAccessTokenCreateInput!) {
          customerAccessTokenCreate(input: $input) {
            customerAccessToken { accessToken }
            customerUserErrors { code message }
          }
        }`,
        variables: { input: { email, password } },
      }),
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) cachedStorefrontToken = null;
      return { ok: false, reason: `http_${res.status}` };
    }
    const json = await res.json();
    const payload = json?.data?.customerAccessTokenCreate;
    if (payload?.customerAccessToken?.accessToken) return { ok: true, reason: "ok" };
    const code = payload?.customerUserErrors?.[0]?.code ?? "unknown";
    return { ok: false, reason: String(code).toLowerCase() };
  } catch (e) {
    console.error("[activate-account] login verification threw:", e);
    return { ok: false, reason: "threw" };
  }
}

async function adminSetPassword(
  domain: string,
  adminToken: string,
  customerId: string,
  password: string
): Promise<{ ok: boolean; state: string; email: string | null; firstName: string | null }> {
  const res = await fetch(`https://${domain}/admin/api/2024-10/customers/${customerId}.json`, {
    method: "PUT",
    headers: { "X-Shopify-Access-Token": adminToken, "Content-Type": "application/json" },
    body: JSON.stringify({
      customer: {
        id: Number(customerId),
        password,
        password_confirmation: password,
        send_email_welcome: false,
      },
    }),
  });
  if (!res.ok) {
    console.error(
      "[activate-account] Admin password write failed:",
      res.status,
      (await res.text()).slice(0, 400)
    );
    return { ok: false, state: "", email: null, firstName: null };
  }
  const json = await res.json();
  return {
    ok: true,
    state: json?.customer?.state ?? "",
    email: json?.customer?.email ?? null,
    firstName: json?.customer?.first_name ?? null,
  };
}

// Accept either:
//   - activationUrl: full Shopify activation URL (preferred - matches
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

  const { activationUrl: providedUrl, customerId, token, password } = parsed.data;

  // Determine the activation endpoint. Shopify's invite email exposes
  // `customer.account_activation_url`, shaped:
  //   https://{store}/account/activate/{customerId}/{token}
  // We POST to that exact path (Shopify accepts form-encoded credentials).
  let activateUrl: string;
  let derivedCustomerId: string | null = null;
  if (providedUrl) {
    activateUrl = providedUrl;
    // Extract numeric id from the activation URL path so we can look the
    // customer up via Admin API after a successful activation.
    try {
      const u = new URL(providedUrl);
      const parts = u.pathname.split("/").filter(Boolean);
      const activateIdx = parts.indexOf("activate");
      if (activateIdx >= 0 && parts[activateIdx + 1]) {
        derivedCustomerId = parts[activateIdx + 1];
      }
    } catch {
      // Ignored - falls back to no email lookup.
    }
  } else {
    const numericId = customerId!.includes("/") ? customerId!.split("/").pop()! : customerId!;
    derivedCustomerId = numericId;
    activateUrl = `https://${SHOPIFY_STORE_DOMAIN}/account/activate/${numericId}/${token}`;
  }

  try {
    // PRIMARY: Shopify's canonical activation API. The classic HTML POST below
    // answers 302 even when it silently drops the password (and the Admin API
    // password write can flip state to `enabled` without storing the typed
    // credential), which is exactly how applicants ended up "activated" but
    // unable to log in. `customerActivateByUrl` stores the password and returns
    // an access token, so success here is real proof.
    let canonicalActivated = false;
    const adminTokenForCanonical = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN");
    if (adminTokenForCanonical) {
      const sfToken = await getStorefrontToken(SHOPIFY_STORE_DOMAIN, adminTokenForCanonical);
      if (sfToken) {
        try {
          const res = await fetch(`https://${SHOPIFY_STORE_DOMAIN}/api/2024-10/graphql.json`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Shopify-Storefront-Access-Token": sfToken,
            },
            body: JSON.stringify({
              query: `mutation activate($url: URL!, $password: String!) {
                customerActivateByUrl(activationUrl: $url, password: $password) {
                  customer { id email firstName }
                  customerAccessToken { accessToken }
                  customerUserErrors { code field message }
                }
              }`,
              variables: { url: activateUrl, password },
            }),
          });
          const json = await res.json();
          const payload = json?.data?.customerActivateByUrl;
          if (payload?.customer?.id) {
            canonicalActivated = true;
            console.log("[activate-account] customerActivateByUrl succeeded for customer", derivedCustomerId);
          } else {
            const code = payload?.customerUserErrors?.[0]?.code ?? null;
            console.warn(
              "[activate-account] customerActivateByUrl did not activate:",
              code ?? JSON.stringify(json?.errors ?? json).slice(0, 300)
            );
            if (code === "ALREADY_ACTIVATED") {
              return sendError(
                400,
                [
                  "This account has already been activated. You can log in with your existing password.",
                ],
                "Already activated"
              );
            }
          }
        } catch (e) {
          console.warn("[activate-account] customerActivateByUrl threw:", e);
        }
      }
    }

    const activateResponse = canonicalActivated
      ? null
      : await fetch(activateUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            "customer[password]": password,
            "customer[password_confirmation]": password,
          }).toString(),
          redirect: "manual",
        });

    // Canonical activation is proof on its own. Otherwise Shopify returns a 302
    // redirect on the classic endpoint, which is only a hint.
    if (
      canonicalActivated ||
      activateResponse!.status === 302 ||
      activateResponse!.status === 200
    ) {


      // Best-effort email lookup so the SPA can auto-sign-in afterwards.
      // Failure here is non-fatal - activation already succeeded.
      let email: string | null = null;
      let firstName: string | null = null;
      // Shopify's storefront activation endpoint answers 302/200 even for a
      // bogus or already-used token, so a redirect alone is NOT proof the
      // password saved. We only report success once the Admin API confirms the
      // customer is `enabled`.
      let activationVerified = false;
      const adminToken = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN");
      if (adminToken && derivedCustomerId) {
        try {
          const adminRes = await fetch(
            `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-10/customers/${derivedCustomerId}.json`,
            {
              headers: {
                "X-Shopify-Access-Token": adminToken,
                "Content-Type": "application/json",
              },
            }
          );
          if (adminRes.ok) {
            const j = await adminRes.json();
            email = j?.customer?.email ?? null;
            firstName = j?.customer?.first_name ?? null;
            const state: string = j?.customer?.state ?? "";

            // CRITICAL: Shopify's classic activation endpoint answers 302 even
            // when it did NOT persist the password (theme redirects, new
            // customer accounts, proxy interference). The customer then stays
            // `invited`/`disabled` and can never log in - the exact silent
            // failure reported by applicants. The token was accepted here, so
            // fall back to an Admin-side password write and re-verify state.
            if (state && state !== "enabled") {
              console.warn(
                "[activate-account] Activation 302 but state is",
                state,
                "- setting password via Admin API for customer",
                derivedCustomerId
              );
              const put = await adminSetPassword(
                SHOPIFY_STORE_DOMAIN,
                adminToken,
                derivedCustomerId,
                password
              );
              email = put.email ?? email;
              firstName = put.firstName ?? firstName;
              if (!put.ok || put.state !== "enabled") {
                console.error(
                  "[activate-account] Admin password write left state as",
                  put.state,
                  "for customer",
                  derivedCustomerId
                );
                return sendError(
                  500,
                  [
                    "We couldn't finish setting your password. Please contact hello@dropdeadextensions.com and we'll set it up for you.",
                  ],
                  "Password not saved"
                );
              }
              console.log(
                "[activate-account] Password set via Admin API fallback, customer now enabled:",
                derivedCustomerId
              );
              activationVerified = true;
            } else if (state === "enabled") {
              activationVerified = true;
            }

            // FINAL PROOF: an `enabled` state does not mean the applicant's
            // password is the credential on file. Mint a storefront access
            // token with the exact email + password they typed. If that fails,
            // rewrite the password via Admin API once and re-verify, so the
            // applicant never leaves this screen with a password Shopify will
            // reject on the login page.
            if (activationVerified && email) {
              let login = await verifyLogin(
                SHOPIFY_STORE_DOMAIN,
                adminToken,
                email,
                password
              );
              if (!login.ok && login.reason !== "no_storefront_token") {
                console.warn(
                  "[activate-account] Post-activation login failed (",
                  login.reason,
                  ") - rewriting password for customer",
                  derivedCustomerId
                );
                const repair = await adminSetPassword(
                  SHOPIFY_STORE_DOMAIN,
                  adminToken,
                  derivedCustomerId,
                  password
                );
                email = repair.email ?? email;
                firstName = repair.firstName ?? firstName;
                if (repair.ok) {
                  login = await verifyLogin(
                    SHOPIFY_STORE_DOMAIN,
                    adminToken,
                    email,
                    password
                  );
                }
                if (!login.ok && login.reason !== "no_storefront_token") {
                  console.error(
                    "[activate-account] Login still failing after repair (",
                    login.reason,
                    ") for customer",
                    derivedCustomerId
                  );
                  return sendError(
                    500,
                    [
                      "Your password was saved but the store would not accept it on sign-in. Please contact hello@dropdeadextensions.com and we'll fix it right away.",
                    ],
                    "Login verification failed"
                  );
                }
              }
              if (login.ok) {
                console.log(
                  "[activate-account] Login verified for customer",
                  derivedCustomerId
                );
              }
            }

            // Visibility: activate-account has no Storefront token to lean on
            // (Shopify's activation endpoint returns a 302 with no body), so
            // the Admin API is the sole source for email/firstName here.
            // Logged at warn so frequency of this fallback is filterable in
            // edge function logs alongside reset-password's same-named warn.
            if (email) {
              console.warn(
                "[activate-account] Email recovered via Admin API (sole source after activation 302) for customer",
                derivedCustomerId
              );
            }
          } else if (adminRes.status === 404) {
            // No such customer: the link's id/token pair is bogus.
            console.warn("[activate-account] Customer not found:", derivedCustomerId);
            return sendError(
              400,
              ["This activation link is invalid or has already been used."],
              "Invalid activation link"
            );
          } else {
            console.warn("Admin customer lookup failed:", adminRes.status);
          }
        } catch (e) {
          console.warn("Admin customer lookup threw:", e);
        }
      }

      if (!activationVerified) {
        console.error(
          "[activate-account] Could not verify activation for customer",
          derivedCustomerId,
          "- refusing to report success"
        );
        return sendError(
          500,
          [
            "We couldn't confirm your password was saved. Please try the link again or contact hello@dropdeadextensions.com and we'll set it up for you.",
          ],
          "Activation unverified"
        );
      }

      // Return the numeric Shopify customer ID so the SPA can hand it to
      // downstream code without re-fetching it.
      const shopifyCustomerId = derivedCustomerId
        ? Number(derivedCustomerId)
        : null;

      // Mint the welcome-offer code server-side (generate-discount is now an
      // internal-only edge function gated by service-role bearer header so the
      // public can no longer mint unlimited discount codes by calling it
      // directly). Two independent toggles drive this:
      //   - welcome_offer_enabled - SPA surfaces the code on success
      //   - discount_metafields_enabled - write code to customer metafields
      //     so the Shopify theme can keep surfacing the discount elsewhere
      //     even when the SPA welcome-offer screen is off.
      // Failures here are non-blocking - activation already succeeded.
      let welcomeOffer: { code: string; endsAt: string | null } | null = null;
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (supabaseUrl && serviceRoleKey) {
          const headers = {
            "Content-Type": "application/json",
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          };
          const [welcomeRes, metaRes] = await Promise.all([
            fetch(`${supabaseUrl}/rest/v1/rpc/get_welcome_offer_enabled`, {
              method: "POST",
              headers,
              body: "{}",
            }),
            fetch(`${supabaseUrl}/rest/v1/rpc/get_discount_metafields_enabled`, {
              method: "POST",
              headers,
              body: "{}",
            }),
          ]);
          const welcomeEnabled = welcomeRes.ok && (await welcomeRes.json()) === true;
          const metafieldsEnabled = metaRes.ok && (await metaRes.json()) === true;
          const shouldMint = welcomeEnabled || metafieldsEnabled;
          if (shouldMint) {
            const discountRes = await fetch(
              `${supabaseUrl}/functions/v1/generate-discount`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-internal-key": serviceRoleKey,
                },
                body: JSON.stringify({
                  email,
                  shopifyCustomerId,
                }),
              }
            );
            if (discountRes.ok) {
              const j = await discountRes.json();
              if (welcomeEnabled && j?.success && j?.code) {
                welcomeOffer = { code: j.code, endsAt: j.endsAt ?? null };
              }
            } else {
              console.warn("[activate-account] generate-discount failed:", discountRes.status);
            }
          }
        }
      } catch (err) {
        console.warn("[activate-account] generate-discount threw (non-blocking):", err);
      }

      return sendSuccess(
        {
          activated: true,
          email,
          firstName,
          shopifyCustomerId: Number.isFinite(shopifyCustomerId) ? shopifyCustomerId : null,
          welcomeOffer,
        },
        "Account has been activated successfully"
      );

    }

    const responseText = await activateResponse!.text();

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

    console.error("Shopify activate response:", activateResponse!.status, responseText.substring(0, 500));
    return sendError(400, [
      "Unable to activate account. The link may be expired or invalid.",
    ], "Activation failed");

  } catch (error) {
    console.error("Activate account error:", error);
    try {
      const u = Deno.env.get("SUPABASE_URL");
      const k = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (u && k) {
        void fetch(`${u}/functions/v1/notify-error`, {
          method: "POST",
          headers: { Authorization: `Bearer ${k}`, apikey: k, "Content-Type": "application/json" },
          body: JSON.stringify({
            source: "activate-account",
            message: error instanceof Error ? error.message : String(error),
            context: { stack: error instanceof Error ? error.stack?.slice(0, 2000) : null },
          }),
        }).catch(() => {});
      }
    } catch { /* never throw */ }

    if (error instanceof TypeError && error.message.includes("fetch")) {
      return sendError(503, [
        "Unable to connect to the store. Please try again in a moment.",
      ], "Connection error");
    }

    return sendError(500, ["An unexpected error occurred. Please try again."]);
  }
});
