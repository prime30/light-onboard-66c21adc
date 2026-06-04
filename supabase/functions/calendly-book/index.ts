// Books a Calendly event via POST /invitees (Scheduling API).
// Body: { start_time, name, email, timezone, first_name?, last_name?, location_kind? }
// Returns the Calendly invitee resource on success.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = Deno.env.get("CALENDLY_API_TOKEN");
  const eventTypeUri = Deno.env.get("CALENDLY_EVENT_TYPE_URI");
  if (!token || !eventTypeUri) {
    return new Response(JSON.stringify({ error: "Calendly not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: {
    start_time?: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    timezone?: string;
    location_kind?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const start = body.start_time ?? "";
  const email = (body.email ?? "").trim().toLowerCase();
  const tz = (body.timezone ?? "").trim();
  const name = (body.name ?? "").trim();

  if (!ISO_RE.test(start)) {
    return new Response(JSON.stringify({ error: "start_time must be ISO UTC (…Z)" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!EMAIL_RE.test(email)) {
    return new Response(JSON.stringify({ error: "Valid email required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!name || !tz) {
    return new Response(JSON.stringify({ error: "name and timezone required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const uri = eventTypeUri.startsWith("http")
    ? eventTypeUri
    : `https://api.calendly.com/event_types/${eventTypeUri}`;

  const payload: Record<string, unknown> = {
    event_type: uri,
    start_time: start,
    invitee: {
      name,
      first_name: body.first_name || undefined,
      last_name: body.last_name || undefined,
      email,
      timezone: tz,
    },
    tracking: {
      utm_source: "dde-onboarding",
      utm_campaign: "founder-call",
    },
  };
  if (body.location_kind) {
    payload.location = { kind: body.location_kind };
  }

  try {
    const res = await fetch("https://api.calendly.com/invitees", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("calendly-book failed:", res.status, data);
      return new Response(
        JSON.stringify({
          error: "Calendly error",
          status: res.status,
          details: data,
        }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const r = data?.resource ?? data;
    return new Response(
      JSON.stringify({
        uri: r?.uri,
        event: r?.event,
        status: r?.status,
        cancel_url: r?.cancel_url,
        reschedule_url: r?.reschedule_url,
        start_time: start,
        timezone: tz,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("calendly-book error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
