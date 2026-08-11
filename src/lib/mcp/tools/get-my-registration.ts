import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_my_registration",
  title: "Get my registration",
  description:
    "Read the signed-in stylist's wholesale registration profile: account type, contact details, license number, salon details and application status.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, account_type, first_name, last_name, email, phone_number, phone_country_code, business_name, city, state, zip_code, country, license_number, salon_size, salon_structure, school_name, school_state, business_operation_type, has_tax_exemption, social_media_handle, subscribe_order_updates, subscribe_promotions, subscribe_sms_promotions, application_status, created_at, updated_at"
      )
      .eq("id", ctx.getUserId() ?? "")
      .maybeSingle();

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    if (!data) {
      return {
        content: [{ type: "text", text: "No registration profile found for this account yet." }],
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { registration: data },
    };
  },
});
