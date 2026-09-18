// Pulls daily campaign figures from the Meta (Facebook) Marketing API into
// public.meta_ads_daily, so the admin Ads tab can show Meta's own spend and
// reported purchases next to our verified signups and revenue.
//
// Auth: admin HMAC token / email + password (same pattern as the other admin
// functions) or the service role key (used by the nightly cron wrapper).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "alex@dropdeadhair.com";
const GRAPH_VERSION = "v21.0";

interface RequestBody {
  email?: string;
  password?: string;
  token?: string;
  daysBack?: number;
  trigger?: string;
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

type ActionEntry = { action_type?: string; value?: string | number };

// Meta reports purchases and leads inside the actions array. Prefer the
// website purchase types, fall back to the generic ones.
function pickAction(actions: ActionEntry[] | undefined, types: string[]): number {
  if (!Array.isArray(actions)) return 0;
  for (const t of types) {
    const hit = actions.find((a) => a?.action_type === t);
    if (hit) return Number(hit.value ?? 0) || 0;
  }
  return 0;
}

const PURCHASE_TYPES = [
  "omni_purchase",
  "purchase",
  "offsite_conversion.fb_pixel_purchase",
];
const LEAD_TYPES = [
  "omni_lead",
  "lead",
  "offsite_conversion.fb_pixel_lead",
  "complete_registration",
  "offsite_conversion.fb_pixel_complete_registration",
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const adminPassword = Deno.env.get("ADMIN_PANEL_PASSWORD");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!adminPassword || !supabaseUrl || !serviceRoleKey) {
    return json({ success: false, error: "Server misconfigured" }, 500);
  }

  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  let authed = bearer === serviceRoleKey;
  if (!authed && body.token) authed = await verifyAdminToken(body.token, adminPassword);
  if (!authed && (body.email ?? "").trim().toLowerCase() === ADMIN_EMAIL) {
    authed = (body.password ?? "") === adminPassword;
  }
  if (!authed) return json({ success: false, error: "Invalid credentials" }, 401);

  const accessToken = Deno.env.get("META_ADS_ACCESS_TOKEN");
  const rawAccountId = (Deno.env.get("META_ADS_ACCOUNT_ID") ?? "").trim();
  if (!accessToken || !rawAccountId) {
    return json(
      {
        success: false,
        error:
          "Meta ads is not connected yet. The access token and ad account id need to be saved first.",
      },
      400,
    );
  }
  const accountId = rawAccountId.startsWith("act_") ? rawAccountId : `act_${rawAccountId.replace(/^act_/, "")}`;

  const daysBack = Math.min(Math.max(Number(body.daysBack ?? 90), 1), 1095);
  const until = new Date();
  const since = new Date(Date.now() - daysBack * 86_400_000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const params = new URLSearchParams({
    level: "campaign",
    time_increment: "1",
    limit: "500",
    fields:
      "campaign_id,campaign_name,spend,impressions,clicks,inline_link_clicks,account_currency,date_start,actions,action_values",
    time_range: JSON.stringify({ since: fmt(since), until: fmt(until) }),
    access_token: accessToken,
  });

  let url = `https://graph.facebook.com/${GRAPH_VERSION}/${accountId}/insights?${params.toString()}`;
  const rows: Record<string, unknown>[] = [];
  let pages = 0;

  while (url && pages < 40) {
    const res = await fetch(url);
    const text = await res.text();
    if (!res.ok) {
      console.error(`meta-ads-sync graph request failed [${res.status}]: ${text}`);
      return json(
        { success: false, error: "Meta rejected the request", status: res.status, details: text.slice(0, 1500) },
        res.status === 400 || res.status === 403 ? 400 : 502,
      );
    }
    let parsed: { data?: Record<string, unknown>[]; paging?: { next?: string } };
    try {
      parsed = JSON.parse(text);
    } catch {
      console.error("meta-ads-sync could not parse Meta response");
      return json({ success: false, error: "Unreadable response from Meta" }, 502);
    }
    rows.push(...(parsed.data ?? []));
    url = parsed.paging?.next ?? "";
    pages += 1;
  }

  const upserts = rows.map((r) => {
    const actions = r.actions as ActionEntry[] | undefined;
    const actionValues = r.action_values as ActionEntry[] | undefined;
    return {
      account_id: accountId,
      campaign_id: String(r.campaign_id ?? ""),
      campaign_name: String(r.campaign_name ?? ""),
      day: String(r.date_start ?? "").slice(0, 10),
      spend: Number(r.spend ?? 0) || 0,
      impressions: Number(r.impressions ?? 0) || 0,
      clicks: Number(r.clicks ?? 0) || 0,
      link_clicks: Number(r.inline_link_clicks ?? 0) || 0,
      purchases: pickAction(actions, PURCHASE_TYPES),
      purchase_value: pickAction(actionValues, PURCHASE_TYPES),
      leads: pickAction(actions, LEAD_TYPES),
      currency: String(r.account_currency ?? "USD"),
      synced_at: new Date().toISOString(),
    };
  }).filter((u) => u.campaign_id && u.day);

  let written = 0;
  const errors: string[] = [];
  for (let i = 0; i < upserts.length; i += 200) {
    const chunk = upserts.slice(i, i + 200);
    const { error } = await supabase
      .from("meta_ads_daily")
      .upsert(chunk, { onConflict: "account_id,campaign_id,day" });
    if (error) {
      console.error("meta-ads-sync upsert failed:", error);
      errors.push(error.message);
    } else {
      written += chunk.length;
    }
  }

  const totals = upserts.reduce(
    (acc, u) => {
      acc.spend += u.spend;
      acc.purchases += u.purchases;
      acc.purchaseValue += u.purchase_value;
      acc.leads += u.leads;
      return acc;
    },
    { spend: 0, purchases: 0, purchaseValue: 0, leads: 0 },
  );

  return json({
    success: errors.length === 0,
    trigger: body.trigger ?? "manual",
    daysBack,
    since: fmt(since),
    until: fmt(until),
    rowsFromMeta: rows.length,
    rowsWritten: written,
    spend: Math.round(totals.spend * 100) / 100,
    purchases: totals.purchases,
    purchaseValue: Math.round(totals.purchaseValue * 100) / 100,
    leads: totals.leads,
    errors,
  });
});
