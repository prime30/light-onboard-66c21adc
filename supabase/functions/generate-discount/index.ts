import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SHOPIFY_STORE_DOMAIN = Deno.env.get("SHOPIFY_STORE_DOMAIN") ?? "drop-dead-2428.myshopify.com";
const SHOPIFY_ADMIN_API_TOKEN =
  Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN") ?? Deno.env.get("SHOPIFY_ADMIN_API_TOKEN") ?? "";
const COLOR_RING_PRODUCT_GID = "gid://shopify/Product/9089694302525";
const SHOPIFY_API_VERSION = "2025-04";
const DISCOUNT_PERCENTAGE = 0.30;
const DISCOUNT_DURATION_HOURS = 48;
const METAFIELD_NAMESPACE = "custom";
const METAFIELD_KEY_CODE = "welcome_offer_code";
const METAFIELD_KEY_ENDS_AT = "welcome_offer_ends_at";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function generateUniqueCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars (0/O, 1/I)
  let code = "";
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  for (const byte of array) {
    code += chars[byte % chars.length];
  }
  return `WELCOME-${code}`;
}

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

const CUSTOMER_LOOKUP_QUERY = `
  query customerByEmail($query: String!) {
    customers(first: 1, query: $query) {
      nodes {
        id
        email
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

/**
 * Best-effort: write the welcome offer to the customer's metafields so the
 * storefront announcement bar can render the marquee slide for any logged-in
 * device. Accepts a numeric Shopify customer ID (preferred — no lookup race)
 * or falls back to an email lookup. Failures are logged but never block the
 * user-facing response — the discount code itself is already created and
 * shown on the success screen.
 */
async function writeCustomerMetafields(
  shopifyCustomerId: number | null,
  email: string,
  code: string,
  endsAtIso: string
): Promise<void> {
  try {
    let customerGid: string | null = null;

    if (shopifyCustomerId && Number.isFinite(shopifyCustomerId)) {
      // Preferred path: GID built directly from the numeric ID returned by
      // create-customer. No search index lag, no race.
      customerGid = `gid://shopify/Customer/${shopifyCustomerId}`;
    } else if (email) {
      // Fallback: look up by email. Subject to Shopify search-index lag for
      // brand-new customers, so prefer the explicit ID path above.
      const lookup = await shopifyGraphQL<{
        customers: { nodes: Array<{ id: string; email: string }> };
      }>(
        CUSTOMER_LOOKUP_QUERY,
        { query: `email:${email}` },
        "customerByEmail"
      );
      const customer = lookup.data?.customers?.nodes?.[0];
      if (!customer?.id) {
        console.warn(`[generate-discount] no customer found for email ${email}`);
        return;
      }
      customerGid = customer.id;
    } else {
      console.log("[generate-discount] no customer id or email provided, skipping metafield write");
      return;
    }

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
            value: code,
          },
          {
            ownerId: customerGid,
            namespace: METAFIELD_NAMESPACE,
            key: METAFIELD_KEY_ENDS_AT,
            type: "date_time",
            value: endsAtIso,
          },
        ],
      },
      "metafieldsSet"
    );

    const userErrors = setRes.data?.metafieldsSet?.userErrors ?? [];
    if (userErrors.length > 0) {
      console.warn(
        "[generate-discount] metafieldsSet userErrors:",
        JSON.stringify(userErrors)
      );
    } else {
      console.log(
        `[generate-discount] wrote welcome offer metafields for ${customerGid}`
      );
    }
  } catch (err) {
    // Soft-fail: log but never throw. The discount code is the source of truth.
    console.error("[generate-discount] writeCustomerMetafields failed:", err);
  }
}

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

  if (!SHOPIFY_ADMIN_API_TOKEN) {
    return new Response(
      JSON.stringify({ error: "Shopify Admin API token not configured." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Optional email + shopifyCustomerId — used to write customer metafields
  // for cross-device marquee. shopifyCustomerId (numeric) is preferred since
  // it skips the email-based customer lookup (which can race against
  // Shopify's search index for brand-new customers).
  let email = "";
  let shopifyCustomerId: number | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body?.email === "string") {
      email = body.email.trim().toLowerCase();
    }
    if (typeof body?.shopifyCustomerId === "number" && Number.isFinite(body.shopifyCustomerId)) {
      shopifyCustomerId = body.shopifyCustomerId;
    } else if (typeof body?.shopifyCustomerId === "string") {
      const parsed = Number(body.shopifyCustomerId);
      if (Number.isFinite(parsed)) shopifyCustomerId = parsed;
    }
  } catch {
    // No body / invalid JSON is fine; both fields are optional.
  }

  try {
    const code = generateUniqueCode();
    const now = new Date();
    const endsAt = new Date(now.getTime() + DISCOUNT_DURATION_HOURS * 60 * 60 * 1000);

    const variables = {
      basicCodeDiscount: {
        title: `Welcome Ring Offer — ${code}`,
        code,
        startsAt: now.toISOString(),
        endsAt: endsAt.toISOString(),
        customerSelection: {
          all: true,
        },
        customerGets: {
          value: {
            percentage: DISCOUNT_PERCENTAGE,
          },
          items: {
            products: {
              productsToAdd: [COLOR_RING_PRODUCT_GID],
            },
          },
        },
        usageLimit: 1,
        appliesOncePerCustomer: false,
      },
    };

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
    }>(CREATE_DISCOUNT_MUTATION, variables, "discountCodeBasicCreate");

    const result = createRes.data?.discountCodeBasicCreate;
    if (!result) {
      console.error("Unexpected Shopify response:", JSON.stringify(createRes));
      return new Response(
        JSON.stringify({ error: "Unexpected response from Shopify." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (result.userErrors?.length > 0) {
      const errorMessages = result.userErrors
        .map((e) => `${e.field?.join(".")}: ${e.message}`)
        .join("; ");
      console.error("Shopify discount creation errors:", errorMessages);
      return new Response(
        JSON.stringify({ error: "Failed to create discount.", details: errorMessages }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const codeDiscount = result.codeDiscountNode?.codeDiscount;
    const confirmedCode = codeDiscount?.codes?.nodes?.[0]?.code ?? code;
    const confirmedEndsAt = codeDiscount?.endsAt ?? endsAt.toISOString();

    // Best-effort metafield write — runs sequentially after the discount exists,
    // so any failure here cannot affect the user-facing response.
    await writeCustomerMetafields(email, confirmedCode, confirmedEndsAt);

    return new Response(
      JSON.stringify({
        success: true,
        code: confirmedCode,
        endsAt: confirmedEndsAt,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-discount error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
