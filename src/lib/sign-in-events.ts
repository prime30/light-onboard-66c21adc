import { supabase } from "@/integrations/supabase/client";

export async function recordSignInEvent(event: { email: string; attemptId: string; outcome: string; code?: string; passwordSource: string; evidence: string }): Promise<void> {
  try {
    await supabase.functions.invoke("sign-in-history", { body: { action: "record", ...event } });
  } catch { /* Diagnostics must not block sign-in. */ }
}