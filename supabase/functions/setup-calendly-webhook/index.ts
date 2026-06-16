// One-off admin helper: creates a Calendly webhook subscription pointing at
// our calendly-webhook function and returns the signing_key. Save the returned
// signing_key as CALENDLY_WEBHOOK_SIGNING_KEY.
//
// Auth: requires ADMIN_PANEL_PASSWORD in the `x-admin-password` header.
//
// Usage (POST, no body required):
//   curl -X POST \
//     -H "x-admin-password: <ADMIN_PANEL_PASSWORD>" \
//     https://<project>.supabase.co/functions/v1/setup-calendly-webhook

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-password",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const CALENDLY_BASE = "https://api.calendly.com";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const adminPassword = Deno.env.get("ADMIN_PANEL_PASSWORD");
  const provided = req.headers.get("x-admin-password");
  if (!adminPassword || provided !== adminPassword) {
    return json(401, { error: "Unauthorized" });
  }


  const calendlyToken = Deno.env.get("CALENDLY_API_TOKEN");
  if (!calendlyToken) return json(500, { error: "CALENDLY_API_TOKEN not set" });

  const projectUrl = Deno.env.get("SUPABASE_URL");
  if (!projectUrl) return json(500, { error: "SUPABASE_URL not set" });

  const callbackUrl = `${projectUrl}/functions/v1/calendly-webhook`;

  try {
    // 1) Get current Calendly user (to derive organization + user URIs)
    const meRes = await fetch(`${CALENDLY_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${calendlyToken}` },
    });
    const meBody = await meRes.json();
    if (!meRes.ok) return json(meRes.status, { step: "users/me", error: meBody });

    const userUri: string = meBody?.resource?.uri;
    const organizationUri: string = meBody?.resource?.current_organization;
    if (!userUri || !organizationUri) {
      return json(500, { step: "users/me", error: "Missing user/org URI", meBody });
    }

    // 2) Optional: list existing subscriptions and short-circuit if one already
    //    points at our callback URL.
    const listUrl = new URL(`${CALENDLY_BASE}/webhook_subscriptions`);
    listUrl.searchParams.set("organization", organizationUri);
    listUrl.searchParams.set("user", userUri);
    listUrl.searchParams.set("scope", "user");
    const listRes = await fetch(listUrl.toString(), {
      headers: { Authorization: `Bearer ${calendlyToken}` },
    });
    const listBody = await listRes.json();
    if (listRes.ok && Array.isArray(listBody?.collection)) {
      const existing = listBody.collection.find((s: any) => s?.callback_url === callbackUrl);
      if (existing) {
        return json(200, {
          ok: true,
          alreadyExists: true,
          subscription: existing,
          note:
            "Subscription already exists for this callback URL. signing_key is only returned at creation time — if you don't have it, delete this subscription in Calendly and re-run.",
        });
      }
    }

    // 3) Create the subscription
    const createRes = await fetch(`${CALENDLY_BASE}/webhook_subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${calendlyToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: callbackUrl,
        events: [
          "invitee.created",
          "invitee.canceled",
          "invitee_no_show.created",
          "invitee_no_show.deleted",
        ],
        organization: organizationUri,
        scope: "organization",
      }),
    });
    const createBody = await createRes.json();
    if (!createRes.ok) {
      return json(createRes.status, { step: "create", error: createBody, callbackUrl });
    }

    return json(200, {
      ok: true,
      callbackUrl,
      subscription: createBody?.resource,
      signing_key: createBody?.resource?.signing_key,
      next: "Copy signing_key and save it as CALENDLY_WEBHOOK_SIGNING_KEY in Lovable Cloud secrets.",
    });
  } catch (err) {
    return json(500, { error: String(err) });
  }
});
