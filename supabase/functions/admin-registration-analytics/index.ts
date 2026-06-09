// Aggregates registration_leads for the admin analytics panel.
// Auth: same email + ADMIN_PANEL_PASSWORD pattern as admin-toggle-setting.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "alex@dropdeadhair.com";
// Leads younger than this are still "in progress" — exclude from bounce math.
const GRACE_MINUTES = 30;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  let body: { email?: string; password?: string; days?: number };
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "Invalid JSON" }, 400);
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const adminPassword = Deno.env.get("ADMIN_PANEL_PASSWORD");
  if (!adminPassword) return json({ success: false, error: "Server misconfigured" }, 500);
  if (email !== ADMIN_EMAIL || password !== adminPassword)
    return json({ success: false, error: "Invalid credentials" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ success: false, error: "Server misconfigured" }, 500);

  const days = Math.min(Math.max(body.days ?? 30, 1), 180);
  const supabase = createClient(supabaseUrl, serviceKey);

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const graceCutoff = new Date(Date.now() - GRACE_MINUTES * 60 * 1000).toISOString();

  const { data: rows, error } = await supabase
    .from("registration_leads")
    .select(
      "email, started_at, completed_at, account_type, last_step, founder_call_booked_at, founder_call_start_time",
    )
    .gte("started_at", since)
    .order("started_at", { ascending: true });

  if (error) {
    console.error("admin-registration-analytics query failed", error);
    return json({ success: false, error: "Query failed" }, 500);
  }

  type Row = {
    email: string;
    started_at: string;
    completed_at: string | null;
    account_type: string | null;
    last_step: string | null;
    founder_call_booked_at: string | null;
    founder_call_start_time: string | null;
  };

  const leads = (rows ?? []) as Row[];

  // ---- totals (apply grace window for bounce) ----
  const eligible = leads.filter((r) => r.completed_at || r.started_at < graceCutoff);
  const completed = leads.filter((r) => !!r.completed_at).length;
  const inProgress = leads.length - eligible.length;
  const bounced = eligible.length - completed;
  const bounceRate = eligible.length > 0 ? bounced / eligible.length : 0;
  const completionRate = eligible.length > 0 ? completed / eligible.length : 0;

  // ---- daily buckets (UTC date) ----
  const dayMap = new Map<string, { started: number; completed: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    dayMap.set(d, { started: 0, completed: 0 });
  }
  for (const r of leads) {
    const startDay = r.started_at.slice(0, 10);
    const bucket = dayMap.get(startDay);
    if (bucket) bucket.started += 1;
    if (r.completed_at) {
      const cDay = r.completed_at.slice(0, 10);
      const cBucket = dayMap.get(cDay);
      if (cBucket) cBucket.completed += 1;
    }
  }
  const series = Array.from(dayMap.entries()).map(([date, v]) => ({
    date,
    started: v.started,
    completed: v.completed,
    bounceRate:
      v.started > 0 ? Math.round(((v.started - v.completed) / v.started) * 1000) / 10 : 0,
  }));

  // ---- account-type breakdown ----
  const byType = new Map<string, { started: number; completed: number }>();
  for (const r of leads) {
    const k = r.account_type ?? "unknown";
    const cur = byType.get(k) ?? { started: 0, completed: 0 };
    cur.started += 1;
    if (r.completed_at) cur.completed += 1;
    byType.set(k, cur);
  }
  const accountTypes = Array.from(byType.entries())
    .map(([type, v]) => ({
      type,
      started: v.started,
      completed: v.completed,
      bounceRate:
        v.started > 0 ? Math.round(((v.started - v.completed) / v.started) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.started - a.started);

  // ---- last step distribution for bounced leads ----
  const stepMap = new Map<string, number>();
  for (const r of leads) {
    if (r.completed_at) continue;
    if (r.started_at >= graceCutoff) continue;
    const k = r.last_step ?? "(none)";
    stepMap.set(k, (stepMap.get(k) ?? 0) + 1);
  }
  const dropOffSteps = Array.from(stepMap.entries())
    .map(([step, count]) => ({ step, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // ---- cohort retention (by start day) ----
  // For each daily cohort: % completed within 1h / 24h / 7d, and ever.
  // Cohorts where the window hasn't fully elapsed yet are flagged `partial`.
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;
  const now = Date.now();
  type CohortAgg = {
    size: number;
    within1h: number;
    within24h: number;
    within7d: number;
    ever: number;
    cohortStartMs: number;
  };
  const cohortMap = new Map<string, CohortAgg>();
  for (const r of leads) {
    const day = r.started_at.slice(0, 10);
    const startMs = Date.parse(r.started_at);
    const cur =
      cohortMap.get(day) ??
      ({
        size: 0,
        within1h: 0,
        within24h: 0,
        within7d: 0,
        ever: 0,
        cohortStartMs: Date.parse(day + "T00:00:00Z"),
      } as CohortAgg);
    cur.size += 1;
    if (r.completed_at) {
      const elapsed = Date.parse(r.completed_at) - startMs;
      if (elapsed <= HOUR) cur.within1h += 1;
      if (elapsed <= DAY) cur.within24h += 1;
      if (elapsed <= 7 * DAY) cur.within7d += 1;
      cur.ever += 1;
    }
    cohortMap.set(day, cur);
  }
  const cohorts = Array.from(cohortMap.entries())
    .map(([date, v]) => {
      // A cohort's window is "complete" when (now - cohortStart) >= window length.
      // Cohort start = beginning of that UTC day; we approximate using +24h
      // (so the 1h window for a cohort is settled once the day is >25h old).
      const ageMs = now - v.cohortStartMs;
      const pct = (n: number) => (v.size > 0 ? Math.round((n / v.size) * 1000) / 10 : 0);
      return {
        date,
        size: v.size,
        within1h: v.within1h,
        within24h: v.within24h,
        within7d: v.within7d,
        ever: v.ever,
        rate1h: pct(v.within1h),
        rate24h: pct(v.within24h),
        rate7d: pct(v.within7d),
        rateEver: pct(v.ever),
        partial1h: ageMs < DAY + HOUR,
        partial24h: ageMs < 2 * DAY,
        partial7d: ageMs < 8 * DAY,
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return json({
    success: true,
    rangeDays: days,
    graceMinutes: GRACE_MINUTES,
    totals: {
      leads: leads.length,
      completed,
      bounced,
      inProgress,
      bounceRate: Math.round(bounceRate * 1000) / 10,
      completionRate: Math.round(completionRate * 1000) / 10,
    },
    series,
    accountTypes,
    dropOffSteps,
    cohorts,
  });
});
