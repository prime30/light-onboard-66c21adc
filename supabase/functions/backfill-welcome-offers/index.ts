// Admin-only tools for the $25 pro welcome code (PRO25). Only new
// registrations mint (generate-discount at approval). Modes:
//   - "list"       preview customers (no writes). Default: recently activated
//                  customers; cohort "ring_last_30d": customers who got a
//                  WELCOME- ring code in the last 30 days.
//   - "apply"      disabled (410): existing customers are never backfilled
//   - "deactivate" rollback: turn off live PRO25 codes, clear the welcome
//                  metafields, mark the rows deactivated (max 100/call)
//   - "retrack"    send "Pro Account Approved" (offer_kind pro25) for live
//                  PRO25 codes minted before the flow went live; same
//                  unique_id as the approval event, so no double sends
//
// Auth: same admin email + ADMIN_PANEL_PASSWORD (or admin token) as
// admin-toggle-setting.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const FUNCTION_VERSION = "PRO25-B-APPROVED-20261013";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "X-Function-Version": FUNCTION_VERSION,
};

const ADMIN_EMAIL = "alex@dropdeadhair.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SHOPIFY_STORE_DOMAIN =
  Deno.env.get("SHOPIFY_STORE_DOMAIN") ?? "drop-dead-2428.myshopify.com";
const SHOPIFY_ADMIN_API_TOKEN =
  Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN") ?? Deno.env.get("SHOPIFY_ADMIN_API_TOKEN") ?? "";
const SHOPIFY_API_VERSION = "2025-04";
const METAFIELD_NAMESPACE = "custom";
const METAFIELD_KEY_CODE = "welcome_offer_code";
const METAFIELD_KEY_ENDS_AT = "welcome_offer_ends_at";
const METAFIELD_KEY_KIND = "welcome_offer_kind";

const PRO25_PREFIX = "PRO25-";
const RING_PREFIX = "WELCOME-";
const BATCH_MAX = 100;

// Same event, properties and unique_id as generate-discount sends at approval,
// so Klaviyo drops a retrack for anyone who already got it.
const KLAVIYO_REVISION = "2025-04-15";
const KLAVIYO_APPROVED_METRIC = "Pro Account Approved";
const APPROVED_EVENT_ID_PREFIX = "pro-account-approved-";
const DISCOUNT_AMOUNT = 25;
const DISCOUNT_MIN_SUBTOTAL = 100;
const PRO25_URL = "/collections/all";

// Defaults: customers created in the last 14 days who were also touched in
// the last 48h (activation always bumps updated_at). Both windows are
// overridable by request body for ad-hoc backfills.
const DEFAULT_CREATED_DAYS = 14;
const DEFAULT_UPDATED_HOURS = 48;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type ShopifyResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

async function shopifyGraphQL<T>(
  query: string,
  variables: Record<string, unknown>,
  label: string
): Promise<ShopifyResponse<T>> {
  const res = await fetch(
    `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_ADMIN_API_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify ${label} HTTP ${res.status}: ${text}`);
  }
  return (await res.json()) as ShopifyResponse<T>;
}

const LIST_QUERY = `
  query recentActivations($query: String!, $first: Int!, $after: String) {
    customers(first: $first, after: $after, query: $query, sortKey: UPDATED_AT, reverse: true) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        email
        firstName
        lastName
        state
        createdAt
        updatedAt
        tags
        codeMetafield: metafield(namespace: "${METAFIELD_NAMESPACE}", key: "${METAFIELD_KEY_CODE}") {
          value
        }
        endsAtMetafield: metafield(namespace: "${METAFIELD_NAMESPACE}", key: "${METAFIELD_KEY_ENDS_AT}") {
          value
        }
      }
    }
  }
`;

const DEACTIVATE_DISCOUNT_MUTATION = `
  mutation discountCodeDeactivate($id: ID!) {
    discountCodeDeactivate(id: $id) {
      codeDiscountNode { id }
      userErrors { field message code }
    }
  }
`;

const METAFIELDS_DELETE_MUTATION = `
  mutation metafieldsDelete($metafields: [MetafieldIdentifierInput!]!) {
    metafieldsDelete(metafields: $metafields) {
      deletedMetafields { key }
      userErrors { field message }
    }
  }
`;

type CustomerNode = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  state: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  codeMetafield: { value: string } | null;
  endsAtMetafield: { value: string } | null;
};

type RecentActivation = {
  id: string;
  numericId: number;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  updatedAt: string;
  existingCode: string | null;
  existingEndsAt: string | null;
  hasUnexpiredCode: boolean;
};

