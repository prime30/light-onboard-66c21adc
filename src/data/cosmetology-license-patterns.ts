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
// NOTE: All US state patterns have been demoted to GENERIC_FALLBACK because
// previous AI-researched patterns were not verified against official board
// sources and produced misleading hints (e.g., AZ does not actually use a
// letter prefix). Re-add a strict pattern for a state ONLY after verifying
// the format against that state's official licensing board public lookup.
// When fallback: true, LicenseStep hides the format hint entirely.
export const US_LICENSE_PATTERNS: Record<string, LicensePattern> = {
  AL: GENERIC_FALLBACK,
  AK: GENERIC_FALLBACK,
  AZ: GENERIC_FALLBACK,
  AR: GENERIC_FALLBACK,
  CA: GENERIC_FALLBACK,
  CO: GENERIC_FALLBACK,
  CT: GENERIC_FALLBACK,
  DE: GENERIC_FALLBACK,
  FL: GENERIC_FALLBACK,
  GA: GENERIC_FALLBACK,
  HI: GENERIC_FALLBACK,
  ID: GENERIC_FALLBACK,
  IL: GENERIC_FALLBACK,
  IN: GENERIC_FALLBACK,
  IA: GENERIC_FALLBACK,
  KS: GENERIC_FALLBACK,
  KY: GENERIC_FALLBACK,
  LA: GENERIC_FALLBACK,
  ME: GENERIC_FALLBACK,
  MD: GENERIC_FALLBACK,
  MA: GENERIC_FALLBACK,
  MI: GENERIC_FALLBACK,
  MN: GENERIC_FALLBACK,
  MS: GENERIC_FALLBACK,
  MO: GENERIC_FALLBACK,
  MT: GENERIC_FALLBACK,
  NE: GENERIC_FALLBACK,
  NV: GENERIC_FALLBACK,
  NH: GENERIC_FALLBACK,
  NJ: GENERIC_FALLBACK,
  NM: GENERIC_FALLBACK,
  NY: GENERIC_FALLBACK,
  NC: GENERIC_FALLBACK,
  ND: GENERIC_FALLBACK,
  OH: GENERIC_FALLBACK,
  OK: GENERIC_FALLBACK,
  OR: GENERIC_FALLBACK,
  PA: GENERIC_FALLBACK,
  RI: GENERIC_FALLBACK,
  SC: GENERIC_FALLBACK,
  SD: GENERIC_FALLBACK,
  TN: GENERIC_FALLBACK,
  TX: GENERIC_FALLBACK,
  UT: GENERIC_FALLBACK,
  VT: GENERIC_FALLBACK,
  VA: GENERIC_FALLBACK,
  WA: GENERIC_FALLBACK,
  WV: GENERIC_FALLBACK,
  WI: GENERIC_FALLBACK,
  WY: GENERIC_FALLBACK,
  DC: GENERIC_FALLBACK,
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
