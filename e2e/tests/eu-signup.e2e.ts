import type { FrameLocator, Page } from "@playwright/test";
import { test, expect, type Harness } from "../fixtures";

const FLAGS = {
  body: {
    autoApprovalEnabled: true,
    businessLocationStepEnabled: true,
    businessOperationStepEnabled: false,
    welcomeOfferStepEnabled: false,
    summaryStepEnabled: false,
  },
};

async function geo(page: Page, countryCode: string | null) {
  await page.route("https://ipwho.is/**", (route) =>
    countryCode
      ? route.fulfill({
          contentType: "application/json",
          headers: { "access-control-allow-origin": "*" },
          body: JSON.stringify({ success: true, country_code: countryCode }),
        })
      : route.abort(),
  );
}

async function openSignup(harness: Harness, page: Page, countryCode: string | null) {
  harness.fake("public-app-flags", FLAGS);
  harness.fake("check-email", { body: { exists: false } });
  harness.fake("check-phone", { body: { valid: true, inUse: false } });
  await geo(page, countryCode);
  return harness.open("/auth");
}

async function pickAccountType(app: FrameLocator, name: RegExp) {
  await app.getByRole("button", { name: "Select an option..." }).click();
  await app.getByRole("option", { name }).click();
}

// The dial picker is the only Radix select on contact basics.
const phoneTrigger = (app: FrameLocator) => app.locator('button[role="combobox"]').first();

test.describe("EU signup", () => {
  test("German professional: +49 seeded, EU credential label and message", async ({ harness, page }) => {
    const app = await openSignup(harness, page, "DE");
    await pickAccountType(app, /Licensed stylist/);
    await expect(phoneTrigger(app)).toHaveText("+49");
    await expect(app.getByText("VAT, trade registration or qualification cert #*")).toBeVisible();
    await expect(app.getByPlaceholder("e.g. DE123456789")).toBeVisible();

    await app.getByLabel("Legal First Name*").fill("Jonas");
    await app.getByLabel("Legal Last Name*").fill("Becker");
    await app.getByLabel("Email*").fill("jonas@stylist-example.de");
    await app.locator('input[name="phoneNumber"]').fill("0151 23456789");
    await app.locator('input[name="socialMediaHandle"]').fill("jonasbecker");
    await app.getByRole("button", { name: /^Continue/ }).click({ force: true });
    await expect(app.getByText("Please enter your VAT, registration or certificate number").first()).toBeVisible();
    await expect(app.getByText("License number is required")).toHaveCount(0);
  });

  test("German salon: Germany has no state field, City and Postcode share a row", async ({ harness, page }) => {
    const app = await openSignup(harness, page, "DE");
    await pickAccountType(app, /Salon owner/);
    await app.getByLabel("Legal First Name*").fill("Lena");
    await app.getByLabel("Legal Last Name*").fill("Schmidt");
    await app.getByLabel("Email*").fill("lena@salon-example.de");
    await app.locator('input[name="phoneNumber"]').fill("0151 23456789");
    await app.locator('input[name="socialMediaHandle"]').fill("lenasalon");
    await app.locator('input[name="licenseNumber"]').fill("DE123456789");
    await app.getByRole("button", { name: /^Continue/ }).click();

    await expect(app.getByRole("heading", { level: 1, name: /Where is your business located/i })).toBeVisible();
    await expect(app.getByText("Postcode*")).toBeVisible();
    await expect(app.getByText(/State\/Province|Select state/)).toHaveCount(0);
    const city = await app.locator('input[name="city"]').boundingBox();
    const zip = await app.locator('input[name="zipCode"]').boundingBox();
    expect(city && zip && Math.abs(city.y - zip.y) < 2).toBe(true);
  });

  test("German student: no region field on the school step", async ({ harness, page }) => {
    const app = await openSignup(harness, page, "DE");
    await pickAccountType(app, /student or apprentice/i);
    await app.getByLabel("Legal First Name*").fill("Mia");
    await app.getByLabel("Legal Last Name*").fill("Weber");
    await app.getByLabel("Email*").fill("mia@student-example.de");
    await app.locator('input[name="phoneNumber"]').fill("0151 23456789");
    await app.locator('input[name="socialMediaHandle"]').fill("miaweber");
    await app.getByRole("button", { name: /^Continue/ }).click();

    await expect(app.getByRole("heading", { level: 1, name: /academy or vocational school/i })).toBeVisible();
    await expect(app.getByText("Region")).toHaveCount(0);
  });

  test("US regression: +1 default, US license label", async ({ harness, page }) => {
    const app = await openSignup(harness, page, "US");
    await pickAccountType(app, /Licensed stylist/);
    await expect(phoneTrigger(app)).toHaveText("+1");
    await expect(app.getByText("License number*")).toBeVisible();
  });
});

