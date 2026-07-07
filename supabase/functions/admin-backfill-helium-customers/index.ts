// Paginates the Helium Customer Fields API and upserts every customer's
// signup record into public.helium_customers_backfill. Designed to be
// called repeatedly: each call resumes from `startPage` and stops after
// `maxPages` pages so we never blow past the Supabase edge-function
// timeout. The response tells the client whether to call again with
// `nextPage` until `done: true`.
//
// Auth: same email + ADMIN_PANEL_PASSWORD pattern as the other admin EFs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "alex@dropdeadhair.com";
const PAGE_LIMIT = 250;          // Helium search.json caps appear well above this in practice
const DEFAULT_MAX_PAGES = 12;    // ~3,000 customers per invocation; stays within EF timeout
const HARD_PAGE_CEILING = 5000;  // safety net to prevent runaway loops

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type HeliumCustomer = {
  id: string;
  email?: string | null;
  shopify_id?: number | string | null;
  created_at?: string | null;
  [k: string]: unknown;
};


// --- Admin auth (token or password) -----------------------------------------
async function _hmacB64u(key: string, msg: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}
async function verifyAdminToken(token: string, secret: string): Promise<boolean> {
  if (!token || typeof token !== "string" || !token.includes(".")) return false;
  const [payload, sig] = token.split(".");
  const expected = await _hmacB64u(secret, payload);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return false;
  try {
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const pad = "===".slice((b64.length + 3) % 4);
    const j = JSON.parse(atob(b64 + pad));
    if (j.email !== ADMIN_EMAIL) return false;
    if (typeof j.exp !== "number" || j.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch { return false; }
}
async function issueAdminToken(email: string, secret: string, ttlSeconds = 60 * 60 * 8): Promise<{ token: string; expiresAt: number }> {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const b = btoa(JSON.stringify({ email, exp: expiresAt })).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const s = await _hmacB64u(secret, b);
  return { token: `${b}.${s}`, expiresAt };
}
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  let body: {
    email?: string;
    password?: string;
    startPage?: number;
    maxPages?: number;
    createdAtMin?: string;
    createdAtMax?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "Invalid JSON" }, 400);
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const providedToken = typeof (body as { token?: unknown }).token === "string" ? (body as { token?: string }).token! : "";
  const adminPassword = Deno.env.get("ADMIN_PANEL_PASSWORD");
  if (!adminPassword) return json({ success: false, error: "Server misconfigured" }, 500);
  let _authed = false;
  let _authedEmail = email;
  if (providedToken) {
    _authed = await verifyAdminToken(providedToken, adminPassword);
    if (_authed) _authedEmail = ADMIN_EMAIL;
  } else {
    const password = body.password ?? "";
    _authed = email === ADMIN_EMAIL && password === adminPassword;
  }
  if (!_authed) return json({ success: false, error: "Invalid credentials" }, 401);
  const _adminEmail = _authedEmail;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const heliumToken = Deno.env.get("HELIUM_PRIVATE_ACCESS_TOKEN");
  if (!supabaseUrl || !serviceKey || !heliumToken)
    return json({ success: false, error: "Server misconfigured" }, 500);

  const startPage = Math.max(1, Math.floor(body.startPage ?? 1));
  const maxPages = Math.min(50, Math.max(1, Math.floor(body.maxPages ?? DEFAULT_MAX_PAGES)));
  const createdAtMin = typeof body.createdAtMin === "string" ? body.createdAtMin : null;
  const createdAtMax = typeof body.createdAtMax === "string" ? body.createdAtMax : null;

  const supabase = createClient(supabaseUrl, serviceKey);

  let page = startPage;
  let pagesProcessed = 0;
  let fetched = 0;
  let upserted = 0;
  let skipped = 0;
  let done = false;
  let lastCreatedAt: string | null = null;

  while (pagesProcessed < maxPages && page <= HARD_PAGE_CEILING) {
    const url = new URL("https://app.customerfields.com/api/v2/customers/search.json");
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(PAGE_LIMIT));
    url.searchParams.set("sort_by", "created_at");
    url.searchParams.set("sort_order", "asc");
    if (createdAtMin) url.searchParams.set("created_at_min", createdAtMin);
    if (createdAtMax) url.searchParams.set("created_at_max", createdAtMax);

    let res: Response;
    try {
      res = await fetch(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json", Authorization: `Bearer ${heliumToken}` },
      });
    } catch (err) {
      console.error("Helium fetch failed", err);
      return json(
        { success: false, error: "Helium request failed", page, fetched, upserted },
        502,
      );
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("Helium responded non-200", res.status, text.slice(0, 300));
      return json(
        { success: false, error: `Helium ${res.status}`, page, fetched, upserted },
        502,
      );
    }

    const data = (await res.json()) as { customers?: HeliumCustomer[] };
    const customers = Array.isArray(data.customers) ? data.customers : [];
    fetched += customers.length;
    pagesProcessed += 1;

    if (customers.length === 0) {
      done = true;
      break;
    }

    const rows = customers
      .filter((c) => typeof c.id === "string" && c.created_at)
      .map((c) => {
        const sid =
          typeof c.shopify_id === "number"
            ? c.shopify_id
            : typeof c.shopify_id === "string" && /^\d+$/.test(c.shopify_id)
              ? Number(c.shopify_id)
              : null;
        return {
          helium_id: c.id,
          email: typeof c.email === "string" ? c.email.toLowerCase() : null,
          shopify_id: sid,
          created_at: c.created_at as string,
          raw: c as unknown as Record<string, unknown>,
          fetched_at: new Date().toISOString(),
        };
      });

    skipped += customers.length - rows.length;

    if (rows.length > 0) {
      const { error: upsertError } = await supabase
        .from("helium_customers_backfill")
        .upsert(rows, { onConflict: "helium_id" });
      if (upsertError) {
        console.error("upsert failed", upsertError);
        return json(
          { success: false, error: "Upsert failed", page, fetched, upserted, detail: upsertError.message },
          500,
        );
      }
      upserted += rows.length;
      lastCreatedAt = rows[rows.length - 1].created_at;
    }

    if (customers.length < PAGE_LIMIT) {
      done = true;
      break;
    }

    page += 1;
  }

  return json({
    success: true,
    startPage,
    pagesProcessed,
    fetched,
    upserted,
    skipped,
    lastCreatedAt,
    done,
    nextPage: done ? null : page,
  });
});

