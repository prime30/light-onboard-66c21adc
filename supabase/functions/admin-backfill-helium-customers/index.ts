// Paginates the Helium Customer Fields API and upserts every customer's
// signup record into public.helium_customers_backfill. Designed to be
// called repeatedly: each call resumes from `startPage` and stops after
// `maxPages` pages so we never blow past the Supabase edge-function
// timeout. The response tells the client whether to call again with
// `nextPage` until `done: true`.
//
// Auth: same email + ADMIN_PANEL_PASSWORD pattern as the other admin EFs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "alex@dropdeadhair.com";
const PAGE_LIMIT = 250;          // Helium search.json caps appear well above this in practice
const DEFAULT_MAX_PAGES = 12;    // ~3,000 customers per invocation; stays within EF timeout
const HARD_PAGE_CEILING = 5000;  // safety net to prevent runaway loops

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function addOneSecondPreservingOffset(value: string) {
  const match = value.match(/^(\d{4}-\d{2}-\d{2}T)(\d{2}):(\d{2}):(\d{2})(.*)$/);
  if (!match) return new Date(Date.parse(value) + 1000).toISOString();
  const [, date, hh, mm, ss, suffix] = match;
  const nextSecond = Number(ss) + 1;
  if (nextSecond < 60) {
    return `${date}${hh}:${mm}:${String(nextSecond).padStart(2, "0")}${suffix}`;
  }
  return new Date(Date.parse(value) + 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
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

  let body: {
    email?: string;
    password?: string;
    startPage?: number;
    maxPages?: number;
    createdAtMin?: string;
    createdAtMax?: string;
    cursor?: string;
  };
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
  const heliumToken = Deno.env.get("HELIUM_PRIVATE_ACCESS_TOKEN");
  if (!supabaseUrl || !serviceKey || !heliumToken)
    return json({ success: false, error: "Server misconfigured" }, 500);

  const startPage = Math.max(1, Math.floor(body.startPage ?? 1));
  const maxPages = Math.min(50, Math.max(1, Math.floor(body.maxPages ?? DEFAULT_MAX_PAGES)));
  const createdAtMin = typeof body.createdAtMin === "string" ? body.createdAtMin : null;
  const createdAtMax = typeof body.createdAtMax === "string" ? body.createdAtMax : null;
  const resumeCursor = typeof body.cursor === "string" ? body.cursor : null;

  const supabase = createClient(supabaseUrl, serviceKey);

  let iter = 0;
  let fetched = 0;
  let upserted = 0;
  let skipped = 0;
  let done = false;
  let cursor: string | null = resumeCursor ?? createdAtMin;

  let lastBatchIds = new Set<string>();
  let lastCreatedAt: string | null = null;

  while (iter < maxPages && iter < HARD_PAGE_CEILING) {
    const url = new URL("https://app.customerfields.com/api/v2/customers/search.json");
    url.searchParams.set("page", "1");
    url.searchParams.set("limit", String(PAGE_LIMIT));
    url.searchParams.set("sort_by", "created_at");
    url.searchParams.set("sort_order", "asc");
    if (cursor) url.searchParams.set("created_at_min", cursor);
    if (createdAtMax) url.searchParams.set("created_at_max", createdAtMax);

    let res: Response;
    try {
      res = await fetch(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json", Authorization: `Bearer ${heliumToken}` },
      });
    } catch (err) {
      console.error("Helium fetch failed", err);
      return json(
        { success: false, error: "Helium request failed", iter, fetched, upserted },
        502,
      );
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("Helium responded non-200", res.status, text.slice(0, 300));
      return json(
        { success: false, error: `Helium ${res.status}`, iter, fetched, upserted },
        502,
      );
    }

    const data = (await res.json()) as { customers?: HeliumCustomer[] };
    const customers = Array.isArray(data.customers) ? data.customers : [];
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
      const { error: upsertError } = await supabase
        .from("helium_customers_backfill")
        .upsert(rows, { onConflict: "helium_id" });
      if (upsertError) {
        console.error("upsert failed", upsertError);
        return json(
          { success: false, error: "Upsert failed", iter, fetched, upserted, detail: upsertError.message },
          500,
        );
      }
      upserted += rows.length;
      lastCreatedAt = rows[rows.length - 1].created_at;
    }

    // Cursor advancement with same-timestamp collision guard
    const currentIds = new Set(rows.map((r) => r.helium_id));
    const allOverlap =
      currentIds.size > 0 &&
      [...currentIds].every((id) => lastBatchIds.has(id));
    const newCursor = lastCreatedAt ?? cursor;

    if (allOverlap && newCursor) {
      // Same boundary timestamp keeps returning the same records — bump 1s
      cursor = addOneSecondPreservingOffset(newCursor);
      lastBatchIds = new Set();
    } else {
      cursor = newCursor;
      lastBatchIds = currentIds;
    }

    // Short page = end of dataset within (cursor, createdAtMax]
    if (customers.length < PAGE_LIMIT) {
      done = true;
      break;
    }

    iter += 1;
  }

  return json({
    success: true,
    startPage,
    pagesProcessed: iter + (done ? 0 : 1),
    fetched,
    upserted,
    skipped,
    lastCreatedAt,
    cursor,
    done,
    nextPage: done ? null : iter + 1,
  });
});

