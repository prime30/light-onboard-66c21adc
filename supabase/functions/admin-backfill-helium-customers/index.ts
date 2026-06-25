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

  const supabase = createClient(supabaseUrl, serviceKey);

  // Cursor-based pagination: advance `created_at_min` to the last seen
  // record's created_at after each page. This avoids the classic offset bug
  // where a short page mid-stream (or a mid-run insert) caused the loop to
  // exit early and silently skip a chunk of customers. Page numbers are
  // tracked only as a soft progress counter so the client can resume.
  let iter = 0;
  let fetched = 0;
  let upserted = 0;
  let skipped = 0;
  let done = false;
  let cursor: string | null = createdAtMin;
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


  return json({
    success: true,
    startPage,
    pagesProcessed: page - startPage + (done ? 0 : 1),
    fetched,
    upserted,
    skipped,
    lastCreatedAt,
    done,
    nextPage,
  });
});
