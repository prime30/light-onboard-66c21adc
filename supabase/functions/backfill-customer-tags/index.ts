// Admin-gated backfill: walk Shopify customers and apply missing
// "Account type: …", admin extra tags (wholesale / B2B), "Tax exempt",
// and a summary `note` for any customer that has Helium metafield
// data but no matching Shopify tag. Safe to re-run.
//
// Body:
//   {
//     email: string,
//     password: string,
//     dryRun?: boolean,    // default true
//     limit?: number,      // max customers to process this run (default 250)
//     onlyEmail?: string,  // restrict to a single email
//     pageInfo?: string    // cursor for pagination (returned in response)
//   }
//
// Returns: { processed, updated, skipped, errors[], nextPageInfo?, results[] }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "alex@dropdeadhair.com";
const HELIUM_NS = "helium_customer_fields";
const API_VERSION = "2024-10";

const accountTypeLabelMap: Record<string, string> = {
  professional: "Licensed stylist",
  salon: "Salon owner or manager",
  student: "Cosmetology student or apprentice",
  licensed_stylist: "Licensed stylist",
};

interface BackfillBody {
  email?: string;
  password?: string;
  dryRun?: boolean;
  limit?: number;
  onlyEmail?: string;
  pageInfo?: string;
}

interface ShopifyCustomer {
  id: number;
  email: string;
  tags: string;
  tax_exempt: boolean;
  note: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

interface ShopifyMetafield {
  namespace: string;
  key: string;
  value: string;
  type?: string;
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseLinkHeader(link: string | null): string | null {
  if (!link) return null;
  // Format: <https://.../customers.json?limit=50&page_info=XYZ>; rel="next", <...>; rel="previous"
  const parts = link.split(",");
  for (const part of parts) {
    const m = part.match(/<([^>]+)>;\s*rel="next"/);
    if (m) {
      try {
        const u = new URL(m[1]);
        return u.searchParams.get("page_info");
      } catch {
        return null;
      }
    }
  }
  return null;
}

function tagsFromString(s: string | undefined | null): string[] {
  if (!s) return [];
  return s
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function metafieldMap(mfs: ShopifyMetafield[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const mf of mfs) {
    if (mf.namespace !== HELIUM_NS) continue;
    out[mf.key] = mf.value;
  }
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  let body: BackfillBody;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "Invalid JSON" }, 400);
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const adminPassword = Deno.env.get("ADMIN_PANEL_PASSWORD");

  if (!adminPassword) return json({ success: false, error: "Server configuration error" }, 500);
  if (email !== ADMIN_EMAIL || password !== adminPassword) {
    return json({ success: false, error: "Invalid credentials" }, 401);
  }

  const shopifyDomain = Deno.env.get("SHOPIFY_STORE_DOMAIN");
  const shopifyAdminToken = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!shopifyDomain || !shopifyAdminToken || !supabaseUrl || !serviceRoleKey) {
    return json({ success: false, error: "Server configuration error" }, 500);
  }

  const dryRun = body.dryRun !== false; // default TRUE — explicit opt-in to write
  const limit = Math.min(Math.max(body.limit ?? 250, 1), 250);
  const onlyEmail = body.onlyEmail?.trim().toLowerCase();
  const pageInfo = body.pageInfo?.trim();

  // Load admin extra tags
  let extraAdminTags: string[] = [];
  try {
    const tagsRes = await fetch(
      `${supabaseUrl}/rest/v1/app_settings?singleton=eq.true&select=extra_customer_tags`,
      {
        headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
      }
    );
    if (tagsRes.ok) {
      const rows = (await tagsRes.json()) as Array<{ extra_customer_tags?: string[] }>;
      const arr = rows?.[0]?.extra_customer_tags;
      if (Array.isArray(arr)) {
        extraAdminTags = arr
          .filter((t): t is string => typeof t === "string")
          .map((t) => t.trim().replace(/,/g, " "))
          .filter(Boolean);
      }
    }
  } catch (e) {
    console.warn("Failed to load extra admin tags:", e);
  }

  const shopifyHeaders = {
    "X-Shopify-Access-Token": shopifyAdminToken,
    "Content-Type": "application/json",
  };

  // Build customer list — either single email or paged list
  let customers: ShopifyCustomer[] = [];
  let nextPageInfo: string | null = null;

  if (onlyEmail) {
    const r = await fetch(
      `https://${shopifyDomain}/admin/api/${API_VERSION}/customers/search.json?query=${encodeURIComponent(`email:${onlyEmail}`)}`,
      { headers: shopifyHeaders }
    );
    if (!r.ok) {
      const t = await r.text();
      return json({ success: false, error: `Shopify search failed: ${r.status} ${t}` }, 502);
    }
    const j = await r.json();
    customers = (j?.customers ?? []) as ShopifyCustomer[];
  } else {
    const qs = new URLSearchParams({ limit: String(limit) });
    if (pageInfo) qs.set("page_info", pageInfo);
    const r = await fetch(
      `https://${shopifyDomain}/admin/api/${API_VERSION}/customers.json?${qs.toString()}`,
      { headers: shopifyHeaders }
    );
    if (!r.ok) {
      const t = await r.text();
      return json({ success: false, error: `Shopify list failed: ${r.status} ${t}` }, 502);
    }
    const j = await r.json();
    customers = (j?.customers ?? []) as ShopifyCustomer[];
    nextPageInfo = parseLinkHeader(r.headers.get("link") ?? r.headers.get("Link"));
  }

