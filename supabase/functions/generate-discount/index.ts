import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const FUNCTION_VERSION = "PRO25-GUEST-20261013";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    : null;

const SHOPIFY_STORE_DOMAIN = Deno.env.get("SHOPIFY_STORE_DOMAIN") ?? "drop-dead-2428.myshopify.com";
const SHOPIFY_ADMIN_API_TOKEN =
  Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN") ?? Deno.env.get("SHOPIFY_ADMIN_API_TOKEN") ?? "";
const SHOPIFY_API_VERSION = "2025-04";

// $25 pro welcome code. The SPA mirrors amount/minimum in src/data/welcome-offer.ts
// and the theme mirrors them in its copy: change all three together.
const DISCOUNT_AMOUNT = 25;
const DISCOUNT_MIN_SUBTOTAL = 100;
const DISCOUNT_DURATION_DAYS = 30;
const CODE_PREFIX = "PRO25-";
const OFFER_KIND = "pro25";
const REJECTED_TAG = "review-rejected";
// Set by the theme's guest-offer function on every METHOD50 issue. A customer
// gets METHOD50 or PRO25, never both (theme docs/contracts/pro25-welcome-offer.md).
const METHOD50_TAG = "dd-method50-issued";

const METAFIELD_NAMESPACE = "custom";
const METAFIELD_KEY_CODE = "welcome_offer_code";
const METAFIELD_KEY_ENDS_AT = "welcome_offer_ends_at";
const METAFIELD_KEY_KIND = "welcome_offer_kind";

// Pending rows older than this are treated as abandoned. Must exceed the edge
// function wall clock so a slow live call never has its row reclaimed.
const PENDING_RECLAIM_MS = 10 * 60 * 1000;
const LIVE_INDEX_NAME = "welcome_offer_codes_one_live_pro25";
const CODE_UNIQUE_NAME = "welcome_offer_codes_code_key";

const KLAVIYO_REVISION = "2025-04-15";
const KLAVIYO_BASE = "https://a.klaviyo.com/api";
const KLAVIYO_METRIC = "Pro Welcome Code Issued";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "X-Function-Version": FUNCTION_VERSION,
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generateUniqueCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars (0/O, 1/I)
  let code = "";
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  for (const byte of array) {
    code += chars[byte % chars.length];
  }
  return `${CODE_PREFIX}${code}`;
}

function runInBackground(promise: Promise<unknown>): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const er = (globalThis as any).EdgeRuntime;
  if (er && typeof er.waitUntil === "function") {
    er.waitUntil(promise.catch((e) => console.warn("[generate-discount] background task failed:", e)));
  } else {
    promise.catch((e) => console.warn("[generate-discount] background task failed:", e));
  }
}

function notifyError(message: string, context: Record<string, unknown>): void {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;
  void fetch(`${SUPABASE_URL}/functions/v1/notify-error`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ source: "generate-discount", message, context }),
  }).catch(() => {});
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const CREATE_DISCOUNT_MUTATION = `
  mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
    discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
      codeDiscountNode {
        id
        codeDiscount {
          ... on DiscountCodeBasic {
            codes(first: 1) {
              nodes {
                code
              }
            }
            endsAt
          }
        }
      }
      userErrors {
        field
        message
        code
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

const CUSTOMER_BY_ID_QUERY = `
  query customerById($id: ID!) {
    customer(id: $id) {
      id
      email
      tags
      guestOfferCode: metafield(namespace: "custom", key: "guest_offer_code") { value }
      guestOfferEndsAt: metafield(namespace: "custom", key: "guest_offer_ends_at") { value }
    }
  }
`;

const DISCOUNT_BY_CODE_QUERY = `
  query discountByCode($code: String!) {
    codeDiscountNodeByCode(code: $code) {
      codeDiscount {
        ... on DiscountCodeBasic { status asyncUsageCount endsAt }
      }
    }
  }
`;

const CUSTOMER_LOOKUP_QUERY = `
  query customerByEmail($query: String!) {
    customers(first: 1, query: $query) {
      nodes {
        id
        email
        tags
      }
    }
  }
`;

const METAFIELDS_SET_MUTATION = `
  mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
        namespace
        key
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

type ShopifyResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
  extensions?: {
    cost?: {
      requestedQueryCost?: number;
      actualQueryCost?: number;
      throttleStatus?: {
        currentlyAvailable?: number;
        maximumAvailable?: number;
        restoreRate?: number;
      };
    };
  };
};