test.describe("EU copy", () => {
  async function accountTypeOptions(app: FrameLocator) {
    await app.getByRole("button", { name: "Select an option..." }).click();
    return (await app.getByRole("option").allInnerTexts()).map((t) => t.trim());
  }

  test("German geo: trade wording in the account type list", async ({ harness, page }) => {
    const app = await openSignup(harness, page, "DE");
    const options = await accountTypeOptions(app);
    expect(options).toContain("Professional stylist");
    expect(options).toContain("Student or apprentice");
    expect(options).not.toContain("Licensed stylist");
    await app.getByRole("option", { name: "I am not a stylist" }).click();
    await expect(app.getByRole("heading", { name: "We only sell to trade professionals" })).toBeVisible();
    await expect(app.getByText(/sold to trade professionals/)).toBeVisible();
  });

  test("US geo: licensed stylist wording unchanged", async ({ harness, page }) => {
    const app = await openSignup(harness, page, "US");
    const options = await accountTypeOptions(app);
    expect(options).toContain("Licensed stylist");
    expect(options).toContain("Cosmetology student or apprentice");
  });

  // Shortest auto-approved path to the success screen: contact basics, password, review.
  const SHORT_FLOW = {
    body: {
      autoApprovalEnabled: true,
      welcomeOfferEnabled: true,
      welcomeOfferStepEnabled: false,
      businessLocationStepEnabled: false,
      businessOperationStepEnabled: false,
      orderVolumeStepEnabled: false,
      preferredMethodStepEnabled: false,
      referralStepEnabled: false,
      summaryStepEnabled: false,
    },
  };

  async function reachSuccess(harness: Harness, page: Page, geoCountry: string, phone: string) {
    harness.fake("public-app-flags", SHORT_FLOW);
    harness.fake("check-email", { body: { exists: false } });
    harness.fake("check-phone", { body: { valid: true, inUse: false } });
    harness.fake("create-customer", {
      body: { success: true, data: { welcomeOffer: { code: "PRO25-TEST1", endsAt: "2026-12-23T12:00:00Z" } } },
    });
    await geo(page, geoCountry);
    const app = await harness.open("/auth");
    await app.getByRole("button", { name: "Select an option..." }).click();
    await app.getByRole("option").first().click();
    await app.getByLabel("Legal First Name*").fill("Lena");
    await app.getByLabel("Legal Last Name*").fill("Schmidt");
    await app.getByLabel("Email*").fill(`lena-${geoCountry.toLowerCase()}@stylist-example.com`);
    await app.locator('input[name="phoneNumber"]').fill(phone);
    await app.locator('input[name="socialMediaHandle"]').fill("lenahair");
    await app.locator('input[name="licenseNumber"]').fill("DE123456789");
    await app.getByRole("button", { name: /^Continue/ }).click();
    await app.locator("#password").fill("Sturdy-Pass-2026");
    await app.locator("#confirmPassword").fill("Sturdy-Pass-2026");
    await app.getByRole("button", { name: /^(Continue|Submit application|Create account)/ }).last().click();
    await expect(app.getByText("PRO25-TEST1")).toBeVisible({ timeout: 20_000 });
    return app;
  }

  test("German applicant: welcome credit in US$ with a day-first date", async ({ harness, page }) => {
    const app = await reachSuccess(harness, page, "DE", "0151 23456789");
    await expect(app.getByText("US$25 off your next order of US$100+")).toBeVisible();
    await expect(app.getByText(/23 December 2026/)).toBeVisible();
  });

  test("US applicant: welcome credit copy unchanged", async ({ harness, page }) => {
    const app = await reachSuccess(harness, page, "US", "(512) 555-0142");
    await expect(app.getByText("$25 off your next order of $100+", { exact: true })).toBeVisible();
    await expect(app.getByText(/December 23, 2026/)).toBeVisible();
  });
});
