// Build & validate E.164 phone strings for downstream services (Calendly,
// Klaviyo SMS, etc.). E.164 spec: leading "+", 1-3 digit country code, total
// 8-15 digits. Klaviyo will 400 profile-import if the phone_number isn't
// strict E.164, so we tighten national-number length per supported country
// rather than only enforcing the generic 8-15 total bound.
import { countryCodes } from "@/data/country-codes";

const E164_RE = /^\+[1-9]\d{7,14}$/;

// National-number length rules per country dial code. Values are the number
// of digits AFTER the country code, WITHOUT any trunk "0". Multiple entries
// mean "any of these lengths is valid" (some countries have variable-length
// numbers).
//
// Notes on trunk zeros: for AU/GB/IE/NZ/ZA users typically write a leading
// "0" (e.g. "0412 345 678"). E.164 drops that trunk zero, so we accept
// either form and strip a single leading "0" when the remaining length
// matches the country's national rule.
const NATIONAL_LENGTHS: Record<string, number[]> = {
  "1": [10],           // NANP (US/CA)
  "44": [10],          // United Kingdom (mobiles start with 7)
  "353": [9],          // Ireland (mobiles start with 8)
  "61": [9],           // Australia (mobiles start with 4)
  "64": [8, 9, 10],    // New Zealand (mobiles typically 9-10 digits after +64)
  "27": [9],           // South Africa
  "33": [9],           // France
  "49": [10, 11],      // Germany (variable)
  "39": [9, 10, 11],   // Italy (variable)
  "34": [9],           // Spain
  "81": [10],          // Japan
  "86": [11],          // China
  "91": [10],          // India
  "52": [10],          // Mexico
  "55": [10, 11],      // Brazil
};

export type E164Result =
  | { ok: true; value: string }
  | { ok: false; reason: string };

/** Validate an already-formed E.164 string. */
export function isE164(value: string): boolean {
  return E164_RE.test(value);
}

/**
 * Combine a registration-form phone (national digits + country iso, e.g.
 * "us" / "(555) 123-4567") into a strict E.164 string.
 * Returns a tagged result so callers can surface the exact reason.
 */
export function toE164(
  phoneNumber: string | undefined | null,
  countryIso: string | undefined | null,
): E164Result {
  let digits = (phoneNumber ?? "").replace(/\D/g, "");
  if (!digits) return { ok: false, reason: "Phone number is required" };

  // Resolve dial code. Accept either the iso ("us") or the raw dial code ("+1").
  const isoOrCode = (countryIso ?? "").trim();
  const match = countryCodes.find(
    (c) => c.iso === isoOrCode || c.code === isoOrCode,
  );
  if (!match) return { ok: false, reason: "Select a valid country code" };

  const dialDigits = match.code.replace(/\D/g, ""); // "+1" -> "1"
  const allowed = NATIONAL_LENGTHS[dialDigits];

  // Strip a single leading trunk zero if doing so makes the number match
  // the country's national-length rule (common in AU/GB/IE/NZ/ZA input).
  if (allowed && digits.startsWith("0") && allowed.includes(digits.length - 1)) {
    digits = digits.slice(1);
  }

  if (allowed) {
    if (!allowed.includes(digits.length)) {
      const expected =
        allowed.length === 1
          ? `${allowed[0]}-digit`
          : `${allowed.slice(0, -1).join(", ")} or ${allowed[allowed.length - 1]}-digit`;
      return { ok: false, reason: `Enter a ${expected} phone number` };
    }
  } else {
    // Generic E.164 bounds: 8-15 digits total including country code.
    const total = dialDigits.length + digits.length;
    if (total < 8) return { ok: false, reason: "Phone number is too short" };
    if (total > 15) return { ok: false, reason: "Phone number is too long" };
  }

  const candidate = `+${dialDigits}${digits}`;
  if (!isE164(candidate)) {
    return { ok: false, reason: "Phone number format is invalid" };
  }
  return { ok: true, value: candidate };
}