type ShopifyUserError = { field: string[]; message: string; code: string };

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

  const json = (await res.json()) as ShopifyResponse<T>;
  if (json.extensions?.cost) {
    console.log(
      `[generate-discount] ${label} cost:`,
      JSON.stringify(json.extensions.cost)
    );
  }
  return json;
}

type ResolvedCustomer = {
  gid: string;
  numericId: string;
  email: string;
  tags: string[];
  guestOfferCode: string | null;
  guestOfferEndsAt: string | null;
};

/**
 * Resolve the Shopify customer BEFORE minting: the code is locked to this
 * customer, so no customer means no code. The numeric ID from create-customer
 * is preferred; the email search can lag behind a brand-new customer, hence
 * the retries on that path only. Tags are always read by GID so the
 * review-rejected check runs on both paths.
 */
async function resolveCustomer(
  shopifyCustomerId: number | null,
  email: string
): Promise<ResolvedCustomer | null> {
  let gid: string | null = null;

  if (shopifyCustomerId && Number.isFinite(shopifyCustomerId)) {
    gid = `gid://shopify/Customer/${shopifyCustomerId}`;
  } else if (email) {
    for (let attempt = 1; attempt <= 3 && !gid; attempt++) {
      const lookup = await shopifyGraphQL<{
        customers: { nodes: Array<{ id: string }> };
      }>(CUSTOMER_LOOKUP_QUERY, { query: `email:${email}` }, `customerByEmail (attempt ${attempt})`);
      gid = lookup.data?.customers?.nodes?.[0]?.id ?? null;
      if (!gid && attempt < 3) await sleep(2000);
    }
  }
  if (!gid) return null;

  const res = await shopifyGraphQL<{
    customer: {
      id: string;
      email: string | null;
      tags: string[];
      guestOfferCode: { value: string } | null;
      guestOfferEndsAt: { value: string } | null;
    } | null;
  }>(CUSTOMER_BY_ID_QUERY, { id: gid }, "customerById");
  const customer = res.data?.customer;
  if (!customer?.id) return null;

  return {
    gid: customer.id,
    numericId: customer.id.split("/").pop() ?? "",
    email: (customer.email ?? email ?? "").trim().toLowerCase(),
    tags: customer.tags ?? [],
    guestOfferCode: customer.guestOfferCode?.value?.trim() || null,
    guestOfferEndsAt: customer.guestOfferEndsAt?.value || null,
  };
}

/**
 * The METHOD50 code the theme's guest popup stored on the customer, returned
 * only while Shopify still says it is active, unused and unexpired (contract:
 * pro25-welcome-offer.md, Guest popup interaction). The metafields are never
 * cleared on redemption, so the discount node is the source of truth.
 */
async function liveGuestOffer(
  customer: ResolvedCustomer
): Promise<{ code: string; endsAt: string | null } | null> {
  const code = customer.guestOfferCode;
  if (!code || !code.toUpperCase().startsWith("METHOD50-")) return null;
  try {
    const res = await shopifyGraphQL<{
      codeDiscountNodeByCode: {
        codeDiscount: { status?: string; asyncUsageCount?: number; endsAt?: string | null } | null;
      } | null;
    }>(DISCOUNT_BY_CODE_QUERY, { code }, "discountByCode");
    const d = res.data?.codeDiscountNodeByCode?.codeDiscount;
    if (!d || d.status !== "ACTIVE" || d.asyncUsageCount !== 0) return null;
    const endsAt = d.endsAt ?? customer.guestOfferEndsAt;
    if (endsAt && new Date(endsAt).getTime() <= Date.now()) return null;
    return { code, endsAt: endsAt ?? null };
  } catch (err) {
    console.warn("[generate-discount] guest offer check failed:", err);
    return null;
  }
}

async function writeCustomerMetafields(
  customerGid: string,
  code: string,
  endsAtIso: string
): Promise<void> {
  try {
    const setRes = await shopifyGraphQL<{
      metafieldsSet: {
        metafields: Array<{ id: string }>;
        userErrors: ShopifyUserError[];
      };
    }>(
      METAFIELDS_SET_MUTATION,
      {
        metafields: [
          {
            ownerId: customerGid,
            namespace: METAFIELD_NAMESPACE,
            key: METAFIELD_KEY_CODE,
            type: "single_line_text_field",
            value: code,
          },
          {
            ownerId: customerGid,
            namespace: METAFIELD_NAMESPACE,
            key: METAFIELD_KEY_ENDS_AT,
            type: "date_time",
            value: endsAtIso,
          },
          {
            ownerId: customerGid,
            namespace: METAFIELD_NAMESPACE,
            key: METAFIELD_KEY_KIND,
            type: "single_line_text_field",
            value: OFFER_KIND,
          },
        ],
      },
      "metafieldsSet"
    );

    const userErrors = setRes.data?.metafieldsSet?.userErrors ?? [];
    if (userErrors.length > 0) {
      console.warn("[generate-discount] metafieldsSet userErrors:", JSON.stringify(userErrors));
    } else {
      console.log(`[generate-discount] wrote welcome offer metafields for ${customerGid}`);
    }
  } catch (err) {
    // Soft-fail: the discount code is the source of truth.
    console.error("[generate-discount] writeCustomerMetafields failed:", err);
  }
}

