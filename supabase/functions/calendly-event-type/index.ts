// Returns the configured Calendly event type metadata
// (name, duration, scheduling_url, location). Used by the in-app scheduler.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const token = Deno.env.get("CALENDLY_API_TOKEN");
  const eventTypeUri = Deno.env.get("CALENDLY_EVENT_TYPE_URI");
  if (!token || !eventTypeUri) {
    return new Response(JSON.stringify({ error: "Calendly not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Accept either a full URI or just a UUID.
  const uri = eventTypeUri.startsWith("http")
    ? eventTypeUri
    : `https://api.calendly.com/event_types/${eventTypeUri}`;

  try {
    const res = await fetch(uri, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("calendly-event-type failed:", res.status, data);
      return new Response(JSON.stringify({ error: "Calendly error", details: data }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const r = data?.resource ?? {};
    return new Response(
      JSON.stringify({
        uri: r.uri,
        name: r.name,
        duration: r.duration,
        scheduling_url: r.scheduling_url,
        location: r.location ?? null,
        kind: r.kind,
        active: r.active,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("calendly-event-type error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