  const results: Array<{
    id: number;
    email: string;
    action: "updated" | "skipped" | "error";
    addedTags?: string[];
    setNote?: boolean;
    setTaxExempt?: boolean;
    reason?: string;
  }> = [];
  let updated = 0;
  let skipped = 0;

  for (const c of customers) {
    try {
      const existingTags = tagsFromString(c.tags);
      const existingLower = new Set(existingTags.map((t) => t.toLowerCase()));

      // Pull metafields for this customer
      const mfRes = await fetch(
        `https://${shopifyDomain}/admin/api/${API_VERSION}/customers/${c.id}/metafields.json`,
        { headers: shopifyHeaders }
      );
      if (!mfRes.ok) {
        results.push({
          id: c.id,
          email: c.email,
          action: "error",
          reason: `metafields ${mfRes.status}`,
        });
        await mfRes.text().catch(() => {});
        continue;
      }
      const mfJson = await mfRes.json();
      const mf = metafieldMap((mfJson?.metafields ?? []) as ShopifyMetafield[]);

      // Derive account type tag from Helium metafield if present.
      // CRITICAL: only customers with a Helium account_type metafield are
      // treated as real B2B applicants. Anyone without it (support contacts,
      // Klaviyo syncs, order-only customers) is skipped entirely so we
      // don't pollute their record with wholesale/B2B/Account-type tags
      // and don't trip the soft-merge block on future registrations.
      const rawAccountType = (mf["account_type"] ?? "").toLowerCase().trim();
      if (!rawAccountType) {
        skipped++;
        results.push({
          id: c.id,
          email: c.email,
          action: "skipped",
          reason: "no Helium account_type — not an applicant",
        });
        continue;
      }
      const accountTypeLabel =
        accountTypeLabelMap[rawAccountType] ?? rawAccountType;

      const desiredTags: string[] = [];
      desiredTags.push(`Account type: ${accountTypeLabel}`);
      const taxExemptFlag = mf["tax_exempt"] === "true" || c.tax_exempt === true;
      if (taxExemptFlag) desiredTags.push("Tax exempt");
      desiredTags.push(...extraAdminTags);

      const tagsToAdd = desiredTags.filter((t) => !existingLower.has(t.toLowerCase()));

      // Build a note if missing and we have metafield data
      const wantsNote = !c.note || c.note.trim().length === 0;
      const noteLines: string[] = [];
      if (accountTypeLabel) noteLines.push(`Account type: ${accountTypeLabel}`);
      if (mf["business_name"]) noteLines.push(`Business: ${mf["business_name"]}`);
      if (mf["license_number"]) noteLines.push(`License #: ${mf["license_number"]}`);
      if (mf["salon_size"]) noteLines.push(`Salon size: ${mf["salon_size"]}`);
      if (mf["salon_structure"]) noteLines.push(`Salon structure: ${mf["salon_structure"]}`);
      if (mf["school_name"]) noteLines.push(`School: ${mf["school_name"]}`);
      if (mf["school_state"]) noteLines.push(`School state: ${mf["school_state"]}`);
      if (mf["referral_source"]) noteLines.push(`Referral: ${mf["referral_source"]}`);
      if (mf["social_media_handle"]) noteLines.push(`Social: ${mf["social_media_handle"]}`);
      const noteToSet =
        wantsNote && noteLines.length > 0
          ? `Backfilled ${new Date().toISOString()}\n${noteLines.join("\n")}`
          : null;

      const needsTaxExempt = taxExemptFlag && c.tax_exempt !== true;

      const willUpdate = tagsToAdd.length > 0 || !!noteToSet || needsTaxExempt;
      if (!willUpdate) {
        skipped++;
        results.push({ id: c.id, email: c.email, action: "skipped", reason: "up-to-date" });
        continue;
      }

      if (dryRun) {
        updated++;
        results.push({
          id: c.id,
          email: c.email,
          action: "updated",
          addedTags: tagsToAdd,
          setNote: !!noteToSet,
          setTaxExempt: needsTaxExempt,
          reason: "dry-run",
        });
        continue;
      }

      const mergedTags = Array.from(new Set([...existingTags, ...tagsToAdd]));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const customerUpdate: Record<string, any> = { id: c.id };
      if (tagsToAdd.length > 0) customerUpdate.tags = mergedTags.join(", ");
      if (noteToSet) customerUpdate.note = noteToSet;
      if (needsTaxExempt) customerUpdate.tax_exempt = true;

      const updRes = await fetch(
        `https://${shopifyDomain}/admin/api/${API_VERSION}/customers/${c.id}.json`,
        {
          method: "PUT",
          headers: shopifyHeaders,
          body: JSON.stringify({ customer: customerUpdate }),
        }
      );
      if (!updRes.ok) {
        const errText = await updRes.text();
        results.push({
          id: c.id,
          email: c.email,
          action: "error",
          reason: `PUT ${updRes.status} ${errText.slice(0, 200)}`,
        });
        continue;
      }
      await updRes.text().catch(() => {});

      updated++;
      results.push({
        id: c.id,
        email: c.email,
        action: "updated",
        addedTags: tagsToAdd,
        setNote: !!noteToSet,
        setTaxExempt: needsTaxExempt,
      });

      // Gentle pacing — Shopify REST is 40 req/s/store. Mf + PUT = 2/customer.
      await new Promise((r) => setTimeout(r, 80));
    } catch (e) {
      results.push({
        id: c.id,
        email: c.email,
        action: "error",
        reason: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return json({
    success: true,
    dryRun,
    processed: customers.length,
    updated,
    skipped,
    errors: results.filter((r) => r.action === "error").length,
    nextPageInfo,
    results,
  });
});
