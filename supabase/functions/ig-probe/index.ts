import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const { handle = "dropdeadextensions" } = await req.json().catch(() => ({}));
  const names: string[] = Array.isArray(handle) ? handle : [handle];
  const targets: Record<string, string> = Object.fromEntries(names.map((n) => [n, `https://imginn.com/${n}/`]));

  const out: Record<string, unknown> = {};
  await Promise.all(Object.entries(targets).map(async ([k, u]) => {
    try {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), 8000);
      const r = await fetch(u, { signal: c.signal, headers: { "User-Agent": "Mozilla/5.0 Chrome/124 Safari/537.36", "X-IG-App-ID": "936619743392459" } });
      clearTimeout(t);
      const txt = (await r.text()).slice(0, 300);
      out[k] = { status: r.status, txt };
    } catch (e) { out[k] = { err: String(e) }; }
  }));
  return new Response(JSON.stringify(out, null, 1), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
