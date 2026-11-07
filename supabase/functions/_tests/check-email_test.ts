import { assertEquals } from "jsr:@std/assert@1";
import { FakeNet, FakeTable, SB_URL, admin, fn, withFunction } from "./harness.ts";

const ENV = { HELIUM_PRIVATE_ACCESS_TOKEN: "helium" };

function appliedWorld(earlier: { status: string; step?: string }[]) {
  const net = new FakeNet();
  net.on("*", new RegExp(`^${SB_URL.replace(/[./]/g, "\\$&")}/rest/v1/`), []);
  net.on("POST", new RegExp(`^${SB_URL.replace(/[./]/g, "\\$&")}/functions/v1/`), { success: true, data: {} });
  net.on("GET", /customerfields\.com\/api\/v2\/customers\/search/, { customers: [{ shopify_id: 42 }] });
  net.on("GET", admin("customers/42\\.json"), {
    customer: { id: 42, state: "disabled", orders_count: 0, tags: "Account type: Professional" },
  });
  const table = new FakeTable("registration_submissions").install(net);
  earlier.forEach((r, i) =>
    table.insert({
      email: "Pat@Example.com",
      status: r.status,
      error_log: r.step ? [{ step: r.step, status: "error", message: "earlier attempt" }] : [],
      created_at: `2026-01-01T10:0${i}:00.000Z`,
    }));
  return net;
}

Deno.test("check-email after a refused password: lets the applicant continue, sends no reset email", async () => {
  const net = appliedWorld([{ status: "failed", step: "password_refused" }]);
  await withFunction("check-email", net, async ({ call }) => {
    const res = await call({ email: "pat@example.com" });
    assertEquals(await res.json(), { exists: false, needsActivation: false });
    assertEquals(net.to("POST", fn("recover-password")).length, 0);
  }, ENV);
});

Deno.test("check-email for an applied, disabled customer without a refusal: unchanged (exists, reset email)", async () => {
  const net = appliedWorld([{ status: "failed", step: "phone_in_use" }]);
  await withFunction("check-email", net, async ({ call }) => {
    const res = await call({ email: "pat@example.com" });
    assertEquals(await res.json(), { exists: true, needsActivation: true, inviteSent: true });
    assertEquals(net.to("POST", fn("recover-password")).length, 1);
  }, ENV);
});
