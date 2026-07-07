// Admin-gated backfill: walk historical Calendly bookings for the configured
// event type and stamp matching public.registration_leads rows with
// founder_call_booked_at / founder_call_start_time / founder_call_invitee_uri.
// Safe to re-run — only updates rows that don't already have a booking stamped
// (unless `force: true`).
//
// Body:
//   {
//     email: string,            // admin email
//     password: string,         // admin password
//     daysBack?: number,        // how far back to look (default 180)
//     daysForward?: number,     // how far forward to look (default 90)
//     dryRun?: boolean,         // default true
//     force?: boolean,          // overwrite existing stamps
//   }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "alex@dropdeadhair.com";
const CALENDLY_API = "https://api.calendly.com";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type Body = {
  email?: string;
  password?: string;
  daysBack?: number;
  daysForward?: number;
  dryRun?: boolean;
  force?: boolean;
};


// --- Admin auth (token or password) -----------------------------------------
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
  } catch { return false; }
}
async function issueAdminToken(email: string, secret: string, ttlSeconds = 60 * 60 * 8): Promise<{ token: string; expiresAt: number }> {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const b = btoa(JSON.stringify({ email, exp: expiresAt })).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const s = await _hmacB64u(secret, b);
  return { token: `${b}.${s}`, expiresAt };
}
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "Invalid JSON" }, 400);
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const providedToken = typeof (body as { token?: unknown }).token === "string" ? (body as { token?: string }).token! : "";
  const adminPassword = Deno.env.get("ADMIN_PANEL_PASSWORD");
  if (!adminPassword) return json({ success: false, error: "Server misconfigured" }, 500);
  let _authed = false;
  let _authedEmail = email;
  if (providedToken) {
    _authed = await verifyAdminToken(providedToken, adminPassword);
    if (_authed) _authedEmail = ADMIN_EMAIL;
  } else {
    const password = body.password ?? "";
    _authed = email === ADMIN_EMAIL && password === adminPassword;
  }
  if (!_authed) return json({ success: false, error: "Invalid credentials" }, 401);
  const _adminEmail = _authedEmail;
  return json({ success: false, error: "Invalid credentials" }, 401);
  }

  const token = Deno.env.get("CALENDLY_API_TOKEN");
  const eventTypeUri = Deno.env.get("CALENDLY_EVENT_TYPE_URI");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!token || !eventTypeUri || !supabaseUrl || !serviceKey) {
    return json({ success: false, error: "Server configuration error" }, 500);
  }

  const dryRun = body.dryRun !== false;
  const force = body.force === true;
  const daysBack = Math.min(Math.max(body.daysBack ?? 180, 1), 365);
  const daysForward = Math.min(Math.max(body.daysForward ?? 90, 0), 365);

  const now = Date.now();
  const minStart = new Date(now - daysBack * 86_400_000).toISOString();
  const maxStart = new Date(now + daysForward * 86_400_000).toISOString();

  const admin = createClient(supabaseUrl, serviceKey);

  // Calendly's /scheduled_events requires at least one of organization|user|group,
  // even when event_type is provided. Fetch the token owner's URIs first.
  let organizationUri = "";
  let userUri = "";
  try {
    const meRes = await fetch(`${CALENDLY_API}/users/me`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (!meRes.ok) {
      const t = await meRes.text();
      return json(
        { success: false, error: `Calendly users/me ${meRes.status}: ${t.slice(0, 300)}` },
        502,
      );
    }
    const me = await meRes.json();
    organizationUri = me?.resource?.current_organization ?? "";
    userUri = me?.resource?.uri ?? "";
  } catch (e) {
    return json(
      { success: false, error: `Calendly users/me threw: ${String(e).slice(0, 200)}` },
      502,
    );
  }

  // 1. Page through scheduled_events for this event type.
  const events: Array<{ uri: string; start_time: string }> = [];
  let pageToken: string | null = null;
  let pages = 0;
  do {
    const qs = new URLSearchParams({
      event_type: eventTypeUri,
      min_start_time: minStart,
      max_start_time: maxStart,
      status: "active",
      count: "100",
      sort: "start_time:asc",
    });
    if (organizationUri) qs.set("organization", organizationUri);
    else if (userUri) qs.set("user", userUri);
    if (pageToken) qs.set("page_token", pageToken);
    const r = await fetch(`${CALENDLY_API}/scheduled_events?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (!r.ok) {
      const t = await r.text();
      return json(
        { success: false, error: `Calendly scheduled_events ${r.status}: ${t.slice(0, 300)}` },
        502,
      );
    }
    const j = await r.json();
    for (const ev of j?.collection ?? []) {
      if (ev?.uri && ev?.start_time) {
        events.push({ uri: ev.uri, start_time: ev.start_time });
      }
    }
    pageToken = j?.pagination?.next_page_token ?? null;
    pages++;
  } while (pageToken && pages < 20);

  // 2. For each event, fetch invitees (usually 1 per event for 1:1 calls).
  type Booking = {
    email: string;
    start_time: string;
    invitee_uri: string;
    created_at: string;
    no_show_at: string | null;
  };
  const bookings: Booking[] = [];

  for (const ev of events) {
    const r = await fetch(`${ev.uri}/invitees?status=active&count=100`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (!r.ok) continue;
    const j = await r.json();
    for (const inv of j?.collection ?? []) {
      const invEmail = (inv?.email ?? "").trim().toLowerCase();
      if (!invEmail) continue;
      // Calendly invitee schema: `no_show` is null OR `{ uri, created_at }` when marked.
      const ns = inv?.no_show;
      const noShowAt =
        ns && typeof ns === "object" ? (ns.created_at ?? new Date().toISOString()) : null;
      bookings.push({
        email: invEmail,
        start_time: ev.start_time,
        invitee_uri: inv?.uri ?? "",
        created_at: inv?.created_at ?? new Date().toISOString(),
        no_show_at: noShowAt,
      });
    }
    // Light pacing — Calendly is ~10 req/s soft.
    await new Promise((r) => setTimeout(r, 60));
  }

  // 3. Match against registration_leads by email and stamp.
  const results: Array<{
    email: string;
    action: "updated" | "skipped" | "no_lead" | "error";
    reason?: string;
  }> = [];
  let updated = 0;
  let skipped = 0;
  let noLead = 0;
  let noShowStamped = 0;

  // Pre-fetch existing leads in one query to avoid per-row reads.
  const emails = Array.from(new Set(bookings.map((b) => b.email)));
  const { data: existing, error: fetchErr } = await admin
    .from("registration_leads")
    .select("email, founder_call_booked_at, founder_call_no_show_at")
    .in("email", emails);
  if (fetchErr) {
    return json({ success: false, error: `lead lookup failed: ${fetchErr.message}` }, 500);
  }
  const existingMap = new Map(
    (existing ?? []).map((r: any) => [
      r.email,
      {
        booked: r.founder_call_booked_at as string | null,
        noShow: r.founder_call_no_show_at as string | null,
      },
    ]),
  );

  for (const b of bookings) {
    const cur = existingMap.get(b.email);
    if (!cur) {
      noLead++;
      results.push({ email: b.email, action: "no_lead" });
      continue;
    }
    const needsBooking = force || !cur.booked;
    const needsNoShow = !!b.no_show_at && (force || !cur.noShow);
    if (!needsBooking && !needsNoShow) {
      skipped++;
      results.push({ email: b.email, action: "skipped", reason: "already stamped" });
      continue;
    }
    if (dryRun) {
      if (needsBooking) updated++;
      if (needsNoShow) noShowStamped++;
      results.push({
        email: b.email,
        action: "updated",
        reason: needsNoShow ? "dry-run (incl. no-show)" : "dry-run",
      });
      continue;
    }
    const patch: Record<string, unknown> = {};
    if (needsBooking) {
      patch.founder_call_booked_at = b.created_at;
      patch.founder_call_start_time = b.start_time;
      patch.founder_call_invitee_uri = b.invitee_uri || null;
    }
    if (needsNoShow) {
      patch.founder_call_no_show_at = b.no_show_at;
      // Make sure invitee_uri is stamped even on existing rows so the webhook can match later.
      if (!cur.booked || force) patch.founder_call_invitee_uri = b.invitee_uri || null;
    }
    const { error: updErr } = await admin
      .from("registration_leads")
      .update(patch)
      .eq("email", b.email);
    if (updErr) {
      results.push({ email: b.email, action: "error", reason: updErr.message });
      continue;
    }
    if (needsBooking) updated++;
    if (needsNoShow) noShowStamped++;
    results.push({
      email: b.email,
      action: "updated",
      reason: needsNoShow ? "stamped no-show" : undefined,
    });
  }

  return json({
    success: true,
    dryRun,
    force,
    rangeDays: { back: daysBack, forward: daysForward },
    eventsFound: events.length,
    bookingsFound: bookings.length,
    updated,
    noShowStamped,
    skipped,
    noLead,
    errors: results.filter((r) => r.action === "error").length,
    results,
  });
});
