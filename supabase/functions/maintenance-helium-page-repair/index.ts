import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PAGE_LIMIT = 250;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type HeliumCustomer = {
  id: string;
  email?: string | null;
  shopify_id?: number | string | null;
  created_at?: string | null;
  [k: string]: unknown;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  let body: { startPage?: number; maxPages?: number } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const heliumToken = Deno.env.get("HELIUM_PRIVATE_ACCESS_TOKEN");
  if (!supabaseUrl || !serviceKey || !heliumToken) {
    return json({ success: false, error: "Server misconfigured" }, 500);
  }

  const startPage = Math.max(1, Math.floor(body.startPage ?? 1));
  const maxPages = Math.min(5, Math.max(1, Math.floor(body.maxPages ?? 3)));
  const supabase = createClient(supabaseUrl, serviceKey);

  let fetched = 0;
  let upserted = 0;
  let skipped = 0;
  let pagesProcessed = 0;
  let lastPage = startPage - 1;
  let lastCreatedAt: string | null = null;
  let done = false;

  for (let page = startPage; page < startPage + maxPages; page += 1) {
    const url = new URL("https://app.customerfields.com/api/v2/customers/search.json");
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(PAGE_LIMIT));
    url.searchParams.set("sort_by", "created_at");
    url.searchParams.set("sort_order", "asc");

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json", Authorization: `Bearer ${heliumToken}` },
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return json({ success: false, error: `Helium ${res.status}`, detail: detail.slice(0, 200), fetched, upserted }, 502);
    }

    const data = (await res.json()) as { customers?: HeliumCustomer[] };
    const customers = Array.isArray(data.customers) ? data.customers : [];
    lastPage = page;
    pagesProcessed += 1;
    fetched += customers.length;

    if (customers.length === 0) {
      done = true;
      break;
    }

    const rows = customers
      .filter((c) => typeof c.id === "string" && c.created_at)
      .map((c) => {
        const sid =
          typeof c.shopify_id === "number"
            ? c.shopify_id
            : typeof c.shopify_id === "string" && /^\d+$/.test(c.shopify_id)
              ? Number(c.shopify_id)
              : null;
        return {
          helium_id: c.id,
          email: typeof c.email === "string" ? c.email.toLowerCase() : null,
          shopify_id: sid,
          created_at: c.created_at as string,
          raw: c as unknown as Record<string, unknown>,
          fetched_at: new Date().toISOString(),
        };
      });

    skipped += customers.length - rows.length;
    if (rows.length > 0) {
      const { error } = await supabase.from("helium_customers_backfill").upsert(rows, { onConflict: "helium_id" });
      if (error) return json({ success: false, error: error.message, fetched, upserted }, 500);
      upserted += rows.length;
      lastCreatedAt = rows[rows.length - 1].created_at;
    }
  }

  return json({ success: true, startPage, lastPage, nextPage: done ? null : lastPage + 1, pagesProcessed, fetched, upserted, skipped, lastCreatedAt, done });
});