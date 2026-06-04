// Book a Calendly slot via single-use scheduling link.
// Calendly's public API doesn't expose direct invitee creation, so the canonical
// flow is: create a single-use scheduling_link for the event_type, then POST
// the invitee form to that link's booking endpoint. We surface Calendly's full
// error body so the client (and logs) see the real reason for any rejection.

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
};

function validate(input: any): { ok: true; value: BookInput } | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "Body must be JSON" };
  const { start_time, name, email, timezone } = input;
  if (typeof start_time !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(start_time))
    return { ok: false, error: "start_time must be ISO timestamp" };
  if (typeof name !== "string" || name.trim().length < 1 || name.length > 200)
    return { ok: false, error: "name required" };
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, error: "valid email required" };
  if (typeof timezone !== "string" || timezone.length < 1) return { ok: false, error: "timezone required" };
  return { ok: true, value: { start_time, name: name.trim(), email: email.trim().toLowerCase(), timezone } };
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
  const { start_time, name, email, timezone } = parsed.value;

  try {
    // 1. Create a single-use scheduling link for the event type.
    const linkRes = await fetch(`${CALENDLY_API}/scheduling_links`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ max_event_count: 1, owner: eventTypeUri, owner_type: "EventType" }),
    });
    const linkData = await linkRes.json().catch(() => null);
    if (!linkRes.ok) {
      console.error("[calendly-book] scheduling_links failed", { status: linkRes.status, linkData });
      return json(
        {
          error: {
            code: "calendly_error",
            message: linkData?.title ?? "Could not create booking link",
            status: linkRes.status,
            details: linkData,
          },
        },
        502,
      );
    }

    const bookingUrl: string | undefined = linkData?.resource?.booking_url;
    if (!bookingUrl) {
      console.error("[calendly-book] missing booking_url", linkData);
      return json({ error: { code: "calendly_error", message: "Missing booking_url", details: linkData } }, 502);
    }

    // 2. Submit invitee form against the scheduling link.
    // Calendly's invitee endpoint mirrors the public booking page POST.
    const inviteeRes = await fetch(bookingUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        event: { start_time },
        invitee: { name, email, timezone },
        timezone,
      }),
    });
    const inviteeText = await inviteeRes.text();
    let inviteeData: any = null;
    try {
      inviteeData = JSON.parse(inviteeText);
    } catch {
      inviteeData = { raw: inviteeText };
    }

    if (!inviteeRes.ok) {
      console.error("[calendly-book] invitee POST failed", {
        status: inviteeRes.status,
        inviteeData,
        bookingUrl,
        payload: { start_time, name, email, timezone },
      });
      return json(
        {
          error: {
            code: "calendly_error",
            message:
              inviteeData?.message ??
              inviteeData?.title ??
              `Calendly rejected the booking (${inviteeRes.status})`,
            status: inviteeRes.status,
            details: inviteeData,
          },
        },
        502,
      );
    }

    // Normalise booking response — Calendly returns slightly different shapes
    // depending on event_type config.
    const ev = inviteeData?.event ?? inviteeData?.scheduled_event ?? {};
    const inv = inviteeData?.invitee ?? {};

    return json({
      booking: {
        uri: inv?.uri ?? ev?.uri ?? "",
        name,
        email,
        start_time: ev?.start_time ?? start_time,
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
