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
  google_click: "Google click id, no campaign tag (unverified ad)",
  tiktok_ads: "TikTok ads",
  tiktok_click: "TikTok link click (not an ad)",
  pinterest_ads: "Pinterest ads",
  other_paid: "Other paid",
  email: "Email / Klaviyo",
  organic_social: "Organic social",
  affiliate: "Affiliate / creator referral link",
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
    .select("attribution, account_type, status, created_at, payload, email")
    .gte("created_at", sinceIso);

  if (error) {
    console.error("admin-ads-attribution query failed:", error);
    return json({ success: false, error: "Failed to query submissions" }, 500);
  }

  // Purchases (stamped by backfill-first-orders) keyed by lowercased email, so
  // revenue can be credited to the channel the signup came from. When lifetime
  // totals are present (orders_count / orders_revenue) they are used, so repeat
  // purchases count too; otherwise it falls back to the first order alone.
  const { data: leadRows, error: leadErr } = await supabase
    .from("registration_leads")
    .select("email, first_order_at, first_order_value, orders_count, orders_revenue")
    .not("first_order_at", "is", null);

  if (leadErr) {
    console.error("admin-ads-attribution leads query failed:", leadErr);
  }

  const orderByEmail = new Map<string, { at: string | null; count: number; value: number; firstValue: number }>();
  for (const l of (leadRows ?? []) as {
    email?: string | null;
    first_order_at?: string | null;
    first_order_value?: number | string | null;
    orders_count?: number | null;
    orders_revenue?: number | string | null;
  }[]) {
    const key = (l.email ?? "").trim().toLowerCase();
    if (!key) continue;
    const firstValue = Number(l.first_order_value ?? 0) || 0;
    const lifetimeCount = Number(l.orders_count ?? 0) || 0;
    const lifetimeRevenue = Number(l.orders_revenue ?? 0) || 0;
    orderByEmail.set(key, {
      at: l.first_order_at ?? null,
      count: lifetimeCount > 0 ? lifetimeCount : 1,
      value: lifetimeRevenue > 0 ? lifetimeRevenue : firstValue,
      firstValue,
    });
  }

  // Ad spend per channel + campaign, entered by hand in the admin panel.
  const { data: costRows, error: costErr } = await supabase
    .from("campaign_costs")
    .select("channel, campaign, cost, currency, note, updated_at");
  if (costErr) console.error("admin-ads-attribution cost query failed:", costErr);
  const costByKey = new Map<string, number>();
  for (const c of (costRows ?? []) as { channel?: string | null; campaign?: string | null; cost?: number | string | null }[]) {
    costByKey.set(`${c.channel ?? ""}::${c.campaign ?? ""}`, Number(c.cost ?? 0) || 0);
  }


  type Row = {
    attribution?: Record<string, unknown> | null;
    account_type?: string | null;
    status?: string | null;
    created_at?: string | null;
    payload?: Record<string, unknown> | null;
    email?: string | null;
  };

  const channelTally: Record<string, { total: number; completed: number; orders: number; revenue: number }> = {};
  const campaignTally: Record<string, { channel: string; total: number; completed: number; orders: number; revenue: number }> = {};
  const timeline: Record<string, { total: number; paid: number; social: number; paidRevenue: number }> = {};
  const byAccountType: Record<string, Record<string, number>> = {};

  let total = 0;
  let tracked = 0;
  let paidTotal = 0;
  let paidCompleted = 0;
  let socialClickTotal = 0;
  let socialClickCompleted = 0;
  // Ad-ish visits (any click id or campaign param) split by whether the link
  // carried a utm_campaign tag. Untagged ad clicks cannot be credited reliably.
  let taggedClicks = 0;
  let untaggedClicks = 0;
  // Affiliate / creator referral links (UpPromote sca_ref and friends).
  let affiliateTotal = 0;
  let affiliateCompleted = 0;
  const refTally: Record<string, { total: number; completed: number; untaggedAd: number }> = {};
  // Referral tag present on what looks like a paid ad link, but no utm_campaign
  // tag, so the ad cannot be credited.
  let refWithoutCampaign = 0;
  // Purchases and revenue, overall and for paid / social / affiliate cohorts.
  let ordersTotal = 0;
  let revenueTotal = 0;
  let buyersTotal = 0;
  let repeatOrdersTotal = 0;
  let repeatRevenueTotal = 0;
  let paidOrders = 0;
  let paidRevenue = 0;
  let paidBuyers = 0;
  let socialOrders = 0;
  let socialRevenue = 0;
  let affiliateOrders = 0;
  let affiliateRevenue = 0;
  const countedOrderEmails = new Set<string>();





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

    // Credit purchases once per email, even if the person submitted the form
    // more than once. orderCount includes repeat orders when they are synced.
    const emailKey = (row.email ?? "").trim().toLowerCase();
    const order = emailKey && !countedOrderEmails.has(emailKey) ? orderByEmail.get(emailKey) : undefined;
    if (order && emailKey) countedOrderEmails.add(emailKey);
    const orderCount = order ? order.count : 0;
    const orderValue = order ? order.value : 0;
    const buyerCount = order ? 1 : 0;
    const repeatOrderCount = order ? Math.max(0, order.count - 1) : 0;
    const repeatRevenue = order ? Math.max(0, order.value - order.firstValue) : 0;
    ordersTotal += orderCount;
    revenueTotal += orderValue;
    buyersTotal += buyerCount;
    repeatOrdersTotal += repeatOrderCount;
    repeatRevenueTotal += repeatRevenue;


    channelTally[channel] ??= { total: 0, completed: 0, orders: 0, revenue: 0 };
    channelTally[channel].total += 1;
    if (completed) channelTally[channel].completed += 1;
    channelTally[channel].orders += orderCount;
    channelTally[channel].revenue += orderValue;

    if (PAID_CHANNELS.has(channel)) {
      paidTotal += 1;
      if (completed) paidCompleted += 1;
      paidOrders += orderCount;
      paidRevenue += orderValue;
      paidBuyers += buyerCount;
      const campaign =
        (typeof attr?.utmCampaign === "string" && attr.utmCampaign) ||
        (typeof attr?.utmSource === "string" && attr.utmSource) ||
        "(no campaign tag)";
      const key = `${channel}::${campaign}`;
      campaignTally[key] ??= { channel, total: 0, completed: 0, orders: 0, revenue: 0 };
      campaignTally[key].total += 1;
      if (completed) campaignTally[key].completed += 1;
      campaignTally[key].orders += orderCount;
      campaignTally[key].revenue += orderValue;
    } else if (SOCIAL_CLICK_CHANNELS.has(channel)) {
      socialClickTotal += 1;
      if (completed) socialClickCompleted += 1;
      socialOrders += orderCount;
      socialRevenue += orderValue;
    }

    const hasClickId = Boolean(
      attr &&
        (attr.fbclid || attr.gclid || attr.gbraid || attr.wbraid || attr.ttclid),
    );
    const hasCampaignTag = Boolean(
      attr && typeof attr.utmCampaign === "string" && attr.utmCampaign.trim(),
    );
    const hasAnyUtm = Boolean(
      attr && (attr.utmSource || attr.utmMedium || attr.utmCampaign),
    );
    if (hasClickId || hasAnyUtm) {
      if (hasCampaignTag) taggedClicks += 1;
      else untaggedClicks += 1;
    }

    const affiliateRef =
      attr && typeof attr.affiliateRef === "string" && attr.affiliateRef.trim()
        ? attr.affiliateRef.trim()
        : null;
    if (affiliateRef) {
      affiliateTotal += 1;
      if (completed) affiliateCompleted += 1;
      affiliateOrders += orderCount;
      affiliateRevenue += orderValue;
      refTally[affiliateRef] ??= { total: 0, completed: 0, untaggedAd: 0 };
      refTally[affiliateRef].total += 1;
      if (completed) refTally[affiliateRef].completed += 1;
      if ((hasClickId || PAID_CHANNELS.has(channel)) && !hasCampaignTag) {
        refWithoutCampaign += 1;
        refTally[affiliateRef].untaggedAd += 1;
      }
    }

    const day = (row.created_at ?? "").slice(0, 10);
    if (day) {
      timeline[day] ??= { total: 0, paid: 0, social: 0, paidRevenue: 0 };
      timeline[day].total += 1;
      if (PAID_CHANNELS.has(channel)) {
        timeline[day].paid += 1;
        timeline[day].paidRevenue += orderValue;
      } else if (SOCIAL_CLICK_CHANNELS.has(channel)) timeline[day].social += 1;
    }

    const acct = (row.account_type ?? "unknown").toString();
    byAccountType[acct] ??= {};
    byAccountType[acct][channel] = (byAccountType[acct][channel] ?? 0) + 1;
  }

  const round2 = (n: number) => Math.round(n * 100) / 100;


  const channels = Object.entries(channelTally)
    .map(([key, v]) => ({
      key,
      label: CHANNEL_LABELS[key] ?? key,
      paid: PAID_CHANNELS.has(key),
      count: v.total,
      completed: v.completed,
      orders: v.orders,
      revenue: round2(v.revenue),
      aov: v.orders === 0 ? 0 : round2(v.revenue / v.orders),
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
      orders: v.orders,
      revenue: round2(v.revenue),
      aov: v.orders === 0 ? 0 : round2(v.revenue / v.orders),
    }))
    .sort((a, b) => b.revenue - a.revenue || b.count - a.count)
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
    taggedClicks,
    untaggedClicks,
    taggedShare:
      taggedClicks + untaggedClicks === 0
        ? 0
        : Math.round((taggedClicks / (taggedClicks + untaggedClicks)) * 1000) / 10,
    affiliateTotal,
    affiliateCompleted,
    affiliateShare: total === 0 ? 0 : Math.round((affiliateTotal / total) * 1000) / 10,
    refWithoutCampaign,
    // Purchases and revenue, credited to the channel the signup came from.
    // Values are first orders stamped by backfill-first-orders (one per
    // customer), so they are a floor on total revenue, not lifetime value.
    ordersTotal,
    revenueTotal: round2(revenueTotal),
    paidOrders,
    paidRevenue: round2(paidRevenue),
    paidAov: paidOrders === 0 ? 0 : round2(paidRevenue / paidOrders),
    paidPurchaseRate: paidTotal === 0 ? 0 : Math.round((paidOrders / paidTotal) * 1000) / 10,
    socialOrders,
    socialRevenue: round2(socialRevenue),
    affiliateOrders,
    affiliateRevenue: round2(affiliateRevenue),

    topRefs: Object.entries(refTally)
      .map(([ref, v]) => ({ ref, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 15),
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