// Named return type (not ReturnType<typeof fn>) so the function's type is not
// circular with the `out` array declared inside it.
async function listRecentActivations(
  createdDays: number,
  updatedHours: number
): Promise<RecentActivation[]> {
  const createdSinceMs = Date.now() - createdDays * 24 * 60 * 60 * 1000;
  const updatedSinceMs = Date.now() - updatedHours * 60 * 60 * 1000;
  const createdSince = new Date(createdSinceMs).toISOString();
  const updatedSince = new Date(updatedSinceMs).toISOString();
  // Shopify customer search query syntax. state:enabled excludes invited/disabled.
  // Quote ISO timestamps so the colons inside them aren't parsed as field separators.
  const queryStr = `state:enabled AND created_at:>'${createdSince}' AND updated_at:>'${updatedSince}'`;

  const out: RecentActivation[] = [];
  let after: string | null = null;
  const now = Date.now();
  // Hard cap: 5 pages × 100 = 500 customers per backfill run.
  for (let page = 0; page < 5; page++) {
    type CustomersPage = {
      customers: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        nodes: CustomerNode[];
      };
    };
    const res: ShopifyResponse<CustomersPage> = await shopifyGraphQL<CustomersPage>(
      LIST_QUERY,
      { query: queryStr, first: 100, after },
      "recentActivations"
    );

    const nodes = res.data?.customers?.nodes ?? [];
    for (const c of nodes) {
      const numericId = Number(c.id.split("/").pop());
      if (!Number.isFinite(numericId)) continue;
      // Defensive client-side enforcement: Shopify search syntax can be
      // permissive, so re-check the created/updated windows.
      const createdMs = Date.parse(c.createdAt);
      if (!Number.isFinite(createdMs) || createdMs < createdSinceMs) continue;
      const updatedMs = Date.parse(c.updatedAt);
      if (!Number.isFinite(updatedMs) || updatedMs < updatedSinceMs) continue;
      const existingCode = c.codeMetafield?.value ?? null;
      const existingEndsAt = c.endsAtMetafield?.value ?? null;
      const endsAtMs = existingEndsAt ? Date.parse(existingEndsAt) : NaN;
      const hasUnexpiredCode =
        !!existingCode && Number.isFinite(endsAtMs) && endsAtMs > now;
      out.push({
        id: c.id,
        numericId,
        email: c.email,
        firstName: c.firstName,
        lastName: c.lastName,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        existingCode,
        existingEndsAt,
        hasUnexpiredCode,
      });
    }
    if (!res.data?.customers?.pageInfo?.hasNextPage) break;
    after = res.data.customers.pageInfo.endCursor;
    if (!after) break;
  }
  return out;
}

// deno-lint-ignore no-explicit-any
type Db = any;

type CodeRow = {
  id: string;
  code: string;
  email: string | null;
  shopify_customer_id: string | null;
  shopify_discount_id: string | null;
  ends_at: string | null;
  created_at: string;
};

async function fetchAllRows(build: (from: number, to: number) => Promise<{ data: CodeRow[] | null; error: { message: string } | null }>): Promise<CodeRow[]> {
  const out: CodeRow[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}

/**
 * Customers who received a WELCOME- ring code in the last 30 days, one entry
 * per email (latest row wins). Codes minted by the theme's ensure path or by
 * older backfill runs never reached welcome_offer_codes and are not included.
 */
async function listRingCohort(db: Db): Promise<{
  customers: Array<RecentActivation & { hasLivePro25: boolean }>;
  rawRows: number;
}> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const ringRows = await fetchAllRows((from, to) =>
    db
      .from("welcome_offer_codes")
      .select("id, code, email, shopify_customer_id, shopify_discount_id, ends_at, created_at")
      .like("code", `${RING_PREFIX}%`)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .range(from, to)
  );
  const liveRows = await fetchAllRows((from, to) =>
    db
      .from("welcome_offer_codes")
      .select("id, code, email, shopify_customer_id, shopify_discount_id, ends_at, created_at")
      .like("code", `${PRO25_PREFIX}%`)
      .is("deactivated_at", null)
      .range(from, to)
  );
  const liveCustomers = new Set(liveRows.map((r) => r.shopify_customer_id).filter(Boolean));

  const byEmail = new Map<string, CodeRow>();
  for (const r of ringRows) {
    const key = (r.email ?? `id:${r.shopify_customer_id}`).trim().toLowerCase();
    if (!byEmail.has(key)) byEmail.set(key, r);
  }

  const customers: Array<RecentActivation & { hasLivePro25: boolean }> = [];
  for (const r of byEmail.values()) {
    const numericId = Number(r.shopify_customer_id);
    if (!Number.isFinite(numericId) || numericId <= 0) continue;
    customers.push({
      id: `gid://shopify/Customer/${numericId}`,
      numericId,
      email: r.email,
      firstName: null,
      lastName: null,
      createdAt: r.created_at,
      updatedAt: r.created_at,
      existingCode: r.code,
      existingEndsAt: r.ends_at,
      hasUnexpiredCode: !!r.ends_at && Date.parse(r.ends_at) > Date.now(),
      hasLivePro25: liveCustomers.has(String(numericId)),
    });
  }
  return { customers, rawRows: ringRows.length };
}

