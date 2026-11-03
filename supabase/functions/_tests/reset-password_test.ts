import { assertEquals, assertMatch } from "jsr:@std/assert@1";
import { FakeNet, admin, fn, readMultipass, reply, rest, storefront, withFunction } from "./harness.ts";

const RESET_URL = "https://store.test/account/reset/42/abc123";
const HINT = "pat@example.com";

type ResetReply = Record<string, unknown>;
const accepted = (email: string | null): ResetReply => ({
  data: {
    customerResetByUrl: {
      customer: { id: "gid://shopify/Customer/42", email, firstName: "Pat" },
      customerAccessToken: { accessToken: "tok", expiresAt: "x" },
      customerUserErrors: [],
    },
  },
});
const rejected = (code: string, message: string): ResetReply => ({
  data: { customerResetByUrl: { customer: null, customerAccessToken: null, customerUserErrors: [{ code, message }] } },
});

function setup(resetReply: ResetReply, recoverReply: Response | Record<string, unknown> = { success: true, data: { sent: true } }) {
  const net = new FakeNet();
  net.on("POST", rest("rpc/record_reset_failure"), null);
  net.on("POST", storefront, ({ body }) => {
    const query = String((body as { query?: string }).query);
    if (query.includes("customerResetByUrl")) return resetReply;
    return { data: { customerAccessTokenCreate: { customerAccessToken: { accessToken: "signin", expiresAt: "x" }, customerUserErrors: [] } } };
  });
  net.on("POST", fn("recover-password"), recoverReply);
  return net;
}

const signInChecks = (net: FakeNet) =>
  net.to("POST", storefront).filter((c) => String((c.body as { query?: string }).query).includes("customerAccessTokenCreate"));

Deno.test("accepted reset: Multipass for Shopify's email, not the client hint, and no password re-check", async () => {
  const net = setup(accepted("Real.Owner@Example.com"));
  await withFunction("reset-password", net, async ({ call }) => {
    const res = await call({ resetUrl: RESET_URL, password: "NewPass123", emailHint: "someone-else@example.com", returnTo: "/account" });
    const body = await res.json();
    assertEquals(res.status, 200);
    const customer = await readMultipass(body.data.multipassUrl);
    assertEquals(customer.email, "real.owner@example.com");
    assertEquals(customer.return_to, "/account");
    assertEquals(signInChecks(net).length, 0);
  });
});

Deno.test("accepted reset with off-site returnTo: link minted without return_to", async () => {
  const net = setup(accepted(HINT));
  await withFunction("reset-password", net, async ({ call }) => {
    const body = await (await call({ resetUrl: RESET_URL, password: "NewPass123", returnTo: "//evil.test" })).json();
    assertEquals((await readMultipass(body.data.multipassUrl)).return_to, undefined);
  });
});

Deno.test("Storefront returns no email: Admin lookup supplies it, the hint is never used", async () => {
  const net = setup(accepted(null));
  net.on("GET", admin("customers/42\\.json"), { customer: { email: "owner@example.com", first_name: "Pat" } });
  await withFunction("reset-password", net, async ({ call }) => {
    const body = await (await call({ resetUrl: RESET_URL, password: "NewPass123", emailHint: HINT })).json();
    assertEquals((await readMultipass(body.data.multipassUrl)).email, "owner@example.com");
  });
});

Deno.test("Storefront and Admin both lack an email: success without a Multipass link", async () => {
  const net = setup(accepted(null));
  net.on("GET", admin("customers/42\\.json"), reply.status(404));
  net.on("POST", admin("graphql\\.json"), { data: { customer: null } });
  await withFunction("reset-password", net, async ({ call }) => {
    const body = await (await call({ resetUrl: RESET_URL, password: "NewPass123", emailHint: HINT })).json();
    assertEquals(body.success, true);
    assertEquals(body.data.multipassUrl, null);
  });
});

for (const [label, recoverReply, freshLink] of [
  ["sent", { success: true, data: { sent: true } }, "sent"],
  ["recently_sent", { success: true, data: { sent: false, reason: "recently_sent" } }, "recently_sent"],
  ["recover-password down", reply.status(503, { success: false }), "none"],
] as const) {
  Deno.test(`used link, self-heal ${label}: freshLink ${freshLink}`, async () => {
    const net = setup(rejected("TOKEN_INVALID", "Invalid reset url"), recoverReply);
    await withFunction("reset-password", net, async ({ call }) => {
      const res = await call({ resetUrl: RESET_URL, password: "NewPass123", emailHint: "Pat@Example.com" });
      const body = await res.json();
      assertEquals(res.status, 400);
      assertEquals(body.freshLink, freshLink);
      assertMatch(body.errorMessage[0], /^This reset link is invalid or has already been used\./);
      assertEquals(net.to("POST", fn("recover-password"))[0].body, { email: HINT, source: "reset_self_heal" });
    });
  });
}

Deno.test("expired link: expired message with a fresh link", async () => {
  const net = setup(rejected("EXPIRED", "Reset URL has expired"));
  await withFunction("reset-password", net, async ({ call }) => {
    const body = await (await call({ resetUrl: RESET_URL, password: "NewPass123", emailHint: HINT })).json();
    assertMatch(body.errorMessage[0], /^This reset link has expired\. We just emailed you a fresh link\./);
    assertEquals(body.freshLink, "sent");
  });
});

Deno.test("dead link without an email hint: no email can be sent, freshLink none", async () => {
  const net = setup(rejected("TOKEN_INVALID", "Invalid reset url"));
  await withFunction("reset-password", net, async ({ call }) => {
    const body = await (await call({ resetUrl: RESET_URL, password: "NewPass123" })).json();
    assertEquals(body.freshLink, "none");
    assertEquals(net.to("POST", fn("recover-password")).length, 0);
  });
});

Deno.test("password rule rejection keeps the link alive: no fresh email", async () => {
  const net = setup(rejected("TOO_SHORT", "Password is too short (minimum is 5 characters)"));
  await withFunction("reset-password", net, async ({ call }) => {
    const body = await (await call({ resetUrl: RESET_URL, password: "NewPass123", emailHint: HINT })).json();
    assertEquals(body.errorMessage, ["Password must be at least 8 characters."]);
    assertEquals(net.to("POST", fn("recover-password")).length, 0);
  });
});

Deno.test("same password as before: signs them in with it", async () => {
  const net = setup(rejected("PASSWORD_PREVIOUSLY_USED", "Password must be different from the current password"));
  await withFunction("reset-password", net, async ({ call }) => {
    const body = await (await call({ resetUrl: RESET_URL, password: "OldPass123", emailHint: HINT })).json();
    assertEquals(body.data.samePassword, true);
    assertEquals(body.data.accessToken, "signin");
    assertEquals(net.to("POST", fn("recover-password")).length, 0);
  });
});