function klaviyoEmailAcceptable(email: string): boolean {
  const KLAVIYO_EMAIL_RE = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/;
  const localPart = email.split("@")[0] ?? "";
  const domainPart = email.split("@")[1] ?? "";
  return (
    KLAVIYO_EMAIL_RE.test(email) &&
    !email.includes("..") &&
    !localPart.startsWith(".") &&
    !localPart.endsWith(".") &&
    !domainPart.startsWith("-") &&
    !domainPart.endsWith("-")
  );
}

async function klaviyo(path: string, apiKey: string, body: unknown): Promise<Response> {
  return await fetch(`${KLAVIYO_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Klaviyo-API-Key ${apiKey}`,
      revision: KLAVIYO_REVISION,
      accept: "application/vnd.api+json",
      "content-type": "application/vnd.api+json",
    },
    body: JSON.stringify(body),
  });
}

/**
 * Profile properties plus the event that triggers the welcome flow. Klaviyo
 * flows ignore back-dated events, so no `time` is sent (Klaviyo stamps now).
 */
async function syncKlaviyo(email: string, code: string, endsAtIso: string, source: string): Promise<void> {
  const apiKey = Deno.env.get("KLAVIYO_PRIVATE_API_KEY");
  if (!apiKey || !email || !klaviyoEmailAcceptable(email)) return;

  const profileRes = await klaviyo("/profile-import", apiKey, {
    data: {
      type: "profile",
      attributes: {
        email,
        properties: { pro_welcome_code: code, pro_welcome_code_expires_at: endsAtIso },
      },
    },
  });
  if (!profileRes.ok) {
    console.error("[generate-discount] Klaviyo profile-import failed", profileRes.status, await profileRes.text());
  }

  const eventRes = await klaviyo("/events", apiKey, {
    data: {
      type: "event",
      attributes: {
        properties: {
          code,
          expires_at: endsAtIso,
          amount: DISCOUNT_AMOUNT,
          minimum: DISCOUNT_MIN_SUBTOTAL,
          source,
        },
        metric: { data: { type: "metric", attributes: { name: KLAVIYO_METRIC } } },
        profile: { data: { type: "profile", attributes: { email } } },
      },
    },
  });
  if (!eventRes.ok) {
    const text = await eventRes.text();
    console.error("[generate-discount] Klaviyo event failed", eventRes.status, text);
    notifyError(`Klaviyo event ${eventRes.status}`, { email, code, body: text.slice(0, 500) });
  }
}

type LiveRow = {
  id: string;
  code: string;
  shopify_discount_id: string | null;
  ends_at: string | null;
};

// deno-lint-ignore no-explicit-any
type Db = any;

async function selectLiveRow(db: Db, customerId: string): Promise<LiveRow | null> {
  const { data, error } = await db
    .from("welcome_offer_codes")
    .select("id, code, shopify_discount_id, ends_at")
    .eq("shopify_customer_id", customerId)
    .like("code", `${CODE_PREFIX}%`)
    .is("deactivated_at", null)
    .maybeSingle();
  if (error) throw new Error(`live row select failed: ${error.message}`);
  return (data as LiveRow | null) ?? null;
}

/**
 * A live row already exists for this customer. Hand back its code only when
 * Shopify has confirmed it (shopify_discount_id set); a pending row may still
 * fail, so the caller gets 409 rather than a code that might never exist.
 */
