import { assert, assertEquals, assertMatch } from "jsr:@std/assert@1";
import { FakeNet, SB_URL, admin, fn, readMultipass, reply, rest, storefront, withFunction } from "./harness.ts";

const EMAIL = "pat@example.com";
const HELIUM_ENV = { HELIUM_PRIVATE_FORM_ID: "form", HELIUM_PRIVATE_ACCESS_TOKEN: "helium" };
const ACTIVATION_URL = "https://store.test/account/activate/42/activation-token";

type World = {
  /** Existing Shopify customer found by email before the application, if any. */
  existing?: { state: string; numberOfOrders: number; tags?: string[] };
  /** Orders the new customer record shows at activation time. */
  ordersAtActivation?: number;
  /** Customer-fields create answers 422 "email already taken" (another signup won the race). */
  heliumEmailTaken?: boolean;
  /** Whether a storefront sign-in with the typed password works after activation. */
  storeAcceptsPassword: boolean;
  /** Whether the Admin password write succeeds. */
  adminWriteOk?: boolean;
  /** customerActivateByUrl refuses even though the form path would work. */
  apiActivationRefused?: boolean;
};

function signupWorld(w: World) {
  const net = new FakeNet();
  const customer = {
    id: 42,
    email: "Pat@Example.com",
    state: w.existing?.state ?? "disabled",
    orders_count: w.existing?.numberOfOrders ?? w.ordersAtActivation ?? 0,
    tags: (w.existing?.tags ?? []).join(", "),
  };

  net.on("*", new RegExp(`^${SB_URL.replace(/[./]/g, "\\$&")}/rest/v1/`), []);
  net.on("GET", rest("app_settings"), [{ auto_approval_enabled: true, extra_customer_tags: [] }]);
  net.on("POST", new RegExp(`^${SB_URL.replace(/[./]/g, "\\$&")}/functions/v1/`), { success: true, data: {} });
  net.on("POST", fn("customer-login"), () =>
    w.storeAcceptsPassword
      ? { success: true, data: { accessToken: "tok" } }
      : reply.status(401, { success: false, kind: "invalid_credentials" }));
  net.on("POST", fn("recover-password"), { success: true, data: { sent: true } });

  net.on("GET", /customerfields\.com\/api\/v2\/customers\/search/, { customers: [] });
  net.on("PUT", /customerfields\.com\/api\/v2\/customers\/\d+\.json$/, { customer: { id: 900, shopify_id: 42 } });

  const existing = () =>
    w.existing
      ? { legacyResourceId: "42", state: w.existing.state.toUpperCase(), tags: w.existing.tags ?? [], numberOfOrders: String(w.existing.numberOfOrders) }
      : null;
  // Before the race the lookup misses; once the create collides it finds the customer.
  let raceLost = false;
  net.on("POST", admin("graphql\\.json"), () => ({ data: { customer: w.heliumEmailTaken && !raceLost ? null : existing() } }));
  net.on("POST", /customerfields\.com\/api\/v2\/customers$/, () => {
    if (!w.heliumEmailTaken) return { customer: { id: 900, shopify_id: 42 } };
    raceLost = true;
    return reply.status(422, { errors: { email: ["has already been taken"] } });
  });
  net.on("GET", admin("customers/search\\.json"), { customers: [] });

  net.on("GET", admin("customers/42\\.json"), () => ({ customer }));
  net.on("PUT", admin("customers/42\\.json"), ({ body }) => {
    const update = (body as { customer: Record<string, unknown> }).customer;
    if (!update.password) return { customer };
    if (w.adminWriteOk === false) return reply.status(422, { errors: { password: ["is invalid"] } });
    customer.state = "enabled";
    return { customer };
  });
  net.on("POST", admin("customers/42/account_activation_url\\.json"), { account_activation_url: ACTIVATION_URL });
  net.on("POST", new RegExp(`^${ACTIVATION_URL}$`), () => {
    customer.state = "enabled";
    return new Response(null, { status: 302, headers: { location: "https://store.test/account" } });
  });
  net.on("POST", storefront, () => {
    if (w.apiActivationRefused || !w.storeAcceptsPassword) {
      return { data: { customerActivateByUrl: { customerAccessToken: null, customerUserErrors: [{ code: "TOKEN_INVALID", field: null, message: "Invalid activation url" }] } } };
    }
    customer.state = "enabled";
    return { data: { customerActivateByUrl: { customerAccessToken: { accessToken: "tok" }, customerUserErrors: [] } } };
  });
  return net;
}

