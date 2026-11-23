import { describe, expect, it } from "vitest";
import { countries, isEuCountry, isSubdivisionOf, requiresSubdivision } from "./locations";
import { countryCodes } from "./country-codes";

describe("EU countries", () => {
  const eu = countries.filter((c) => c.group === "eu").map((c) => c.code);

  it("lists all 27 member states with ISO codes (GR, not EL)", () => {
    expect(eu).toHaveLength(27);
    expect(eu).toContain("GR");
    expect(eu).not.toContain("EL");
    expect(isEuCountry("de")).toBe(true);
    expect(isEuCountry("UK")).toBe(false);
  });

  it("has a phone dial code for every member state", () => {
    for (const code of eu) expect(countryCodes.some((c) => c.country === code)).toBe(true);
  });

  it("requires a province only where the country has subdivisions", () => {
    expect(requiresSubdivision("US")).toBe(true);
    expect(requiresSubdivision("IE")).toBe(true);
    expect(requiresSubdivision("DE")).toBe(false);
    expect(requiresSubdivision("JP")).toBe(false);
    expect(isSubdivisionOf("US", "NY")).toBe(true);
    expect(isSubdivisionOf("DE", "NY")).toBe(false);
  });
});
