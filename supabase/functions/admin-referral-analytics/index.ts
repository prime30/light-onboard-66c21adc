// Admin-only: aggregate "How did you hear about us?" responses from
// public.registration_submissions.payload.referralSource.
// Same auth pattern as admin-list-submissions (email + ADMIN_PANEL_PASSWORD).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "alex@dropdeadhair.com";

// Canonical labels for the 8 option values used in PreferencesStep.
const LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  google: "Google Search",
  friend: "Friend or colleague",
  salon: "My salon",
  event: "Industry event",
  reddit: "Reddit",
  other: "Other",
};

interface RequestBody {
  email?: string;
  password?: string;
  // Optional ISO date filter — default = last 90 days.
  sinceDays?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "Invalid JSON" }, 400);
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const adminPassword = Deno.env.get("ADMIN_PANEL_PASSWORD");
  if (!adminPassword) return json({ success: false, error: "Server configuration error" }, 500);
  if (email !== ADMIN_EMAIL || password !== adminPassword) {
    return json({ success: false, error: "Invalid credentials" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ success: false, error: "Server configuration error" }, 500);
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const sinceDays = Math.min(Math.max(Number(body.sinceDays ?? 90), 1), 3650);
  const sinceIso = new Date(Date.now() - sinceDays * 86_400_000).toISOString();

  // Pull only what we need; payload is JSONB but PostgREST returns the whole column.
  const { data, error } = await supabase
    .from("registration_submissions")
    .select("payload, account_type, created_at")
    .gte("created_at", sinceIso);

  if (error) {
    console.error("admin-referral-analytics query failed:", error);
    return json({ success: false, error: "Failed to query submissions" }, 500);
  }

  // Tally referrals (counted per submission, including blanks).
  const sourceTally: Record<string, number> = {};
  const byAccountType: Record<string, Record<string, number>> = {};
  // Daily timeline (YYYY-MM-DD -> count of submissions with any source).
  const timeline: Record<string, number> = {};
  let total = 0;
  let withSource = 0;

  for (const row of data ?? []) {
    const payload = (row as { payload?: Record<string, unknown> }).payload ?? {};
    // Skip internal test users (first name "Test", case-insensitive).
    const firstName = (
      (payload.first_name as string | undefined) ??
      (payload.firstName as string | undefined) ??
      ""
    )
      .trim()
      .toLowerCase();
    if (firstName === "test") continue;
    total += 1;
    const rawSource = (payload.referralSource as string | undefined) ?? "";
    const source = rawSource.trim().toLowerCase();
    const key = source && LABELS[source] ? source : source ? "other" : "unspecified";
    sourceTally[key] = (sourceTally[key] ?? 0) + 1;
    if (key !== "unspecified") withSource += 1;

    const acctType = ((row as { account_type?: string }).account_type ?? "unknown").toString();
    byAccountType[acctType] ??= {};
    byAccountType[acctType][key] = (byAccountType[acctType][key] ?? 0) + 1;

    const day = ((row as { created_at?: string }).created_at ?? "").slice(0, 10);
    if (day) timeline[day] = (timeline[day] ?? 0) + 1;
  }

  const sources = Object.entries(sourceTally)
    .map(([key, count]) => ({
      key,
      label: key === "unspecified" ? "Not answered" : (LABELS[key] ?? key),
      count,
      pct: total === 0 ? 0 : Math.round((count / total) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count);

  return json({
    success: true,
    sinceDays,
    total,
    withSource,
    answerRate: total === 0 ? 0 : Math.round((withSource / total) * 1000) / 10,
    sources,
    byAccountType,
    timeline,
  });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
