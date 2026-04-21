/**
 * Cosmetology license number format patterns, by US state.
 *
 * Phase 1 of license verification: format-level validation. This catches the
 * vast majority of typos and fake/placeholder submissions BEFORE we ever call
 * an external system. Live state-database verification (Phase 2) can build on
 * top of this.
 *
 * Patterns are researched from each state's public licensing board. Many states
 * issue multiple license classes (cosmetologist, esthetician, barber, etc.) —
 * where possible the regex covers the commonly-seen formats. When a state's
 * format is too variable or undocumented, we fall back to a generic length
 * check (`fallback: true`) instead of rejecting valid licenses.
 *
 * `example` is shown in placeholders / hints to guide the user.
 * `hint` is a short human-readable format description.
 * `fallback: true` means "we don't strictly enforce this; only sanity-check".
 *
 * Licenses are normalized (uppercased, spaces/dashes removed) before matching
 * via `normalizeLicense()`.
 */

export type LicensePattern = {
  /** Regex tested against the normalized (uppercased, stripped) license string. */
  regex: RegExp;
  /** Human-readable example shown as placeholder. */
  example: string;
  /** Short hint describing the format (shown under the input). */
  hint: string;
  /** If true, pattern is a loose sanity check — unknown/variable format. */
  fallback?: boolean;
};

/**
 * Generic fallback: 4-20 alphanumeric chars. Used for states where the format
 * is undocumented, highly variable, or not worth maintaining a strict rule.
 */
const GENERIC_FALLBACK: LicensePattern = {
  regex: /^[A-Z0-9]{4,20}$/,
  example: "License #",
  hint: "4-20 letters or numbers",
  fallback: true,
};

// US state patterns. Keyed by 2-letter state code.
// Where patterns cover multiple license classes (e.g., cosmetologist, barber,
// esthetician) we use a union. Prefixes/digit counts verified against state
// board public search pages where accessible.
export const US_LICENSE_PATTERNS: Record<string, LicensePattern> = {
  AL: { regex: /^\d{4,6}$/, example: "12345", hint: "4-6 digits" },
  AK: { regex: /^\d{4,6}$/, example: "12345", hint: "4-6 digits" },
  AZ: { regex: /^(C|CS|AE|AI|B|N)\d{4,6}$/, example: "C12345", hint: "Letter prefix + 4-6 digits (e.g., C12345)" },
  AR: { regex: /^\d{4,6}$/, example: "12345", hint: "4-6 digits" },
  CA: {
    regex: /^(KK|K|Z|BA|BS|BT|CI|CT|TE|MU|NT)\d{5,7}$/,
    example: "KK123456",
    hint: "Letter prefix + 5-7 digits (e.g., KK123456 for cosmetologist)",
  },
  CO: { regex: /^(CO|CE|NT|BA|HS)\.?\d{5,7}$/, example: "CO.12345", hint: "Letter prefix + 5-7 digits (e.g., CO.12345)" },
  CT: { regex: /^\d{6,8}$/, example: "1234567", hint: "6-8 digits" },
  DE: { regex: /^[A-Z]\d{1}-\d{7}$/, example: "C1-0001234", hint: "Letter-digit + 7 digits (e.g., C1-0001234)" },
  FL: { regex: /^(CL|FS|FB|CE|BL|HO|MM)\d{5,8}$/, example: "CL1234567", hint: "Letter prefix + 5-8 digits (e.g., CL1234567)" },
  GA: { regex: /^(CS|HD|NT|MA|MC|ES|BA)\d{5,7}$/, example: "CS012345", hint: "Letter prefix + 5-7 digits (e.g., CS012345)" },
  HI: { regex: /^[A-Z]{2,4}-?\d{3,6}$/, example: "BC-1234", hint: "Letter prefix + 3-6 digits" },
  ID: { regex: /^(C|CMT|E|N|BA)-?\d{4,6}$/, example: "C-12345", hint: "Letter prefix + 4-6 digits (e.g., C-12345)" },
  IL: { regex: /^\d{3}-?\d{6,7}$/, example: "011-1234567", hint: "3 digits + 6-7 digits (e.g., 011-1234567)" },
  IN: { regex: /^(CO|CH|CI|CE|MA|AE|AI|BA)\d{7,9}$/, example: "CO31000123", hint: "Letter prefix + 7-9 digits" },
  IA: { regex: /^\d{5,6}$/, example: "12345", hint: "5-6 digits" },
  KS: { regex: /^\d{4,6}$/, example: "12345", hint: "4-6 digits" },
  KY: { regex: /^(C|E|N|I|M|BA)\d{4,6}$/, example: "C12345", hint: "Letter prefix + 4-6 digits" },
  LA: { regex: /^\d{4,6}$/, example: "12345", hint: "4-6 digits" },
  ME: { regex: /^[A-Z]{2,3}\d{4,6}$/, example: "CO1234", hint: "Letter prefix + 4-6 digits" },
  MD: { regex: /^(C|E|N|M|BA|JR)\d{5,7}$/, example: "C12345", hint: "Letter prefix + 5-7 digits" },
  MA: { regex: /^\d{5,7}$/, example: "123456", hint: "5-7 digits" },
  MI: { regex: /^\d{10}$/, example: "3401012345", hint: "10 digits" },
  MN: { regex: /^[A-Z]\d{5,7}$/, example: "C123456", hint: "1 letter + 5-7 digits" },
  MS: { regex: /^\d{4,6}$/, example: "12345", hint: "4-6 digits" },
  MO: { regex: /^\d{4,8}$/, example: "123456", hint: "4-8 digits" },
  MT: { regex: /^\d{4,6}-[A-Z]{3}$/, example: "12345-CMT", hint: "4-6 digits + letter suffix (e.g., 12345-CMT)" },
  NE: { regex: /^\d{4,6}$/, example: "12345", hint: "4-6 digits" },
  NV: { regex: /^(C|E|N|M|BA|HS)\.?\d{3,5}$/, example: "C.1234", hint: "Letter prefix + 3-5 digits" },
  NH: { regex: /^\d{4,6}[A-Z]?$/, example: "1234C", hint: "4-6 digits with optional letter suffix" },
  NJ: { regex: /^\d{2}[A-Z]{2}\d{5,7}$/, example: "20BC00123", hint: "Digits + letters + digits (e.g., 20BC00123)" },
  NM: { regex: /^[A-Z]{2,3}\d{4,6}$/, example: "CS1234", hint: "Letter prefix + 4-6 digits" },
  NY: { regex: /^\d{6,8}$/, example: "1234567", hint: "6-8 digits" },
  NC: { regex: /^(C|E|N|M|T)-?\d{4,6}$/, example: "C-12345", hint: "Letter + 4-6 digits (e.g., C-12345)" },
  ND: { regex: /^\d{4,6}$/, example: "12345", hint: "4-6 digits" },
  OH: { regex: /^(MGR|COS|EST|NT|ADV|BO)\.?\d{5,7}$/, example: "COS.123456", hint: "Letter prefix + 5-7 digits (e.g., COS.123456)" },
  OK: { regex: /^\d{4,6}$/, example: "12345", hint: "4-6 digits" },
  OR: { regex: /^\d{4,6}(-[A-Z]{2,4})?$/, example: "12345-C", hint: "4-6 digits + optional letter suffix" },
  PA: { regex: /^[A-Z]{2}\d{6}$/, example: "CL123456", hint: "2 letters + 6 digits (e.g., CL123456)" },
  RI: { regex: /^[A-Z]{2,3}\d{4,6}$/, example: "CSO1234", hint: "Letter prefix + 4-6 digits" },
  SC: { regex: /^\d{4,6}$/, example: "12345", hint: "4-6 digits" },
  SD: { regex: /^\d{3,5}$/, example: "1234", hint: "3-5 digits" },
  TN: { regex: /^\d{4,6}$/, example: "12345", hint: "4-6 digits" },
  TX: { regex: /^\d{6,8}$/, example: "1234567", hint: "6-8 digits" },
  UT: { regex: /^\d{4,8}(-\d{4})?$/, example: "1234567-4801", hint: "Digits, optionally with -####" },
  VT: { regex: /^\d{3}\.\d{4,6}$/, example: "017.0001234", hint: "3 digits . 4-6 digits (e.g., 017.0001234)" },
  VA: { regex: /^\d{4}\d{6}$/, example: "2901012345", hint: "10 digits" },
  WA: { regex: /^[A-Z]{2,4}\.?[A-Z]{2}\.?\d{4,8}$/, example: "COS.CO.12345", hint: "Letters + letters + digits (e.g., COS.CO.12345)" },
  WV: { regex: /^[A-Z]{1,3}\d{4,6}$/, example: "CO1234", hint: "Letter prefix + 4-6 digits" },
  WI: { regex: /^\d{4,8}$/, example: "12345", hint: "4-8 digits" },
  WY: { regex: /^\d{3,5}$/, example: "1234", hint: "3-5 digits" },
  DC: { regex: /^(CO|BA|ES|NT|MN)\d{5,7}$/, example: "CO123456", hint: "Letter prefix + 5-7 digits" },
};