async function respondWithExisting(db: Db, customer: ResolvedCustomer): Promise<Response> {
  let row = await selectLiveRow(db, customer.numericId);
  if (row && !row.shopify_discount_id) {
    await sleep(2000);
    row = await selectLiveRow(db, customer.numericId);
  }
  if (!row) return json(409, { error: "pending" });
  if (!row.shopify_discount_id) return json(409, { error: "pending" });

  const endsAt = row.ends_at ?? "";
  if (!endsAt || new Date(endsAt).getTime() <= Date.now()) {
    return json(409, { error: "already_issued" });
  }

  await writeCustomerMetafields(customer.gid, row.code, endsAt);
  return json(200, { success: true, code: row.code, endsAt, kind: OFFER_KIND, existing: true });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  // Internal-only endpoint. Only trusted edge functions running with the
  // service-role key may mint codes.
  const provided = req.headers.get("x-internal-key") ?? "";
  if (!SUPABASE_SERVICE_ROLE_KEY || provided !== SUPABASE_SERVICE_ROLE_KEY) {
    return json(401, { error: "Unauthorized" });
  }

  if (!SHOPIFY_ADMIN_API_TOKEN) {
    return json(500, { error: "Shopify Admin API token not configured." });
  }
  if (!supabaseAdmin) {
    return json(500, { error: "Database client not configured." });
  }
  const db = supabaseAdmin;

  let email = "";
  let shopifyCustomerId: number | null = null;
  let source = "signup";
  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body?.email === "string") {
      email = body.email.trim().toLowerCase();
    }
    if (typeof body?.shopifyCustomerId === "number" && Number.isFinite(body.shopifyCustomerId)) {
      shopifyCustomerId = body.shopifyCustomerId;
    } else if (typeof body?.shopifyCustomerId === "string") {
      const parsed = Number(body.shopifyCustomerId);
      if (Number.isFinite(parsed) && parsed > 0) shopifyCustomerId = parsed;
    }
    if (body?.source === "backfill") source = "backfill";
  } catch {
    // No body / invalid JSON: resolveCustomer returns null below.
  }

  try {
    const customer = await resolveCustomer(shopifyCustomerId, email);
    if (!customer || !customer.numericId) {
      console.warn(`[generate-discount] no customer for id=${shopifyCustomerId} email=${email}`);
      notifyError("no_customer", { email, shopifyCustomerId, source });
      return json(422, { error: "no_customer" });
    }
    if (customer.tags.some((t) => t.trim().toLowerCase() === REJECTED_TAG)) {
      return json(403, { error: "rejected" });
    }
    if (customer.tags.some((t) => t.trim().toLowerCase() === METHOD50_TAG)) {
      return json(403, { error: "method50_issued", guestOffer: await liveGuestOffer(customer) });
    }

    const now = new Date();
    const endsAt = new Date(now.getTime() + DISCOUNT_DURATION_DAYS * 24 * 60 * 60 * 1000);
    const endsAtIso = endsAt.toISOString();

    // Phase 1: reserve the one live row for this customer. The partial unique
    // index makes concurrent or retried calls collide here instead of minting
    // a second code. A plain insert is required: upsert can't target a
    // partial index.
    await db
      .from("welcome_offer_codes")
      .delete()
      .eq("shopify_customer_id", customer.numericId)
      .like("code", `${CODE_PREFIX}%`)
      .is("shopify_discount_id", null)
      .is("deactivated_at", null)
      .lt("created_at", new Date(now.getTime() - PENDING_RECLAIM_MS).toISOString());

    let rowId: string | null = null;
    let code = "";
    for (let attempt = 1; attempt <= 3 && !rowId; attempt++) {
      code = generateUniqueCode();
      const { data, error } = await db
        .from("welcome_offer_codes")
        .insert({
          code,
          email: customer.email || email || null,
          shopify_customer_id: customer.numericId,
          ends_at: endsAtIso,
        })
        .select("id")
        .single();
      if (!error) {
        rowId = (data as { id: string }).id;
        break;
      }
      const msg = error.message ?? "";
      if (error.code === "23505" && msg.includes(LIVE_INDEX_NAME)) {
        // Phase 2: this customer already has a live (or pending) code.
        return await respondWithExisting(db, customer);
      }
      if (error.code === "23505" && msg.includes(CODE_UNIQUE_NAME)) continue;
      throw new Error(`reserve insert failed: ${msg}`);
    }
    if (!rowId) {
      notifyError("code collision exhausted", { customer: customer.numericId });
      return json(422, { error: "Failed to reserve a unique code." });
    }

    // Phase 3: create in Shopify, then confirm the row.
    const deleteReservation = () =>
      db.from("welcome_offer_codes").delete().eq("id", rowId).is("shopify_discount_id", null);

    let confirmedDiscountId: string | null = null;
    let confirmedEndsAt = endsAtIso;
    let lastErrors: ShopifyUserError[] = [];
    for (let attempt = 1; attempt <= 3; attempt++) {
      const createRes = await shopifyGraphQL<{
        discountCodeBasicCreate: {
          codeDiscountNode: {
            id: string;
            codeDiscount: { codes: { nodes: Array<{ code: string }> }; endsAt: string };
          } | null;
          userErrors: ShopifyUserError[];
        };
      }>(
        CREATE_DISCOUNT_MUTATION,
        {
          basicCodeDiscount: {
            title: `Pro Welcome $${DISCOUNT_AMOUNT} - ${code}`,
            code,
            startsAt: now.toISOString(),
            endsAt: endsAtIso,
            customerSelection: { customers: { add: [customer.gid] } },
            customerGets: {
              value: {
                discountAmount: { amount: DISCOUNT_AMOUNT.toFixed(2), appliesOnEachItem: false },
              },
              items: { all: true },
            },
            minimumRequirement: {
              subtotal: { greaterThanOrEqualToSubtotal: DISCOUNT_MIN_SUBTOTAL.toFixed(2) },
            },
            usageLimit: 1,
            appliesOncePerCustomer: true,
            combinesWith: {
              orderDiscounts: true,
              productDiscounts: true,
              shippingDiscounts: true,
            },
          },
        },
        `discountCodeBasicCreate (attempt ${attempt})`
      );

      const result = createRes.data?.discountCodeBasicCreate;
      if (!result) {
        await deleteReservation();
        console.error("[generate-discount] unexpected Shopify response:", JSON.stringify(createRes));
        notifyError("Unexpected Shopify response", { customer: customer.numericId, errors: createRes.errors });
        return json(502, { error: "Unexpected response from Shopify." });
      }

      const userErrors = result.userErrors ?? [];
      const isDuplicate = userErrors.some(
        (e) => e.code === "TAKEN" || /already exists|taken/i.test(e.message ?? "")
      );
      if (userErrors.length > 0 && isDuplicate && attempt < 3) {
        console.warn(`[generate-discount] code collision in Shopify on attempt ${attempt}, retrying`);
        lastErrors = userErrors;
        code = generateUniqueCode();
        const { error: renameError } = await db
          .from("welcome_offer_codes")
          .update({ code })
          .eq("id", rowId);
        if (renameError) throw new Error(`reservation rename failed: ${renameError.message}`);
        continue;
      }
      if (userErrors.length > 0) {
        await deleteReservation();
        const details = userErrors.map((e) => `${e.field?.join(".")}: ${e.message}`).join("; ");
        console.error("[generate-discount] Shopify discount creation errors:", details);
        notifyError("Shopify discount create failed", { customer: customer.numericId, details });
        return json(422, { error: "Failed to create discount.", details });
      }

      const node = result.codeDiscountNode;
      code = node?.codeDiscount?.codes?.nodes?.[0]?.code ?? code;
      confirmedEndsAt = node?.codeDiscount?.endsAt ?? endsAtIso;
      confirmedDiscountId = node?.id ?? null;
      break;
    }

    if (!confirmedDiscountId) {
      await deleteReservation();
      console.error("[generate-discount] exhausted retries:", JSON.stringify(lastErrors));
      notifyError("Shopify code collision exhausted", { customer: customer.numericId });
      return json(422, { error: "Failed to mint unique discount code." });
    }

    const { data: confirmed, error: confirmError } = await db
      .from("welcome_offer_codes")
      .update({ shopify_discount_id: confirmedDiscountId, ends_at: confirmedEndsAt, code })
      .eq("id", rowId)
      .is("shopify_discount_id", null)
      .select("id");
    if (confirmError || !Array.isArray(confirmed) || confirmed.length !== 1) {
      // Our reservation was reclaimed or the write failed: the code we just
      // created has no row, so turn it off and defer to whatever row is live.
      console.error("[generate-discount] confirm write-back failed", confirmError?.message);
      notifyError("confirm write-back failed", {
        customer: customer.numericId,
        discountId: confirmedDiscountId,
        error: confirmError?.message ?? "row count mismatch",
      });
      await shopifyGraphQL(DEACTIVATE_DISCOUNT_MUTATION, { id: confirmedDiscountId }, "discountCodeDeactivate")
        .catch((e) => console.error("[generate-discount] orphan deactivate failed:", e));
      return await respondWithExisting(db, customer);
    }

    await writeCustomerMetafields(customer.gid, code, confirmedEndsAt);
    runInBackground(syncKlaviyo(customer.email || email, code, confirmedEndsAt, source));

    return json(200, { success: true, code, endsAt: confirmedEndsAt, kind: OFFER_KIND });
  } catch (error) {
    console.error("generate-discount error:", error);
    notifyError(error instanceof Error ? error.message : String(error), { email, shopifyCustomerId, source });
    return json(500, { error: "Internal server error." });
  }
});
