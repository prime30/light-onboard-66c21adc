// Lightweight email-existence check used by ContactBasicsStep.
// Returns { exists: boolean } based on a Customer Fields lookup.
// Inlined cors + helpers per project convention.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    // Don't error — just say "not exists" so the client UX doesn't block on
    // mid-typing values. Schema validation handles the real format error.
    return new Response(JSON.stringify({ exists: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("HELIUM_PRIVATE_ACCESS_TOKEN");
  if (!apiKey) {
    console.error("HELIUM_PRIVATE_ACCESS_TOKEN missing");
    // Fail open — don't block registration on infra hiccup.
    return new Response(JSON.stringify({ exists: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = `https://app.customerfields.com/api/v2/customers/search.json?page=1&limit=1&sort_by=updated_at&sort_order=desc&email=${encodeURIComponent(email)}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (!res.ok) {
      console.error("check-email search failed:", res.status);
      return new Response(JSON.stringify({ exists: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = (await res.json()) as { customers?: unknown[] };
    const exists = Array.isArray(data.customers) && data.customers.length > 0;
    return new Response(JSON.stringify({ exists }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("check-email error:", err);
    return new Response(JSON.stringify({ exists: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
