import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "alex@dropdeadhair.com";

interface RequestBody {
  email?: string;
  password?: string;
  autoApprovalEnabled?: boolean;
  extraCustomerTags?: string[];
}

function sanitizeTags(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null;
  const cleaned = input
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && t.length <= 80)
    // Shopify tags can't contain commas
    .map((t) => t.replace(/,/g, " "))
    .slice(0, 50);
  // De-dupe case-insensitively, preserve first-seen casing
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of cleaned) {
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
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
    console.error("ADMIN_PANEL_PASSWORD is not configured");
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

  const hasToggle = typeof body.autoApprovalEnabled === "boolean";
  const sanitizedTags = sanitizeTags(body.extraCustomerTags);
  const hasTags = sanitizedTags !== null;

  // Verify-only request (no changes)
  if (!hasToggle && !hasTags) {
    const { data: current, error: readErr } = await supabase
      .from("app_settings")
      .select("auto_approval_enabled, extra_customer_tags")
      .eq("singleton", true)
      .single();
    if (readErr) {
      console.error("Failed to read app_settings:", readErr);
      return json({ success: true, verified: true });
    }
    return json({ success: true, verified: true, setting: current });
  }

  const update: Record<string, unknown> = { updated_by: email };
  if (hasToggle) update.auto_approval_enabled = body.autoApprovalEnabled;
  if (hasTags) update.extra_customer_tags = sanitizedTags;

  const { data, error } = await supabase
    .from("app_settings")
    .update(update)
    .eq("singleton", true)
    .select()
    .single();

  if (error) {
    console.error("Failed to update app_settings:", error);
    return json({ success: false, error: "Failed to update setting" }, 500);
  }

  return json({ success: true, setting: data });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
