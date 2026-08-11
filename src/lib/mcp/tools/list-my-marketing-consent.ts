import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_marketing_consent",
  title: "List my marketing consent",
  description:
    "List the signed-in user's recorded marketing consent events (SMS and email opt-ins), newest first.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("marketing_consent_log")
      .select("id, channel, granted, opt_in_level, email, phone_e164, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const rows = data ?? [];
    return {
      content: [
        {
          type: "text",
          text: rows.length
            ? JSON.stringify(rows, null, 2)
            : "No marketing consent records found for this account.",
        },
      ],
      structuredContent: { count: rows.length, records: rows },
    };
  },
});
