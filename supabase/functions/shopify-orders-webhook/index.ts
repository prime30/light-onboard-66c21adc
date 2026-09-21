// Live order webhook from Shopify.
//
// Replaces the page-by-page nightly order crawl: the store tells us the moment
// an order is created, paid, updated, cancelled or refunded, we store that one
// order in `shop_orders`, then match it to a signup (email first, phone as a
// fallback) and recompute that signup's purchase totals.
//
// Topics handled:
//   orders/create, orders/paid, orders/updated, orders/cancelled,
//   orders/delete, refunds/create
//
// Auth: Shopify HMAC (X-Shopify-Hmac-Sha256) over the raw body. No JWT.
//
// Whatever the topic, we re-read the order from the Admin API so refunds,
// cancellations and edited totals are always accurate rather than trusting the
// partial payload each topic happens to send.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-shopify-hmac-sha256, x-shopify-topic, x-shopify-shop-domain",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_API_VERSION = Deno.env.get("SHOPIFY_ADMIN_API_VERSION") ?? "2026-04";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Last 10 digits, so +1 (480) 555-1234 and 4805551234 match each other.
function phoneKey(raw?: string | null): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length < 10) return "";
  return digits.slice(-10);
}

function candidateSecrets(): string[] {
  const names = [
    "SHOPIFY_WEBHOOK_SECRET",
    "SHOPIFY_APP_API_SECRET",
    "SHOPIFY_ACCOUNT_APP_SECRET",
  ];
  const out: string[] = [];
  for (const n of names) {
    const v = Deno.env.get(n);
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}

async function hmacB64(secret: string, raw: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, raw);
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

type ShopifyOrder = {
  id: number;
  order_number?: number | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  created_at: string;
  total_price?: string | null;
  currency?: string | null;
  cancelled_at?: string | null;
  financial_status?: string | null;
  test?: boolean | null;
  customer?: { email?: string | null; phone?: string | null } | null;
  shipping_address?: { phone?: string | null } | null;
  billing_address?: { phone?: string | null } | null;
  refunds?: { transactions?: { amount?: string | null; kind?: string | null; status?: string | null }[] }[] | null;
  total_refunded_set?: { shop_money?: { amount?: string | null } } | null;
};

function refundedTotal(o: ShopifyOrder): number {
  const fromSet = Number(o.total_refunded_set?.shop_money?.amount ?? NaN);
  if (Number.isFinite(fromSet) && fromSet > 0) return fromSet;
  let sum = 0;
  for (const r of o.refunds ?? []) {
    for (const t of r.transactions ?? []) {
      if (t.kind && t.kind !== "refund") continue;
      if (t.status && t.status !== "success") continue;
      const amt = Number(t.amount ?? 0);
      if (Number.isFinite(amt)) sum += amt;
    }
  }
  return Math.round(sum * 100) / 100;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  const raw = new Uint8Array(await req.arrayBuffer());
  const provided = req.headers.get("x-shopify-hmac-sha256") ?? "";
  const topic = req.headers.get("x-shopify-topic") ?? "unknown";

  const secrets = candidateSecrets();
  if (secrets.length === 0) {
    console.error("[shopify-orders-webhook] no webhook secret configured");
    return json({ success: false, error: "Server misconfigured" }, 500);
  }

  let verified = false;
  for (const s of secrets) {
    if (timingSafeEqual(await hmacB64(s, raw), provided)) {
      verified = true;
      break;
    }
  }
  if (!verified) {
    console.warn("[shopify-orders-webhook] HMAC rejected", { topic });
    return json({ success: false, error: "Invalid signature" }, 401);
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    return json({ success: false, error: "Invalid JSON" }, 400);
  }

  // refunds/create sends the refund, not the order.
  const orderId = String(
    (payload.order_id as string | number | undefined) ??
      (payload.id as string | number | undefined) ??
      "",
  ).trim();
  if (!orderId) return json({ success: true, skipped: "no_order_id", topic });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const shopDomain = Deno.env.get("SHOPIFY_STORE_DOMAIN") ?? Deno.env.get("SHOPIFY_SHOP_DOMAIN");
  const adminToken = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN");
  if (!supabaseUrl || !serviceKey) return json({ success: false, error: "Server misconfigured" }, 500);

  const supabase = createClient(supabaseUrl, serviceKey);

  // orders/delete: drop the row and recompute whoever owned it.
  if (topic === "orders/delete") {
    const { data: existing } = await supabase
      .from("shop_orders")
      .select("matched_email")
      .eq("shopify_order_id", orderId)
      .maybeSingle();
    await supabase.from("shop_orders").delete().eq("shopify_order_id", orderId);
    const owner = (existing as { matched_email?: string | null } | null)?.matched_email;
    if (owner) {
      // Recompute by re-running the matcher on any remaining order of theirs.
      const { data: sibling } = await supabase
        .from("shop_orders")
        .select("shopify_order_id")
        .eq("matched_email", owner)
        .limit(1);
      const sibId = (sibling?.[0] as { shopify_order_id?: string } | undefined)?.shopify_order_id;
      if (sibId) {
        await supabase.rpc("match_and_recompute_order", { _order_id: sibId });
      } else {
        await supabase
          .from("registration_leads")
          .update({
            orders_count: 0,
            orders_revenue: 0,
            last_order_at: null,
            orders_synced_at: new Date().toISOString(),
          })
          .eq("email", owner);
      }
    }
    return json({ success: true, topic, deleted: orderId });
  }

  // Re-read the order so refunds, cancellations and edits are accurate.
  let order: ShopifyOrder | null = null;
  if (shopDomain && adminToken) {
    try {
      const res = await fetch(
        `https://${shopDomain}/admin/api/${ADMIN_API_VERSION}/orders/${orderId}.json`,
        { headers: { "X-Shopify-Access-Token": adminToken, Accept: "application/json" } },
      );
      if (res.ok) {
        const body = (await res.json()) as { order?: ShopifyOrder };
        order = body.order ?? null;
      } else {
        console.warn("[shopify-orders-webhook] order fetch failed", res.status, orderId);
      }
    } catch (e) {
      console.warn("[shopify-orders-webhook] order fetch threw", String(e));
    }
  }

  // Fall back to the webhook payload when the Admin read is unavailable.
  if (!order && typeof payload.id !== "undefined") {
    order = payload as unknown as ShopifyOrder;
  }
  if (!order || !order.created_at) {
    return json({ success: true, skipped: "no_order_detail", topic, orderId });
  }

  const email = String(order.email ?? order.customer?.email ?? "").trim().toLowerCase() || null;
  const phone =
    phoneKey(order.phone) ||
    phoneKey(order.customer?.phone) ||
    phoneKey(order.shipping_address?.phone) ||
    phoneKey(order.billing_address?.phone) ||
    null;
  const total = Number(order.total_price ?? 0);

  const row = {
    shopify_order_id: String(order.id),
    order_number: order.name ?? (order.order_number != null ? `#${order.order_number}` : null),
    email,
    phone_last10: phone,
    order_created_at: order.created_at,
    total_price: Number.isFinite(total) ? total : 0,
    refunded_amount: refundedTotal(order),
    currency: order.currency ?? "USD",
    cancelled_at: order.cancelled_at ?? null,
    financial_status: order.financial_status ?? null,
    is_test: !!order.test,
    raw: order as unknown as Record<string, unknown>,
    topic,
    received_at: new Date().toISOString(),
  };

  const { error: upErr } = await supabase
    .from("shop_orders")
    .upsert(row, { onConflict: "shopify_order_id" });
  if (upErr) {
    console.error("[shopify-orders-webhook] upsert failed", upErr);
    return json({ success: false, error: "Store failed" }, 500);
  }

  const { data: matchResult, error: rpcErr } = await supabase.rpc("match_and_recompute_order", {
    _order_id: row.shopify_order_id,
  });
  if (rpcErr) console.error("[shopify-orders-webhook] match failed", rpcErr);

  return json({ success: true, topic, orderId: row.shopify_order_id, match: matchResult ?? null });
});
