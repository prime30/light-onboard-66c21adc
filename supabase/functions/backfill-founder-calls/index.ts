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
  const password = body.password ?? "";
  const adminPassword = Deno.env.get("ADMIN_PANEL_PASSWORD");
  if (!adminPassword) return json({ success: false, error: "Server configuration error" }, 500);
  if (email !== ADMIN_EMAIL || password !== adminPassword) {
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
      bookings.push({
        email: invEmail,
        start_time: ev.start_time,
        invitee_uri: inv?.uri ?? "",
        created_at: inv?.created_at ?? new Date().toISOString(),
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

  // Pre-fetch existing leads in one query to avoid per-row reads.
  const emails = Array.from(new Set(bookings.map((b) => b.email)));
  const { data: existing, error: fetchErr } = await admin
    .from("registration_leads")
    .select("email, founder_call_booked_at")
    .in("email", emails);
  if (fetchErr) {
    return json({ success: false, error: `lead lookup failed: ${fetchErr.message}` }, 500);
  }
  const existingMap = new Map(
    (existing ?? []).map((r: any) => [r.email, r.founder_call_booked_at as string | null]),
  );

  for (const b of bookings) {
    if (!existingMap.has(b.email)) {
      noLead++;
      results.push({ email: b.email, action: "no_lead" });
      continue;
    }
    if (!force && existingMap.get(b.email)) {
      skipped++;
      results.push({ email: b.email, action: "skipped", reason: "already stamped" });
      continue;
    }
    if (dryRun) {
      updated++;
      results.push({ email: b.email, action: "updated", reason: "dry-run" });
      continue;
    }
    const { error: updErr } = await admin
      .from("registration_leads")
      .update({
        founder_call_booked_at: b.created_at,
        founder_call_start_time: b.start_time,
        founder_call_invitee_uri: b.invitee_uri || null,
      })
      .eq("email", b.email);
    if (updErr) {
      results.push({ email: b.email, action: "error", reason: updErr.message });
      continue;
    }
    updated++;
    results.push({ email: b.email, action: "updated" });
  }

  return json({
    success: true,
    dryRun,
    force,
    rangeDays: { back: daysBack, forward: daysForward },
    eventsFound: events.length,
    bookingsFound: bookings.length,
    updated,
    skipped,
    noLead,
    errors: results.filter((r) => r.action === "error").length,
    results,
  });
});
