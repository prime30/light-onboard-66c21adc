// Lightweight phone validity + uniqueness check used by ContactBasicsStep.
// Returns { valid, inUse } based on libphonenumber-js validation and a
// Shopify Admin customers/search lookup. Mirrors check-email shape.
import { parsePhoneNumberFromString } from "npm:libphonenumber-js@1.11.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function toE164(countryCode?: string, phoneNumber?: string): string | undefined {
  if (!phoneNumber) return undefined;
  const cleaned = phoneNumber.replace(/\D/g, "");
  if (!cleaned) return undefined;
  const cc = (countryCode ?? "").trim();
  // Dial code path: "+1" or bare digits like "1".
  if (cc.startsWith("+") || /^\d+$/.test(cc)) {
    const code = cc.startsWith("+") ? cc : `+${cc || "1"}`;
    return `${code}${cleaned}`;
  }
  // ISO region path ("US", "CA"): resolve via libphonenumber.
  if (/^[A-Za-z]{2}$/.test(cc)) {
    try {
      const parsed = parsePhoneNumberFromString(cleaned, cc.toUpperCase() as never);
      if (parsed) return parsed.number;
    } catch {
      /* fall through */
    }
  }
  return `+1${cleaned}`;
}

function ok(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Tiny in-memory LRU cache (per-isolate). Dedupes Shopify search calls
// across users hitting the same E.164 within the TTL window. Cuts upstream
// load during traffic bursts; safe because results are stable for minutes.
const CACHE_TTL_MS = 60_000;
const CACHE_MAX = 500;
const phoneCache = new Map<string, { at: number; inUse: boolean }>();
function cacheGet(key: string): boolean | undefined {
  const hit = phoneCache.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    phoneCache.delete(key);
    return undefined;
  }
  // Refresh recency (LRU): re-insert.
  phoneCache.delete(key);
  phoneCache.set(key, hit);
  return hit.inUse;
}
function cacheSet(key: string, inUse: boolean) {
  if (phoneCache.size >= CACHE_MAX) {
    const oldest = phoneCache.keys().next().value;
    if (oldest) phoneCache.delete(oldest);
  }
  phoneCache.set(key, { at: Date.now(), inUse });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { phoneNumber?: string; phoneCountryCode?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const e164 = toE164(body.phoneCountryCode, body.phoneNumber);
  // Empty / partial number: don't block the UI while user is typing.
  if (!e164) return ok({ valid: false, inUse: false });

  let valid = false;
  try {
    const parsed = parsePhoneNumberFromString(e164);
    valid = !!parsed && parsed.isValid();
  } catch {
    valid = false;
  }

  if (!valid) return ok({ valid: false, inUse: false });

  // Cache hit short-circuits the Shopify search.
  const cached = cacheGet(e164);
  if (cached !== undefined) return ok({ valid: true, inUse: cached });

  // Uniqueness check via Shopify Admin search.
  const shopifyDomain = Deno.env.get("SHOPIFY_STORE_DOMAIN");
  const shopifyAdminToken = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN");
  if (!shopifyDomain || !shopifyAdminToken) {
    // Fail open on infra hiccup — server-side backstop on submit still applies.
    return ok({ valid: true, inUse: false });
  }

  try {
    const res = await fetch(
      `https://${shopifyDomain}/admin/api/2024-10/customers/search.json?query=${encodeURIComponent(
        `phone:${e164}`
      )}`,
      {
        method: "GET",
        headers: {
          "X-Shopify-Access-Token": shopifyAdminToken,
          "Content-Type": "application/json",
        },
      }
    );
    if (!res.ok) {
      console.warn("check-phone: Shopify search failed:", res.status);
      return ok({ valid: true, inUse: false });
    }
    const json = (await res.json()) as { customers?: Array<{ id?: number }> };
    const inUse = Array.isArray(json.customers) && json.customers.length > 0;
    cacheSet(e164, inUse);
    return ok({ valid: true, inUse });
  } catch (e) {
    console.warn("check-phone: search threw:", e);
    return ok({ valid: true, inUse: false });
  }
});
