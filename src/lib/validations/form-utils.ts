// Email validation - requires @ symbol
export const isValidEmail = (email: string): boolean => {
  return email.trim() !== "" && email.includes("@");
};

// Format phone number as user types (local number only, no country code).
// If the user pastes a full international number (e.g. "+1 (415) 555-1212"),
// keep the LAST 10 digits — the country selector already supplies the dial code,
// so the local number is what we display & store.
export const formatPhoneNumber = (value: string): string => {
  const allDigits = value.replace(/\D/g, "");
  const cleaned = allDigits.length > 10 ? allDigits.slice(-10) : allDigits;

  // US format: (555) 123-4567
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
};

// Phone number validation - validates the local number part (without country code)
export const isValidPhoneNumber = (phone: string): boolean => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, "");
  // Must have exactly 10 digits for US/CA format
  return cleaned.length === 10;
};
