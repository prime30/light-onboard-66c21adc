// Calendly webhook receiver. Handles:
//   - invitee_no_show.created  → stamp founder_call_no_show_at
//   - invitee_no_show.deleted  → clear founder_call_no_show_at
//   - invitee.canceled         → clear founder_call_* (booking went away)
//   - invitee.created          → idempotent re-stamp of booking (safety net)
//
// Signature verification: Calendly sends `Calendly-Webhook-Signature: t=<ts>,v1=<hmac>`.
// We compute HMAC-SHA256(`${t}.${rawBody}`, CALENDLY_WEBHOOK_SIGNING_KEY) and
// compare in constant time. If the signing key is missing we refuse the
// request (fail-closed) - never accept unauthenticated webhook traffic.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, calendly-webhook-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function verifySignature(rawBody: string, header: string | null, signingKey: string) {
  if (!header) return false;
  // Format: "t=1620000000,v1=hexsig[,v1=hexsig...]"
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    }),
  ) as { t?: string; v1?: string };
  if (!parts.t || !parts.v1) return false;

  // Reject stale timestamps (5 min skew).
  const ts = Number(parts.t);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(signingKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(`${parts.t}.${rawBody}`));
  const expected = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time compare.
  const a = expected;
  const b = parts.v1;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const signingKey = Deno.env.get("CALENDLY_WEBHOOK_SIGNING_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!signingKey || !supabaseUrl || !serviceKey) {
    console.error("[calendly-webhook] missing required env");
    return json({ error: "Server misconfigured" }, 500);
  }

  const rawBody = await req.text();
  const sigHeader = req.headers.get("calendly-webhook-signature");
  const ok = await verifySignature(rawBody, sigHeader, signingKey);
  if (!ok) {
    console.warn("[calendly-webhook] signature verification failed");
    return json({ error: "Invalid signature" }, 401);
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const eventType = event?.event as string | undefined;
  const payload = event?.payload ?? {};
  const admin = createClient(supabaseUrl, serviceKey);

  // Helper: find a registration_leads row by invitee URI (preferred) or email.
  async function findLead(inviteeUri: string | null, email: string | null) {
    if (inviteeUri) {
      const { data } = await admin
        .from("registration_leads")
        .select("email")
        .eq("founder_call_invitee_uri", inviteeUri)
        .maybeSingle();
      if (data?.email) return data.email as string;
    }
    if (email) {
      const { data } = await admin
        .from("registration_leads")
        .select("email")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();
      if (data?.email) return data.email as string;
    }
    return null;
  }

  try {
    if (eventType === "invitee_no_show.created") {
      // payload: { uri, invitee: <invitee_uri>, created_at }
      const inviteeUri = (payload?.invitee as string | undefined) ?? null;
      const createdAt = (payload?.created_at as string | undefined) ?? new Date().toISOString();
      const leadEmail = await findLead(inviteeUri, null);
      if (!leadEmail) {
        console.warn("[calendly-webhook] no-show: no matching lead", { inviteeUri });
        return json({ ok: true, matched: false });
      }
      const { error } = await admin
        .from("registration_leads")
        .update({ founder_call_no_show_at: createdAt })
        .eq("email", leadEmail);
      if (error) throw error;
      console.log("[calendly-webhook] stamped no-show", { email: leadEmail });
      return json({ ok: true, matched: true });
    }

    if (eventType === "invitee_no_show.deleted") {
      // payload: { uri, invitee: <invitee_uri> } - user un-marked no-show.
      const inviteeUri = (payload?.invitee as string | undefined) ?? null;
      const leadEmail = await findLead(inviteeUri, null);
      if (!leadEmail) return json({ ok: true, matched: false });
      const { error } = await admin
        .from("registration_leads")
        .update({ founder_call_no_show_at: null })
        .eq("email", leadEmail);
      if (error) throw error;
      console.log("[calendly-webhook] cleared no-show", { email: leadEmail });
      return json({ ok: true, matched: true });
    }

    if (eventType === "invitee.canceled") {
      // payload: { uri (invitee uri), email, ... }
      const inviteeUri = (payload?.uri as string | undefined) ?? null;
      const inviteeEmail = (payload?.email as string | undefined) ?? null;
      const leadEmail = await findLead(inviteeUri, inviteeEmail);
      if (!leadEmail) return json({ ok: true, matched: false });
      const { error } = await admin
        .from("registration_leads")
        .update({
          founder_call_booked_at: null,
          founder_call_start_time: null,
          founder_call_invitee_uri: null,
          founder_call_no_show_at: null,
        })
        .eq("email", leadEmail);
      if (error) throw error;
      console.log("[calendly-webhook] cleared cancellation", { email: leadEmail });
      return json({ ok: true, matched: true });
    }

    if (eventType === "invitee.created") {
      // Booking is already stamped by calendly-book at submit time; this is a safety net.
      const inviteeUri = (payload?.uri as string | undefined) ?? null;
      const inviteeEmail = (payload?.email as string | undefined) ?? null;
      const startTime =
        (payload?.scheduled_event?.start_time as string | undefined) ?? null;
      const createdAt = (payload?.created_at as string | undefined) ?? new Date().toISOString();
      const leadEmail = await findLead(null, inviteeEmail);
      if (!leadEmail) return json({ ok: true, matched: false });
      const { data: cur } = await admin
        .from("registration_leads")
        .select("founder_call_booked_at")
        .eq("email", leadEmail)
        .maybeSingle();
      if (cur?.founder_call_booked_at) return json({ ok: true, matched: true, skipped: true });
      const { error } = await admin
        .from("registration_leads")
        .update({
          founder_call_booked_at: createdAt,
          founder_call_start_time: startTime,
          founder_call_invitee_uri: inviteeUri,
        })
        .eq("email", leadEmail);
      if (error) throw error;
      return json({ ok: true, matched: true, stamped: "booking" });
    }

    console.log("[calendly-webhook] ignored event", { eventType });
    return json({ ok: true, ignored: true });
  } catch (e) {
    console.error("[calendly-webhook] handler error", e);
    return json({ error: e instanceof Error ? e.message : "handler error" }, 500);
  }
});