// Canadian province patterns. Most Canadian provinces regulate hair styling at
// the provincial level with fairly loose formats — use the fallback.
export const CA_LICENSE_PATTERNS: Record<string, LicensePattern> = {
  AB: GENERIC_FALLBACK,
  BC: GENERIC_FALLBACK,
  MB: GENERIC_FALLBACK,
  NB: GENERIC_FALLBACK,
  NL: GENERIC_FALLBACK,
  NT: GENERIC_FALLBACK,
  NS: GENERIC_FALLBACK,
  NU: GENERIC_FALLBACK,
  ON: GENERIC_FALLBACK,
  PE: GENERIC_FALLBACK,
  QC: GENERIC_FALLBACK,
  SK: GENERIC_FALLBACK,
  YT: GENERIC_FALLBACK,
};

/**
 * Normalize a raw license number for pattern matching:
 *   - uppercase
 *   - strip whitespace
 *   - preserve dots/dashes (many formats use them)
 */
export function normalizeLicense(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * Get the pattern for a given country+state code. Returns the fallback if
 * we don't have a specific pattern on file.
 */
export function getLicensePattern(
  countryCode: string | undefined,
  stateCode: string | undefined
): LicensePattern {
  if (!stateCode) return GENERIC_FALLBACK;
  if (countryCode === "CA") return CA_LICENSE_PATTERNS[stateCode] ?? GENERIC_FALLBACK;
  return US_LICENSE_PATTERNS[stateCode] ?? GENERIC_FALLBACK;
}

/**
 * Validate a license number against its state's pattern.
 * Returns { valid: true } or { valid: false, hint, example }.
 */
export function validateLicenseFormat(
  raw: string,
  countryCode: string | undefined,
  stateCode: string | undefined
): { valid: boolean; hint: string; example: string; isFallback: boolean } {
  const pattern = getLicensePattern(countryCode, stateCode);
  const normalized = normalizeLicense(raw);
  return {
    valid: pattern.regex.test(normalized),
    hint: pattern.hint,
    example: pattern.example,
    isFallback: !!pattern.fallback,
  };
}
