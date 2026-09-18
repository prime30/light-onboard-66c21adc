// Nightly purchase sync wrapper.
//
// Scheduled by pg_cron (daily 06:00 UTC). Invokes backfill-first-orders with
// the service role key so recent Shopify orders land on registration_leads
// (orders_count / orders_revenue / last_order_at / first_order_*) without
// anyone having to click "Sync purchases" in the admin panel.
//
// Safe to call by hand: the backfill is idempotent and only ever moves
// first-order fields backwards in time or refreshes lifetime aggregates.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ success: false, error: "Server misconfigured" }, 500);

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/backfill-first-orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ daysBack: 365, trigger: "cron" }),
    });
    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text.slice(0, 500) };
    }
    if (!res.ok) {
      console.error("nightly-orders-sync backfill failed:", res.status, text.slice(0, 300));
      return json({ success: false, error: "Backfill failed", status: res.status, detail: parsed }, 502);
    }
    return json({ success: true, result: parsed });
  } catch (e) {
    console.error("nightly-orders-sync threw:", e);
    return json({ success: false, error: "Sync threw" }, 500);
  }
});
