// Admin-only backfill: find customers who recently became enabled (likely
// activated) and issue them a fresh 48h Color Ring welcome offer. Two modes:
//   - mode: "list"  → preview matches (no writes)
//   - mode: "apply" → issue offers to the provided customer IDs
//
// Auth: same admin email + ADMIN_PANEL_PASSWORD as admin-toggle-setting.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "alex@dropdeadhair.com";
const SHOPIFY_STORE_DOMAIN =
  Deno.env.get("SHOPIFY_STORE_DOMAIN") ?? "drop-dead-2428.myshopify.com";
const SHOPIFY_ADMIN_API_TOKEN =
  Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN") ?? Deno.env.get("SHOPIFY_ADMIN_API_TOKEN") ?? "";
const SHOPIFY_API_VERSION = "2025-04";
const COLOR_RING_PRODUCT_GID = "gid://shopify/Product/9089694302525";
const DISCOUNT_PERCENTAGE = 0.30;
const DISCOUNT_DURATION_HOURS = 48;
const METAFIELD_NAMESPACE = "custom";
const METAFIELD_KEY_CODE = "welcome_offer_code";
const METAFIELD_KEY_ENDS_AT = "welcome_offer_ends_at";

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

function generateUniqueCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  for (const b of bytes) code += chars[b % chars.length];
  return `WELCOME-${code}`;
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

const CREATE_DISCOUNT_MUTATION = `
  mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
    discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
      codeDiscountNode {
        id
        codeDiscount {
          ... on DiscountCodeBasic {
            codes(first: 1) { nodes { code } }
            endsAt
          }
        }
      }
      userErrors { field message code }
    }
  }
`;

