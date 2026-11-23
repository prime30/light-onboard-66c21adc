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
