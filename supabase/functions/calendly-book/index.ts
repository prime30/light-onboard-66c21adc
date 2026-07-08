// Book a Calendly slot via the public POST /invitees endpoint.
// Fetches the event type once (cached for 1h) to echo back its configured
// location, which is required by Calendly when location.kind is custom,
// physical, ask_invitee, or outbound_call.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const CALENDLY_API = "https://api.calendly.com";


function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type BookInput = {
  start_time: string;
  name: string;
  email: string;
  timezone: string;
  phone?: string;
};

function validate(input: any): { ok: true; value: BookInput } | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "Body must be JSON" };
  const { start_time, name, email, timezone, phone } = input;
  if (typeof start_time !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(start_time))
    return { ok: false, error: "start_time must be ISO timestamp" };
  if (typeof name !== "string" || name.trim().length < 1 || name.length > 200)
    return { ok: false, error: "name required" };
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, error: "valid email required" };
  if (typeof timezone !== "string" || timezone.length < 1) return { ok: false, error: "timezone required" };
  // Strict E.164 validation: leading "+", 1-3 digit country code, total 8-15
  // digits. Reject anything malformed so Calendly never receives garbage.
  let normalizedPhone: string | undefined;
  if (phone !== undefined && phone !== null && phone !== "") {
    if (typeof phone !== "string") return { ok: false, error: "phone must be a string" };
    const trimmed = phone.trim();
    if (!trimmed.startsWith("+"))
      return { ok: false, error: "phone must be E.164 (start with +country code)" };
    const e164 = "+" + trimmed.slice(1).replace(/\D/g, "");
    if (!/^\+[1-9]\d{7,14}$/.test(e164))
      return { ok: false, error: "phone is not a valid E.164 number" };
    normalizedPhone = e164;
  }
  return {
    ok: true,
    value: {
      start_time,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      timezone,
      phone: normalizedPhone,
    },
  };
}

// Module-scoped 1h memo for the event type (location, slug, etc.) - survives
// across warm invocations of the same isolate.
let eventTypeCache: { fetchedAt: number; data: any } | null = null;
async function getEventType(uri: string, token: string): Promise<any> {
  if (eventTypeCache && Date.now() - eventTypeCache.fetchedAt < 60 * 60 * 1000) {
    return eventTypeCache.data;
  }
  const res = await fetch(uri, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error("event_type fetch failed"), { status: res.status, details: data });
  eventTypeCache = { fetchedAt: Date.now(), data };
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: { message: "Method not allowed" } }, 405);

  const token = Deno.env.get("CALENDLY_API_TOKEN");
  const eventTypeUri = Deno.env.get("CALENDLY_EVENT_TYPE_URI");
  if (!token || !eventTypeUri) {
    return json({ error: { code: "config_missing", message: "Calendly not configured" } }, 500);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: { code: "bad_request", message: "Invalid JSON" } }, 400);
  }

  const parsed = validate(body);
  if (!parsed.ok) return json({ error: { code: "bad_request", message: parsed.error } }, 400);
  const { start_time, name, email, timezone, phone } = parsed.value;

  // Refuse past start_time early - Calendly will 422 with an opaque error.
  if (new Date(start_time).getTime() <= Date.now()) {
    return json({ error: { code: "bad_request", message: "start_time is in the past" } }, 400);
  }

  // Pull event-type location (Calendly requires echoing it for several kinds).
  let location: { kind: string; location?: string } | undefined;
  try {
    const et = await getEventType(eventTypeUri, token);
    const loc = et?.resource?.locations?.[0];
    if (loc && typeof loc.kind === "string") {
      location = { kind: loc.kind };
      if (typeof loc.location === "string") location.location = loc.location;
    }
  } catch (err: any) {
    console.error("[calendly-book] event_type lookup failed", err?.status, err?.details ?? err);
    return json(
      { error: { code: "calendly_error", message: "Could not load event type", details: err?.details ?? String(err) } },
      502,
    );
  }

  const invitee: Record<string, unknown> = { name, email, timezone };
  // Calendly opts the invitee into SMS reminders when text_reminder_number is
  // set (event type must have SMS reminders enabled in Calendly settings).
  if (phone) invitee.text_reminder_number = phone;

  const payload: Record<string, unknown> = {
    event_type: eventTypeUri,
    start_time,
    invitee,
  };
  if (location) payload.location = location;

  try {
    const res = await fetch(`${CALENDLY_API}/invitees`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      console.error("[calendly-book] /invitees failed", { status: res.status, data, payload });
      // Extract first field-level detail (e.g. "invitee.email: disposable email")
      const firstDetail = Array.isArray(data?.details) && data.details[0]
        ? `${data.details[0].parameter ?? ""}: ${data.details[0].message ?? data.details[0].code ?? ""}`.trim().replace(/^:\s*/, "")
        : null;
      const message =
        firstDetail ||
        data?.message ||
        data?.title ||
        `Calendly rejected the booking (${res.status})`;
      // Return 200 so the client can read the error body (invoke throws on non-2xx).
      return json({
        error: {
          code: "calendly_error",
          message,
          status: res.status,
          details: data,
        },
      });
    }

    // Normalise booking response - Calendly returns slightly different shapes
    // depending on event_type config.
    const ev = data?.resource?.event ?? data?.event ?? data?.scheduled_event ?? {};
    const inv = data?.resource ?? data?.invitee ?? {};

    const bookingStartTime: string = ev?.start_time ?? start_time;
    const inviteeUri: string = inv?.uri ?? "";

    // Best-effort: stamp the matching registration_lead so admin analytics can
    // compute founder-call take rate. Never block the booking response on this.
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrl && serviceKey) {
        const admin = createClient(supabaseUrl, serviceKey);
        const { error: updErr } = await admin
          .from("registration_leads")
          .update({
            founder_call_booked_at: new Date().toISOString(),
            founder_call_start_time: bookingStartTime,
            founder_call_invitee_uri: inviteeUri || null,
          })
          .eq("email", email);
        if (updErr) {
          console.warn("[calendly-book] lead stamp failed", updErr.message);
        }
      }
    } catch (stampErr) {
      console.warn("[calendly-book] lead stamp threw", stampErr);
    }

    return json({
      booking: {
        uri: inviteeUri,
        name,
        email,
        start_time: bookingStartTime,
        end_time: ev?.end_time ?? "",
        join_url: ev?.location?.join_url ?? ev?.join_url,
        cancel_url: inv?.cancel_url,
        reschedule_url: inv?.reschedule_url,
      },
    });
  } catch (err) {
    console.error("[calendly-book] unexpected error", err);
    return json({ error: { code: "network_error", message: String(err) } }, 502);
  }
});

