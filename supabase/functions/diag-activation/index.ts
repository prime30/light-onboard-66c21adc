// TEMPORARY diagnostic: mint a real Shopify account activation URL for a
// throwaway customer so the classic account-invite link can be tested
// end to end (the same URL Shopify puts in the account invite email).
// Protected by a shared diagnostic secret. Delete after use.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const domain = Deno.env.get("SHOPIFY_STORE_DOMAIN");
  const adminToken = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN");
  const version = Deno.env.get("SHOPIFY_ADMIN_API_VERSION") || "2024-10";
  const diagSecret = Deno.env.get("DIAG_ACTIVATION_SECRET");
  if (!domain || !adminToken) return json({ error: "shopify_env_missing" }, 500);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  if (!diagSecret || body.secret !== diagSecret) return json({ error: "unauthorized" }, 401);

  const H = { "X-Shopify-Access-Token": adminToken, "Content-Type": "application/json" };
  const action = String(body.action || "mint");
  const email = String(body.email || "");

  async function lookup(e: string) {
    const r = await fetch(
      `https://${domain}/admin/api/${version}/customers/search.json?query=${encodeURIComponent(`email:${e}`)}`,
      { headers: H },
    );
    const j = await r.json().catch(() => ({}));
    return j?.customers?.[0] ?? null;
  }

  if (action === "state") {
    const c = await lookup(email);
    return json({ found: !!c, id: c?.id, state: c?.state, email: c?.email });
  }

  if (action === "cleanup") {
    const c = await lookup(email);
    if (!c) return json({ deleted: false, reason: "not_found" });
    const r = await fetch(`https://${domain}/admin/api/${version}/customers/${c.id}.json`, {
      method: "DELETE",
      headers: H,
    });
    return json({ deleted: r.ok, status: r.status });
  }

  // action === "mint": create (or reuse) the customer, then mint the activation URL
  let customer = email ? await lookup(email) : null;
  if (!customer) {
    const createRes = await fetch(`https://${domain}/admin/api/${version}/customers.json`, {
      method: "POST",
      headers: H,
      body: JSON.stringify({
        customer: {
          email,
          first_name: "Diag",
          last_name: "Activation",
          tags: "diagnostic-do-not-use",
          email_marketing_consent: { state: "not_subscribed" },
        },
      }),
    });
    const cj = await createRes.json().catch(() => ({}));
    if (!createRes.ok) {
      return json({ error: "create_failed", status: createRes.status, detail: cj }, 502);
    }
    customer = cj.customer;
  }

  const urlRes = await fetch(
    `https://${domain}/admin/api/${version}/customers/${customer.id}/account_activation_url.json`,
    { method: "POST", headers: H },
  );
  const uj = await urlRes.json().catch(() => ({}));
  return json({
    customerId: customer.id,
    state: customer.state,
    status: urlRes.status,
    activationUrl: uj?.account_activation_url ?? null,
    detail: urlRes.ok ? undefined : uj,
  });
});
