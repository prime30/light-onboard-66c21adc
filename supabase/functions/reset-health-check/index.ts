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

  // In-app webview share: an Instagram/TikTok-only spike points at the webview
  // handoff rather than the invite links themselves, so surface it in the alert.
  // Reason strings from activate-account are prefixed `activation_`, so the
  // subject line can say which flow is actually breaking.
  const isActivation = (r: LeadRow) => (r.reset_failure_reason ?? "").startsWith("activation_");
  const activationCount = thisWeek.filter(isActivation).length;
  const resetCount = thisWeek.length - activationCount;
  const priorActivationCount = priorWeek.filter(isActivation).length;
  const priorResetCount = priorWeek.length - priorActivationCount;

  const webviewCount = thisWeek.filter((r) => !!r.reset_failure_in_app_browser).length;
  const webviewShare = thisWeek.length
    ? Math.round((webviewCount / thisWeek.length) * 100)
    : 0;

  // Paid vs free social-click split for the last 7 days of leads, so the
  // weekly summary says where the week's traffic actually came from.
  const PAID_SET = new Set(["meta_ads", "google_ads", "tiktok_ads", "pinterest_ads", "other_paid"]);
  const SOCIAL_SET = new Set(["meta_click", "tiktok_click", "organic_social"]);
  let attributionSplit = { total: 0, paidAds: 0, socialClicks: 0, unverified: 0, other: 0 };
  try {
    const attrRes = await fetch(
      `${supabaseUrl}/rest/v1/registration_leads?select=attribution_channel` +
        `&started_at=gte.${weekAgo}&limit=5000`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
    );
    if (attrRes.ok) {
      const attrRows = (await attrRes.json()) as { attribution_channel: string | null }[];
      for (const r of attrRows) {
        const ch = r.attribution_channel ?? "";
        attributionSplit.total += 1;
        if (PAID_SET.has(ch)) attributionSplit.paidAds += 1;
        else if (SOCIAL_SET.has(ch)) attributionSplit.socialClicks += 1;
        else if (ch === "google_click") attributionSplit.unverified += 1;
        else attributionSplit.other += 1;
      }
    } else {
      console.warn("reset-health-check attribution query failed:", attrRes.status);
    }
  } catch (e) {
    console.warn("reset-health-check attribution query threw:", e);
  }
  const attributionLine =
    `Traffic split (7d): ${attributionSplit.paidAds} paid ads, ` +
    `${attributionSplit.socialClicks} free social link clicks, ` +
    `${attributionSplit.unverified} unverified Google click ids, ` +
    `${attributionSplit.other} other, of ${attributionSplit.total} leads.`;

  const isSpike = (current: number, prior: number) =>
    current >= MIN_FAILURES && current >= Math.max(MIN_FAILURES, prior * SPIKE_MULTIPLIER);

  // Each flow is evaluated on its own so an activation regression still pages
  // even when overall volume looks normal (and vice versa).
  const totalSpiking = isSpike(thisWeek.length, priorWeek.length);
  const resetSpiking = isSpike(resetCount, priorResetCount);
  const activationSpiking = isSpike(activationCount, priorActivationCount);
  const spiking = totalSpiking || resetSpiking || activationSpiking;

  const spikeLabel = activationSpiking
    ? resetSpiking
      ? "Reset and activation failures spiked"
      : "Activation link failures spiked"
    : resetSpiking
      ? "Password reset failures spiked"
      : "Link failures spiked";

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
          message:
            `${spikeLabel}: ${resetCount} reset + ${activationCount} activation ` +
            `= ${thisWeek.length} affected accounts in the last 7 days ` +
            `(prior week: ${priorResetCount} reset + ${priorActivationCount} activation = ${priorWeek.length}). ` +
            `In-app browsers: ${webviewShare}% (${webviewCount}). ${attributionLine}`,
          context: {
            ...report,
            spikeLabel,
            resetSpiking,
            activationSpiking,
            resetFailuresThisWeek: resetCount,
            activationFailuresThisWeek: activationCount,
            resetFailuresPriorWeek: priorResetCount,
            activationFailuresPriorWeek: priorActivationCount,
            inAppBrowserShare: webviewShare,
            inAppBrowserCount: webviewCount,
            attributionSplit,
            attributionLine,
          },
        }),
      });
    } catch (e) {
      console.warn("reset-health-check notify failed:", e);
    }
  }


  const fullReport = {
    ...report,
    resetFailuresThisWeek: resetCount,
    activationFailuresThisWeek: activationCount,
    resetFailuresPriorWeek: priorResetCount,
    activationFailuresPriorWeek: priorActivationCount,
    inAppBrowserShare: webviewShare,
    inAppBrowserCount: webviewCount,
    resetSpiking,
    activationSpiking,
    attributionSplit,
    attributionLine,
  };
  console.log("RESET_HEALTH_REPORT", JSON.stringify({ ...fullReport, alerted: spiking }));
  return json(200, { success: true, alerted: spiking, report: fullReport });
});
