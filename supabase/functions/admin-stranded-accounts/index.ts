// Admin-only: find applicants who completed registration but never ended up
// with a usable Shopify password, and re-issue account setup emails.
//
// Why this exists: during the window when the account App Proxy pointed at the
// wrong place (and while the Storefront token was 401ing), the auto-approval
// activation chain in create-customer could fail silently. Those submissions
// were left at status "shopify_ok": the Shopify customer exists, but the
// password was never written and the customerRecover fallback returned 401, so
// no email went out either. The applicant sees a success screen and then can
// never log in.
//
// Shopify customer.state is the source of truth here:
//   enabled  -> has a password (or can use Storefront customerRecover)
//   invited  -> invite issued, never consumed. NO password.
//   disabled -> shell / never invited. NO password.
//
// Repair routing mirrors mem/features/activation-fallback-state-aware.md:
//   invited | disabled -> Admin POST customers/{id}/send_invite.json
//   enabled            -> Storefront customerRecover
//
// Auth pattern copied from admin-list-submissions (admin token or password).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "alex@dropdeadhair.com";
const STOREFRONT_API_VERSION = "2024-10";

type Action = "audit" | "repair" | "link";
type Scope = "flagged" | "all";

interface RequestBody {
  email?: string;
  password?: string;
  token?: string;
  action?: Action;
  /** For action "link": the single customer email to mint a setup link for. */
  linkEmail?: string;
  scope?: Scope;
  days?: number;
  limit?: number;
  emails?: string[];
}

