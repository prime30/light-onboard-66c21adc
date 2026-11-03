import { assertEquals } from "jsr:@std/assert@1";
import { FakeNet, SERVICE_KEY, admin, reply, rest, storefront, withFunction, type Call } from "./harness.ts";

const EMAIL = "pat@example.com";
const CLAIMED_AT = "2026-11-03T06:00:00.000Z";
const recovered = { data: { customerRecover: { customerUserErrors: [] } } };

function setup(opts: {
  customer?: Record<string, unknown> | null;
  claim?: string | null;
  recover?: Record<string, unknown>;
} = {}) {
  const net = new FakeNet();
  const customer = opts.customer === undefined ? { id: 42, email: EMAIL, state: "enabled" } : opts.customer;
  net.on("GET", admin("customers/search\\.json"), { customers: customer ? [customer] : [] });
  net.on("POST", rest("rpc/claim_reset_send"), () => reply.json(opts.claim === undefined ? CLAIMED_AT : opts.claim));
  net.on("POST", rest("rpc/release_reset_send"), null);
  net.on("POST", storefront, opts.recover ?? recovered);
  return net;
}

const claimBody = (net: FakeNet) => net.to("POST", rest("rpc/claim_reset_send")).map((c: Call) => c.body as Record<string, unknown>);

Deno.test("inside the cooldown: recently_sent, Shopify never asked to send", async () => {
  const net = setup({ claim: null });
  await withFunction("recover-password", net, async ({ call }) => {
    const res = await call({ email: EMAIL, source: "spa_forgot" });
    const body = await res.json();
    assertEquals(res.status, 200);
    assertEquals(body.data, { sent: false, reason: "recently_sent" });
    assertEquals(net.to("POST", storefront).length, 0);
    assertEquals(claimBody(net)[0], { _email: EMAIL, _cooldown_seconds: 600, _source: "spa_forgot" });
  });
});

Deno.test("sent: the claim is kept so a second request inside the window is refused", async () => {
  const net = setup();
  await withFunction("recover-password", net, async ({ call }) => {
    const res = await call({ email: "Pat@Example.com" });
    assertEquals((await res.json()).data, { sent: true, channel: "recover" });
    assertEquals(net.to("POST", rest("rpc/release_reset_send")).length, 0);
  });
});

Deno.test("Shopify userErrors: nothing was sent, so the claim is released", async () => {
  const net = setup({ recover: { data: { customerRecover: { customerUserErrors: [{ code: "UNIDENTIFIED_CUSTOMER", message: "x" }] } } } });
  await withFunction("recover-password", net, async ({ call }) => {
    await call({ email: EMAIL });
    const releases = net.to("POST", rest("rpc/release_reset_send"));
    assertEquals(releases.map((c) => c.body), [{ _email: EMAIL, _claimed_at: CLAIMED_AT }]);
  });
});

Deno.test("Shopify's own reset limit: 429 and the claim is released", async () => {
  const net = setup({ recover: { errors: [{ message: "Resetting password limit exceeded. Please try again later.", extensions: { code: "THROTTLED" } }] } });
  await withFunction("recover-password", net, async ({ call }) => {
    const res = await call({ email: EMAIL });
    assertEquals(res.status, 429);
    assertEquals(net.to("POST", rest("rpc/release_reset_send")).length, 1);
  });
});

Deno.test("unknown email: no claim (it would lock out a later real account), recover still runs", async () => {
  const net = setup({ customer: null });
  await withFunction("recover-password", net, async ({ call }) => {
    const res = await call({ email: EMAIL });
    assertEquals((await res.json()).data.sent, true);
    assertEquals(claimBody(net).length, 0);
    assertEquals(net.to("POST", storefront).length, 1);
  });
});

Deno.test("kill switch RESET_EMAIL_COOLDOWN_SECONDS=0: no claim", async () => {
  const net = setup({ claim: null });
  await withFunction("recover-password", net, async ({ call }) => {
    const res = await call({ email: EMAIL });
    assertEquals((await res.json()).data.sent, true);
    assertEquals(claimBody(net).length, 0);
  }, { RESET_EMAIL_COOLDOWN_SECONDS: "0" });
});

Deno.test("force skips the cooldown only for the service role", async () => {
  const net = setup();
  await withFunction("recover-password", net, async ({ call }) => {
    await call({ email: EMAIL, force: true, source: "admin_stranded" }, { headers: { Authorization: `Bearer ${SERVICE_KEY}` } });
    await call({ email: EMAIL, force: true }, { headers: { Authorization: "Bearer anon-key" } });
    assertEquals(claimBody(net).map((b) => b._cooldown_seconds), [0, 600]);
  });
});

Deno.test("invited account is enabled and verified before the reset email", async () => {
  const net = setup({ customer: { id: 42, email: EMAIL, state: "invited" } });
  net.on("PUT", admin("customers/42\\.json"), { customer: { id: 42 } });
  net.on("GET", admin("customers/42\\.json"), { customer: { id: 42, state: "enabled" } });
  await withFunction("recover-password", net, async ({ call }) => {
    const res = await call({ email: EMAIL });
    assertEquals((await res.json()).data.sent, true);
    const put = net.to("PUT", admin("customers/42\\.json"))[0].body as { customer: Record<string, unknown> };
    assertEquals(put.customer.send_email_welcome, false);
    assertEquals(net.to("POST", storefront).length, 1);
  });
});

Deno.test("invited account that does not become enabled: 502, no email, claim released", async () => {
  const net = setup({ customer: { id: 42, email: EMAIL, state: "invited" } });
  net.on("PUT", admin("customers/42\\.json"), { customer: { id: 42 } });
  net.on("GET", admin("customers/42\\.json"), { customer: { id: 42, state: "invited" } });
  await withFunction("recover-password", net, async ({ call }) => {
    const res = await call({ email: EMAIL });
    assertEquals(res.status, 502);
    assertEquals(net.to("POST", storefront).length, 0);
    assertEquals(net.to("POST", rest("rpc/release_reset_send")).length, 1);
  });
});
