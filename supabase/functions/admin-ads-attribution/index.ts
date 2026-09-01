// Admin-only: which registrations came from ads.
// Aggregates public.registration_submissions.attribution (written by
// create-customer) into channel buckets, campaigns, and a daily timeline.
// Same auth pattern as admin-referral-analytics (token or email + password).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "alex@dropdeadhair.com";

const CHANNEL_LABELS: Record<string, string> = {
  meta_ads: "Meta ads",
  meta_click: "Facebook / Instagram link click (not an ad)",
  google_ads: "Google ads",
  tiktok_ads: "TikTok ads",
  tiktok_click: "TikTok link click (not an ad)",
  pinterest_ads: "Pinterest ads",
  other_paid: "Other paid",
  email: "Email / Klaviyo",
  organic_social: "Organic social",
  campaign: "Tagged link",
  direct: "Direct / organic",
  untracked: "Untracked (before tracking)",
};

const PAID_CHANNELS = new Set([
  "meta_ads",
  "google_ads",
  "tiktok_ads",
  "pinterest_ads",
  "other_paid",
]);

// In-app link clicks (fbclid / ttclid without paid campaign params). Free
// traffic from social apps, tracked separately from ad spend.
const SOCIAL_CLICK_CHANNELS = new Set(["meta_click", "tiktok_click", "organic_social"]);

interface RequestBody {
  email?: string;
  password?: string;
  token?: string;
  sinceDays?: number;
}

async function _hmacB64u(key: string, msg: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function verifyAdminToken(token: string, secret: string): Promise<boolean> {
  if (!token || typeof token !== "string" || !token.includes(".")) return false;
  const [payload, sig] = token.split(".");
  const expected = await _hmacB64u(secret, payload);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return false;
  try {
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const pad = "===".slice((b64.length + 3) % 4);
    const j = JSON.parse(atob(b64 + pad));
    if (j.email !== ADMIN_EMAIL) return false;
    if (typeof j.exp !== "number" || j.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
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
  const providedToken = typeof body.token === "string" ? body.token : "";
  const adminPassword = Deno.env.get("ADMIN_PANEL_PASSWORD");
  if (!adminPassword) return json({ success: false, error: "Server misconfigured" }, 500);

  let authed = false;
  if (providedToken) {
    authed = await verifyAdminToken(providedToken, adminPassword);
  } else {
    authed = email === ADMIN_EMAIL && (body.password ?? "") === adminPassword;
  }
  if (!authed) return json({ success: false, error: "Invalid credentials" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ success: false, error: "Server configuration error" }, 500);
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const sinceDays = Math.min(Math.max(Number(body.sinceDays ?? 30), 1), 3650);
  const sinceIso = new Date(Date.now() - sinceDays * 86_400_000).toISOString();

  const { data, error } = await supabase
    .from("registration_submissions")
    .select("attribution, account_type, status, created_at, payload")
    .gte("created_at", sinceIso);

  if (error) {
    console.error("admin-ads-attribution query failed:", error);
    return json({ success: false, error: "Failed to query submissions" }, 500);
  }

  type Row = {
    attribution?: Record<string, unknown> | null;
    account_type?: string | null;
    status?: string | null;
    created_at?: string | null;
    payload?: Record<string, unknown> | null;
  };

  const channelTally: Record<string, { total: number; completed: number }> = {};
  const campaignTally: Record<string, { channel: string; total: number; completed: number }> = {};
  const timeline: Record<string, { total: number; paid: number }> = {};
  const byAccountType: Record<string, Record<string, number>> = {};

  let total = 0;
  let tracked = 0;
  let paidTotal = 0;
  let paidCompleted = 0;
  let socialClickTotal = 0;
  let socialClickCompleted = 0;

  for (const row of (data ?? []) as Row[]) {
    // Skip internal test users the same way the other analytics do.
    const payload = row.payload ?? {};
    const firstName = (
      ((payload.first_name as string | undefined) ?? (payload.firstName as string | undefined) ?? "")
    )
      .trim()
      .toLowerCase();
    if (firstName === "test") continue;

    total += 1;
    const attr = row.attribution ?? null;
    const channel = attr && typeof attr.channel === "string" && attr.channel ? attr.channel : "untracked";
    if (channel !== "untracked") tracked += 1;
    const completed = (row.status ?? "") === "succeeded";

    channelTally[channel] ??= { total: 0, completed: 0 };
    channelTally[channel].total += 1;
    if (completed) channelTally[channel].completed += 1;

    if (PAID_CHANNELS.has(channel)) {
      paidTotal += 1;
      if (completed) paidCompleted += 1;
      const campaign =
        (typeof attr?.utmCampaign === "string" && attr.utmCampaign) ||
        (typeof attr?.utmSource === "string" && attr.utmSource) ||
        "(no campaign tag)";
      const key = `${channel}::${campaign}`;
      campaignTally[key] ??= { channel, total: 0, completed: 0 };
      campaignTally[key].total += 1;
      if (completed) campaignTally[key].completed += 1;
    } else if (SOCIAL_CLICK_CHANNELS.has(channel)) {
      socialClickTotal += 1;
      if (completed) socialClickCompleted += 1;
    }

    const day = (row.created_at ?? "").slice(0, 10);
    if (day) {
      timeline[day] ??= { total: 0, paid: 0 };
      timeline[day].total += 1;
      if (PAID_CHANNELS.has(channel)) timeline[day].paid += 1;
    }

    const acct = (row.account_type ?? "unknown").toString();
    byAccountType[acct] ??= {};
    byAccountType[acct][channel] = (byAccountType[acct][channel] ?? 0) + 1;
  }

  const channels = Object.entries(channelTally)
    .map(([key, v]) => ({
      key,
      label: CHANNEL_LABELS[key] ?? key,
      paid: PAID_CHANNELS.has(key),
      count: v.total,
      completed: v.completed,
      pct: total === 0 ? 0 : Math.round((v.total / total) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count);

  const campaigns = Object.entries(campaignTally)
    .map(([key, v]) => ({
      key,
      channel: v.channel,
      channelLabel: CHANNEL_LABELS[v.channel] ?? v.channel,
      campaign: key.split("::")[1] ?? "",
      count: v.total,
      completed: v.completed,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 25);

  return json({
    success: true,
    sinceDays,
    total,
    tracked,
    trackedRate: total === 0 ? 0 : Math.round((tracked / total) * 1000) / 10,
    paidTotal,
    paidCompleted,
    paidShare: total === 0 ? 0 : Math.round((paidTotal / total) * 1000) / 10,
    socialClickTotal,
    socialClickCompleted,
    socialClickShare: total === 0 ? 0 : Math.round((socialClickTotal / total) * 1000) / 10,
    channels,
    campaigns,
    byAccountType,
    timeline: Object.entries(timeline)
      .map(([day, v]) => ({ day, ...v }))
      .sort((a, b) => a.day.localeCompare(b.day)),
  });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