const application = (extra: Record<string, unknown> = {}) => ({
  formElapsedMs: 5000,
  data: {
    accountType: "professional",
    firstName: "Pat",
    lastName: "Tester",
    email: EMAIL,
    phoneNumber: "6502530000",
    licenseNumber: "L123",
    password: "GoodPass123",
    ...extra,
  },
});

const passwordWrites = (net: FakeNet) =>
  net.to("PUT", admin("customers/42\\.json")).filter((c) => (c.body as { customer: Record<string, unknown> }).customer.password);
const activationPosts = (net: FakeNet) => net.to("POST", new RegExp(`^${ACTIVATION_URL}$`));
const apiActivations = (net: FakeNet) =>
  net.to("POST", storefront).filter((c) => String((c.body as { query?: string }).query).includes("customerActivateByUrl"));
const alerts = (net: FakeNet) => net.to("POST", fn("notify-error")).map((c) => (c.body as { source: string }).source);

Deno.test("activation verified: success, no Multipass fallback, no reset email", async () => {
  const net = signupWorld({ storeAcceptsPassword: true });
  await withFunction("create-customer", net, async ({ call }) => {
    const res = await call(application());
    const body = await res.json();
    assertEquals(res.status, 200, JSON.stringify(body));
    assertEquals(body.data.multipassUrl, undefined);
    assertEquals(net.to("POST", fn("recover-password")).length, 0);
    assertEquals(net.to("POST", fn("generate-discount")).length, 1);
  }, HELIUM_ENV);
});

Deno.test("store refuses the new password after a good Admin write: Multipass fallback and an admin alert", async () => {
  const net = signupWorld({ storeAcceptsPassword: false });
  await withFunction("create-customer", net, async ({ call }) => {
    const res = await call(application({ returnTo: "/collections/new" }));
    const body = await res.json();
    assertEquals(res.status, 200, JSON.stringify(body));
    const customer = await readMultipass(body.data.multipassUrl);
    assertEquals(customer.email, EMAIL);
    assertEquals(passwordWrites(net).length, 1);
    assertEquals(net.to("POST", fn("recover-password")).length, 0);
    assert(alerts(net).includes("create-customer-password-refused"), JSON.stringify(alerts(net)));
    // The approval event still goes out, so the welcome offer is not lost.
    assertEquals(net.to("POST", fn("generate-discount")).length, 1);
  }, HELIUM_ENV);
});

