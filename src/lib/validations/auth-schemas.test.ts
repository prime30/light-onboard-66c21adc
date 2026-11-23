import { describe, expect, it } from "vitest";
import { businessLocationSchema, registrationSchema } from "./auth-schemas";
import { EU_CREDENTIAL_CONFIG, getCredentialConfig, licenseRequiredMessage } from "../../data/qualifications";

const address = { businessName: "Salon", businessAddress: "Hauptstrasse 12", city: "Berlin", zipCode: "10115" };

describe("businessLocationSchema", () => {
  it("accepts a German address with no province", () => {
    expect(businessLocationSchema.safeParse({ ...address, countryCode: "DE" }).success).toBe(true);
  });

  it("still requires a US state", () => {
    const r = businessLocationSchema.safeParse({ ...address, countryCode: "US", zipCode: "10001" });
    expect(r.success).toBe(false);
    expect(r.error?.issues.some((i) => i.path[0] === "provinceCode")).toBe(true);
  });
});

describe("student region", () => {
  const studentBase = {
    accountType: "student" as const,
    firstName: "Pat",
    lastName: "Tester",
    email: "pat@example.com",
    phoneNumber: "6502530000",
    phoneCountryCode: "us",
    socialMediaHandle: "pat",
    password: "GoodPass123",
    confirmPassword: "GoodPass123",
    schoolName: "Academy",
    enrollmentProofFiles: ["https://files.test/a.pdf"],
  };
  const schoolStateIssue = (data: Record<string, unknown>) =>
    registrationSchema.safeParse(data).error?.issues.some((i) => i.path[0] === "schoolState") ?? false;

  it("is required for a US student", () => {
    expect(schoolStateIssue({ ...studentBase, schoolCountryCode: "US" })).toBe(true);
  });

  it("is not required for a German student", () => {
    expect(schoolStateIssue({ ...studentBase, schoolCountryCode: "DE" })).toBe(false);
  });
});

describe("credential config", () => {
  it("uses the EU config for Germany and keeps Ireland's own", () => {
    expect(getCredentialConfig("DE")).toBe(EU_CREDENTIAL_CONFIG);
    expect(getCredentialConfig("IE")).not.toBe(EU_CREDENTIAL_CONFIG);
    expect(getCredentialConfig("US").licenseFieldLabel(false)).toBe("License number*");
  });

  it("asks EU applicants for a VAT, registration or certificate number", () => {
    expect(licenseRequiredMessage("DE")).toBe("Please enter your VAT, registration or certificate number");
    expect(licenseRequiredMessage("US")).toBe("License number is required");
  });
});
