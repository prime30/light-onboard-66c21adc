// Admin-gated backfill: fill in a missing country (and AU state) on the
// Shopify customer's default address. Needed because the business-location
// step was disabled, so customers created after that point can have an
// address with no country_code.
//
// Body:
//   {
//     email: string,
//     password: string,
//     dryRun?: boolean,      // default true
//     limit?: number,        // customers per run (default 250, max 250)
//     createdAtMin?: string, // ISO date, e.g. "2026-08-05"
//     onlyEmail?: string,
//     pageInfo?: string      // cursor returned in the response
//   }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "alex@dropdeadhair.com";
const API_VERSION = "2024-10";

const CA_AREA_CODES = new Set([
  "204", "226", "236", "249", "250", "263", "289", "306", "343", "354", "365", "367", "368",
  "382", "403", "416", "418", "428", "431", "437", "438", "450", "468", "474", "506", "514",
  "519", "548", "579", "581", "584", "587", "604", "613", "639", "647", "672", "683", "705",
  "709", "742", "753", "778", "780", "782", "807", "819", "825", "867", "873", "879", "902",
  "905",
]);

const AU_STATE_BY_AREA: Record<string, string> = {
  "2": "NSW",
  "3": "VIC",
  "7": "QLD",
  "8": "SA",
};

interface Body {
  email?: string;
  password?: string;
  dryRun?: boolean;
  limit?: number;
  createdAtMin?: string;
  onlyEmail?: string;
  pageInfo?: string;
}

interface ShopifyAddress {
  id?: number;
  country_code?: string | null;
  province_code?: string | null;
  phone?: string | null;
}

interface ShopifyCustomer {
  id: number;
  email: string;
  phone?: string | null;
  default_address?: ShopifyAddress | null;
  addresses?: ShopifyAddress[] | null;
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseNextPageInfo(link: string | null): string | null {
  if (!link) return null;
  for (const part of link.split(",")) {
    const m = part.match(/<([^>]+)>;\s*rel="next"/);
    if (m) {
      try {
        return new URL(m[1]).searchParams.get("page_info");
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** Derive an ISO country from an E.164-ish phone string. */
function countryFromPhone(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("61")) return "AU";
  if (digits.startsWith("64")) return "NZ";
  if (digits.startsWith("44")) return "GB";
  if (digits.startsWith("353")) return "IE";
  if (digits.startsWith("27")) return "ZA";
  if (digits.startsWith("1") && digits.length >= 11) {
    return CA_AREA_CODES.has(digits.slice(1, 4)) ? "CA" : "US";
  }
  if (digits.length === 10) {
    return CA_AREA_CODES.has(digits.slice(0, 3)) ? "CA" : "US";
  }
  return null;
}

/** AU landline area codes carry a state; mobiles (04x) do not. */
function auStateFromPhone(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits.startsWith("61")) return null;
  const local = digits.slice(2).replace(/^0/, "");
  return AU_STATE_BY_AREA[local.slice(0, 1)] ?? null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "Invalid JSON" }, 400);
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const adminPassword = Deno.env.get("ADMIN_PANEL_PASSWORD");
  if (!adminPassword) return json({ success: false, error: "Server configuration error" }, 500);
  if (email !== ADMIN_EMAIL || (body.password ?? "") !== adminPassword) {
    return json({ success: false, error: "Invalid credentials" }, 401);
  }

  const shopifyDomain = Deno.env.get("SHOPIFY_STORE_DOMAIN");
  const shopifyAdminToken = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN");
  if (!shopifyDomain || !shopifyAdminToken) {
    return json({ success: false, error: "Server configuration error" }, 500);
  }

  const dryRun = body.dryRun !== false; // explicit opt-in to write
  const limit = Math.min(Math.max(body.limit ?? 250, 1), 250);
  const onlyEmail = body.onlyEmail?.trim().toLowerCase();

  const shopifyHeaders = {
    "X-Shopify-Access-Token": shopifyAdminToken,
    "Content-Type": "application/json",
  };

  let customers: ShopifyCustomer[] = [];
  let nextPageInfo: string | null = null;

  if (onlyEmail) {
    const r = await fetch(
      `https://${shopifyDomain}/admin/api/${API_VERSION}/customers/search.json?query=${encodeURIComponent(`email:${onlyEmail}`)}`,
      { headers: shopifyHeaders }
    );
    if (!r.ok) return json({ success: false, error: `Shopify search failed: ${r.status}` }, 502);
    customers = ((await r.json())?.customers ?? []) as ShopifyCustomer[];
  } else {
    const qs = new URLSearchParams({ limit: String(limit) });
    if (body.pageInfo) {
      // Shopify rejects filters alongside page_info cursors.
      qs.set("page_info", body.pageInfo.trim());
    } else if (body.createdAtMin) {
      qs.set("created_at_min", new Date(body.createdAtMin).toISOString());
    }
    const r = await fetch(
      `https://${shopifyDomain}/admin/api/${API_VERSION}/customers.json?${qs.toString()}`,
      { headers: shopifyHeaders }
    );
    if (!r.ok) return json({ success: false, error: `Shopify list failed: ${r.status}` }, 502);
    customers = ((await r.json())?.customers ?? []) as ShopifyCustomer[];
    nextPageInfo = parseNextPageInfo(r.headers.get("link") ?? r.headers.get("Link"));
  }

  const results: Array<{
    id: number;
    email: string;
    action: "updated" | "skipped" | "error";
    countryCode?: string;
    provinceCode?: string;
    reason?: string;
  }> = [];
  let updated = 0;
  let skipped = 0;

  for (const c of customers) {
    try {
      const addr = c.default_address ?? c.addresses?.[0] ?? null;
      if (!addr?.id) {
        skipped++;
        results.push({ id: c.id, email: c.email, action: "skipped", reason: "no address on record" });
        continue;
      }
      if ((addr.country_code ?? "").trim()) {
        skipped++;
        results.push({ id: c.id, email: c.email, action: "skipped", reason: "country already set" });
        continue;
      }

      const phone = addr.phone || c.phone;
      const country = countryFromPhone(phone);
      if (!country) {
        skipped++;
        results.push({ id: c.id, email: c.email, action: "skipped", reason: "no usable phone" });
        continue;
      }

      const province =
        country === "AU" && !(addr.province_code ?? "").trim() ? auStateFromPhone(phone) : null;

      if (dryRun) {
        updated++;
        results.push({
          id: c.id,
          email: c.email,
          action: "updated",
          countryCode: country,
          provinceCode: province ?? undefined,
          reason: "dry-run",
        });
        continue;
      }

      const addressUpdate: Record<string, string> = { country_code: country };
      if (province) addressUpdate.province_code = province;

      const upd = await fetch(
        `https://${shopifyDomain}/admin/api/${API_VERSION}/customers/${c.id}/addresses/${addr.id}.json`,
        {
          method: "PUT",
          headers: shopifyHeaders,
          body: JSON.stringify({ address: addressUpdate }),
        }
      );
      if (!upd.ok) {
        const t = await upd.text();
        results.push({
          id: c.id,
          email: c.email,
          action: "error",
          reason: `PUT ${upd.status} ${t.slice(0, 200)}`,
        });
        continue;
      }
      await upd.text().catch(() => {});

      updated++;
      results.push({
        id: c.id,
        email: c.email,
        action: "updated",
        countryCode: country,
        provinceCode: province ?? undefined,
      });

      // Gentle pacing against the Shopify REST rate limit.
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
