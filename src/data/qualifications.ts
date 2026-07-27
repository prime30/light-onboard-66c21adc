// Hairdressing qualifications per country. Countries without a national
// qualification (US, CA) don't render a dropdown - just the license number.
export type QualificationOption = { value: string; label: string; tag: string };

export const QUALIFICATIONS_BY_COUNTRY: Record<string, QualificationOption[]> = {
  AU: [
    { value: "cert3", label: "Certificate III in Hairdressing (SHB30416)", tag: "qualification-cert3" },
    { value: "cert4", label: "Certificate IV in Hairdressing", tag: "qualification-cert4" },
    { value: "apprentice", label: "Apprentice / in training", tag: "qualification-apprentice" },
  ],
  UK: [
    { value: "nvq2", label: "NVQ Level 2 in Hairdressing", tag: "qualification-nvq2" },
    { value: "nvq3", label: "NVQ Level 3 in Hairdressing", tag: "qualification-nvq3" },
    { value: "vtct", label: "VTCT / City & Guilds diploma", tag: "qualification-vtct" },
    { value: "apprentice", label: "Apprentice / in training", tag: "qualification-apprentice" },
  ],
  IE: [
    { value: "qqi5", label: "QQI Level 5 in Hairdressing", tag: "qualification-qqi5" },
    { value: "qqi6", label: "QQI Level 6 in Hairdressing", tag: "qualification-qqi6" },
    { value: "apprentice", label: "Apprentice / in training", tag: "qualification-apprentice" },
  ],
  NZ: [
    { value: "nzcert3", label: "NZ Certificate in Hairdressing (Level 3)", tag: "qualification-nzcert3" },
    { value: "nzcert4", label: "NZ Certificate in Commercial Hairdressing (Level 4)", tag: "qualification-nzcert4" },
    { value: "apprentice", label: "Apprentice / in training", tag: "qualification-apprentice" },
  ],
  ZA: [
    { value: "saha", label: "SAHA registered hairdresser", tag: "qualification-saha" },
    { value: "nc_hairdressing", label: "National Certificate in Hairdressing", tag: "qualification-nc-hairdressing" },
    { value: "apprentice", label: "Apprentice / learner", tag: "qualification-apprentice" },
  ],
};

// Full flat list of qualification values (used to widen the zod enum).
export const ALL_QUALIFICATION_VALUES = Array.from(
  new Set(Object.values(QUALIFICATIONS_BY_COUNTRY).flat().map((q) => q.value))
) as [string, ...string[]];

// Full label lookup across countries.
export const QUALIFICATION_LABEL: Record<string, string> = Object.fromEntries(
  Object.values(QUALIFICATIONS_BY_COUNTRY)
    .flat()
    .map((q) => [q.value, q.label])
);

// Tag lookup across countries.
export const QUALIFICATION_TAG: Record<string, string> = Object.fromEntries(
  Object.values(QUALIFICATIONS_BY_COUNTRY)
    .flat()
    .map((q) => [q.value, q.tag])
);

// --- Country credential UI/UX config ---------------------------------------
// One place that captures per-country copy + validation shape for the
// LicenseStep. Adding a country means adding an entry here (and to
// QUALIFICATIONS_BY_COUNTRY / locations.ts / country-codes.ts / ZIP_PATTERNS).
export type CredentialConfig = {
  /** Heading on the license step. */
  h1: string;
  /** Subheading below h1. */
  sub: string;
  /** Wholesale info line. */
  wholesaleCopy: string;
  /** Label shown above the primary license/registration text field. */
  licenseFieldLabel: (isSalon: boolean) => string;
  /** Placeholder for the license/registration text field. */
  licenseFieldPlaceholder: (isSalon: boolean) => string;
  /** Copy shown next to the file upload. */
  uploadCopy: (isSalon: boolean) => string;
  /** Does this country render the qualification dropdown? */
  hasQualification: boolean;
};

