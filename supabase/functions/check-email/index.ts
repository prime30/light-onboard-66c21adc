// Lightweight email-existence check used by ContactBasicsStep.
// Returns { exists: boolean } based on a Customer Fields lookup.
// Inlined cors + helpers per project convention.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    // Don't error - just say "not exists" so the client UX doesn't block on
    // mid-typing values. Schema validation handles the real format error.
    return new Response(JSON.stringify({ exists: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("HELIUM_PRIVATE_ACCESS_TOKEN");
  if (!apiKey) {
    console.error("HELIUM_PRIVATE_ACCESS_TOKEN missing");
    // Fail open - don't block registration on infra hiccup.
    return new Response(JSON.stringify({ exists: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = `https://app.customerfields.com/api/v2/customers/search.json?page=1&limit=1&sort_by=updated_at&sort_order=desc&email=${encodeURIComponent(email)}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (!res.ok) {
      console.error("check-email search failed:", res.status);
      return new Response(JSON.stringify({ exists: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = (await res.json()) as {
      customers?: Array<{ shopify_id?: number | string }>;
    };
    const customer = Array.isArray(data.customers) ? data.customers[0] : undefined;

    // No record at all → free to register.
    if (!customer) {
      return new Response(JSON.stringify({ exists: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Soft-merge: a Shopify customer may already exist because support/Klaviyo
    // created one. We only block registration when the customer has already
    // completed a B2B application - detected by an "Account type:" Shopify tag
    // (written by create-customer on every successful submission).
    const shopifyId = customer.shopify_id;
    const shopifyDomain = Deno.env.get("SHOPIFY_STORE_DOMAIN");
    const shopifyAdminToken = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN");

    if (!shopifyId || !shopifyDomain || !shopifyAdminToken) {
      // Can't determine tag state - preserve prior behavior (block) so we
      // don't silently let a duplicate application through.
      return new Response(JSON.stringify({ exists: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      const tagRes = await fetch(
        `https://${shopifyDomain}/admin/api/2024-10/customers/${shopifyId}.json`,
        {
          method: "GET",
          headers: {
            "X-Shopify-Access-Token": shopifyAdminToken,
            "Content-Type": "application/json",
          },
        }
      );
      if (!tagRes.ok) {
        console.warn("check-email: Shopify tag fetch failed:", tagRes.status);
        return new Response(JSON.stringify({ exists: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const json = await tagRes.json();
      const tagStr: string = json?.customer?.tags ?? "";
      const hasAppliedTag = tagStr
        .split(",")
        .map((t: string) => t.trim())
        .some((t: string) => /^account type:/i.test(t));

      // The account exists but was never activated (state "invited" =
      // invite sent, never consumed; "disabled" = no password set). Telling
       // these people to "sign in instead" strands them, since they have no
       // password. Route through recover-password, which first enables the
       // account with an unknown random password and then sends a reset link.
       // Do not use send_invite here because the storefront activation route
       // is the broken path this recovery is intended to bypass.
      const state: string = json?.customer?.state ?? "";
      const needsActivation = hasAppliedTag && (state === "invited" || state === "disabled");
       let inviteSent = false;
      if (needsActivation) {
        try {
           const backendUrl = Deno.env.get("SUPABASE_URL");
           const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
           if (!backendUrl || !serviceKey) throw new Error("Backend recovery configuration missing");
           const recoveryRes = await fetch(`${backendUrl}/functions/v1/recover-password`, {
             method: "POST",
             headers: {
               Authorization: `Bearer ${serviceKey}`,
               apikey: serviceKey,
               "Content-Type": "application/json",
             },
             body: JSON.stringify({ email }),
           });
           inviteSent = recoveryRes.ok;
           if (!recoveryRes.ok) {
            console.error(
               "check-email: verified setup recovery failed",
              email,
               recoveryRes.status,
               (await recoveryRes.text()).slice(0, 300)
            );
          }
        } catch (inviteErr) {
           console.error("check-email: verified setup recovery threw", inviteErr);
        }
      }

      return new Response(
        JSON.stringify({ exists: hasAppliedTag, needsActivation, inviteSent }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );

    } catch (tagErr) {
      console.warn("check-email: Shopify tag fetch threw:", tagErr);
      return new Response(JSON.stringify({ exists: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    console.error("check-email error:", err);
    try {
      const u = Deno.env.get("SUPABASE_URL");
      const k = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (u && k) {
        void fetch(`${u}/functions/v1/notify-error`, {
          method: "POST",
          headers: { Authorization: `Bearer ${k}`, apikey: k, "Content-Type": "application/json" },
          body: JSON.stringify({
            source: "check-email",
            message: err instanceof Error ? err.message : String(err),
            context: { stack: err instanceof Error ? err.stack?.slice(0, 2000) : null },
          }),
        }).catch(() => {});
      }
    } catch { /* never throw */ }
    return new Response(JSON.stringify({ exists: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
