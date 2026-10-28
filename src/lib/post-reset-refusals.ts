// Mirrored inline in supabase/functions/reset-health-check/index.ts (edge
// functions cannot import from src/). Keep both copies identical.
export type SignInEventRow = { email: string; source: string; outcome: string; code: string | null; created_at: string };
export type PostResetRefusal = { email: string; resetAt: string; refusedAt: string; refusals: number };

export const POST_RESET_WINDOW_MS = 15 * 60 * 1000;

export function isRefusal(e: SignInEventRow): boolean {
  if (e.outcome === "invalid_credentials") return true;
  return e.source === "browser_report" && e.outcome === "error" && e.code === "rejected";
}

/** Customers whose sign-in was refused within 15 minutes after a successful reset. */
export function findPostResetRefusals(events: SignInEventRow[]): PostResetRefusal[] {
  const byEmail = new Map<string, SignInEventRow[]>();
  for (const e of events) byEmail.set(e.email, [...(byEmail.get(e.email) ?? []), e]);
  const out: PostResetRefusal[] = [];
  for (const [email, rows] of byEmail) {
    const sorted = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));
    let latest: PostResetRefusal | null = null;
    let resetAt: number | null = null;
    let resetIso = "";
    for (const e of sorted) {
      const t = Date.parse(e.created_at);
      if (e.outcome === "reset_succeeded") { resetAt = t; resetIso = e.created_at; continue; }
      if (resetAt !== null && isRefusal(e) && t >= resetAt && t - resetAt <= POST_RESET_WINDOW_MS) {
        if (latest && latest.resetAt === resetIso) { latest.refusals++; latest.refusedAt = e.created_at; }
        else latest = { email, resetAt: resetIso, refusedAt: e.created_at, refusals: 1 };
      }
    }
    if (latest) out.push(latest);
  }
  return out.sort((a, b) => b.refusedAt.localeCompare(a.refusedAt));
}