async function klaviyoRetrack(row: CodeRow, apiKey: string): Promise<boolean> {
  const email = (row.email ?? "").trim().toLowerCase();
  if (!email || !/^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/.test(email) || email.includes("..")) {
    return false;
  }
  if (!row.shopify_customer_id) return false;
  // No `time`: Klaviyo flows ignore back-dated events, so the event is stamped now.
  const res = await fetch("https://a.klaviyo.com/api/events", {
    method: "POST",
    headers: {
      Authorization: `Klaviyo-API-Key ${apiKey}`,
      revision: KLAVIYO_REVISION,
      accept: "application/vnd.api+json",
      "content-type": "application/vnd.api+json",
    },
    body: JSON.stringify({
      data: {
        type: "event",
        attributes: {
          properties: {
            offer_kind: "pro25",
            offer_code: row.code,
            offer_ends_at: row.ends_at,
            offer_amount: DISCOUNT_AMOUNT,
            offer_minimum: DISCOUNT_MIN_SUBTOTAL,
            offer_url: PRO25_URL,
          },
          unique_id: `${APPROVED_EVENT_ID_PREFIX}${row.shopify_customer_id}`,
          metric: { data: { type: "metric", attributes: { name: KLAVIYO_APPROVED_METRIC } } },
          profile: { data: { type: "profile", attributes: { email } } },
        },
      },
    }),
  });
  if (!res.ok) console.error("[backfill] Klaviyo retrack failed", res.status, await res.text());
  return res.ok;
}

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
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  if (!SHOPIFY_ADMIN_API_TOKEN) {
    return json({ success: false, error: "Shopify Admin token not configured" }, 500);
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ success: false, error: "Server misconfigured" }, 500);
  }

  let body: {
    email?: string;
    password?: string;
    token?: string;
    mode?: "list" | "apply" | "deactivate" | "retrack";
    cohort?: "recent_activations" | "ring_last_30d";
    createdDays?: number;
    updatedHours?: number;
    customerIds?: string[]; // numeric strings from the list response
    codes?: string[];
    createdAfter?: string;
    createdBefore?: string;
    offset?: number;
  };
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "Invalid JSON" }, 400);
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const providedToken = typeof body.token === "string" ? body.token : "";
  const adminPassword = Deno.env.get("ADMIN_PANEL_PASSWORD");
  if (!adminPassword) return json({ success: false, error: "Server misconfigured" }, 500);
  const authed = providedToken
    ? await verifyAdminToken(providedToken, adminPassword)
    : email === ADMIN_EMAIL && (body.password ?? "") === adminPassword;
  if (!authed) return json({ success: false, error: "Invalid credentials" }, 401);

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const mode = body.mode ?? "list";

  try {
    if (mode === "list") {
      if (body.cohort === "ring_last_30d") {
        const { customers, rawRows } = await listRingCohort(db);
        return json({
          success: true,
          mode: "list",
          cohort: "ring_last_30d",
          ringRows: rawRows,
          count: customers.length,
          alreadyLive: customers.filter((c) => c.hasLivePro25).length,
          customers,
        });
      }
      const createdDays = Number.isFinite(body.createdDays) && (body.createdDays as number) > 0
        ? Math.min(body.createdDays as number, 90)
        : DEFAULT_CREATED_DAYS;
      const updatedHours = Number.isFinite(body.updatedHours) && (body.updatedHours as number) > 0
        ? Math.min(body.updatedHours as number, 24 * 30)
        : DEFAULT_UPDATED_HOURS;
      const matches = await listRecentActivations(createdDays, updatedHours);
      return json({
        success: true,
        mode: "list",
        createdDays,
        updatedHours,
        count: matches.length,
        customers: matches,
      });
    }

    if (mode === "apply") {
      // Only new registrations mint PRO25 (owner decision, 2026-10-12);
      // generate-discount refuses backfill calls too.
      return json({ success: false, error: "backfill_disabled" }, 410);
    }
    if (mode === "deactivate") {
      const codes = Array.isArray(body.codes) ? body.codes.map((c) => String(c).trim().toUpperCase()) : [];
      if (codes.length === 0 && !body.createdAfter) {
        return json({ success: false, error: "codes or createdAfter is required" }, 400);
      }
      let q = db
        .from("welcome_offer_codes")
        .select("id, code, email, shopify_customer_id, shopify_discount_id, ends_at, created_at")
        .like("code", `${PRO25_PREFIX}%`)
        .is("deactivated_at", null)
        .order("created_at", { ascending: true })
        .limit(BATCH_MAX);
      if (codes.length > 0) q = q.in("code", codes.slice(0, BATCH_MAX));
      if (body.createdAfter) q = q.gte("created_at", body.createdAfter);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as CodeRow[];

      const results: Array<{ code: string; success: boolean; error?: string }> = [];
      for (const row of rows) {
        try {
          if (row.shopify_discount_id) {
            const d = await shopifyGraphQL<{
              discountCodeDeactivate: { userErrors: Array<{ message: string }> };
            }>(DEACTIVATE_DISCOUNT_MUTATION, { id: row.shopify_discount_id }, "discountCodeDeactivate");
            const errs = d.data?.discountCodeDeactivate?.userErrors ?? [];
            if (errs.length > 0 || d.errors?.length) {
              throw new Error(errs.map((e) => e.message).join("; ") || d.errors?.[0]?.message || "deactivate failed");
            }
          }
          if (row.shopify_customer_id) {
            const ownerId = `gid://shopify/Customer/${row.shopify_customer_id}`;
            const m = await shopifyGraphQL<{
              metafieldsDelete: { userErrors: Array<{ message: string }> };
            }>(
              METAFIELDS_DELETE_MUTATION,
              {
                metafields: [METAFIELD_KEY_CODE, METAFIELD_KEY_ENDS_AT, METAFIELD_KEY_KIND].map((key) => ({
                  ownerId,
                  namespace: METAFIELD_NAMESPACE,
                  key,
                })),
              },
              "metafieldsDelete"
            );
            const mErrs = m.data?.metafieldsDelete?.userErrors ?? [];
            if (mErrs.length > 0) console.warn(`[backfill] metafieldsDelete ${row.code}:`, JSON.stringify(mErrs));
          }
          const { error: updError } = await db
            .from("welcome_offer_codes")
            .update({ deactivated_at: new Date().toISOString() })
            .eq("id", row.id);
          if (updError) throw new Error(updError.message);
          results.push({ code: row.code, success: true });
        } catch (err) {
          results.push({ code: row.code, success: false, error: err instanceof Error ? err.message : String(err) });
        }
      }
      const done = results.filter((r) => r.success).length;
      return json({
        success: true,
        mode: "deactivate",
        processed: results.length,
        deactivated: done,
        failed: results.length - done,
        more: rows.length === BATCH_MAX,
        results,
      });
    }

    if (mode === "retrack") {
      if (!body.createdBefore) {
        return json({ success: false, error: "createdBefore is required" }, 400);
      }
      const apiKey = Deno.env.get("KLAVIYO_PRIVATE_API_KEY");
      if (!apiKey) return json({ success: false, error: "Klaviyo key not configured" }, 500);
      const offset = Number.isFinite(body.offset) && (body.offset as number) > 0 ? (body.offset as number) : 0;
      let q = db
        .from("welcome_offer_codes")
        .select("id, code, email, shopify_customer_id, shopify_discount_id, ends_at, created_at")
        .like("code", `${PRO25_PREFIX}%`)
        .is("deactivated_at", null)
        .not("shopify_discount_id", "is", null)
        .gt("ends_at", new Date().toISOString())
        .lt("created_at", body.createdBefore)
        .order("created_at", { ascending: true })
        .range(offset, offset + BATCH_MAX - 1);
      if (body.createdAfter) q = q.gte("created_at", body.createdAfter);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as CodeRow[];
      let sent = 0;
      for (const row of rows) {
        if (await klaviyoRetrack(row, apiKey)) sent++;
      }
      return json({
        success: true,
        mode: "retrack",
        processed: rows.length,
        sent,
        skipped: rows.length - sent,
        nextOffset: rows.length === BATCH_MAX ? offset + BATCH_MAX : null,
      });
    }

    return json({ success: false, error: "Unknown mode" }, 400);
  } catch (err) {
    console.error("[backfill] error:", err);
    return json(
      { success: false, error: err instanceof Error ? err.message : "Unknown error" },
      500
    );
  }
});
