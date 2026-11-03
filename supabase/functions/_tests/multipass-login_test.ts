import { assert, assertEquals, assertMatch } from "jsr:@std/assert@1";
import { FakeNet, FakeTable, admin, readMultipass, rest, storefront, withFunction } from "./harness.ts";

const EMAIL = "pat@example.com";
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

function setup(storefrontReply: Record<string, unknown> = { data: { customerAccessTokenCreate: { customerAccessToken: { accessToken: "tok", expiresAt: "x" }, customerUserErrors: [] } } }) {
  const net = new FakeNet();
  const attempts = new FakeTable("multipass_attempts").install(net);
  net.on("POST", rest("rpc/record_reset_failure"), null);
  net.on("POST", rest("sign_in_events"), null);
  net.on("POST", storefront, storefrontReply);
  return { net, attempts };
}

const wrongPassword = {
  data: { customerAccessTokenCreate: { customerAccessToken: null, customerUserErrors: [{ code: "UNIDENTIFIED_CUSTOMER", message: "Unidentified customer" }] } },
};

Deno.test("five failed attempts in the hour: 429 with Retry-After, store never asked", async () => {
  const { net, attempts } = setup();
  for (const m of [50, 40, 30, 20, 10]) attempts.insert({ email: EMAIL, ip: "198.51.100.1", outcome: "attempt", created_at: minutesAgo(m) });

  await withFunction("multipass-login", net, async ({ call, settle }) => {
    const res = await call({ email: EMAIL, password: "whatever1" });
    const body = await res.json();
    await settle();
    assertEquals(res.status, 429);
    assertEquals(body.kind, "rate_limited");
    // The oldest of the five (50 minutes ago) leaves the window in about 10 minutes.
    assert(body.retry_after_seconds > 9 * 60 && body.retry_after_seconds <= 10 * 60, String(body.retry_after_seconds));
    assertEquals(res.headers.get("Retry-After"), String(body.retry_after_seconds));
    assertEquals(net.to("POST", storefront).length, 0);
    assertEquals(attempts.rows.at(-1)?.outcome, "capped");
  });
});

Deno.test("retries while capped do not count toward the cap", async () => {
  const { net, attempts } = setup();
  for (const m of [50, 40, 30, 20]) attempts.insert({ email: EMAIL, outcome: "attempt", created_at: minutesAgo(m) });
  for (const m of [9, 8, 7, 6, 5, 4]) attempts.insert({ email: EMAIL, outcome: "capped", created_at: minutesAgo(m) });

  await withFunction("multipass-login", net, async ({ call }) => {
    const res = await call({ email: EMAIL, password: "whatever1" });
    assertEquals(res.status, 200);
    assertEquals(net.to("POST", storefront).length, 1);
  });
});

Deno.test("a successful sign-in is marked ok and stops counting", async () => {
  const { net, attempts } = setup();
  for (const m of [50, 40, 30, 20]) attempts.insert({ email: EMAIL, outcome: "attempt", created_at: minutesAgo(m) });

  await withFunction("multipass-login", net, async ({ call, settle }) => {
    assertEquals((await call({ email: EMAIL, password: "right-pass1" })).status, 200);
    await settle();
    assertEquals(attempts.rows.at(-1)?.outcome, "ok");
    // Four failed attempts plus a success is still under the cap of five.
    assertEquals((await call({ email: EMAIL, password: "right-pass1" })).status, 200);
  });
});

Deno.test("success mints a Multipass link for the normalized email and same-site return_to", async () => {
  const { net } = setup();
  await withFunction("multipass-login", net, async ({ call }) => {
    const res = await call({ email: "Pat@Example.com", password: "right-pass1", return_to: "/collections/all?fbclid=abc" });
    const body = await res.json();
    assertEquals(res.status, 200);
    const customer = await readMultipass(body.data.multipassUrl);
    assertEquals(customer.email, EMAIL);
    assertEquals(customer.return_to, "/collections/all?fbclid=abc");
  });
});

Deno.test("off-site return_to is refused before any password check", async () => {
  const { net } = setup();
  await withFunction("multipass-login", net, async ({ call }) => {
    const res = await call({ email: EMAIL, password: "right-pass1", return_to: "//evil.test/x" });
    assertEquals(res.status, 400);
    assertEquals((await res.json()).kind, "invalid_return_to");
    assertEquals(net.to("POST", storefront).length, 0);
  });
});

Deno.test("wrong password on the sign-in form for an invited account: 403 unactivated", async () => {
  const { net } = setup(wrongPassword);
  net.on("GET", admin("customers/search\\.json"), { customers: [{ id: 1, email: EMAIL, state: "invited" }] });
  await withFunction("multipass-login", net, async ({ call }) => {
    const res = await call({ email: EMAIL, password: "nope12345", context: "sign_in" });
    assertEquals(res.status, 403);
    assertEquals((await res.json()).kind, "unactivated");
  });
});

Deno.test("wrong password for an enabled account: 401, no link", async () => {
  const { net } = setup(wrongPassword);
  net.on("GET", admin("customers/search\\.json"), { customers: [{ id: 1, email: EMAIL, state: "enabled" }] });
  await withFunction("multipass-login", net, async ({ call }) => {
    const res = await call({ email: EMAIL, password: "nope12345", context: "sign_in" });
    const body = await res.json();
    assertEquals(res.status, 401);
    assertEquals(body.kind, "invalid_credentials");
    assertEquals(body.data, undefined);
  });
});

Deno.test("store throttling is a 429 and is recorded as throttled", async () => {
  const { net, attempts } = setup({ errors: [{ message: "Throttled", extensions: { code: "THROTTLED" } }] });
  await withFunction("multipass-login", net, async ({ call, settle }) => {
    const res = await call({ email: EMAIL, password: "right-pass1" });
    await settle();
    assertEquals(res.status, 429);
    assertMatch(JSON.stringify(attempts.rows.map((r) => r.outcome)), /throttled/);
  });
});
