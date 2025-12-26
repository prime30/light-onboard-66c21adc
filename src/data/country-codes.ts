// Country codes for phone numbers - using iso as unique key
export const countryCodes = [
  { code: "+1", country: "US", iso: "us", name: "United States" },
  { code: "+1", country: "CA", iso: "ca", name: "Canada" },
  { code: "+44", country: "UK", iso: "gb", name: "United Kingdom" },
  { code: "+61", country: "AU", iso: "au", name: "Australia" },
  { code: "+33", country: "FR", iso: "fr", name: "France" },
  { code: "+49", country: "DE", iso: "de", name: "Germany" },
  { code: "+39", country: "IT", iso: "it", name: "Italy" },
  { code: "+34", country: "ES", iso: "es", name: "Spain" },
  { code: "+81", country: "JP", iso: "jp", name: "Japan" },
  { code: "+86", country: "CN", iso: "cn", name: "China" },
  { code: "+91", country: "IN", iso: "in", name: "India" },
  { code: "+52", country: "MX", iso: "mx", name: "Mexico" },
  { code: "+55", country: "BR", iso: "br", name: "Brazil" },
] as const;

export type CountryCode = (typeof countryCodes)[number];
