// Admin-only: list recent rows from public.registration_submissions.
// Mirrors the auth pattern in admin-toggle-setting (email + ADMIN_PANEL_PASSWORD).
// Table is RLS-locked (deny-all); reads go via service_role here.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "alex@dropdeadhair.com";
const VALID_STATUSES = ["pending", "helium_ok", "shopify_ok", "succeeded", "failed"] as const;
type StatusFilter = (typeof VALID_STATUSES)[number] | "all" | "needs_attention";

interface RequestBody {
  email?: string;
  password?: string;
  status?: StatusFilter;
  search?: string;
  limit?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405);
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "Invalid JSON" }, 400);
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const adminPassword = Deno.env.get("ADMIN_PANEL_PASSWORD");
  if (!adminPassword) {
    return json({ success: false, error: "Server configuration error" }, 500);
  }
  if (email !== ADMIN_EMAIL || password !== adminPassword) {
    return json({ success: false, error: "Invalid credentials" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ success: false, error: "Server configuration error" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const limit = Math.min(Math.max(Number(body.limit ?? 100), 1), 500);
  const status: StatusFilter = body.status ?? "needs_attention";
  const search = (body.search ?? "").trim().toLowerCase();

  let query = supabase
    .from("registration_submissions")
    .select(
      "id, email, account_type, status, helium_customer_id, shopify_customer_id, error_log, ip_address, created_at, updated_at, payload"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status === "needs_attention") {
    query = query.in("status", ["pending", "helium_ok", "shopify_ok", "failed"]);
  } else if (status !== "all") {
    query = query.eq("status", status);
  }
  if (search) {
    query = query.ilike("email", `%${search}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Failed to list submissions:", error);
    return json({ success: false, error: "Failed to query submissions" }, 500);
  }

  // Aggregate counts for the header
  const { data: counts } = await supabase
    .from("registration_submissions")
    .select("status");
  const tally: Record<string, number> = {};
  for (const row of counts ?? []) {
    const s = (row as { status?: string }).status ?? "unknown";
    tally[s] = (tally[s] ?? 0) + 1;
  }

  return json({ success: true, submissions: data ?? [], counts: tally });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
