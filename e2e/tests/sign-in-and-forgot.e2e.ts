import { test, expect, type Harness } from "../fixtures";

const EMAIL = "pat@example.com";
const MULTIPASS_URL = "https://dropdeadextensions.com/account/login/multipass/test-token";
const FOUND = { body: { found: true, eligible: true, numberOfOrders: 0 } };
const NOT_FOUND = { body: { found: false, eligible: false, numberOfOrders: 0 } };

async function signIn(harness: Harness, password = "WrongPass123") {
  const app = await harness.open("/login");
  await app.getByPlaceholder("you@example.com").fill(EMAIL);
  await app.locator('input[name="password"]').fill(password);
  await app.getByRole("button", { name: "Log In" }).click();
  return app;
}

async function requestReset(harness: Harness) {
  const app = await harness.open("/login?forgot=1");
  await app.getByPlaceholder("you@example.com").fill(EMAIL);
  await app.getByRole("button", { name: "Send reset link" }).click();
  return app;
}

test.describe("sign in", () => {
  test("correct password opens the Multipass link and never posts the password to the theme", async ({ harness }) => {
    harness.fake("customer-gate", FOUND);
    harness.fake("multipass-login", { body: { success: true, data: { multipassUrl: MULTIPASS_URL } } });
    await signIn(harness, "RightPass123");
    await expect.poll(() => harness.storeNavigations).toContain(MULTIPASS_URL);
    expect(await harness.messageTypes()).not.toContain("USER_LOGIN");
  });

  test("wrong password says so", async ({ harness }) => {
    harness.fake("customer-gate", FOUND);
    harness.fake("multipass-login", { status: 401, body: { success: false, kind: "invalid_credentials" } });
    const app = await signIn(harness);
    await expect(app.getByText("Incorrect password. Please try again or reset your password.")).toBeVisible();
  });

  test("sign-in limit shows how long to wait", async ({ harness }) => {
    harness.fake("customer-gate", FOUND);
    harness.fake("multipass-login", { status: 429, body: { success: false, kind: "rate_limited", retry_after_seconds: 1800 } });
    const app = await signIn(harness);
    await expect(app.getByText(/sign-in is paused\. Try again in (30|31) minutes/)).toBeVisible();
  });

  test("unknown email says there is no account", async ({ harness }) => {
    harness.fake("customer-gate", NOT_FOUND);
    harness.fake("multipass-login", { status: 401, body: { success: false, kind: "invalid_credentials" } });
    const app = await signIn(harness);
    await expect(app.getByText("We couldn't find an account with this email.")).toBeVisible();
  });
});

test.describe("forgot password", () => {
  test("/login?forgot=1 paints the forgot view first, never Welcome back", async ({ harness, page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __sawWelcome: boolean };
      w.__sawWelcome = false;
      const check = () => {
        if (document.querySelector("h1")?.textContent?.includes("Welcome back")) w.__sawWelcome = true;
        requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });
    const app = await harness.open("/login?forgot=1");
    await expect(app.getByRole("heading", { level: 1, name: "Reset password" })).toBeVisible();
    await page.waitForTimeout(500);
    expect(await harness.appFrame().evaluate(() => (window as unknown as { __sawWelcome: boolean }).__sawWelcome)).toBe(false);
  });

  test("sending a link shows Check your email, not the Log In form", async ({ harness }) => {
    harness.fake("customer-gate", FOUND);
    harness.fake("recover-password", { body: { success: true, data: { sent: true } } });
    const app = await requestReset(harness);
    await expect(app.getByRole("heading", { level: 1, name: "Check your email" })).toBeVisible();
    await expect(app.getByText(`We sent a reset link to ${EMAIL}.`)).toBeVisible();
    expect(harness.calls("recover-password")).toEqual([expect.objectContaining({ email: EMAIL, source: "spa_forgot" })]);
  });

  test("inside the cooldown it says the earlier email is on its way", async ({ harness }) => {
    harness.fake("customer-gate", FOUND);
    harness.fake("recover-password", { body: { success: true, data: { sent: false, reason: "recently_sent" } } });
    const app = await requestReset(harness);
    await expect(app.getByText(`We already sent a reset link to ${EMAIL} a few minutes ago.`)).toBeVisible();
  });

  test("unknown email sends nothing", async ({ harness }) => {
    harness.fake("customer-gate", NOT_FOUND);
    const app = await requestReset(harness);
    await expect(app.getByText("We couldn't find an account with this email.")).toBeVisible();
    expect(harness.calls("recover-password")).toHaveLength(0);
  });

  test("when recover-password is down the theme's own recover form is asked to send", async ({ harness }) => {
    harness.fake("customer-gate", FOUND);
    harness.fake("recover-password", { status: 503, body: { success: false, error: "unavailable" } });
    await requestReset(harness);
    await expect.poll(() => harness.messageTypes()).toContain("USER_FORGOT_PASSWORD");
  });
});