export const CREDENTIAL_CONFIG: Record<string, CredentialConfig> = {
  US: {
    h1: "Provide your license number",
    sub: "Enter your cosmetology license details",
    wholesaleCopy: "Please enter your license exactly as it appears from the state.",
    licenseFieldLabel: (s) => (s ? "Salon License #*" : "License number*"),
    licenseFieldPlaceholder: (s) => (s ? "Salon License #" : "Enter your license number"),
    uploadCopy: (s) =>
      s
        ? "Upload your salon license*"
        : "For quicker account verification process upload your license",
    hasQualification: false,
  },
  CA: {
    h1: "Provide your license number",
    sub: "Enter your cosmetology license details",
    wholesaleCopy: "Please enter your license exactly as issued by your province.",
    licenseFieldLabel: (s) => (s ? "Salon License #*" : "License number*"),
    licenseFieldPlaceholder: (s) => (s ? "Salon License #" : "Enter your license number"),
    uploadCopy: (s) =>
      s ? "Upload your salon license*" : "For quicker verification, upload your license",
    hasQualification: false,
  },
  AU: {
    h1: "Provide your credentials",
    sub: "Enter your ABN and hairdressing qualification",
    wholesaleCopy: "Wholesale pricing is exclusive to verified Australian salon professionals.",
    licenseFieldLabel: () => "ABN*",
    licenseFieldPlaceholder: () => "e.g. 12 345 678 901",
    uploadCopy: (s) =>
      s
        ? "Upload your Certificate III or business registration*"
        : "Upload your Certificate III (or state licence)*",
    hasQualification: true,
  },
  UK: {
    h1: "Provide your credentials",
    sub: "Enter your qualification and salon details",
    wholesaleCopy: "Wholesale pricing is exclusive to verified UK salon professionals.",
    licenseFieldLabel: (s) => (s ? "Salon / Companies House number*" : "NVQ certificate # or Hair Council SRH*"),
    licenseFieldPlaceholder: (s) =>
      s ? "e.g. Companies House number" : "e.g. NVQ cert #, SRH00000",
    uploadCopy: (s) =>
      s
        ? "Upload your NVQ / salon registration certificate*"
        : "Upload your NVQ / Hair Council certificate*",
    hasQualification: true,
  },
  IE: {
    h1: "Provide your credentials",
    sub: "Enter your qualification and salon details",
    wholesaleCopy: "Wholesale pricing is exclusive to verified Irish salon professionals.",
    licenseFieldLabel: (s) => (s ? "Salon CRO / VAT number*" : "QQI certificate # or CRO*"),
    licenseFieldPlaceholder: (s) => (s ? "e.g. CRO or VAT number" : "e.g. QQI cert #"),
    uploadCopy: (s) =>
      s ? "Upload your QQI / CRO certificate*" : "Upload your QQI certificate*",
    hasQualification: true,
  },
  NZ: {
    h1: "Provide your credentials",
    sub: "Enter your qualification and salon details",
    wholesaleCopy: "Wholesale pricing is exclusive to verified NZ salon professionals.",
    licenseFieldLabel: (s) => (s ? "NZBN*" : "NZ Certificate # or NZBN*"),
    licenseFieldPlaceholder: (s) => (s ? "13-digit NZBN" : "e.g. NZ Cert # or NZBN"),
    uploadCopy: (s) =>
      s
        ? "Upload your NZ Certificate or business registration*"
        : "Upload your NZ Certificate in Hairdressing*",
    hasQualification: true,
  },
  ZA: {
    h1: "Provide your credentials",
    sub: "Enter your SAHA registration and salon details",
    wholesaleCopy: "Wholesale pricing is exclusive to verified South African salon professionals.",
    licenseFieldLabel: (s) => (s ? "Salon VAT / registration number*" : "SAHA number or National Certificate*"),
    licenseFieldPlaceholder: (s) =>
      s ? "e.g. VAT / CIPC number" : "e.g. SAHA # or NC Hairdressing",
    uploadCopy: (s) =>
      s ? "Upload your SAHA / business registration*" : "Upload your SAHA or NC certificate*",
    hasQualification: true,
  },
};

export function getCredentialConfig(countryCode: string | undefined): CredentialConfig {
  const key = (countryCode ?? "US").toUpperCase();
  return CREDENTIAL_CONFIG[key] ?? CREDENTIAL_CONFIG.US;
}

export function getQualificationOptions(countryCode: string | undefined): QualificationOption[] {
  const key = (countryCode ?? "").toUpperCase();
  return QUALIFICATIONS_BY_COUNTRY[key] ?? [];
}
