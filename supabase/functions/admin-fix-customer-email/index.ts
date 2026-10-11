// Admin-only: correct a misspelled email domain on Shopify customers
// ("jane@gmail.con" -> "jane@gmail.com").
//
// Body: { email, password, fixes: [{ customerId, from }], apply?: boolean }
// - Without apply: true it only reports what it would do.
// - The new address is always suggestEmailDomainFix(from); arbitrary
//   addresses can't be set through this function.
// - A fix is skipped when the customer's current email isn't `from`, or when
//   another Shopify customer already uses the corrected address.
// - Applied fixes also update registration_submissions.email.

import { createClient } from "npm:@supabase/supabase-js@2";
import { suggestEmailDomainFix } from "./email-typos.ts";

const FUNCTION_VERSION = "E1-20261010";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "X-Function-Version": FUNCTION_VERSION,
};

const ADMIN_EMAIL = "alex@dropdeadhair.com";
const MAX_FIXES = 25;

type Fix = { customerId?: number | string; from?: string };
type Result = {
  customerId: string;
  from: string;
  to: string | null;
  status: "would_fix" | "fixed" | "skipped" | "failed";
  reason?: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  let body: { email?: string; password?: string; fixes?: Fix[]; apply?: boolean };
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "Invalid JSON" }, 400);
  }

  const adminPassword = Deno.env.get("ADMIN_PANEL_PASSWORD");
  if (!adminPassword) return json({ success: false, error: "Server misconfigured" }, 500);
  const adminEmail = (body.email ?? "").trim().toLowerCase();
  if (adminEmail !== ADMIN_EMAIL || (body.password ?? "") !== adminPassword) {
    return json({ success: false, error: "Invalid credentials" }, 401);
  }

  const shopDomain = Deno.env.get("SHOPIFY_SHOP_DOMAIN") ?? Deno.env.get("SHOPIFY_STORE_DOMAIN");
  const adminToken = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN");
  const apiVersion = Deno.env.get("SHOPIFY_ADMIN_API_VERSION") ?? "2024-10";
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!shopDomain || !adminToken || !supabaseUrl || !serviceRoleKey) {
    return json({ success: false, error: "Server config error" }, 500);
  }

  const fixes = Array.isArray(body.fixes) ? body.fixes : [];
  if (fixes.length === 0) return json({ success: false, error: "No fixes given" }, 400);
  if (fixes.length > MAX_FIXES) return json({ success: false, error: `At most ${MAX_FIXES} fixes per call` }, 400);
  const apply = body.apply === true;

  const shopify = (path: string, init?: RequestInit) =>
    fetch(`https://${shopDomain}/admin/api/${apiVersion}${path}`, {
      ...init,
      headers: { "X-Shopify-Access-Token": adminToken, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const results: Result[] = [];
  for (const fix of fixes) {
    const customerId = String(fix.customerId ?? "").replace(/\D+/g, "");
    const from = (fix.from ?? "").trim().toLowerCase();
    const to = suggestEmailDomainFix(from)?.toLowerCase() ?? null;
    const base = { customerId, from, to };

    if (!customerId || !from) {
      results.push({ ...base, status: "skipped", reason: "missing customerId or from" });
      continue;
    }
    if (!to) {
      results.push({ ...base, status: "skipped", reason: "from is not a known domain typo" });
      continue;
    }

    try {
      const getRes = await shopify(`/customers/${customerId}.json`);
      if (!getRes.ok) {
        results.push({ ...base, status: "failed", reason: `Shopify GET ${getRes.status}` });
        continue;
      }
      const current = String((await getRes.json())?.customer?.email ?? "").trim().toLowerCase();
      if (current !== from) {
        results.push({ ...base, status: "skipped", reason: `current email is ${current || "empty"}` });
        continue;
      }

      const searchRes = await shopify(`/customers/search.json?query=${encodeURIComponent(`email:"${to}"`)}&fields=id,email`);
      if (!searchRes.ok) {
        results.push({ ...base, status: "failed", reason: `Shopify search ${searchRes.status}` });
        continue;
      }
      const matches = ((await searchRes.json())?.customers ?? []) as Array<{ id: number; email: string | null }>;
      const conflict = matches.find(
        (c) => String(c.id) !== customerId && String(c.email ?? "").trim().toLowerCase() === to,
      );
      if (conflict) {
        results.push({ ...base, status: "skipped", reason: `${to} already belongs to customer ${conflict.id}` });
        continue;
      }

      if (!apply) {
        results.push({ ...base, status: "would_fix" });
        continue;
      }

      const putRes = await shopify(`/customers/${customerId}.json`, {
        method: "PUT",
        body: JSON.stringify({ customer: { id: Number(customerId), email: to } }),
      });
      if (!putRes.ok) {
        const detail = (await putRes.text()).slice(0, 200);
        results.push({ ...base, status: "failed", reason: `Shopify PUT ${putRes.status}: ${detail}` });
        continue;
      }

      const { error: dbErr } = await supabase
        .from("registration_submissions")
        .update({ email: to })
        .eq("email", from);
      console.log("Customer email corrected", { customerId, from, to, dbUpdated: !dbErr });
      results.push({ ...base, status: "fixed", reason: dbErr ? `Shopify updated; DB update failed: ${dbErr.message}` : undefined });
    } catch (e) {
      results.push({ ...base, status: "failed", reason: e instanceof Error ? e.message : String(e) });
    }
  }

  return json({ success: true, apply, results });
});
