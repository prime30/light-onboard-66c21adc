/**
 * Formats a phone number by combining country code and phone number
 * @param countryCode - The country code (e.g., "+1", "1", etc.)
 * @param phoneNumber - The phone number without country code (will be stripped to digits only)
 * @returns The formatted phone number with country code, or undefined if no phone number provided
 *
 * @example
 * formatPhoneNumber("+1", "(555) 123-4567") // "+15551234567"
 * formatPhoneNumber("1", "555.123.4567") // "15551234567"
 * formatPhoneNumber(undefined, "555-123-4567") // "5551234567"
 * formatPhoneNumber("+1", undefined) // undefined
 */
export function formatPhoneNumber(countryCode?: string, phoneNumber?: string): string | undefined {
  if (!phoneNumber) return undefined;

  // Strip everything except digits from phone number
  const digitsOnly = phoneNumber.replace(/\D/g, "");
  if (!digitsOnly) return undefined;

  return countryCode ? `${countryCode}${digitsOnly}` : digitsOnly;
}
