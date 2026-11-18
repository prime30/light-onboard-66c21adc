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

// Inlined email validation (project rule: inline schemas in edge functions,
// no npm:zod import which the Deno check cannot resolve against package.json).
function parseEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 320 ? v : null;
}

// Bumped by every PR that changes this function, so a probe can tell which
// version is live (GitHub merges do not redeploy functions).
const FUNCTION_VERSION = "EXACTLOOKUP-20261118";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "X-Function-Version": FUNCTION_VERSION,
};


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
const EXACT_LOOKUP_API_VERSION = "2026-07";

const toResult = (raw: string | number | null | undefined): GateResult => {
  const count = typeof raw === "string" ? parseInt(raw, 10) : (raw ?? 0);
  const numberOfOrders = Number.isFinite(count) ? count : 0;
  return { eligible: numberOfOrders >= 1, numberOfOrders, found: true };
};

// Exact email lookup. Unlike customers(query:) it does not go through the
// search index, which can miss customers that exist. Returns null when no
// customer has this email; throws on API errors.
async function findByIdentifier(domain: string, token: string, email: string): Promise<GateResult | null> {
  const resp = await fetch(`https://${domain}/admin/api/${EXACT_LOOKUP_API_VERSION}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({
      query:
        "query CustomerGateExact($email: String!) { customer: customerByIdentifier(identifier: { emailAddress: $email }) { id numberOfOrders } }",
      variables: { email },
    }),
  });
  if (!resp.ok) throw new Error(`customerByIdentifier HTTP ${resp.status}`);
  const json = await resp.json();
  if (json?.errors?.length) throw new Error(`customerByIdentifier: ${JSON.stringify(json.errors).slice(0, 200)}`);
  const node = json?.data?.customer;
  return node ? toResult(node.numberOfOrders) : null;
}

async function lookupCustomer(email: string): Promise<GateResult> {
  const token = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN");
  const domain = Deno.env.get("SHOPIFY_STORE_DOMAIN");

  if (!token || !domain) {
    console.error("[customer-gate] Missing SHOPIFY_ADMIN_ACCESS_TOKEN or SHOPIFY_STORE_DOMAIN");
    return { eligible: true, numberOfOrders: 0, found: false, degraded: true };
  }

  try {
    const exact = await findByIdentifier(domain, token, email);
    if (exact) return exact;
  } catch (err) {
    console.warn("[customer-gate] exact lookup failed, using search:", err);
  }

  // The search also runs after an exact miss, so "not found" needs both to agree.
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
      // Customer not found in Shopify - they cannot have placed any orders.
      // This is NOT a degraded state; gate them.
      return { eligible: false, numberOfOrders: 0, found: false };
    }

    return toResult(node.numberOfOrders);
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

  const email = parseEmail((parsedBody as Record<string, unknown>).email);
  if (!email) {
    return new Response(
      JSON.stringify({ error: "A valid email is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const result = await lookupCustomer(email);

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
