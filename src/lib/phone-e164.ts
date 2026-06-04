// Build & validate E.164 phone strings for downstream services (Calendly etc.).
// E.164 spec: leading "+", 1-3 digit country code, total 8-15 digits.
import { countryCodes } from "@/data/country-codes";

const E164_RE = /^\+[1-9]\d{7,14}$/;

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
  const digits = (phoneNumber ?? "").replace(/\D/g, "");
  if (!digits) return { ok: false, reason: "Phone number is required" };

  // Resolve dial code. Accept either the iso ("us") or the raw dial code ("+1").
  const isoOrCode = (countryIso ?? "").trim();
  const match = countryCodes.find(
    (c) => c.iso === isoOrCode || c.code === isoOrCode,
  );
  if (!match) return { ok: false, reason: "Select a valid country code" };

  const dialDigits = match.code.replace(/\D/g, ""); // "+1" -> "1"
  // North America (NANP) requires a 10-digit national number.
  if (dialDigits === "1" && digits.length !== 10) {
    return { ok: false, reason: "Enter a 10-digit phone number" };
  }
  // Generic E.164 bounds: 8-15 digits total including country code.
  const total = dialDigits.length + digits.length;
  if (total < 8) return { ok: false, reason: "Phone number is too short" };
  if (total > 15) return { ok: false, reason: "Phone number is too long" };

  const candidate = `+${dialDigits}${digits}`;
  if (!isE164(candidate)) {
    return { ok: false, reason: "Phone number format is invalid" };
  }
  return { ok: true, value: candidate };
}
