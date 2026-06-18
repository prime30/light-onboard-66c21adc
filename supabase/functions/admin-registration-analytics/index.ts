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

  // Read the founder-call gate so we can scope the take-rate denominator to
  // users who would have actually seen the schedule CTA. When the gate is OFF,
  // every completed lead is eligible. When ON, only pro/salon with monthly
  // order volume in 6-10 / 10+ are eligible.
  const { data: gateRow } = await supabase
    .from("app_settings")
    .select("founder_call_high_volume_only")
    .eq("singleton", true)
    .maybeSingle();
  const founderGateOn = !!gateRow?.founder_call_high_volume_only;

  const { data: rows, error } = await supabase
    .from("registration_leads")
    .select(
      "email, started_at, completed_at, account_type, last_step, last_field, validation_errors, device_type, viewport_width, founder_call_booked_at, founder_call_start_time, founder_call_no_show_at, first_order_at, first_order_value, monthly_order_volume",
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
    last_field: string | null;
    validation_errors: Record<string, number> | null;
    device_type: string | null;
    viewport_width: number | null;
    founder_call_booked_at: string | null;
    founder_call_start_time: string | null;
    founder_call_no_show_at: string | null;
    first_order_at: string | null;
    first_order_value: number | string | null;
  };


  // Exclude internal test users: any email whose submission payload first
  // name is "Test" (case-insensitive). Pulled from registration_submissions
  // since registration_leads doesn't store first_name.
  const { data: testRows } = await supabase
    .from("registration_submissions")
    .select("email, payload")
    .ilike("payload->>first_name", "test");
  const excludedEmails = new Set(
    (testRows ?? [])
      .map((r: { email?: string }) => (r.email ?? "").trim().toLowerCase())
      .filter(Boolean),
  );

  // Disposable / test inbox domains used for QA — always exclude.
  const TEST_DOMAINS = ["spamok.com", "mailinator.com", "tempmail.com", "guerrillamail.com", "10minutemail.com"];
  const isTestEmail = (email: string) => {
    const e = email.trim().toLowerCase();
    if (excludedEmails.has(e)) return true;
    const domain = e.split("@")[1] ?? "";
    return TEST_DOMAINS.some((d) => domain === d || domain.endsWith("." + d));
  };

  const leads = ((rows ?? []) as Row[]).filter((r) => !isTestEmail(r.email ?? ""));

  // ---- totals (apply grace window for bounce) ----
  const eligible = leads.filter((r) => r.completed_at || r.started_at < graceCutoff);
  const completed = leads.filter((r) => !!r.completed_at).length;
  const inProgress = leads.length - eligible.length;
  const bounced = eligible.length - completed;
  const bounceRate = eligible.length > 0 ? bounced / eligible.length : 0;
  const completionRate = eligible.length > 0 ? completed / eligible.length : 0;

  // ---- recovery tracking ----
  // A "recovered" lead = completed registration where the gap between first
  // touch (started_at) and completion (completed_at) is > 1 hour. That's the
  // window after which Klaviyo's abandoned-registration flow has (or would
  // have) fired, so completions past that point are the cohort the recovery
  // email is designed to bring back. Without per-message click attribution
  // this is the best proxy we have.
  const HOUR_MS = 60 * 60 * 1000;
  const recoveryWindowMs = 1 * HOUR_MS;
  const recoveredLeads = leads.filter(
    (r) => r.completed_at && Date.parse(r.completed_at) - Date.parse(r.started_at) > recoveryWindowMs,
  );
  // Denominator: anyone eligible for recovery = bounced OR recovered
  // (i.e., everyone who didn't finish in the first hour).
  const recoveryEligible = recoveredLeads.length + bounced;
  const recoveryRate =
    recoveryEligible > 0 ? Math.round((recoveredLeads.length / recoveryEligible) * 1000) / 10 : 0;
  // Median time-to-recover in hours.
  const recoveryDeltas = recoveredLeads
    .map((r) => Date.parse(r.completed_at!) - Date.parse(r.started_at))
    .sort((a, b) => a - b);
  const medianRecoveryHours =
    recoveryDeltas.length > 0
      ? Math.round(
          (recoveryDeltas[Math.floor(recoveryDeltas.length / 2)] / HOUR_MS) * 10,
        ) / 10
      : 0;
  const recovery = {
    recoveredCount: recoveredLeads.length,
    bouncedCount: bounced,
    eligibleCount: recoveryEligible,
    recoveryRate,
    medianHoursToRecover: medianRecoveryHours,
    windowHours: 1,
  };

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

  // ---- last field distribution for bounced leads ----
  const fieldMap = new Map<string, { count: number; step: string }>();
  for (const r of leads) {
    if (r.completed_at) continue;
    if (r.started_at >= graceCutoff) continue;
    if (!r.last_field) continue;
    const key = r.last_field;
    const cur = fieldMap.get(key) ?? { count: 0, step: r.last_step ?? "(none)" };
    cur.count += 1;
    fieldMap.set(key, cur);
  }
  const dropOffFields = Array.from(fieldMap.entries())
    .map(([field, v]) => ({ field, count: v.count, step: v.step }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // ---- validation error frequency (aggregate jsonb counts across leads) ----
  type ValAgg = { totalErrors: number; usersAffected: number; bouncedAffected: number };
  const valMap = new Map<string, ValAgg>();
  for (const r of leads) {
    const errs = r.validation_errors;
    if (!errs || typeof errs !== "object") continue;
    const bounced = !r.completed_at && r.started_at < graceCutoff;
    // Collapse password + confirmPassword into a single bucket. They almost
    // always co-fire (mismatch + rule violations) so counting separately
    // double-counts the same user friction.
    const collapsedEntries = new Map<string, number>();
    for (const [field, raw] of Object.entries(errs)) {
      const n = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(n) || n <= 0) continue;
      const key = field === "password" || field === "confirmPassword" ? "password" : field;
      collapsedEntries.set(key, (collapsedEntries.get(key) ?? 0) + n);
    }
    for (const [field, n] of collapsedEntries) {
      const cur = valMap.get(field) ?? { totalErrors: 0, usersAffected: 0, bouncedAffected: 0 };
      cur.totalErrors += n;
      cur.usersAffected += 1;
      if (bounced) cur.bouncedAffected += 1;
      valMap.set(field, cur);
    }
  }
  const validationErrors = Array.from(valMap.entries())
    .map(([field, v]) => ({
      field,
      totalErrors: v.totalErrors,
      usersAffected: v.usersAffected,
      bouncedAffected: v.bouncedAffected,
      bounceRate:
        v.usersAffected > 0
          ? Math.round((v.bouncedAffected / v.usersAffected) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => b.totalErrors - a.totalErrors)
    .slice(0, 15);

  // ---- device / viewport split ----
  type DeviceAgg = { started: number; completed: number };
  const deviceMap = new Map<string, DeviceAgg>();
  for (const r of leads) {
    const k = r.device_type ?? "unknown";
    const cur = deviceMap.get(k) ?? { started: 0, completed: 0 };
    cur.started += 1;
    if (r.completed_at) cur.completed += 1;
    deviceMap.set(k, cur);
  }
  const devices = Array.from(deviceMap.entries())
    .map(([device, v]) => ({
      device,
      started: v.started,
      completed: v.completed,
      bounceRate:
        v.started > 0 ? Math.round(((v.started - v.completed) / v.started) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.started - a.started);

  // Mobile vs desktop bounce per step (only for mobile + desktop with last_step).
  const deviceStepMap = new Map<string, { mobileStarted: number; mobileBounced: number; desktopStarted: number; desktopBounced: number }>();
  for (const r of leads) {
    if (!r.last_step) continue;
    if (r.device_type !== "mobile" && r.device_type !== "desktop") continue;
    const cur = deviceStepMap.get(r.last_step) ?? {
      mobileStarted: 0, mobileBounced: 0, desktopStarted: 0, desktopBounced: 0,
    };
    const bounced = !r.completed_at && r.started_at < graceCutoff;
    if (r.device_type === "mobile") {
      cur.mobileStarted += 1;
      if (bounced) cur.mobileBounced += 1;
    } else {
      cur.desktopStarted += 1;
      if (bounced) cur.desktopBounced += 1;
    }
    deviceStepMap.set(r.last_step, cur);
  }
  const deviceByStep = Array.from(deviceStepMap.entries())
    .map(([step, v]) => ({
      step,
      mobileStarted: v.mobileStarted,
      desktopStarted: v.desktopStarted,
      mobileBounceRate:
        v.mobileStarted > 0 ? Math.round((v.mobileBounced / v.mobileStarted) * 1000) / 10 : 0,
      desktopBounceRate:
        v.desktopStarted > 0 ? Math.round((v.desktopBounced / v.desktopStarted) * 1000) / 10 : 0,
    }))
    .sort((a, b) => (b.mobileStarted + b.desktopStarted) - (a.mobileStarted + a.desktopStarted))
    .slice(0, 12);


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

  // ---- founder call funnel ----
  // Denominator = completed registrations (only they see the schedule CTA).
  // Take rate = booked / completed.
  const completedLeads = leads.filter((r) => !!r.completed_at);
  const booked = completedLeads.filter((r) => !!r.founder_call_booked_at);
  const futureCalls = booked.filter(
    (r) => r.founder_call_start_time && Date.parse(r.founder_call_start_time) > Date.now(),
  ).length;
  // Eligibility for the founder call. When the gate is OFF, everyone who
  // completes is eligible. When ON, only pro/salon at the high-volume tiers
  // would have ever seen the schedule CTA — so they're the only ones who
  // belong in the take-rate denominator.
  const isEligible = (r: typeof completedLeads[number]) => {
    if (!founderGateOn) return true;
    const v = (r as { monthly_order_volume?: string | null }).monthly_order_volume;
    const highVolume = v === "6-10" || v === "10+";
    const proOrSalon = r.account_type === "professional" || r.account_type === "salon";
    return proOrSalon && highVolume;
  };
  const eligibleLeads = completedLeads.filter(isEligible);
  const eligibleBooked = eligibleLeads.filter((r) => !!r.founder_call_booked_at);
  const takeRate =
    eligibleLeads.length > 0
      ? Math.round((eligibleBooked.length / eligibleLeads.length) * 1000) / 10
      : 0;

  // No-shows: only count bookings whose start time is in the past.
  const pastBooked = booked.filter(
    (r) => r.founder_call_start_time && Date.parse(r.founder_call_start_time) <= Date.now(),
  );
  const noShows = pastBooked.filter((r) => !!r.founder_call_no_show_at);
  const showRate =
    pastBooked.length > 0
      ? Math.round(((pastBooked.length - noShows.length) / pastBooked.length) * 1000) / 10
      : 0;

  // Daily booked vs completed (use completed_at for completed cohort, booked_at for booked).
  const fcDayMap = new Map<string, { completed: number; booked: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    fcDayMap.set(d, { completed: 0, booked: 0 });
  }
  for (const r of eligibleLeads) {
    const cDay = r.completed_at!.slice(0, 10);
    const cBucket = fcDayMap.get(cDay);
    if (cBucket) cBucket.completed += 1;
    if (r.founder_call_booked_at) {
      const bDay = r.founder_call_booked_at.slice(0, 10);
      const bBucket = fcDayMap.get(bDay);
      if (bBucket) bBucket.booked += 1;
    }
  }
  const founderCallSeries = Array.from(fcDayMap.entries()).map(([date, v]) => ({
    date,
    completed: v.completed,
    booked: v.booked,
    takeRate:
      v.completed > 0 ? Math.round((v.booked / v.completed) * 1000) / 10 : 0,
  }));

  // Take rate by account type — only eligible cohort counts in the denominator.
  const fcByType = new Map<string, { completed: number; booked: number; noShow: number }>();
  for (const r of eligibleLeads) {
    const k = r.account_type ?? "unknown";
    const cur = fcByType.get(k) ?? { completed: 0, booked: 0, noShow: 0 };
    cur.completed += 1;
    if (r.founder_call_booked_at) cur.booked += 1;
    if (r.founder_call_no_show_at) cur.noShow += 1;
    fcByType.set(k, cur);
  }
  const founderCallByType = Array.from(fcByType.entries())
    .map(([type, v]) => ({
      type,
      completed: v.completed,
      booked: v.booked,
      noShow: v.noShow,
      takeRate:
        v.completed > 0 ? Math.round((v.booked / v.completed) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.completed - a.completed);

  // Recent bookings (most recent 25).
  const recentBookings = booked
    .slice()
    .sort((a, b) =>
      (b.founder_call_booked_at ?? "") < (a.founder_call_booked_at ?? "") ? -1 : 1,
    )
    .slice(0, 25)
    .map((r) => ({
      email: r.email,
      accountType: r.account_type,
      bookedAt: r.founder_call_booked_at,
      startTime: r.founder_call_start_time,
      noShowAt: r.founder_call_no_show_at,
    }));

  // ---- Founder-call purchase cohorts ----
  // Attended  = booked + start_time in past + no no_show_at stamp
  // No-show   = booked + start_time in past + no_show_at present
  // No call   = completed reg, never booked
  // Upcoming  = booked + start_time in future (excluded from purchase math —
  //             these users haven't had a chance to attend yet)
  const nowMs = Date.now();
  type CohortBucket = {
    leads: Row[];
    purchasers: Row[];
    timeToPurchaseMs: number[];
  };
  const mkBucket = (): CohortBucket => ({ leads: [], purchasers: [], timeToPurchaseMs: [] });
  const cohortBuckets: Record<"attended" | "no_show" | "no_call", CohortBucket> = {
    attended: mkBucket(),
    no_show: mkBucket(),
    no_call: mkBucket(),
  };

  for (const r of completedLeads) {
    let key: "attended" | "no_show" | "no_call" | null = null;
    if (r.founder_call_booked_at && r.founder_call_start_time) {
      const startMs = Date.parse(r.founder_call_start_time);
      if (startMs > nowMs) {
        // upcoming — skip purchase cohort math
      } else if (r.founder_call_no_show_at) {
        key = "no_show";
      } else {
        key = "attended";
      }
    } else {
      key = "no_call";
    }
    if (!key) continue;
    const b = cohortBuckets[key];
    b.leads.push(r);
    if (r.first_order_at && r.completed_at) {
      const delta = Date.parse(r.first_order_at) - Date.parse(r.completed_at);
      // Only count orders placed AT OR AFTER registration completion
      // (negative delta means they ordered before completing — rare, ignore).
      if (delta >= 0) {
        b.purchasers.push(r);
        b.timeToPurchaseMs.push(delta);
      }
    }
  }

  const median = (arr: number[]): number => {
    if (arr.length === 0) return 0;
    const s = arr.slice().sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
  };
  const avg = (arr: number[]): number =>
    arr.length === 0 ? 0 : arr.reduce((s, n) => s + n, 0) / arr.length;
  const sum = (arr: number[]): number => arr.reduce((s, n) => s + n, 0);

  const buildCohort = (label: string, b: CohortBucket) => {
    const size = b.leads.length;
    const purchasers = b.purchasers.length;
    const purchaseRate = size > 0 ? Math.round((purchasers / size) * 1000) / 10 : 0;
    const HOUR = 60 * 60 * 1000;
    const values = b.purchasers
      .map((r) => Number(r.first_order_value))
      .filter((n) => Number.isFinite(n) && n > 0);
    return {
      cohort: label,
      size,
      purchasers,
      purchaseRate,
      avgTimeToPurchaseHours:
        purchasers > 0 ? Math.round((avg(b.timeToPurchaseMs) / HOUR) * 10) / 10 : 0,
      medianTimeToPurchaseHours:
        purchasers > 0 ? Math.round((median(b.timeToPurchaseMs) / HOUR) * 10) / 10 : 0,
      avgOrderValue:
        values.length > 0 ? Math.round((sum(values) / values.length) * 100) / 100 : 0,
      totalRevenue: Math.round(sum(values) * 100) / 100,
    };
  };

  const purchaseCohorts = [
    buildCohort("attended", cohortBuckets.attended),
    buildCohort("no_show", cohortBuckets.no_show),
    buildCohort("no_call", cohortBuckets.no_call),
  ];

  // Lift = attended purchase rate vs no_call baseline (percentage points)
  const attendedRate = purchaseCohorts[0].purchaseRate;
  const noCallRate = purchaseCohorts[2].purchaseRate;
  const attendedLiftPp = Math.round((attendedRate - noCallRate) * 10) / 10;

  // ---- marketing consent (SMS / email opt-in) ----
  // Source of truth = the submitted payload booleans. We also cross-check
  // against marketing_consent_log to surface a "logged but not in payload"
  // delta, which usually means a Shopify sync issue.
  const { data: subRows } = await supabase
    .from("registration_submissions")
    .select("email, payload, account_type, created_at")
    .gte("created_at", since);
  const subs = (subRows ?? []).filter(
    (s: { email?: string }) => !excludedEmails.has((s.email ?? "").trim().toLowerCase()),
  ) as Array<{
    email: string;
    payload: Record<string, unknown> | null;
    account_type: string | null;
    created_at: string;
  }>;

  let smsYes = 0;
  let emailYes = 0;
  const consentByType = new Map<string, { total: number; sms: number; email: number }>();
  const consentDayMap = new Map<string, { total: number; sms: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    consentDayMap.set(d, { total: 0, sms: 0 });
  }
  for (const s of subs) {
    const p = s.payload ?? {};
    const sms = !!(p as Record<string, unknown>).accepts_sms_marketing;
    const em = !!(p as Record<string, unknown>).accepts_marketing;
    if (sms) smsYes += 1;
    if (em) emailYes += 1;
    const k = s.account_type ?? "unknown";
    const cur = consentByType.get(k) ?? { total: 0, sms: 0, email: 0 };
    cur.total += 1;
    if (sms) cur.sms += 1;
    if (em) cur.email += 1;
    consentByType.set(k, cur);
    const day = s.created_at.slice(0, 10);
    const bucket = consentDayMap.get(day);
    if (bucket) {
      bucket.total += 1;
      if (sms) bucket.sms += 1;
    }
  }
  const consentTotal = subs.length;
  const pct = (n: number, d: number) =>
    d > 0 ? Math.round((n / d) * 1000) / 10 : 0;
  const consent = {
    total: consentTotal,
    smsYes,
    emailYes,
    smsRate: pct(smsYes, consentTotal),
    emailRate: pct(emailYes, consentTotal),
    byType: Array.from(consentByType.entries())
      .map(([type, v]) => ({
        type,
        total: v.total,
        sms: v.sms,
        email: v.email,
        smsRate: pct(v.sms, v.total),
        emailRate: pct(v.email, v.total),
      }))
      .sort((a, b) => b.total - a.total),
    series: Array.from(consentDayMap.entries()).map(([date, v]) => ({
      date,
      total: v.total,
      sms: v.sms,
      smsRate: pct(v.sms, v.total),
    })),
  };

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
    dropOffFields,
    validationErrors,
    devices,
    deviceByStep,
    cohorts,

    founderCall: {
      gateOn: founderGateOn,
      completedCount: completedLeads.length,
      eligibleCount: eligibleLeads.length,
      eligibleBookedCount: eligibleBooked.length,
      bookedCount: booked.length,
      futureCount: futureCalls,
      noShowCount: noShows.length,
      pastBookedCount: pastBooked.length,
      showRate,
      takeRate,
      series: founderCallSeries,
      byType: founderCallByType,
      recent: recentBookings,
      purchaseCohorts,
      attendedLiftPp,
    },
    consent,
    recovery,
  });
});

