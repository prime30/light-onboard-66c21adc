// Country codes for phone numbers - using iso as unique key
export const countryCodes = [
  { code: "+1", country: "US", iso: "us", name: "United States" },
  { code: "+1", country: "CA", iso: "ca", name: "Canada" },
  { code: "+44", country: "UK", iso: "gb", name: "United Kingdom" },
  { code: "+353", country: "IE", iso: "ie", name: "Ireland" },
  { code: "+61", country: "AU", iso: "au", name: "Australia" },
  { code: "+64", country: "NZ", iso: "nz", name: "New Zealand" },
  { code: "+27", country: "ZA", iso: "za", name: "South Africa" },
  { code: "+43", country: "AT", iso: "at", name: "Austria" },
  { code: "+32", country: "BE", iso: "be", name: "Belgium" },
  { code: "+359", country: "BG", iso: "bg", name: "Bulgaria" },
  { code: "+385", country: "HR", iso: "hr", name: "Croatia" },
  { code: "+357", country: "CY", iso: "cy", name: "Cyprus" },
  { code: "+420", country: "CZ", iso: "cz", name: "Czechia" },
  { code: "+45", country: "DK", iso: "dk", name: "Denmark" },
  { code: "+372", country: "EE", iso: "ee", name: "Estonia" },
  { code: "+358", country: "FI", iso: "fi", name: "Finland" },
  { code: "+33", country: "FR", iso: "fr", name: "France" },
  { code: "+49", country: "DE", iso: "de", name: "Germany" },
  { code: "+30", country: "GR", iso: "gr", name: "Greece" },
  { code: "+36", country: "HU", iso: "hu", name: "Hungary" },
  { code: "+39", country: "IT", iso: "it", name: "Italy" },
  { code: "+371", country: "LV", iso: "lv", name: "Latvia" },
  { code: "+370", country: "LT", iso: "lt", name: "Lithuania" },
  { code: "+352", country: "LU", iso: "lu", name: "Luxembourg" },
  { code: "+356", country: "MT", iso: "mt", name: "Malta" },
  { code: "+31", country: "NL", iso: "nl", name: "Netherlands" },
  { code: "+48", country: "PL", iso: "pl", name: "Poland" },
  { code: "+351", country: "PT", iso: "pt", name: "Portugal" },
  { code: "+40", country: "RO", iso: "ro", name: "Romania" },
  { code: "+421", country: "SK", iso: "sk", name: "Slovakia" },
  { code: "+386", country: "SI", iso: "si", name: "Slovenia" },
  { code: "+34", country: "ES", iso: "es", name: "Spain" },
  { code: "+46", country: "SE", iso: "se", name: "Sweden" },
  { code: "+81", country: "JP", iso: "jp", name: "Japan" },
  { code: "+86", country: "CN", iso: "cn", name: "China" },
  { code: "+91", country: "IN", iso: "in", name: "India" },
  { code: "+52", country: "MX", iso: "mx", name: "Mexico" },
  { code: "+55", country: "BR", iso: "br", name: "Brazil" },
] as const;

export function getCountryName(value: string) {
  const country = countryCodes.find(
    (country) =>
      country.iso === value ||
      country.country === value ||
      country.code === value ||
      country.name === value
  );

  return country ? country.name : null;
}

export type CountryCode = (typeof countryCodes)[number];
