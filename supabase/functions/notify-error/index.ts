// Internal error notification. Fire-and-forget from anywhere we want a ping:
//   await supabase.functions.invoke("notify-error", {
//     body: { source: "create-customer", message: "...", context: {...} }
//   })
//
// Dedupes by (source + message) with a 15-minute cooldown stored in
// public.error_alerts, then fires a "Internal Error Alert" Klaviyo event
// targeted at alex@dropdeadhair.com. Add a one-step Klaviyo flow on that
// metric to email yourself.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALERT_EMAIL = "alex@dropdeadhair.com";
const COOLDOWN_MIN = 15;
const KLAVIYO_REVISION = "2025-04-15";
const KLAVIYO_BASE = "https://a.klaviyo.com/api";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildKey(source: string, message: string): string {
  // Strip volatile bits (ids, hex, long digits) so the same logical error dedupes.
  const norm = message
    .toLowerCase()
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, "<uuid>")
    .replace(/0x[0-9a-f]+/g, "<hex>")
    .replace(/\b\d{4,}\b/g, "<num>")
    .slice(0, 240);
  return `${source}::${norm}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  let payload: { source?: string; message?: string; context?: Record<string, unknown> };
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const source = (payload.source ?? "").toString().slice(0, 80) || "unknown";
  const message = (payload.message ?? "").toString().slice(0, 1000) || "(no message)";
  const context = payload.context && typeof payload.context === "object" ? payload.context : {};
  const alertKey = buildKey(source, message);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json(500, { error: "Server misconfigured" });
  }

  // Check existing alert row.
  let shouldNotify = true;
  let occurrenceCount = 1;
  try {
    const getRes = await fetch(
      `${supabaseUrl}/rest/v1/error_alerts?alert_key=eq.${encodeURIComponent(alertKey)}&select=occurrence_count,last_notified_at`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
    );
    if (getRes.ok) {
      const rows = (await getRes.json()) as Array<{ occurrence_count: number; last_notified_at: string | null }>;
      if (rows.length > 0) {
        occurrenceCount = (rows[0].occurrence_count ?? 0) + 1;
        const last = rows[0].last_notified_at ? new Date(rows[0].last_notified_at).getTime() : 0;
        const cooldownMs = COOLDOWN_MIN * 60 * 1000;
        if (last && Date.now() - last < cooldownMs) shouldNotify = false;
      }
    }
  } catch (err) {
    console.warn("notify-error: lookup failed", err);
  }

  // Upsert alert state.
  const now = new Date().toISOString();
  const upsertBody: Record<string, unknown> = {
    alert_key: alertKey,
    source,
    last_message: message,
    last_context: context,
    occurrence_count: occurrenceCount,
    last_seen_at: now,
  };
  if (shouldNotify) upsertBody.last_notified_at = now;

  try {
    await fetch(`${supabaseUrl}/rest/v1/error_alerts?on_conflict=alert_key`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(upsertBody),
    });
  } catch (err) {
    console.warn("notify-error: upsert failed", err);
  }

  if (!shouldNotify) {
    return json(200, { ok: true, deduped: true, occurrenceCount });
  }

  // Fire Klaviyo event.
  const klaviyoKey = Deno.env.get("KLAVIYO_PRIVATE_API_KEY");
  if (!klaviyoKey) {
    return json(200, { ok: true, notified: false, reason: "no_klaviyo_key" });
  }

  try {
    const res = await fetch(`${KLAVIYO_BASE}/events`, {
      method: "POST",
      headers: {
        Authorization: `Klaviyo-API-Key ${klaviyoKey}`,
        revision: KLAVIYO_REVISION,
        accept: "application/vnd.api+json",
        "content-type": "application/vnd.api+json",
      },
      body: JSON.stringify({
        data: {
          type: "event",
          attributes: {
            properties: {
              source,
              message,
              context,
              occurrence_count: occurrenceCount,
              dedupe_window_minutes: COOLDOWN_MIN,
              alert_key: alertKey,
            },
            metric: { data: { type: "metric", attributes: { name: "Internal Error Alert" } } },
            profile: { data: { type: "profile", attributes: { email: ALERT_EMAIL } } },
          },
        },
      }),
    });
    if (!res.ok) {
      console.warn("notify-error: klaviyo event failed", res.status, await res.text());
      return json(200, { ok: true, notified: false });
    }
  } catch (err) {
    console.warn("notify-error: klaviyo threw", err);
    return json(200, { ok: true, notified: false });
  }

  return json(200, { ok: true, notified: true, occurrenceCount });
});
