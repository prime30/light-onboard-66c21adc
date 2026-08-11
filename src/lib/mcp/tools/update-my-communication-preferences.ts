import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "update_my_communication_preferences",
  title: "Update my communication preferences",
  description:
    "Update the signed-in user's marketing preferences and Instagram handle on their registration profile. Only the provided fields change.",
  inputSchema: {
    subscribe_order_updates: z
      .boolean()
      .optional()
      .describe("Receive transactional order update emails."),
    subscribe_promotions: z.boolean().optional().describe("Receive promotional emails."),
    subscribe_sms_promotions: z.boolean().optional().describe("Receive promotional text messages."),
    social_media_handle: z
      .string()
      .trim()
      .min(1)
      .max(60)
      .optional()
      .describe("Instagram handle, with or without the leading @."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }

    const patch: Record<string, unknown> = {};
    if (input.subscribe_order_updates !== undefined)
      patch.subscribe_order_updates = input.subscribe_order_updates;
    if (input.subscribe_promotions !== undefined)
      patch.subscribe_promotions = input.subscribe_promotions;
    if (input.subscribe_sms_promotions !== undefined)
      patch.subscribe_sms_promotions = input.subscribe_sms_promotions;
    if (input.social_media_handle !== undefined)
      patch.social_media_handle = input.social_media_handle.replace(/^@+/, "");

    if (Object.keys(patch).length === 0) {
      throw new ToolError("Provide at least one field to update.");
    }

    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", ctx.getUserId() ?? "")
      .select(
        "id, social_media_handle, subscribe_order_updates, subscribe_promotions, subscribe_sms_promotions, updated_at"
      )
      .maybeSingle();

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    if (!data) {
      return {
        content: [{ type: "text", text: "No registration profile found for this account." }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { registration: data },
    };
  },
});
