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
    // Don't leak which one is wrong
    return json({ success: false, error: "Invalid credentials" }, 401);
  }

  // If only verifying credentials (no toggle value provided), return success
  if (typeof body.autoApprovalEnabled !== "boolean") {
    return json({ success: true, verified: true });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ success: false, error: "Server configuration error" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await supabase
    .from("app_settings")
    .update({
      auto_approval_enabled: body.autoApprovalEnabled,
      updated_by: email,
    })
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
