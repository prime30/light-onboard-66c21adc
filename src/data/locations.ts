// US States with codes
export const states = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" }, { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" }, { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" }, { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" }, { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" }, { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" }, { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" }, { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" }, { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" }, { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" }, { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" }, { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" }, { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" }, { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" }, { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" }, { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" },
];

// Canadian Provinces and Territories
export const provinces = [
  { code: "AB", name: "Alberta" }, { code: "BC", name: "British Columbia" },
  { code: "MB", name: "Manitoba" }, { code: "NB", name: "New Brunswick" },
  { code: "NL", name: "Newfoundland and Labrador" }, { code: "NT", name: "Northwest Territories" },
  { code: "NS", name: "Nova Scotia" }, { code: "NU", name: "Nunavut" },
  { code: "ON", name: "Ontario" }, { code: "PE", name: "Prince Edward Island" },
  { code: "QC", name: "Quebec" }, { code: "SK", name: "Saskatchewan" }, { code: "YT", name: "Yukon" },
];

// Australian States and Territories
export const australianStates = [
  { code: "ACT", name: "Australian Capital Territory" },
  { code: "NSW", name: "New South Wales" }, { code: "NT", name: "Northern Territory" },
  { code: "QLD", name: "Queensland" }, { code: "SA", name: "South Australia" },
  { code: "TAS", name: "Tasmania" }, { code: "VIC", name: "Victoria" },
  { code: "WA", name: "Western Australia" },
];

// UK constituent nations
export const ukNations = [
  { code: "ENG", name: "England" }, { code: "SCT", name: "Scotland" },
  { code: "WLS", name: "Wales" }, { code: "NIR", name: "Northern Ireland" },
];

// Irish counties
export const irishCounties = [
  { code: "CW", name: "Carlow" }, { code: "CN", name: "Cavan" }, { code: "CE", name: "Clare" },
  { code: "CO", name: "Cork" }, { code: "DL", name: "Donegal" }, { code: "D", name: "Dublin" },
  { code: "G", name: "Galway" }, { code: "KY", name: "Kerry" }, { code: "KE", name: "Kildare" },
  { code: "KK", name: "Kilkenny" }, { code: "LS", name: "Laois" }, { code: "LM", name: "Leitrim" },
  { code: "LK", name: "Limerick" }, { code: "LD", name: "Longford" }, { code: "LH", name: "Louth" },
  { code: "MO", name: "Mayo" }, { code: "MH", name: "Meath" }, { code: "MN", name: "Monaghan" },
  { code: "OY", name: "Offaly" }, { code: "RN", name: "Roscommon" }, { code: "SO", name: "Sligo" },
  { code: "TA", name: "Tipperary" }, { code: "WD", name: "Waterford" }, { code: "WH", name: "Westmeath" },
  { code: "WX", name: "Wexford" }, { code: "WW", name: "Wicklow" },
];

// New Zealand regions
export const nzRegions = [
  { code: "NTL", name: "Northland" }, { code: "AUK", name: "Auckland" },
  { code: "WKO", name: "Waikato" }, { code: "BOP", name: "Bay of Plenty" },
  { code: "GIS", name: "Gisborne" }, { code: "HKB", name: "Hawke's Bay" },
  { code: "TKI", name: "Taranaki" }, { code: "MWT", name: "Manawatū-Whanganui" },
  { code: "WGN", name: "Wellington" }, { code: "TAS", name: "Tasman" },
  { code: "NSN", name: "Nelson" }, { code: "MBH", name: "Marlborough" },
  { code: "WTC", name: "West Coast" }, { code: "CAN", name: "Canterbury" },
  { code: "OTA", name: "Otago" }, { code: "STL", name: "Southland" },
];

// South African provinces
export const zaProvinces = [
  { code: "EC", name: "Eastern Cape" }, { code: "FS", name: "Free State" },
  { code: "GP", name: "Gauteng" }, { code: "KZN", name: "KwaZulu-Natal" },
  { code: "LP", name: "Limpopo" }, { code: "MP", name: "Mpumalanga" },
  { code: "NC", name: "Northern Cape" }, { code: "NW", name: "North West" },
  { code: "WC", name: "Western Cape" },
];

// Countries with additional metadata
export const countries = [
  { code: "US", name: "United States", subdivisionType: "state",
    subdivisionLabel: "State", postalCodeLabel: "ZIP Code", subdivisions: states },
  { code: "CA", name: "Canada", subdivisionType: "province",
    subdivisionLabel: "Province/Territory", postalCodeLabel: "Postal Code", subdivisions: provinces },
  { code: "UK", name: "United Kingdom", subdivisionType: "nation",
    subdivisionLabel: "Nation", postalCodeLabel: "Postcode", subdivisions: ukNations },
  { code: "IE", name: "Ireland", subdivisionType: "county",
    subdivisionLabel: "County", postalCodeLabel: "Eircode", subdivisions: irishCounties },
  { code: "AU", name: "Australia", subdivisionType: "state",
    subdivisionLabel: "State/Territory", postalCodeLabel: "Postcode", subdivisions: australianStates },
  { code: "NZ", name: "New Zealand", subdivisionType: "region",
    subdivisionLabel: "Region", postalCodeLabel: "Postcode", subdivisions: nzRegions },
  { code: "ZA", name: "South Africa", subdivisionType: "province",
    subdivisionLabel: "Province", postalCodeLabel: "Postal code", subdivisions: zaProvinces },
];

export function getProvinceName(
  code: string,
  countryCode: (typeof countries)[number]["code"]
): string | undefined {
  const country = countries.find((c) => c.code === countryCode);
  if (!country) return undefined;
  const subdivision = country.subdivisions.find((s) => s.code === code);
  return subdivision ? subdivision.name : undefined;
}
