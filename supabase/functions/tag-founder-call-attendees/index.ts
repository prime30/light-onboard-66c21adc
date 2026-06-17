// Admin-gated sweep: finds registration_leads who attended a founder call
// (booked + start_time in the past + no no_show_at stamp) and adds the
// "Founder Call Attendee" tag to their Shopify customer.
//
// Safe to re-run — tag is merged with existing tags, never overwrites.
//
// Body: { email, password, dryRun? (default false) }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "alex@dropdeadhair.com";
const ATTENDEE_TAG = "Founder Call Attendee";
const ADMIN_API_VERSION = Deno.env.get("SHOPIFY_ADMIN_API_VERSION") ?? "2026-04";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function tagsFromString(s: string | null | undefined): string[] {
  if (!s) return [];
  return s.split(",").map((t) => t.trim()).filter(Boolean);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  let body: { email?: string; password?: string; dryRun?: boolean };
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "Invalid JSON" }, 400);
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const adminPassword = Deno.env.get("ADMIN_PANEL_PASSWORD");
  if (!adminPassword) return json({ success: false, error: "Server misconfigured" }, 500);
  if (email !== ADMIN_EMAIL || password !== adminPassword)
    return json({ success: false, error: "Invalid credentials" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const shopDomain = Deno.env.get("SHOPIFY_STORE_DOMAIN") ?? Deno.env.get("SHOPIFY_SHOP_DOMAIN");
  const adminToken = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN");
  if (!supabaseUrl || !serviceKey)
    return json({ success: false, error: "Server misconfigured" }, 500);
  if (!shopDomain || !adminToken)
    return json({ success: false, error: "Shopify admin not configured" }, 500);

  const dryRun = body.dryRun === true;
  const supabase = createClient(supabaseUrl, serviceKey);
  const nowIso = new Date().toISOString();

  // Attendees: start_time in past AND no no_show_at stamp.
  const { data: rows, error } = await supabase
    .from("registration_leads")
    .select("email, founder_call_start_time, founder_call_no_show_at")
    .not("founder_call_booked_at", "is", null)
    .lt("founder_call_start_time", nowIso)
    .is("founder_call_no_show_at", null);

  if (error) {
    console.error("[tag-attendees] lead query failed", error);
    return json({ success: false, error: "Lead query failed" }, 500);
  }

  const attendees = (rows ?? []) as Array<{ email: string }>;
  let tagged = 0;
  let alreadyTagged = 0;
  let notFound = 0;
  let failed = 0;

  for (const row of attendees) {
    const e = (row.email ?? "").trim().toLowerCase();
    if (!e) continue;

    try {
      // Look up Shopify customer by email
      const searchRes = await fetch(
        `https://${shopDomain}/admin/api/${ADMIN_API_VERSION}/customers/search.json?query=${encodeURIComponent(`email:${e}`)}`,
        {
          headers: {
            "X-Shopify-Access-Token": adminToken,
            Accept: "application/json",
          },
        },
      );
      if (!searchRes.ok) {
        failed += 1;
        console.warn("[tag-attendees] search failed", e, searchRes.status);
        continue;
      }
      const { customers } = (await searchRes.json()) as {
        customers?: Array<{ id: number; tags?: string }>;
      };
      const customer = customers?.[0];
      if (!customer) {
        notFound += 1;
        continue;
      }

      const existing = tagsFromString(customer.tags);
      const hasTag = existing.some((t) => t.toLowerCase() === ATTENDEE_TAG.toLowerCase());
      if (hasTag) {
        alreadyTagged += 1;
        continue;
      }

      if (dryRun) {
        tagged += 1;
        continue;
      }

      const merged = Array.from(new Set([...existing, ATTENDEE_TAG])).join(", ");
      const updateRes = await fetch(
        `https://${shopDomain}/admin/api/${ADMIN_API_VERSION}/customers/${customer.id}.json`,
        {
          method: "PUT",
          headers: {
            "X-Shopify-Access-Token": adminToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ customer: { id: customer.id, tags: merged } }),
        },
      );
      if (!updateRes.ok) {
        failed += 1;
        const text = await updateRes.text().catch(() => "");
        console.warn("[tag-attendees] update failed", e, updateRes.status, text.slice(0, 300));
        continue;
      }
      tagged += 1;
      // Be polite to Shopify rate limits
      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      failed += 1;
      console.warn("[tag-attendees] error", e, err);
    }
  }

  return json({
    success: true,
    dryRun,
    candidates: attendees.length,
    tagged,
    alreadyTagged,
    notFound,
    failed,
    tag: ATTENDEE_TAG,
  });
});
