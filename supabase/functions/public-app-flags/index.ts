// Public, read-only accessor for the three app_settings flags the SPA reads
// during boot. This replaces client-side supabase.rpc(...) calls into
// SECURITY DEFINER database functions, which we no longer expose to anon or
// authenticated roles.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ autoApprovalEnabled: false, welcomeOfferEnabled: false, founderCallHighVolumeOnly: false, founderCallEnabled: true, businessOperationStepEnabled: true, orderVolumeStepEnabled: true, preferredMethodStepEnabled: true, businessLocationStepEnabled: false, referralStepEnabled: true, summaryStepEnabled: false }, 200);
  }
  const supabase = createClient(supabaseUrl, serviceKey);
  const { data, error } = await supabase
    .from("app_settings")
    .select("auto_approval_enabled, welcome_offer_enabled, founder_call_high_volume_only, founder_call_enabled, business_operation_step_enabled, order_volume_step_enabled, preferred_method_step_enabled, business_location_step_enabled, referral_step_enabled, summary_step_enabled")
    .eq("singleton", true)
    .maybeSingle();
  if (error || !data) {
    return json({ autoApprovalEnabled: false, welcomeOfferEnabled: false, founderCallHighVolumeOnly: false, founderCallEnabled: true, businessOperationStepEnabled: true, orderVolumeStepEnabled: true, preferredMethodStepEnabled: true, businessLocationStepEnabled: false, referralStepEnabled: true }, 200);
  }
  return json({
    autoApprovalEnabled: !!data.auto_approval_enabled,
    welcomeOfferEnabled: !!data.welcome_offer_enabled,
    founderCallHighVolumeOnly: !!data.founder_call_high_volume_only,
    founderCallEnabled: data.founder_call_enabled !== false,
    businessOperationStepEnabled: data.business_operation_step_enabled !== false,
    orderVolumeStepEnabled: data.order_volume_step_enabled !== false,
    preferredMethodStepEnabled: data.preferred_method_step_enabled !== false,
    businessLocationStepEnabled: !!data.business_location_step_enabled,
    referralStepEnabled: data.referral_step_enabled !== false,
  });
});
