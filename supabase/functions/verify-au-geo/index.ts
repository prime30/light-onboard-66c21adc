// Verify that a registrant selecting Australia is actually located in AU.
// Strategy: server-side IP geolocation first. If that fails, accept a
// browser Geolocation fix (lat/lng) that falls within AU bounds. On success
// we mint a short-lived HMAC token the client sends back at submit time.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const HMAC_SECRET = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// Loose AU bounding box incl. Tasmania + external islands.
const AU_BOUNDS = { latMin: -44.5, latMax: -9.0, lngMin: 112.0, lngMax: 154.5 };

function b64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(HMAC_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return b64url(new Uint8Array(sig));
}

async function mintToken(email: string, method: "ip" | "gps"): Promise<{ token: string; exp: number }> {
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = `AU|${email.toLowerCase()}|${method}|${exp}`;
  const sig = await sign(payload);
  const token = b64url(new TextEncoder().encode(payload)) + "." + sig;
  return { token, exp };
}

function extractIp(req: Request): string | null {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() ?? null;
  const real = req.headers.get("x-real-ip");
  return real ? real.trim() : null;
}

async function lookupCountryByIp(ip: string): Promise<string | null> {
  try {
    const r = await fetch(`https://ipwho.is/${ip}?fields=country_code,success`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { success?: boolean; country_code?: string };
    if (!j.success) return null;
    return (j.country_code || "").toUpperCase() || null;
  } catch {
    return null;
  }
}

function inAuBounds(lat: number, lng: number): boolean {
  return (
    lat >= AU_BOUNDS.latMin &&
    lat <= AU_BOUNDS.latMax &&
    lng >= AU_BOUNDS.lngMin &&
    lng <= AU_BOUNDS.lngMax
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { email?: string; lat?: number; lng?: number } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    /* empty body allowed for pure IP check */
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(
      JSON.stringify({ verified: false, reason: "invalid_email" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const ip = extractIp(req);
  const ipCountry = ip ? await lookupCountryByIp(ip) : null;

  if (ipCountry === "AU") {
    const { token, exp } = await mintToken(email, "ip");
    return new Response(
      JSON.stringify({ verified: true, method: "ip", token, expiresAt: exp }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // IP says non-AU (or unknown). Accept a GPS fix inside the AU bounding box.
  if (typeof body.lat === "number" && typeof body.lng === "number") {
    if (inAuBounds(body.lat, body.lng)) {
      const { token, exp } = await mintToken(email, "gps");
      return new Response(
        JSON.stringify({ verified: true, method: "gps", token, expiresAt: exp }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({ verified: false, reason: "gps_outside_au", ipCountry }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({ verified: false, reason: "needs_gps", ipCountry }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

// Exported so create-customer can validate the token without re-fetching geo.
export async function validateAuGeoToken(
  token: string,
  email: string,
): Promise<{ ok: boolean; method?: string; reason?: string }> {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return { ok: false, reason: "malformed" };
  }
  const [payloadB64, sig] = token.split(".");
  try {
    const payloadBytes = Uint8Array.from(
      atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0),
    );
    const payload = new TextDecoder().decode(payloadBytes);
    const expected = await sign(payload);
    if (expected !== sig) return { ok: false, reason: "bad_signature" };
    const parts = payload.split("|");
    if (parts.length !== 4 || parts[0] !== "AU") return { ok: false, reason: "bad_payload" };
    const [, tokenEmail, method, expStr] = parts;
    if (tokenEmail !== email.toLowerCase()) return { ok: false, reason: "email_mismatch" };
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || Date.now() > exp) return { ok: false, reason: "expired" };
    return { ok: true, method };
  } catch {
    return { ok: false, reason: "decode_error" };
  }
}
