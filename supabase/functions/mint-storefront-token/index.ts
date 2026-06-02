const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const domain = Deno.env.get("SHOPIFY_STORE_DOMAIN");
  const adminToken = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN");
  const version = Deno.env.get("SHOPIFY_ADMIN_API_VERSION") || "2024-10";

  if (!domain || !adminToken) {
    return new Response(JSON.stringify({ error: "missing config", hasDomain: !!domain, hasAdmin: !!adminToken }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const mutation = `mutation { storefrontAccessTokenCreate(input: { title: "lovable-recover-${Date.now()}" }) { storefrontAccessToken { accessToken title } userErrors { field message } } }`;

  const r = await fetch(`https://${domain}/admin/api/${version}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": adminToken },
    body: JSON.stringify({ query: mutation }),
  });

  const text = await r.text();
  return new Response(JSON.stringify({ status: r.status, domain, body: text }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
