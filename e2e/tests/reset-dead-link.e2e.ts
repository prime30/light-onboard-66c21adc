import { test, expect, screenButtons, screenOf, type Harness } from "../fixtures";

const RESET_PATH = `/reset-password?reset_url=${encodeURIComponent(
  "https://dropdeadextensions.com/account/reset/123/abc"
)}&email=${encodeURIComponent("pat@example.com")}`;

const LINK_STATES = {
  expired: { message: "This reset link has expired.", heading: { none: "Link Expired", sent: "Link Expired", recently_sent: "Check your email" } },
  invalid: { message: "This reset link is invalid or has already been used.", heading: { none: "Invalid link", sent: "Check your email", recently_sent: "Check your email" } },
} as const;

// Once a fresh link is in the inbox, closing is the next step (PR #55).
// Inside the resend cooldown another request only hits the cooldown, so the
// link is hidden (PR #56). With no email sent, requesting one stays first.
const EXPECTED_BUTTONS = {
  none: ["Request a new link", "Close"],
  sent: ["Close", "Request a new link"],
  recently_sent: ["Close"],
} as const;

async function submitDeadLink(harness: Harness, state: keyof typeof LINK_STATES, freshLink: keyof typeof EXPECTED_BUTTONS) {
  harness.fake("reset-password", {
    status: 400,
    body: { success: false, statusCode: 400, freshLink, errorMessage: [LINK_STATES[state].message] },
  });
  const app = await harness.open(RESET_PATH);
  await app.locator('input[name="password"]').fill("MyNewPass123");
  await app.locator('input[name="confirmPassword"]').fill("MyNewPass123");
  await app.getByRole("button", { name: "Reset Password" }).click();
  return app;
}

for (const state of Object.keys(LINK_STATES) as (keyof typeof LINK_STATES)[]) {
  for (const freshLink of Object.keys(EXPECTED_BUTTONS) as (keyof typeof EXPECTED_BUTTONS)[]) {
    test(`${state} link, freshLink ${freshLink}: buttons`, async ({ harness }) => {
      const app = await submitDeadLink(harness, state, freshLink);
      const buttons = await screenButtons(app, LINK_STATES[state].heading[freshLink]);
      expect(buttons).toEqual(EXPECTED_BUTTONS[freshLink]);
    });
  }
}

test("Close after a fresh link was sent tells the theme to close", async ({ harness }) => {
  const app = await submitDeadLink(harness, "invalid", "sent");
  await screenOf(app, "Check your email").getByRole("button", { name: "Close", exact: true }).click();
  await expect.poll(() => harness.messageTypes()).toContain("CLOSE_IFRAME");
});

test("Request a new link opens the forgot-password view", async ({ harness }) => {
  const app = await submitDeadLink(harness, "invalid", "none");
  await screenOf(app, "Invalid link").getByRole("button", { name: "Request a new link" }).click();
  await expect(app.getByRole("heading", { level: 1, name: "Reset password" })).toBeVisible();
  await expect(app.getByRole("button", { name: "Send reset link" })).toBeVisible();
});
