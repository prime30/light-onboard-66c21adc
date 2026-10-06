// Email validation - requires @ symbol
export const isValidEmail = (email: string): boolean => {
  return email.trim() !== "" && email.includes("@");
};

// Phone keyboards and autocorrect can leave a trailing space or period
// ("jane@gmail.com."), which fails email validation with no visible cause.
export const normalizeEmailInput = (value: string): string =>
  value.trim().replace(/\.+$/, "");

// US and Canada share +1 and always use 10-digit numbers. Other countries vary
// (a New Zealand mobile can be 8 digits) and people write the local leading 0,
// so those numbers are kept as typed. No country means the US default.
export const isNanpPhoneCountry = (country?: string): boolean => {
  const c = (country ?? "").trim().toLowerCase();
  return c === "" || c === "us" || c === "ca" || c === "+1" || c === "1";
};

// Format phone number as user types (local number only, no country code).
// For +1, a pasted full number (e.g. "+1 (415) 555-1212") keeps the LAST 10
// digits, since the country selector already supplies the dial code.
export const formatPhoneNumber = (value: string, country?: string): string => {
  if (!isNanpPhoneCountry(country)) {
    return value.replace(/[^\d\s()+-]/g, "").replace(/\s+/g, " ").trim();
  }
  const allDigits = value.replace(/\D/g, "");
  const cleaned = allDigits.length > 10 ? allDigits.slice(-10) : allDigits;

  // US format: (555) 123-4567
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
};

// Phone number validation - validates the local number part (without country code)
export const isValidPhoneNumber = (phone: string, country?: string): boolean => {
  const cleaned = phone.replace(/\D/g, "");
  if (!isNanpPhoneCountry(country)) return cleaned.length >= 7 && cleaned.length <= 15;
  return cleaned.length === 10 || (cleaned.length === 11 && cleaned.startsWith("1"));
};
