// Lists Calendly available times for the configured event type.
// Body: { start_time: ISO, end_time: ISO }  (max 7 days apart)
// Returns: { collection: [{ start_time, status, scheduling_url }] }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

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

  let body: { start_time?: string; end_time?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const start = body.start_time ?? "";
  const end = body.end_time ?? "";
  if (!ISO_RE.test(start) || !ISO_RE.test(end)) {
    return new Response(JSON.stringify({ error: "start_time/end_time must be ISO UTC (…Z)" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const uri = eventTypeUri.startsWith("http")
    ? eventTypeUri
    : `https://api.calendly.com/event_types/${eventTypeUri}`;

  const url = new URL("https://api.calendly.com/event_type_available_times");
  url.searchParams.set("event_type", uri);
  url.searchParams.set("start_time", start);
  url.searchParams.set("end_time", end);

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("calendly-availability failed:", res.status, data);
      return new Response(JSON.stringify({ error: "Calendly error", details: data }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ collection: data?.collection ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("calendly-availability error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