const METAFIELDS_SET_MUTATION = `
  mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields { id namespace key }
      userErrors { field message code }
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

async function listRecentActivations(
  createdDays: number,
  updatedHours: number
): Promise<Array<{
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
}>> {
  const createdSinceMs = Date.now() - createdDays * 24 * 60 * 60 * 1000;
  const updatedSinceMs = Date.now() - updatedHours * 60 * 60 * 1000;
  const createdSince = new Date(createdSinceMs).toISOString();
  const updatedSince = new Date(updatedSinceMs).toISOString();
  // Shopify customer search query syntax. state:enabled excludes invited/disabled.
  // Quote ISO timestamps so the colons inside them aren't parsed as field separators.
  // Exclude customers already tagged with the color ring tag.
  const queryStr = `state:enabled AND created_at:>'${createdSince}' AND updated_at:>'${updatedSince}' AND NOT tag:'has color ring'`;

  const out: Awaited<ReturnType<typeof listRecentActivations>> = [];
  let after: string | null = null;
  const now = Date.now();
  // Hard cap: 5 pages × 100 = 500 customers per backfill run.
  for (let page = 0; page < 5; page++) {
    const res = await shopifyGraphQL<{
      customers: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        nodes: CustomerNode[];
      };
    }>(LIST_QUERY, { query: queryStr, first: 100, after }, "recentActivations");

    const nodes = res.data?.customers?.nodes ?? [];
    for (const c of nodes) {
      const numericId = Number(c.id.split("/").pop());
      if (!Number.isFinite(numericId)) continue;
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

async function issueOfferForCustomer(
  customerGid: string
): Promise<
  | { success: true; code: string; endsAt: string }
  | { success: false; error: string }
> {
  try {
    const code = generateUniqueCode();
    const now = new Date();
    const endsAt = new Date(now.getTime() + DISCOUNT_DURATION_HOURS * 60 * 60 * 1000);

    const createRes = await shopifyGraphQL<{
      discountCodeBasicCreate: {
        codeDiscountNode: {
          id: string;
          codeDiscount: {
            codes: { nodes: Array<{ code: string }> };
            endsAt: string;
          };
        } | null;
        userErrors: Array<{ field: string[]; message: string; code: string }>;
      };
    }>(
      CREATE_DISCOUNT_MUTATION,
      {
        basicCodeDiscount: {
          title: `Welcome Ring Offer — ${code}`,
          code,
          startsAt: now.toISOString(),
          endsAt: endsAt.toISOString(),
          customerSelection: { all: true },
          customerGets: {
            value: { percentage: DISCOUNT_PERCENTAGE },
            items: { products: { productsToAdd: [COLOR_RING_PRODUCT_GID] } },
          },
          usageLimit: 1,
          appliesOncePerCustomer: false,
        },
      },
      "discountCodeBasicCreate"
    );

    const userErrors = createRes.data?.discountCodeBasicCreate?.userErrors ?? [];
    if (userErrors.length > 0) {
      return {
        success: false,
        error: userErrors.map((e) => e.message).join("; "),
      };
    }
    const confirmedCode =
      createRes.data?.discountCodeBasicCreate?.codeDiscountNode?.codeDiscount?.codes
        ?.nodes?.[0]?.code ?? code;
    const confirmedEndsAt =
      createRes.data?.discountCodeBasicCreate?.codeDiscountNode?.codeDiscount?.endsAt ??
      endsAt.toISOString();

    const setRes = await shopifyGraphQL<{
      metafieldsSet: {
        metafields: Array<{ id: string }>;
        userErrors: Array<{ field: string[]; message: string; code: string }>;
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
            value: confirmedCode,
          },
          {
            ownerId: customerGid,
            namespace: METAFIELD_NAMESPACE,
            key: METAFIELD_KEY_ENDS_AT,
            type: "date_time",
            value: confirmedEndsAt,
          },
        ],
      },
      "metafieldsSet"
    );

    const mfErrors = setRes.data?.metafieldsSet?.userErrors ?? [];
    if (mfErrors.length > 0) {
      // Discount was created but metafield write failed — still report success
      // for the discount itself; the marquee just won't show on other devices.
      console.warn(
        `[backfill] metafieldsSet errors for ${customerGid}:`,
        JSON.stringify(mfErrors)
      );
    }
    return { success: true, code: confirmedCode, endsAt: confirmedEndsAt };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  if (!SHOPIFY_ADMIN_API_TOKEN) {
    return json({ success: false, error: "Shopify Admin token not configured" }, 500);
  }

  let body: {
    email?: string;
    password?: string;
    mode?: "list" | "apply";
    createdDays?: number;
    updatedHours?: number;
    customerIds?: string[]; // numeric strings from the list response
  };
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "Invalid JSON" }, 400);
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const adminPassword = Deno.env.get("ADMIN_PANEL_PASSWORD");
  if (!adminPassword) {
    return json({ success: false, error: "Server configuration error" }, 500);
  }
  if (email !== ADMIN_EMAIL || password !== adminPassword) {
    return json({ success: false, error: "Invalid credentials" }, 401);
  }

  const mode = body.mode ?? "list";
  const createdDays = Number.isFinite(body.createdDays) && (body.createdDays as number) > 0
    ? Math.min(body.createdDays as number, 90)
    : DEFAULT_CREATED_DAYS;
  const updatedHours = Number.isFinite(body.updatedHours) && (body.updatedHours as number) > 0
    ? Math.min(body.updatedHours as number, 24 * 30)
    : DEFAULT_UPDATED_HOURS;

  try {
    if (mode === "list") {
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
      const ids = Array.isArray(body.customerIds) ? body.customerIds : [];
      if (ids.length === 0) {
        return json({ success: false, error: "customerIds is required for apply mode" }, 400);
      }
      // Cap apply at 200 per call to bound runtime.
      const capped = ids.slice(0, 200);
      const results: Array<{
        customerId: string;
        success: boolean;
        code?: string;
        endsAt?: string;
        error?: string;
      }> = [];

      for (const rawId of capped) {
        const numeric = String(rawId).split("/").pop();
        if (!numeric || !/^\d+$/.test(numeric)) {
          results.push({ customerId: String(rawId), success: false, error: "Invalid customer ID" });
          continue;
        }
        const gid = `gid://shopify/Customer/${numeric}`;
        const r = await issueOfferForCustomer(gid);
        results.push({ customerId: numeric, ...r });
      }

      const created = results.filter((r) => r.success).length;
      return json({
        success: true,
        mode: "apply",
        processed: results.length,
        created,
        failed: results.length - created,
        results,
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