Deno.test("store refuses the password and the Admin write fails: no Multipass, reset email, 502", async () => {
  const net = signupWorld({ storeAcceptsPassword: false, adminWriteOk: false });
  await withFunction("create-customer", net, async ({ call }) => {
    const res = await call(application());
    const body = await res.json();
    assertEquals(res.status, 502);
    assertEquals(body.data?.multipassUrl, undefined);
    assertMatch(body.errorMessage[0], /We've emailed you a link to set it/);
    assertEquals(net.to("POST", fn("recover-password"))[0].body, { email: EMAIL, source: "create_customer_chain_c" });
    assertEquals(net.to("POST", fn("generate-discount")).length, 0);
  }, HELIUM_ENV);
});

Deno.test("orders guard, existing account with orders: 409 before anything is written", async () => {
  const net = signupWorld({ storeAcceptsPassword: true, existing: { state: "disabled", numberOfOrders: 3 } });
  await withFunction("create-customer", net, async ({ call }) => {
    const res = await call(application());
    const body = await res.json();
    assertEquals(res.status, 409);
    assertEquals(body.actions.map((a: { type: string }) => a.type), ["LOGIN", "RESET_PASSWORD"]);
    assertEquals(net.to("POST", /customerfields\.com/).length + net.to("PUT", /customerfields\.com/).length, 0);
    assertEquals(passwordWrites(net).length, 0);
    assertEquals(activationPosts(net).length, 0);
  }, HELIUM_ENV);
});

Deno.test("orders guard, ghost shell without orders: treated as a new applicant and activated", async () => {
  const net = signupWorld({ storeAcceptsPassword: true, existing: { state: "disabled", numberOfOrders: 0 } });
  await withFunction("create-customer", net, async ({ call }) => {
    const res = await call(application());
    assertEquals(res.status, 200, await res.clone().text());
    assertEquals(net.to("PUT", /customerfields\.com\/api\/v2\/customers\/42\.json$/).length, 1);
    assertEquals(apiActivations(net).length, 1);
  }, HELIUM_ENV);
});

Deno.test("activation through customerActivateByUrl: no form POST, no Admin write, no customer-login check", async () => {
  const net = signupWorld({ storeAcceptsPassword: true });
  await withFunction("create-customer", net, async ({ call }) => {
    const res = await call(application());
    const body = await res.json();
    assertEquals(res.status, 200, JSON.stringify(body));
    assertEquals(body.data.multipassUrl, undefined);
    assertEquals(apiActivations(net).length, 1);
    assertEquals((apiActivations(net)[0].body as { variables: unknown }).variables, { url: ACTIVATION_URL, password: "GoodPass123" });
    assertEquals(activationPosts(net).length, 0);
    assertEquals(passwordWrites(net).length, 0);
    assertEquals(net.to("POST", fn("customer-login")).length, 0);
    assertEquals(net.to("POST", fn("generate-discount")).length, 1);
  }, HELIUM_ENV);
});

Deno.test("customerActivateByUrl refuses: falls back to the activation form and still succeeds", async () => {
  const net = signupWorld({ storeAcceptsPassword: true, apiActivationRefused: true });
  await withFunction("create-customer", net, async ({ call }) => {
    const res = await call(application());
    const body = await res.json();
    assertEquals(res.status, 200, JSON.stringify(body));
    assertEquals(apiActivations(net).length, 1);
    assertEquals(activationPosts(net).length, 1);
    assertEquals(net.to("POST", fn("customer-login")).length, 1);
  }, HELIUM_ENV);
});

Deno.test("store refuses everywhere: the audit detail carries Shopify's API reason", async () => {
  const net = signupWorld({ storeAcceptsPassword: false });
  net.on("POST", rest("registration_submissions"), [{ id: "sub-1" }]);
  await withFunction("create-customer", net, async ({ call, settle }) => {
    await call(application());
    await settle();
    const audit = JSON.stringify(net.to("PATCH", rest("registration_submissions")).map((c) => c.body));
    assertMatch(audit, /api HTTP 200 .*TOKEN_INVALID/);
  }, HELIUM_ENV);
});

Deno.test("orders guard, lost the create race to an account with orders: 409, no soft-merge", async () => {
  const net = signupWorld({ storeAcceptsPassword: true, heliumEmailTaken: true, existing: { state: "disabled", numberOfOrders: 2 } });
  await withFunction("create-customer", net, async ({ call }) => {
    const res = await call(application());
    assertEquals(res.status, 409);
    assertEquals(net.to("PUT", /customerfields\.com/).length, 0);
    assertEquals(passwordWrites(net).length, 0);
  }, HELIUM_ENV);
});

Deno.test("orders guard, orders appear by activation time: 409, the typed password is never set", async () => {
  const net = signupWorld({ storeAcceptsPassword: true, ordersAtActivation: 1 });
  await withFunction("create-customer", net, async ({ call }) => {
    const res = await call(application());
    assertEquals(res.status, 409);
    assertEquals(net.to("POST", admin("customers/42/account_activation_url\\.json")).length, 0);
    assertEquals(passwordWrites(net).length, 0);
    assertEquals(net.to("POST", fn("recover-password")).length, 0);
  }, HELIUM_ENV);
});

Deno.test("a 41 character password is refused by validation", async () => {
  const net = signupWorld({ storeAcceptsPassword: true });
  await withFunction("create-customer", net, async ({ call }) => {
    const res = await call(application({ password: "a".repeat(41) }));
    const body = await res.json();
    assertEquals(res.status, 400);
    assertMatch(body.errorMessage.join(" "), /40 characters or fewer/);
    assertEquals(net.to("POST", /customerfields\.com/).length, 0);
  }, HELIUM_ENV);
});
