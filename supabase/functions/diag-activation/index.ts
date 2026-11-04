// Admin-only experiment: create throwaway customers and set their password
// three ways (storefront form POST, Admin API write, Storefront
// customerActivateByUrl), then check whether the store accepts each password.
// Test customers are deleted afterwards unless keep is true.

const ADMIN_EMAIL = "alex@dropdeadhair.com";
const STOREFRONT_VERSION = "2024-10";
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
  });

type Mode = "form" | "admin_write" | "activate_by_url";

function randomPassword(): string {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnpqrstuvwxyz", "23456789"];
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b, i) => sets[i % 3][b % sets[i % 3].length]).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" } });
  const body = await req.json().catch(() => ({})) as { email?: string; password?: string; modes?: Mode[]; keep?: boolean; testPasswords?: string[]; lookupId?: string; lookupEmail?: string };
  const adminPassword = Deno.env.get("ADMIN_PANEL_PASSWORD");
  if (!adminPassword || (body.email ?? "").trim().toLowerCase() !== ADMIN_EMAIL || body.password !== adminPassword) {
    return json(401, { error: "Unauthorized" });
  }
  const domain = Deno.env.get("SHOPIFY_STORE_DOMAIN")!;
  const adminToken = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN")!;
  const privateToken = Deno.env.get("SHOPIFY_STOREFRONT_PRIVATE_TOKEN");
  const publicToken = Deno.env.get("SHOPIFY_STOREFRONT_ACCESS_TOKEN");
  const adminHeaders = { "X-Shopify-Access-Token": adminToken, "Content-Type": "application/json" };
  const storefrontHeaders: Record<string, string> = privateToken
    ? { "Content-Type": "application/json", "Shopify-Storefront-Private-Token": privateToken }
    : { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": publicToken ?? "" };

  const storefront = async (query: string, variables: unknown) => {
    const res = await fetch(`https://${domain}/api/${STOREFRONT_VERSION}/graphql.json`, {
      method: "POST",
      headers: storefrontHeaders,
      body: JSON.stringify({ query, variables }),
    });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const state = async (id: number) => {
    const res = await fetch(`https://${domain}/admin/api/2024-10/customers/${id}.json?fields=id,state`, { headers: adminHeaders });
    return (await res.json().catch(() => null))?.customer?.state ?? `http ${res.status}`;
  };
  const signIn = async (email: string, password: string) => {
    const r = await storefront(
      `mutation t($input: CustomerAccessTokenCreateInput!) { customerAccessTokenCreate(input: $input) { customerAccessToken { accessToken } customerUserErrors { code message } } }`,
      { input: { email, password } },
    );
    const out = r.body?.data?.customerAccessTokenCreate;
    return out?.customerAccessToken?.accessToken ? "ok" : `${r.status} ${JSON.stringify(out?.customerUserErrors ?? r.body?.errors ?? null)}`;
  };

  // Read-only: what Shopify stores for one customer, plus any other record
  // under the same email.
  if (body.lookupId || body.lookupEmail) {
    const fields = "id,email,state,created_at,updated_at,verified_email,tags,phone,email_marketing_consent";
    const byId = body.lookupId
      ? await (await fetch(`https://${domain}/admin/api/2024-10/customers/${encodeURIComponent(body.lookupId)}.json?fields=${fields}`, { headers: adminHeaders })).json().catch(() => null)
      : null;
    const byEmail = body.lookupEmail
      ? await (await fetch(`https://${domain}/admin/api/2024-10/customers/search.json?query=${encodeURIComponent(`email:${body.lookupEmail}`)}&fields=${fields}`, { headers: adminHeaders })).json().catch(() => null)
      : null;
    const gql = body.lookupId
      ? await (await fetch(`https://${domain}/admin/api/2024-10/graphql.json`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ query: `{ customer(id: "gid://shopify/Customer/${body.lookupId}") { email state createdAt updatedAt canDelete events(first: 30, reverse: true) { nodes { createdAt message } } } }` }),
      })).json().catch(() => null)
      : null;
    return json(200, { byId, byEmail, gql });
  }

  const modes: Mode[] = body.modes?.length ? body.modes : ["form", "admin_write", "activate_by_url"];
  const passwords: (string | null)[] = (body.testPasswords?.length ? body.testPasswords : [null]).slice(0, 6);
  const runs = passwords.flatMap((p, i) => modes.map((mode) => ({ mode, password: p ?? randomPassword(), label: p ? `custom#${i}` : "random" })));
  const results: Record<string, unknown>[] = [];
  for (const { mode, password, label } of runs) {
    const email = `ddtest-act-${mode.replace(/_/g, "")}-${Date.now()}@spamok.com`;
    const steps: string[] = [];
    let id: number | null = null;
    try {
      const created = await fetch(`https://${domain}/admin/api/2024-10/customers.json`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ customer: { email, first_name: "Diag", last_name: "Activation", tags: "diag-activation", send_email_invite: false } }),
      });
      const cj = await created.json().catch(() => null);
      id = cj?.customer?.id ?? null;
      steps.push(`create ${created.status} state=${cj?.customer?.state ?? "?"}`);
      if (!id) throw new Error(JSON.stringify(cj).slice(0, 300));

      const urlRes = await fetch(`https://${domain}/admin/api/2024-10/customers/${id}/account_activation_url.json`, { method: "POST", headers: adminHeaders });
      const activationUrl: string | undefined = (await urlRes.json().catch(() => null))?.account_activation_url;
      steps.push(`activation_url ${urlRes.status} ${activationUrl ? "ok" : "missing"}`);

      if (mode === "form" && activationUrl) {
        const r = await fetch(activationUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ "customer[password]": password, "customer[password_confirmation]": password }).toString(),
          redirect: "manual",
        });
        const location = r.headers.get("location") || "";
        steps.push(`form ${r.status} ${(location || "-").replace(/^https?:\/\/[^/]+/, "").split("?")[0].replace(/\/[a-f0-9]{20,}.*$/, "/<token>")}`);
        if (location.includes("/account/activate")) {
          const cookies = (r.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
          const page = await fetch(new URL(location, activationUrl).href, { headers: cookies ? { Cookie: cookies } : {} });
          const html = await page.text();
          const errors = [...html.matchAll(/class="[^"]*(?:errors?|form-message)[^"]*"[^>]*>([\s\S]{0,400}?)<\/(?:div|ul|p|h2)>/gi)]
            .map((m) => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()).filter(Boolean);
          steps.push(`bounce_page ${page.status} errors=${JSON.stringify(errors.slice(0, 4))}`);
        }
      }
      if (mode === "admin_write") {
        const r = await fetch(`https://${domain}/admin/api/2024-10/customers/${id}.json`, {
          method: "PUT",
          headers: adminHeaders,
          body: JSON.stringify({ customer: { id, password, password_confirmation: password, send_email_welcome: false } }),
        });
        steps.push(`admin_write ${r.status}`);
      }
      if (mode === "activate_by_url" && activationUrl) {
        const r = await storefront(
          `mutation a($url: URL!, $password: String!) { customerActivateByUrl(activationUrl: $url, password: $password) { customerAccessToken { accessToken } customerUserErrors { code field message } } }`,
          { url: activationUrl, password },
        );
        const out = r.body?.data?.customerActivateByUrl;
        steps.push(`activate_by_url ${r.status} token=${out?.customerAccessToken?.accessToken ? "yes" : "no"} errors=${JSON.stringify(out?.customerUserErrors ?? r.body?.errors ?? null)}`);
      }

      steps.push(`state=${await state(id)}`);
      steps.push(`sign_in_now=${await signIn(email, password)}`);
      await new Promise((r) => setTimeout(r, 5000));
      steps.push(`sign_in_5s=${await signIn(email, password)}`);
    } catch (e) {
      steps.push(`threw ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      if (id && !body.keep) {
        const d = await fetch(`https://${domain}/admin/api/2024-10/customers/${id}.json`, { method: "DELETE", headers: adminHeaders });
        steps.push(`deleted ${d.status}`);
      }
    }
    results.push({ mode, password: label, email, id, steps });
  }
  return json(200, { storefrontToken: privateToken ? "private" : "public", results });
});
