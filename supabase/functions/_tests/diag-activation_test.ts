import { assertEquals } from "jsr:@std/assert@1";
import { FakeNet, admin, reply, withFunction } from "./harness.ts";

const ADMIN = { email: "alex@dropdeadhair.com", password: "admin-pass" };
const ENV = { ADMIN_PANEL_PASSWORD: "admin-pass" };

function probeWorld(opts: { reject?: string; throwOn?: string } = {}) {
  const net = new FakeNet();
  net.on("POST", admin("customers\\.json"), { customer: { id: 77 } });
  net.on("POST", admin("customers/77/addresses\\.json"), ({ body }) => {
    const code = (body as { address: { country_code: string } }).address.country_code;
    if (code === opts.throwOn) throw new TypeError("network down");
    return code === opts.reject
      ? reply.status(422, { errors: { province: ["is required"] } })
      : { customer_address: { id: 1 } };
  });
  net.on("DELETE", admin("customers/77\\.json"), reply.status(200, {}));
  return net;
}

Deno.test("EU address probe: reports the rejected country and deletes the probe customer", async () => {
  const net = probeWorld({ reject: "IT" });
  await withFunction("diag-activation", net, async ({ call }) => {
    const res = await call({ ...ADMIN, probeEuAddresses: true });
    const body = await res.json();
    assertEquals(res.status, 200);
    assertEquals(res.headers.get("X-Function-Version"), "EU-20261123");
    assertEquals(body.results.length, 27);
    assertEquals(body.rejected, ["IT"]);
    assertEquals(body.deleted, 200);
  }, ENV);
});

Deno.test("EU address probe: the probe customer is deleted even when a step throws", async () => {
  const net = probeWorld({ throwOn: "DE" });
  await withFunction("diag-activation", net, async ({ call }) => {
    await call({ ...ADMIN, probeEuAddresses: true }).catch(() => null);
    assertEquals(net.to("DELETE", admin("customers/77\\.json")).length, 1);
  }, ENV);
});
