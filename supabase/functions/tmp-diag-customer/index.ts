// TEMPORARY read-only diagnostic. Delete after use.
const TOKEN = "b720dc998efa86c6c56d67a878a9e8ce";
Deno.serve(async (req) => {
  const b = await req.json().catch(() => ({}));
  if (b.t !== TOKEN) return new Response("no", { status: 401 });
  const d = Deno.env.get("SHOPIFY_STORE_DOMAIN"); const a = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN")!;
  const out: unknown[] = [];
  for (const email of b.emails as string[]) {
    const q = `{ customers(first:1, query:"email:${email}") { nodes { id state createdAt updatedAt tags numberOfOrders
      events(first:30, reverse:true){ nodes { createdAt message appTitle attributeToApp attributeToUser criticalAlert ... on BasicEvent { action subjectType } } } } } }`;
    const r = await fetch(`https://${d}/admin/api/2025-07/graphql.json`, { method:"POST", headers:{ "X-Shopify-Access-Token": a, "Content-Type":"application/json"}, body: JSON.stringify({query:q}) });
    out.push({ email, res: await r.json() });
  }
  return new Response(JSON.stringify(out), { headers: { "Content-Type": "application/json" } });
});
