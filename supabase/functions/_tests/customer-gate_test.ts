import { assertEquals } from "jsr:@std/assert@1";
import { FakeNet, admin, reply, withFunction, type Call } from "./harness.ts";

const graphql = admin("graphql\\.json");
const isExact = (c: Call) => String((c.body as { query?: string })?.query).includes("customerByIdentifier");

function world(exact: unknown, search: unknown) {
  const net = new FakeNet();
  net.on("POST", graphql, (c) => (isExact(c) ? exact : search) as Record<string, unknown>);
  return net;
}
const searchHit = { data: { customers: { edges: [{ node: { id: "gid://shopify/Customer/7", email: "pat@example.com", numberOfOrders: "0" } }] } } };
const searchMiss = { data: { customers: { edges: [] } } };

Deno.test("customer-gate: the exact lookup answers found without the search", async () => {
  const net = world({ data: { customer: { id: "gid://shopify/Customer/7", numberOfOrders: "3" } } }, searchMiss);
  await withFunction("customer-gate", net, async ({ call }) => {
    const res = await call({ email: "Pat@Example.com" });
    assertEquals(await res.json(), { eligible: true, numberOfOrders: 3, found: true });
    assertEquals(net.to("POST", graphql).length, 1);
  });
});

Deno.test("customer-gate: an exact miss the search can find is still found", async () => {
  const net = world({ data: { customer: null } }, searchHit);
  await withFunction("customer-gate", net, async ({ call }) => {
    const res = await call({ email: "pat@example.com" });
    assertEquals(await res.json(), { eligible: false, numberOfOrders: 0, found: true });
  });
});

Deno.test("customer-gate: not found only when both lookups agree", async () => {
  const net = world({ data: { customer: null } }, searchMiss);
  await withFunction("customer-gate", net, async ({ call }) => {
    const res = await call({ email: "pat@example.com" });
    assertEquals(await res.json(), { eligible: false, numberOfOrders: 0, found: false });
    assertEquals(net.to("POST", graphql).length, 2);
  });
});

Deno.test("customer-gate: an exact lookup error falls back to the search, and a search error fails open", async () => {
  const net = world(reply.status(500), searchHit);
  await withFunction("customer-gate", net, async ({ call }) => {
    const res = await call({ email: "pat@example.com" });
    assertEquals((await res.json()).found, true);
  });
  const down = world({ errors: [{ message: "boom" }] }, reply.status(502));
  await withFunction("customer-gate", down, async ({ call }) => {
    const res = await call({ email: "pat@example.com" });
    assertEquals(await res.json(), { eligible: true, numberOfOrders: 0, found: false, degraded: true });
  });
});
