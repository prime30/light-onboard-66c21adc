// Email validation - requires @ symbol
export const isValidEmail = (email: string): boolean => {
  return email.trim() !== "" && email.includes("@");
};

// Format phone number as user types (local number only, no country code)
export const formatPhoneNumber = (value: string): string => {
  // Remove all non-digit characters
  const cleaned = value.replace(/\D/g, '').slice(0, 10);

  // US format: (555) 123-4567
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
};