// --- Admin auth (token or password) -----------------------------------------
async function _hmacB64u(key: string, msg: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}
async function verifyAdminToken(token: string, secret: string): Promise<boolean> {
  if (!token || typeof token !== "string" || !token.includes(".")) return false;
  const [payload, sig] = token.split(".");
  const expected = await _hmacB64u(secret, payload);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return false;
  try {
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const pad = "===".slice((b64.length + 3) % 4);
    const j = JSON.parse(atob(b64 + pad));
    if (j.email !== ADMIN_EMAIL) return false;
    if (typeof j.exp !== "number" || j.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}
// ---------------------------------------------------------------------------

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface ShopifyCustomer {
  id: number;
  email: string;
  state: string;
  orders_count?: number;
  tags?: string;
  created_at?: string;
}

async function lookupCustomer(
  domain: string,
  adminToken: string,
  version: string,
  email: string,
): Promise<ShopifyCustomer | null> {
  const res = await fetch(
    `https://${domain}/admin/api/${version}/customers/search.json?query=${encodeURIComponent(`email:${email}`)}`,
    { headers: { "X-Shopify-Access-Token": adminToken } },
  );
  if (!res.ok) {
    console.warn(`[admin-stranded-accounts] lookup ${email} -> ${res.status}`);
    return null;
  }
  const j = await res.json();
  const c = j?.customers?.[0];
  return c ? (c as ShopifyCustomer) : null;
}

async function mapLimited<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

async function getStorefrontToken(domain: string, adminToken: string, version: string): Promise<string | null> {
  const envToken = Deno.env.get("SHOPIFY_STOREFRONT_ACCESS_TOKEN");
  if (envToken && envToken.length === 32 && /^[a-f0-9]+$/i.test(envToken)) return envToken;
  try {
    const res = await fetch(`https://${domain}/admin/api/${version}/storefront_access_tokens.json`, {
      headers: { "X-Shopify-Access-Token": adminToken },
    });
    if (!res.ok) return null;
    const j = await res.json();
    const tokens: Array<{ access_token: string; title?: string }> = j?.storefront_access_tokens ?? [];
    if (!tokens.length) return null;
    return (tokens.find((t) => (t.title || "").startsWith("lovable-")) ?? tokens[0]).access_token ?? null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "Invalid JSON" }, 400);
  }

  const adminPassword = Deno.env.get("ADMIN_PANEL_PASSWORD");
  if (!adminPassword) return json({ success: false, error: "Server misconfigured" }, 500);

  let authed = false;
  if (body.token) {
    authed = await verifyAdminToken(body.token, adminPassword);
  } else {
    authed = (body.email ?? "").trim().toLowerCase() === ADMIN_EMAIL && body.password === adminPassword;
  }
  if (!authed) return json({ success: false, error: "Invalid credentials" }, 401);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const DOMAIN = Deno.env.get("SHOPIFY_STORE_DOMAIN");
  const ADMIN_TOKEN = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN");
  const VERSION = Deno.env.get("SHOPIFY_ADMIN_API_VERSION") || "2024-10";
  if (!SUPABASE_URL || !SERVICE_KEY || !DOMAIN || !ADMIN_TOKEN) {
    return json({ success: false, error: "Server configuration error" }, 500);
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const action: Action =
    body.action === "repair" ? "repair" : body.action === "link" ? "link" : "audit";

  // ---------------- LINK ----------------
  // Mints a Shopify account activation URL directly (no email round-trip) and
  // wraps it in our own SPA activation route, which writes the password through
  // the activate-account function and verifies the customer really flips to
  // "enabled". Use this when a customer says the invite email does not open a
  // working password setup screen. Also probes the raw storefront URL so we can
  // see whether the theme's activate page is serving or 404ing.
  if (action === "link") {
    const target = String(body.linkEmail ?? "").trim().toLowerCase();
    if (!target.includes("@")) return json({ success: false, error: "linkEmail required" }, 400);

    const cust = await lookupCustomer(DOMAIN, ADMIN_TOKEN, VERSION, target);
    if (!cust) return json({ success: false, error: "customer_not_found" }, 404);
    if (cust.state === "enabled") {
      return json({
        success: true,
        action,
        email: target,
        state: cust.state,
        alreadyEnabled: true,
        message: "This customer already has a password. Send a password reset instead.",
      });
    }

    const gql = await fetch(`https://${DOMAIN}/admin/api/${VERSION}/graphql.json`, {
      method: "POST",
      headers: { "X-Shopify-Access-Token": ADMIN_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `mutation act($id: ID!) {
          customerGenerateAccountActivationUrl(customerId: $id) {
            accountActivationUrl
            userErrors { field message }
          }
        }`,
        variables: { id: `gid://shopify/Customer/${cust.id}` },
      }),
    });
    const gqlBody = await gql.json().catch(() => null);
    const payload = gqlBody?.data?.customerGenerateAccountActivationUrl;
    const rawUrl: string | null = payload?.accountActivationUrl ?? null;
    const userErrors = payload?.userErrors ?? gqlBody?.errors ?? [];
    if (!rawUrl) {
      return json({
        success: false,
        error: "activation_url_unavailable",
        detail: JSON.stringify(userErrors).slice(0, 300),
      }, 502);
    }

    // Probe the storefront activation page so we know whether the theme
    // template is actually serving the password form.
    let rawUrlStatus: number | null = null;
    try {
      const probe = await fetch(rawUrl, { method: "GET", redirect: "manual" });
      rawUrlStatus = probe.status;
    } catch {
      rawUrlStatus = null;
    }

    const spaUrl = `https://apply.dropdeadextensions.com/activate-account?activation_url=${encodeURIComponent(rawUrl)}`;

    return json({
      success: true,
      action,
      email: target,
      state: cust.state,
      shopifyId: cust.id,
      rawUrl,
      rawUrlStatus,
      spaUrl,
      themeActivatePageOk: rawUrlStatus === 200,
    });
  }


  // ---------------- REPAIR ----------------
  if (action === "repair") {
    const emails = Array.isArray(body.emails)
      ? body.emails.map((e) => String(e).trim().toLowerCase()).filter((e) => e.includes("@")).slice(0, 200)
      : [];
    if (!emails.length) return json({ success: false, error: "No emails provided" }, 400);

    const storefrontToken = await getStorefrontToken(DOMAIN, ADMIN_TOKEN, VERSION);

    const results = await mapLimited(emails, 3, async (email) => {
      try {
        const cust = await lookupCustomer(DOMAIN, ADMIN_TOKEN, VERSION, email);
        if (!cust) return { email, ok: false, channel: "none", detail: "customer_not_found" };

        if (cust.state === "invited" || cust.state === "disabled") {
          const res = await fetch(
            `https://${DOMAIN}/admin/api/${VERSION}/customers/${cust.id}/send_invite.json`,
            {
              method: "POST",
              headers: { "X-Shopify-Access-Token": ADMIN_TOKEN, "Content-Type": "application/json" },
              body: JSON.stringify({ customer_invite: {} }),
            },
          );
          if (res.ok) return { email, ok: true, channel: "invite", detail: cust.state };
          return { email, ok: false, channel: "invite", detail: `${res.status}: ${(await res.text()).slice(0, 160)}` };
        }

        // enabled -> storefront recover
        if (!storefrontToken) return { email, ok: false, channel: "recover", detail: "no_storefront_token" };
        const res = await fetch(`https://${DOMAIN}/api/${STOREFRONT_API_VERSION}/graphql.json`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": storefrontToken },
          body: JSON.stringify({
            query: `mutation customerRecover($email: String!) { customerRecover(email: $email) { customerUserErrors { code message } } }`,
            variables: { email },
          }),
        });
        if (!res.ok) return { email, ok: false, channel: "recover", detail: `HTTP ${res.status}` };
        const j = await res.json();
        const errs = j?.data?.customerRecover?.customerUserErrors ?? [];
        if (errs.length) return { email, ok: false, channel: "recover", detail: JSON.stringify(errs).slice(0, 160) };
        return { email, ok: true, channel: "recover", detail: "enabled" };
      } catch (e) {
        return { email, ok: false, channel: "none", detail: e instanceof Error ? e.message : String(e) };
      }
    });

    const sent = results.filter((r) => r.ok).length;
    console.log(`[admin-stranded-accounts] repair: ${sent}/${results.length} emails re-issued`);
    return json({ success: true, action, attempted: results.length, sent, results });
  }

  // ---------------- AUDIT ----------------
  const days = Math.min(Math.max(Number(body.days ?? 120), 1), 730);
  const limit = Math.min(Math.max(Number(body.limit ?? 250), 1), 500);
  const scope: Scope = body.scope === "all" ? "all" : "flagged";
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  const { data: rows, error } = await supabase
    .from("registration_submissions")
    .select("email, status, error_log, shopify_customer_id, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(scope === "all" ? limit : 500);

  if (error) {
    console.error("[admin-stranded-accounts] query failed", error);
    return json({ success: false, error: "Failed to query submissions" }, 500);
  }

  type Row = { email: string; status: string; error_log: unknown; shopify_customer_id: number | null; created_at: string };
  const all = (rows ?? []) as Row[];

  const isFlagged = (r: Row) => {
    if (r.status === "shopify_ok" || r.status === "pending" || r.status === "helium_ok") return true;
    const log = JSON.stringify(r.error_log ?? "");
    return /activation|password|customerRecover/i.test(log);
  };

  // Dedupe by email, keep most recent submission.
  const seen = new Set<string>();
  const candidates: Row[] = [];
  for (const r of all) {
    const email = (r.email ?? "").trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    if (scope === "flagged" && !isFlagged(r)) continue;
    seen.add(email);
    candidates.push({ ...r, email });
    if (candidates.length >= limit) break;
  }

  const checked = await mapLimited(candidates, 4, async (r) => {
    const cust = await lookupCustomer(DOMAIN, ADMIN_TOKEN, VERSION, r.email);
    const activationError = (() => {
      const log = Array.isArray(r.error_log) ? (r.error_log as Array<{ step?: string; message?: string }>) : [];
      const hit = log.find((l) => /activation|password/i.test(l.step ?? "") || /activation|customerRecover/i.test(l.message ?? ""));
      return hit ? `${hit.step}: ${(hit.message ?? "").slice(0, 140)}` : null;
    })();
    return {
      email: r.email,
      submissionStatus: r.status,
      submittedAt: r.created_at,
      shopifyId: cust?.id ?? null,
      shopifyState: cust?.state ?? "not_found",
      ordersCount: cust?.orders_count ?? 0,
      activationError,
      needsPassword: !!cust && (cust.state === "invited" || cust.state === "disabled"),
    };
  });

  const stranded = checked.filter((c) => c.needsPassword);
  const tally: Record<string, number> = {};
  for (const c of checked) tally[c.shopifyState] = (tally[c.shopifyState] ?? 0) + 1;

  return json({
    success: true,
    action,
    scope,
    days,
    scanned: candidates.length,
    stateTally: tally,
    strandedCount: stranded.length,
    stranded,
    checked,
  });
});
