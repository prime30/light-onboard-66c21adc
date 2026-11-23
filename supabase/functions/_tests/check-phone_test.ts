import { assertEquals } from "jsr:@std/assert@1";
import { FakeNet, admin, withFunction } from "./harness.ts";

function phoneWorld() {
  const net = new FakeNet();
  net.on("GET", admin("customers/search\\.json"), { customers: [] });
  return net;
}
const searchedPhone = (net: FakeNet) =>
  decodeURIComponent(net.to("GET", admin("customers/search\\.json"))[0]?.url.searchParams.get("query") ?? "");

Deno.test("dial code +49 with a typed trunk 0: valid, searched as canonical E.164", async () => {
  const net = phoneWorld();
  await withFunction("check-phone", net, async ({ call }) => {
    const res = await call({ phoneCountryCode: "+49", phoneNumber: "0151 23456789", email: "a@example.com" });
    assertEquals((await res.json()).valid, true);
    assertEquals(res.headers.get("X-Function-Version"), "EU-20261123");
    assertEquals(searchedPhone(net), "phone:+4915123456789");
  });
});

Deno.test("ISO de keeps resolving through libphonenumber", async () => {
  const net = phoneWorld();
  await withFunction("check-phone", net, async ({ call }) => {
    const res = await call({ phoneCountryCode: "de", phoneNumber: "0151 23456789", email: "a@example.com" });
    assertEquals((await res.json()).valid, true);
    assertEquals(searchedPhone(net), "phone:+4915123456789");
  });
});

Deno.test("+1 numbers are searched exactly as before", async () => {
  const net = phoneWorld();
  await withFunction("check-phone", net, async ({ call }) => {
    const res = await call({ phoneCountryCode: "+1", phoneNumber: "(650) 253-0000", email: "a@example.com" });
    assertEquals((await res.json()).valid, true);
    assertEquals(searchedPhone(net), "phone:+16502530000");
  });
});
