import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const entry = z.object({
  action: z.literal("record"), email: z.string().email().max(254), attemptId: z.string().uuid(),
  outcome: z.enum(["started", "success", "confirmed", "error", "no_account", "timeout"]),
  code: z.enum(["rejected", "rate_limited", "challenge", "store_error", "network", "unactivated", "recently_sent"]).optional(),
  passwordSource: z.enum(["typed", "autofill", "paste", "mixed", "unknown", "new_password"]),
  evidence: z.enum(["unknown", "input_event", "browser_autofill", "new_password"]),
}).strict();
const history = z.object({ action: z.literal("history"), token: z.string().max(2000), email: z.string().email().max(254), offset: z.number().int().min(0).max(100000).default(0) }).strict();
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function verifyAdminToken(token: string, secret: string): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, signature] = parts;
  try {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const bytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
    const expected = btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
    if (expected.length !== signature.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    if (diff !== 0) return false;
    const encoded = payload.replace(/-/g, "+").replace(/_/g, "/");
    const data = JSON.parse(atob(encoded + "===".slice((encoded.length + 3) % 4)));
    return data.email === "alex@dropdeadhair.com" && typeof data.exp === "number" && data.exp >= Math.floor(Date.now() / 1000);
  } catch { return false; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });
  const parsed = z.union([entry, history]).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json(400, { error: "Invalid request" });
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return json(500, { error: "Server configuration error" });
  const db = createClient(url, key, { auth: { persistSession: false } });
  const body = parsed.data;
  const email = body.email.trim().toLowerCase();
  if (body.action === "history") {
    const secret = Deno.env.get("ADMIN_PANEL_PASSWORD");
    if (!secret || !await verifyAdminToken(body.token, secret)) return json(401, { error: "Unauthorized" });
    if (/-test@example\.com$|probe.*@example\.com$/i.test(email)) return json(200, { events: [], hasMore: false });
    const { data, error } = await db.from("sign_in_events").select("id,attempt_id,email,source,outcome,code,password_source,evidence,user_agent,created_at").eq("email", email).order("created_at", { ascending: false }).order("id", { ascending: false }).range(body.offset, body.offset + 50);
    if (error) return json(502, { error: "History unavailable" });
    return json(200, { events: (data ?? []).slice(0, 50), hasMore: (data?.length ?? 0) > 50 });
  }
  // Browser reports cannot prove successful authentication. Keep them separate
  // from server-verified outcomes, and bound anonymous logging per address.
  const { count, error: countError } = await db.from("sign_in_events").select("id", { count: "exact", head: true }).eq("email", email).eq("source", "browser_report").gte("created_at", new Date(Date.now() - 3600000).toISOString());
  if (countError) return json(503, { error: "History unavailable" });
  if ((count ?? 0) >= 100) return json(429, { error: "Too many diagnostic events" });
  const { error } = await db.from("sign_in_events").insert({ email, attempt_id: body.attemptId, source: "browser_report", outcome: body.outcome, code: body.code ?? null, password_source: body.passwordSource, evidence: body.evidence, user_agent: req.headers.get("user-agent")?.slice(0, 400) ?? null });
  return error ? json(502, { error: "History unavailable" }) : json(200, { success: true });
});