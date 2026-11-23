import { assertEquals } from "jsr:@std/assert@1";
import { FakeNet, withFunction } from "./harness.ts";

const place = (country: [string, string], route: string, number: string) => ({
  formattedAddress: "",
  addressComponents: [
    { types: ["street_number"], longText: number, shortText: number },
    { types: ["route"], longText: route, shortText: route },
    { types: ["locality"], longText: "City", shortText: "City" },
    { types: ["country"], longText: country[0], shortText: country[1] },
    { types: ["postal_code"], longText: "12345", shortText: "12345" },
  ],
});

async function details(body: unknown) {
  const net = new FakeNet();
  net.on("GET", /places\.googleapis\.com\/v1\/places\//, body as Record<string, unknown>);
  let out: Record<string, string> = {};
  await withFunction("address-details", net, async ({ call }) => {
    const res = await call({ placeId: "p1" });
    assertEquals(res.headers.get("X-Function-Version"), "EU-20261123");
    out = (await res.json()).details;
  }, { GOOGLE_PLACES_API_KEY: "key" });
  return out;
}

Deno.test("Germany: countryCode DE and the street before the number", async () => {
  const d = await details(place(["Germany", "DE"], "Hauptstrasse", "12"));
  assertEquals(d.countryCode, "DE");
  assertEquals(d.streetAddress, "Hauptstrasse 12");
});

Deno.test("United States keeps number then street", async () => {
  const d = await details(place(["United States", "US"], "Main St", "12"));
  assertEquals(d.countryCode, "US");
  assertEquals(d.streetAddress, "12 Main St");
});

Deno.test("France keeps number then street", async () => {
  const d = await details(place(["France", "FR"], "Rue de Rivoli", "12"));
  assertEquals(d.streetAddress, "12 Rue de Rivoli");
});
