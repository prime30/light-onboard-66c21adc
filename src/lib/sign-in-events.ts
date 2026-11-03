// keepalive: some reports are sent right before the top window navigates away.
export async function recordSignInEvent(event: { email: string; attemptId: string; outcome: string; code?: string; passwordSource: string; evidence: string }): Promise<void> {
  try {
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sign-in-history`, {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ action: "record", ...event }),
    });
  } catch { /* Diagnostics must not block sign-in. */ }
}