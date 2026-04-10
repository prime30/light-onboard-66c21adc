import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SHOPIFY_STORE_DOMAIN = Deno.env.get("SHOPIFY_STORE_DOMAIN") ?? "drop-dead-2428.myshopify.com";
const SHOPIFY_ADMIN_API_TOKEN = Deno.env.get("SHOPIFY_ADMIN_API_TOKEN") ?? "";
const COLOR_RING_PRODUCT_GID = "gid://shopify/Product/9089694302525";
const SHOPIFY_API_VERSION = "2025-04";
const DISCOUNT_PERCENTAGE = 0.30;
const DISCOUNT_DURATION_HOURS = 48;

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

    const shopifyResponse = await fetch(
      `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": SHOPIFY_ADMIN_API_TOKEN,
        },
        body: JSON.stringify({
          query: CREATE_DISCOUNT_MUTATION,
          variables,
        }),
      }
    );

    if (!shopifyResponse.ok) {
      const text = await shopifyResponse.text();
      console.error("Shopify API error:", shopifyResponse.status, text);
      return new Response(
        JSON.stringify({ error: "Shopify API request failed.", details: text }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const json = await shopifyResponse.json();
    const result = json?.data?.discountCodeBasicCreate;

    if (!result) {
      console.error("Unexpected Shopify response:", JSON.stringify(json));
      return new Response(
        JSON.stringify({ error: "Unexpected response from Shopify." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (result.userErrors?.length > 0) {
      const errorMessages = result.userErrors.map((e: { field: string[]; message: string }) =>
        `${e.field?.join(".")}: ${e.message}`
      ).join("; ");
      console.error("Shopify discount creation errors:", errorMessages);
      return new Response(
        JSON.stringify({ error: "Failed to create discount.", details: errorMessages }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const codeDiscount = result.codeDiscountNode?.codeDiscount;
    const confirmedCode = codeDiscount?.codes?.nodes?.[0]?.code ?? code;
    const confirmedEndsAt = codeDiscount?.endsAt ?? endsAt.toISOString();

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
