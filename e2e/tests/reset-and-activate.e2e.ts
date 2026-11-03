import { test, expect } from "../fixtures";

const EMAIL = "pat@example.com";
const RESET_URL = "https://dropdeadextensions.com/account/reset/123/abc";
const RESET_PATH = `/reset-password?reset_url=${encodeURIComponent(RESET_URL)}&email=${encodeURIComponent(EMAIL)}`;
const ACTIVATE_PATH = `/activate-account?activation_url=${encodeURIComponent(
  "https://dropdeadextensions.com/account/activate/123/abc"
)}&email=${encodeURIComponent(EMAIL)}`;
const MULTIPASS_URL = "https://dropdeadextensions.com/account/login/multipass/test-token";
const TOO_LONG = "a".repeat(41);

test("successful reset signs in with the Multipass link reset-password minted", async ({ harness }) => {
  harness.fake("reset-password", {
    body: { success: true, statusCode: 200, data: { reset: true, email: EMAIL, firstName: "Pat", multipassUrl: MULTIPASS_URL } },
  });
  const app = await harness.open(RESET_PATH);
  await app.locator('input[name="password"]').fill("MyNewPass123");
  await app.locator('input[name="confirmPassword"]').fill("MyNewPass123");
  await app.getByRole("button", { name: "Reset Password" }).click();

  await expect.poll(() => harness.storeNavigations).toContain(MULTIPASS_URL);
  expect(harness.calls("reset-password")[0]).toMatchObject({ resetUrl: RESET_URL, password: "MyNewPass123" });
  // No second password check that the store can refuse right after a reset.
  expect(harness.calls("multipass-login")).toHaveLength(0);
  expect(harness.calls("customer-login")).toHaveLength(0);
  expect(await harness.messageTypes()).not.toContain("USER_LOGIN");
});

test("reset rejects a password over Shopify's 40 character limit before submitting", async ({ harness }) => {
  const app = await harness.open(RESET_PATH);
  await app.locator('input[name="password"]').fill(TOO_LONG);
  await app.locator('input[name="confirmPassword"]').fill(TOO_LONG);
  await app.getByRole("button", { name: "Reset Password" }).click();
  await expect(app.getByText("Password must be 40 characters or fewer").first()).toBeVisible();
  expect(harness.calls("reset-password")).toHaveLength(0);
});

test("reset form saves the new password against the email", async ({ harness }) => {
  const app = await harness.open(RESET_PATH);
  await expect(app.locator('input[name="password"]')).toBeVisible();
  await expect(app.locator('input[autocomplete="username"]')).toHaveValue(EMAIL);
});

test("activation rejects a password over 40 characters before submitting", async ({ harness }) => {
  const app = await harness.open(ACTIVATE_PATH);
  await app.locator('input[name="password"]').fill(TOO_LONG);
  await app.locator('input[name="confirmPassword"]').fill(TOO_LONG);
  await app.getByRole("button", { name: "Activate Account" }).click();
  await expect(app.getByText("Password must be 40 characters or fewer").first()).toBeVisible();
  expect(harness.calls("activate-account")).toHaveLength(0);
});

test("activation form saves the new password against the email", async ({ harness }) => {
  const app = await harness.open(ACTIVATE_PATH);
  await expect(app.locator('input[name="password"]')).toBeVisible();
  await expect(app.locator('input[autocomplete="username"]')).toHaveValue(EMAIL);
});
