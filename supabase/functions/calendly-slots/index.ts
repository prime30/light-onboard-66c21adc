// Fetch available Calendly slots for an event type within a date window.
// Public endpoint (no JWT) - only reads availability for one preconfigured event type.

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

function isYmd(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const token = Deno.env.get("CALENDLY_API_TOKEN");
  const eventTypeUri = Deno.env.get("CALENDLY_EVENT_TYPE_URI");
  if (!token || !eventTypeUri) {
    return json({ error: { code: "config_missing", message: "Calendly not configured" } }, 500);
  }

  // Accept params from either querystring (GET) or JSON body (POST/invoke).
  let startDate = "";
  let endDate = "";
  const url = new URL(req.url);
  startDate = url.searchParams.get("start_date") ?? "";
  endDate = url.searchParams.get("end_date") ?? "";
  if ((!startDate || !endDate) && (req.method === "POST" || req.headers.get("content-type")?.includes("application/json"))) {
    try {
      const body = await req.json();
      startDate ||= body?.start_date ?? "";
      endDate ||= body?.end_date ?? "";
    } catch {
      // ignore
    }
  }

  if (!isYmd(startDate) || !isYmd(endDate)) {
    return json({ error: { code: "bad_request", message: "start_date and end_date must be YYYY-MM-DD" } }, 400);
  }


  // Calendly requires ISO timestamps with timezone for available_times,
  // and start_time must be strictly in the future.
  const now = new Date();
  let startTime = new Date(`${startDate}T00:00:00.000Z`);
  if (startTime <= now) startTime = new Date(now.getTime() + 60_000);
  const endTime = new Date(`${endDate}T23:59:59.999Z`);

  // If the requested window is entirely in the past (or otherwise inverted
  // after the start_time bump), Calendly 400s with
  // "start_time must be before end_time". Just return no slots.
  if (startTime >= endTime) {
    return json({ slots: [] });
  }

  const cUrl = new URL(`${CALENDLY_API}/event_type_available_times`);
  cUrl.searchParams.set("event_type", eventTypeUri);
  cUrl.searchParams.set("start_time", startTime.toISOString());
  cUrl.searchParams.set("end_time", endTime.toISOString());


  try {
    const res = await fetch(cUrl.toString(), {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      console.error("[calendly-slots] upstream error", { status: res.status, data });
      return json(
        {
          error: {
            code: "calendly_error",
            message: data?.title ?? data?.message ?? "Calendly request failed",
            status: res.status,
            details: data,
          },
        },
        502,
      );
    }
    const slots = Array.isArray(data?.collection)
      ? data.collection
          .filter((s: any) => s?.status === "available" && typeof s?.start_time === "string")
          .map((s: any) => ({ start_time: s.start_time }))
      : [];
    return json({ slots });
  } catch (err) {
    console.error("[calendly-slots] fetch failed", err);
    return json({ error: { code: "network_error", message: String(err) } }, 502);
  }
});
