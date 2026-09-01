// Weekly reset / invite-link health check.
//
// Scheduled by pg_cron (Mondays 15:00 UTC). Counts password-reset and
// activation failures recorded on public.registration_leads over the last 7
// days, compares them against the previous 7 days, and pings notify-error
// (Klaviyo internal alert) when the volume looks like an invite-link
// regression rather than the usual trickle of expired links.
//
// Also returns the same report as JSON so it can be called ad hoc from the
// admin panel or by hand.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// Alert when the trailing week has at least this many failures AND it is at
// least this multiple of the prior week. Absolute floor stops a 0 -> 2 week
// from paging anyone.
const MIN_FAILURES = 5;
const SPIKE_MULTIPLIER = 2;

interface LeadRow {
  email: string;
  reset_failure_count: number | null;
  reset_failure_last_at: string | null;
  reset_failure_reason: string | null;
  reset_failure_code: string | null;
  reset_failure_device_type: string | null;
  reset_failure_in_app_browser: string | null;
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function tally(rows: LeadRow[], field: keyof LeadRow): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const key = (r[field] as string | null) || "unknown";
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json(500, { error: "Server misconfigured" });

  const now = Date.now();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const twoWeeksAgo = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString();

  const select =
    "email,reset_failure_count,reset_failure_last_at,reset_failure_reason,reset_failure_code," +
    "reset_failure_device_type,reset_failure_in_app_browser";

  let rows: LeadRow[] = [];
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/registration_leads?select=${select}` +
        `&reset_failure_last_at=gte.${twoWeeksAgo}&order=reset_failure_last_at.desc&limit=2000`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
    );
    if (!res.ok) {
      const text = (await res.text()).slice(0, 300);
      console.error("reset-health-check query failed:", res.status, text);
      return json(502, { error: "Query failed" });
    }
    rows = await res.json();
  } catch (e) {
    console.error("reset-health-check query threw:", e);
    return json(500, { error: "Query threw" });
  }

  const thisWeek = rows.filter((r) => (r.reset_failure_last_at ?? "") >= weekAgo);
  const priorWeek = rows.filter(
    (r) => (r.reset_failure_last_at ?? "") < weekAgo && (r.reset_failure_last_at ?? "") >= twoWeeksAgo,
  );

  const report = {
    windowStart: weekAgo,
    affectedUsersThisWeek: thisWeek.length,
    affectedUsersPriorWeek: priorWeek.length,
    attemptsThisWeek: thisWeek.reduce((n, r) => n + (r.reset_failure_count ?? 1), 0),
    byReason: tally(thisWeek, "reset_failure_reason"),
    byCode: tally(thisWeek, "reset_failure_code"),
    byDevice: tally(thisWeek, "reset_failure_device_type"),
    byInAppBrowser: tally(thisWeek, "reset_failure_in_app_browser"),
    sampleEmails: thisWeek.slice(0, 10).map((r) => r.email),
  };

  const spiking =
    thisWeek.length >= MIN_FAILURES &&
    thisWeek.length >= Math.max(MIN_FAILURES, priorWeek.length * SPIKE_MULTIPLIER);

  if (spiking) {
    try {
      await fetch(`${supabaseUrl}/functions/v1/notify-error`, {
        method: "POST",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "reset-health-check",
          message: `Reset/invite link failures spiked: ${thisWeek.length} affected accounts in the last 7 days (prior week: ${priorWeek.length})`,
          context: report,
        }),
      });
    } catch (e) {
      console.warn("reset-health-check notify failed:", e);
    }
  }

  console.log("RESET_HEALTH_REPORT", JSON.stringify({ ...report, alerted: spiking }));
  return json(200, { success: true, alerted: spiking, report });
});
