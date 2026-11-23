import { describe, expect, it } from "vitest";
import { toE164 } from "./phone-e164";

const e164 = (phone: string, iso: string) => {
  const r = toE164(phone, iso);
  return "value" in r ? r.value : r.reason;
};

describe("toE164 for EU numbers", () => {
  it("drops the German and Austrian trunk 0", () => {
    expect(e164("0151 23456789", "de")).toBe("+4915123456789");
    expect(e164("0664 1234567", "at")).toBe("+436641234567");
  });

  it("keeps the Italian leading 0", () => {
    expect(e164("06 1234 5678", "it")).toBe("+390612345678");
  });

  it("drops the Hungarian 06 prefix", () => {
    expect(e164("06 30 123 4567", "hu")).toBe("+36301234567");
  });

  it("drops the French trunk 0 and leaves US numbers alone", () => {
    expect(e164("06 12 34 56 78", "fr")).toBe("+33612345678");
    expect(e164("(555) 201-0000", "us")).toBe("+15552010000");
  });
});
