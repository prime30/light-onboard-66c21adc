/**
 * customer-gate
 *
 * Server-side eligibility check for the Circle/Syndicate SSO chokepoint.
 * Given an email, looks up the Shopify customer's numberOfOrders via the
 * Admin GraphQL API and returns whether they meet the >=1 order threshold.
 *
 * Fail-open by design: any error (network, 5xx, not found, missing config)
 * returns { eligible: true } so a Shopify outage never locks out legitimate
 * customers. Circle gating naturally re-checks on next login.
 *
 * SHOPIFY_ADMIN_ACCESS_TOKEN is read from env and never returned to the
 * client. Email is the only client-supplied input and is validated.
 */

import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({
  email: z.string().email().max(320).transform((v) => v.trim().toLowerCase()),
});

interface ShopifyCustomerNode {
  id: string;
  email: string | null;
  numberOfOrders: string | number | null;
}

interface ShopifyGraphQLResponse {
  data?: {
    customers?: {
      edges?: Array<{ node: ShopifyCustomerNode }>;
    };
  };
  errors?: Array<{ message: string }>;
}

interface GateResult {
  eligible: boolean;
  numberOfOrders: number;
  found: boolean;
  /** Set when fail-open kicks in. Never blocks. */
  degraded?: boolean;
}

const SHOPIFY_API_VERSION = "2025-01";

async function lookupCustomer(email: string): Promise<GateResult> {
  const token = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN");
  const domain = Deno.env.get("SHOPIFY_STORE_DOMAIN");

  if (!token || !domain) {
    console.error("[customer-gate] Missing SHOPIFY_ADMIN_ACCESS_TOKEN or SHOPIFY_STORE_DOMAIN");
    return { eligible: true, numberOfOrders: 0, found: false, degraded: true };
  }

  // Escape quotes in email for the Shopify search query string.
  const safeEmail = email.replace(/"/g, '\\"');
  const query = `
    query CustomerGate($q: String!) {
      customers(first: 1, query: $q) {
        edges {
          node {
            id
            email
            numberOfOrders
          }
        }
      }
    }
  `;

  try {
    const resp = await fetch(
      `https://${domain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": token,
        },
        body: JSON.stringify({
          query,
          variables: { q: `email:"${safeEmail}"` },
        }),
      }
    );

    if (!resp.ok) {
      console.error(`[customer-gate] Shopify ${resp.status} for ${email}`);
      return { eligible: true, numberOfOrders: 0, found: false, degraded: true };
    }

    const json = (await resp.json()) as ShopifyGraphQLResponse;

    if (json.errors && json.errors.length > 0) {
      console.error("[customer-gate] Shopify GraphQL errors:", json.errors);
      return { eligible: true, numberOfOrders: 0, found: false, degraded: true };
    }

    const node = json.data?.customers?.edges?.[0]?.node;
    if (!node) {
      // Customer not found in Shopify — they cannot have placed any orders.
      // This is NOT a degraded state; gate them.
      return { eligible: false, numberOfOrders: 0, found: false };
    }

    const raw = node.numberOfOrders;
    const count = typeof raw === "string" ? parseInt(raw, 10) : (raw ?? 0);
    const numberOfOrders = Number.isFinite(count) ? count : 0;

    return {
      eligible: numberOfOrders >= 1,
      numberOfOrders,
      found: true,
    };
  } catch (err) {
    console.error("[customer-gate] Network/parse error:", err);
    return { eligible: true, numberOfOrders: 0, found: false, degraded: true };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let parsedBody: unknown;
  try {
    parsedBody = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const parsed = BodySchema.safeParse(parsedBody);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const result = await lookupCustomer(parsed.data.email);

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
