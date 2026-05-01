// Smoke test: verifies SHOPIFY_ADMIN_ACCESS_TOKEN has the scopes
// required by all 4 edge functions (create-customer, activate-account,
// customer-gate, generate-discount). Read-only — no records are created.
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const TOKEN = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN")!;
const DOMAIN = Deno.env.get("SHOPIFY_STORE_DOMAIN")!;
const API = "2024-10";

if (!TOKEN || !DOMAIN) {
  throw new Error("Missing SHOPIFY_ADMIN_ACCESS_TOKEN or SHOPIFY_STORE_DOMAIN");
}

const headers = {
  "X-Shopify-Access-Token": TOKEN,
  "Content-Type": "application/json",
};

async function gql(query: string, variables: Record<string, unknown> = {}) {
  const r = await fetch(`https://${DOMAIN}/admin/api/${API}/graphql.json`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });
  const json = await r.json();
  return { status: r.status, json };
}

Deno.test("granted access scopes include required ones", async () => {
  const r = await fetch(
    `https://${DOMAIN}/admin/oauth/access_scopes.json`,
    { headers },
  );
  const json = await r.json();
  console.log("Granted scopes:", json);
  assertEquals(r.status, 200);
  const granted: string[] = (json.access_scopes ?? []).map((s: { handle: string }) => s.handle);
  const required = ["read_customers", "write_customers", "read_discounts", "write_discounts"];
  for (const s of required) {
    if (!granted.includes(s)) {
      throw new Error(`Missing required scope: ${s}. Granted: ${granted.join(", ")}`);
    }
  }
});

Deno.test("read_customers — query customers (customer-gate)", async () => {
  const { status, json } = await gql(
    `query { customers(first: 1) { edges { node { id email } } } }`,
  );
  console.log("read_customers result:", JSON.stringify(json).slice(0, 200));
  assertEquals(status, 200);
  if (json.errors) throw new Error(JSON.stringify(json.errors));
});

Deno.test("read_customers via REST (activate-account / create-customer tag merge)", async () => {
  // Find any one customer ID then GET it via REST as activate-account does
  const { json: list } = await gql(
    `query { customers(first: 1) { edges { node { legacyResourceId } } } }`,
  );
  const legacy = list.data?.customers?.edges?.[0]?.node?.legacyResourceId;
  if (!legacy) {
    console.log("No customers in store — skipping REST GET test");
    return;
  }
  const r = await fetch(
    `https://${DOMAIN}/admin/api/${API}/customers/${legacy}.json`,
    { headers },
  );
  await r.text();
  console.log("REST GET /customers status:", r.status);
  assertEquals(r.status, 200);
});

Deno.test("read_discounts — query discount codes (generate-discount precheck)", async () => {
  const { status, json } = await gql(
    `query { codeDiscountNodes(first: 1) { edges { node { id } } } }`,
  );
  console.log("read_discounts result:", JSON.stringify(json).slice(0, 200));
  assertEquals(status, 200);
  if (json.errors) throw new Error(JSON.stringify(json.errors));
});
