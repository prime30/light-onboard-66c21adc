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

type Mode = "form" | "admin_write" | "activate_by_url" | "race_form" | "race_activate_by_url";

function randomPassword(): string {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnpqrstuvwxyz", "23456789"];
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b, i) => sets[i % 3][b % sets[i % 3].length]).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" } });
  const body = await req.json().catch(() => ({})) as { email?: string; password?: string; modes?: Mode[]; keep?: boolean; testPasswords?: string[]; lookupId?: string; lookupEmail?: string; repeat?: number; delaysMs?: number[]; buyerIp?: string; seedRefused?: { withRefusedRow?: boolean }; deleteId?: string };
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

  const buyerIp = privateToken && body.buyerIp ? body.buyerIp : null;
  const storefront = async (query: string, variables: unknown, withIp = true) => {
    const res = await fetch(`https://${domain}/api/${STOREFRONT_VERSION}/graphql.json`, {
      method: "POST",
      headers: withIp && buyerIp ? { ...storefrontHeaders, "Shopify-Storefront-Buyer-IP": buyerIp } : storefrontHeaders,
      body: JSON.stringify({ query, variables }),
    });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const state = async (id: number) => {
    const res = await fetch(`https://${domain}/admin/api/2024-10/customers/${id}.json?fields=id,state`, { headers: adminHeaders });
    return (await res.json().catch(() => null))?.customer?.state ?? `http ${res.status}`;
  };
  const signInOnce = async (email: string, password: string, withIp: boolean) => {
    const r = await storefront(
      `mutation t($input: CustomerAccessTokenCreateInput!) { customerAccessTokenCreate(input: $input) { customerAccessToken { accessToken } customerUserErrors { code message } } }`,
      { input: { email, password } },
      withIp,
    );
    const out = r.body?.data?.customerAccessTokenCreate;
    return out?.customerAccessToken?.accessToken ? "ok" : `${r.status} ${JSON.stringify(out?.customerUserErrors ?? r.body?.errors ?? null)}`;
  };
  const signIn = async (email: string, password: string) =>
    buyerIp
      ? `with_ip:${await signInOnce(email, password, true)} no_ip:${await signInOnce(email, password, false)}`
      : signInOnce(email, password, false);

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

  // The state a refused signup leaves behind: a disabled, tagged customer and,
  // optionally, the audit row that lets a resubmit through. Throwaway emails
  // only; remove with deleteId.
  if (body.seedRefused) {
    const seedEmail = `ddtest-refused-${Date.now()}@spamok.com`;
    const created = await fetch(`https://${domain}/admin/api/2024-10/customers.json`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        customer: { email: seedEmail, first_name: "Diag", last_name: "Refused", tags: "Account type: Professional", send_email_invite: false },
      }),
    });
    const customer = (await created.json().catch(() => null))?.customer;
    let auditRow: number | null = null;
    if (customer?.id && body.seedRefused.withRefusedRow) {
      const sbUrl = Deno.env.get("SUPABASE_URL");
      const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (sbUrl && sbKey) {
        const ins = await fetch(`${sbUrl}/rest/v1/registration_submissions`, {
          method: "POST",
          headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}`, "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify({
            email: seedEmail,
            account_type: "professional",
            status: "failed",
            shopify_customer_id: String(customer.id),
            payload: { seeded_by: "diag-activation" },
            error_log: [{ step: "password_refused", status: "error", field: "password", message: "seeded by diag-activation", at: new Date().toISOString() }],
          }),
        });
        auditRow = ins.status;
      }
    }
    return json(created.ok ? 200 : 502, { email: seedEmail, id: customer?.id ?? null, state: customer?.state ?? null, createStatus: created.status, auditRow });
  }

  if (body.deleteId) {
    const res = await fetch(`https://${domain}/admin/api/2024-10/customers/${encodeURIComponent(body.deleteId)}.json?fields=id,email`, { headers: adminHeaders });
    const email: string = (await res.json().catch(() => null))?.customer?.email ?? "";
    if (!/^ddtest-[a-z0-9-]+@spamok\.com$/.test(email)) return json(400, { error: "Only ddtest- throwaway customers can be deleted", email });
    const d = await fetch(`https://${domain}/admin/api/2024-10/customers/${encodeURIComponent(body.deleteId)}.json`, { method: "DELETE", headers: adminHeaders });
    return json(200, { deleted: d.status, email });
  }

  const modes: Mode[] = body.modes?.length ? body.modes : ["form", "admin_write", "activate_by_url"];
  const passwords: (string | null)[] = (body.testPasswords?.length ? body.testPasswords : [null]).slice(0, 6);
  const repeat = Math.min(Math.max(Number(body.repeat) || 1, 1), 10);
  const delays = body.delaysMs?.length ? body.delaysMs : [0];
  const runs = Array.from({ length: repeat }, (_, r) => r).flatMap((r) =>
    passwords.flatMap((p, i) => modes.map((mode) => ({ mode, password: p ?? randomPassword(), label: p ? `custom#${i}` : "random", delay: delays[r % delays.length] })))
  );
  const results: Record<string, unknown>[] = [];
  for (const { mode, password, label, delay } of runs) {
    const email = `ddtest-act-${mode.replace(/_/g, "")}-${Date.now()}@spamok.com`;
    const steps: string[] = [];
    let id: number | null = null;
    try {
      const created = await fetch(`https://${domain}/admin/api/2024-10/customers.json`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          customer: {
            email,
            tags: "diag-activation",
            send_email_invite: false,
            ...(mode.startsWith("race") ? { email_marketing_consent: { state: "subscribed", opt_in_level: "single_opt_in", consent_updated_at: new Date().toISOString() } } : { first_name: "Diag", last_name: "Activation" }),
          },
        }),
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
      if (mode.startsWith("race") && activationUrl && id) {
        const cid = id;
        const t0 = Date.now();
        const enrich = async () => {
          const g = await fetch(`https://${domain}/admin/api/2024-10/customers/${cid}.json`, { headers: adminHeaders });
          const existing = (await g.json().catch(() => null))?.customer;
          const p = await fetch(`https://${domain}/admin/api/2024-10/customers/${cid}.json`, {
            method: "PUT",
            headers: adminHeaders,
            body: JSON.stringify({
              customer: {
                id: cid,
                first_name: "Diag",
                last_name: "Race",
                note: "diag race enrichment",
                tags: [existing?.tags, "Account type: Diag", "wholesale"].filter(Boolean).join(", "),
                email_marketing_consent: { state: "subscribed", opt_in_level: "single_opt_in", consent_updated_at: new Date().toISOString() },
                addresses: [{ first_name: "Diag", last_name: "Race", address1: "1 Test St", city: "Austin", province_code: "TX", zip: "78701", country_code: "US", default: true }],
              },
            }),
          });
          return `enrich get ${g.status} put ${p.status} at ${Date.now() - t0}ms`;
        };
        const activate = async () => {
          if (delay) await new Promise((r) => setTimeout(r, delay));
          if (mode === "race_activate_by_url") {
            const r = await storefront(
              `mutation a($url: URL!, $password: String!) { customerActivateByUrl(activationUrl: $url, password: $password) { customerAccessToken { accessToken } customerUserErrors { code field message } } }`,
              { url: activationUrl, password },
            );
            const out = r.body?.data?.customerActivateByUrl;
            return `activate_by_url ${r.status} token=${out?.customerAccessToken?.accessToken ? "yes" : "no"} errors=${JSON.stringify(out?.customerUserErrors ?? r.body?.errors ?? null)} at ${Date.now() - t0}ms`;
          }
          const r = await fetch(activationUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ "customer[password]": password, "customer[password_confirmation]": password }).toString(),
            redirect: "manual",
          });
          const loc = (r.headers.get("location") || "-").replace(/^https?:\/\/[^/]+/, "").split("?")[0].replace(/\/[a-f0-9]{20,}.*$/, "/<token>");
          return `form ${r.status} ${loc} at ${Date.now() - t0}ms`;
        };
        steps.push(`delay ${delay}ms`, ...(await Promise.all([enrich(), activate()])));
        steps.push(`state_after_race=${await state(cid)}`);
        const first = await signIn(email, password);
        steps.push(`sign_in_after_race=${first}`);
        if (first !== "ok" && mode === "race_form") {
          const w = await fetch(`https://${domain}/admin/api/2024-10/customers/${cid}.json`, {
            method: "PUT",
            headers: adminHeaders,
            body: JSON.stringify({ customer: { id: cid, password, password_confirmation: password, send_email_welcome: false } }),
          });
          steps.push(`admin_write ${w.status} state=${await state(cid)} sign_in=${await signIn(email, password)}`);
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

      if (!mode.startsWith("race")) {
        steps.push(`state=${await state(id)}`);
        steps.push(`sign_in_now=${await signIn(email, password)}`);
        await new Promise((r) => setTimeout(r, 5000));
        steps.push(`sign_in_5s=${await signIn(email, password)}`);
      }
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
