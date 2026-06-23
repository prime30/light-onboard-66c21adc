// Returns 24 months of completed-registration counts (current 12 + prior 12)
// so the admin panel can render a year-over-year monthly comparison.
// Auth: same email + ADMIN_PANEL_PASSWORD pattern as admin-toggle-setting.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "alex@dropdeadhair.com";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// "YYYY-MM" key in UTC. We use UTC consistently so the rolling window doesn't
// shift around depending on where the admin is sitting.
function monthKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function addMonths(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
}

function shortLabel(key: string): string {
  // "2026-06" -> "Jun"
  const [y, m] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, 1));
  return dt.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  let body: { email?: string; password?: string };
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

  const supabase = createClient(supabaseUrl, serviceKey);

  // Rolling 12-month window anchored to the current calendar month, with the
  // matching 12 months from the prior year for comparison. So the lookback is
  // 24 calendar months total.
  const now = new Date();
  const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const windowStart = addMonths(currentMonthStart, -23); // 24 months back, inclusive
  const sinceIso = windowStart.toISOString();

  // Filter test users the same way the main analytics function does — by
  // looking them up in registration_submissions. Kept minimal here since we
  // only need a set of emails to exclude.
  const TEST_FIRST_NAME = "Test";
  const TEST_ADDRESS_FRAGMENT = "5813 S Feliz";
  const TEST_PHONE_DIGITS = "4804157613";

  const { data: allSubs } = await supabase
    .from("registration_submissions")
    .select("email, payload");

  const testEmails = new Set<string>();
  for (const sub of allSubs ?? []) {
    const e = (sub as { email?: string | null }).email;
    if (!e) continue;
    const p = (sub as { payload?: Record<string, unknown> | null }).payload ?? {};
    const firstName = String(p.first_name ?? "").trim();
    const address = String(p.business_address ?? "");
    const phone = String(p.phone_number ?? "").replace(/\D/g, "");
    if (
      firstName === TEST_FIRST_NAME ||
      address.includes(TEST_ADDRESS_FRAGMENT) ||
      phone === TEST_PHONE_DIGITS
    ) {
      testEmails.add(e.toLowerCase());
    }
  }

  const { data: rows, error } = await supabase
    .from("registration_leads")
    .select("email, completed_at")
    .gte("completed_at", sinceIso)
    .not("completed_at", "is", null);

  if (error) {
    console.error("admin-registration-yoy query failed", error);
    return json({ success: false, error: "Query failed" }, 500);
  }

  // Also pull historical signups previously backfilled from the Helium
  // Customer Fields API. registration_leads only goes back as far as our
  // own onboarding SPA — Helium has the full Shopify customer history.
  // We page through the table to avoid PostgREST's default row cap.
  type HeliumRow = { email: string | null; created_at: string };
  const heliumRows: HeliumRow[] = [];
  {
    const PAGE = 1000;
    let from = 0;
    while (true) {
      const { data: page, error: hErr } = await supabase
        .from("helium_customers_backfill")
        .select("email, created_at")
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: true })
        .range(from, from + PAGE - 1);
      if (hErr) {
        console.error("helium_customers_backfill query failed", hErr);
        break;
      }
      const batch = (page ?? []) as HeliumRow[];
      heliumRows.push(...batch);
      if (batch.length < PAGE) break;
      from += PAGE;
    }
  }

  // Seed every month in the window so the chart never has gaps.
  const counts = new Map<string, number>();
  for (let i = 0; i < 24; i++) {
    counts.set(monthKey(addMonths(windowStart, i)), 0);
  }

  // Dedupe by email across sources. registration_leads is the source of truth
  // for any account that completed via the SPA; Helium fills in the rest.
  const seenEmails = new Set<string>();
  const monthEmailKeys = new Set<string>();

  let liveCount = 0;
  let backfillCount = 0;

  for (const r of rows ?? []) {
    const e = (r as { email?: string | null }).email?.toLowerCase() ?? null;
    if (e && testEmails.has(e)) continue;
    const c = (r as { completed_at?: string | null }).completed_at;
    if (!c) continue;
    const key = monthKey(new Date(c));
    if (!counts.has(key)) continue;
    // Guard against duplicate rows in registration_leads for the same email.
    const dedupeKey = e ? `live:${e}:${key}` : `live:row:${Math.random()}:${key}`;
    if (monthEmailKeys.has(dedupeKey)) continue;
    monthEmailKeys.add(dedupeKey);
    if (e) seenEmails.add(e);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    liveCount += 1;
  }

  for (const r of heliumRows) {
    const e = r.email?.toLowerCase() ?? null;
    if (e && testEmails.has(e)) continue;
    if (e && seenEmails.has(e)) continue; // already counted via registration_leads
    const c = r.created_at;
    if (!c) continue;
    const key = monthKey(new Date(c));
    if (!counts.has(key)) continue;
    const dedupeKey = e ? `helium:${e}` : `helium:row:${Math.random()}`;
    if (monthEmailKeys.has(dedupeKey)) continue;
    monthEmailKeys.add(dedupeKey);
    if (e) seenEmails.add(e);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    backfillCount += 1;
  }


  // Build the 12 paired month rows the UI consumes.
  const currentWindowStart = addMonths(currentMonthStart, -11);
  const series: Array<{
    monthLabel: string;
    currentKey: string;
    priorKey: string;
    current: number;
    prior: number;
    delta: number;
    deltaPct: number | null;
    isCurrentMonth: boolean;
  }> = [];

  let totalCurrent = 0;
  let totalPrior = 0;

  for (let i = 0; i < 12; i++) {
    const curMonth = addMonths(currentWindowStart, i);
    const priorMonth = addMonths(curMonth, -12);
    const curKey = monthKey(curMonth);
    const priorKey = monthKey(priorMonth);
    const current = counts.get(curKey) ?? 0;
    const prior = counts.get(priorKey) ?? 0;
    totalCurrent += current;
    totalPrior += prior;
    series.push({
      monthLabel: shortLabel(curKey),
      currentKey: curKey,
      priorKey,
      current,
      prior,
      delta: current - prior,
      deltaPct: prior === 0 ? (current === 0 ? 0 : null) : ((current - prior) / prior) * 100,
      isCurrentMonth: curKey === monthKey(currentMonthStart),
    });
  }

  const totalDeltaPct =
    totalPrior === 0 ? (totalCurrent === 0 ? 0 : null) : ((totalCurrent - totalPrior) / totalPrior) * 100;

  // Surface backfill freshness so the UI can prompt for a refresh if Helium
  // has never been pulled (or hasn't been pulled in a while).
  const { count: backfillTotal } = await supabase
    .from("helium_customers_backfill")
    .select("helium_id", { count: "exact", head: true });
  const { data: latestFetched } = await supabase
    .from("helium_customers_backfill")
    .select("fetched_at")
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return json({
    success: true,
    generatedAt: new Date().toISOString(),
    windowStart: currentWindowStart.toISOString(),
    currentMonth: monthKey(currentMonthStart),
    series,
    totals: {
      current: totalCurrent,
      prior: totalPrior,
      delta: totalCurrent - totalPrior,
      deltaPct: totalDeltaPct,
    },
    sources: {
      liveCount,
      backfillCount,
      backfillTotal: backfillTotal ?? 0,
      backfillLastFetchedAt: latestFetched?.fetched_at ?? null,
    },
  });
});

