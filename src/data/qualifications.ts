// Hairdressing qualifications per country. Countries without a national
// qualification (US, CA) don't render a dropdown - just the license number.
export type QualificationOption = { value: string; label: string; tag: string };

// Verified against awarding bodies (Nov 2026):
// - UK: Ofqual RQF-regulated NVQ Diplomas (City & Guilds 6008 / VTCT), SVQ in
//   Scotland, plus voluntary State Registered Hairdresser (SRH) via the
//   Hair & Barber Council.
// - IE: QQI Level 5 (5M3351) / Level 6, or the SOLAS National Hairdressing
//   Apprenticeship (launched 2024).
// - NZ: NZ Certificate in Hairdressing L3 (entry) and L4 Professional Stylist
//   (NZQA ID 2413), standards set by Ringa Hora WDC.
// - ZA: QCTO Occupational Certificate: Hairdresser (NQF 4, SAQA 102497) is the
//   current national qualification; National Certificate: Hairdressing and the
//   legacy City & Guilds International Diploma are still widely held.
export const QUALIFICATIONS_BY_COUNTRY: Record<string, QualificationOption[]> = {
  // AU: training.gov.au SHB Training Package. NSW Hairdressers Act 2003
  // requires SHB30416 (Cert III) - it does NOT issue a separate licence #.
  AU: [
    { value: "cert3", label: "Certificate III in Hairdressing (SHB30416)", tag: "qualification-cert3" },
    { value: "cert3_barbering", label: "Certificate III in Barbering (SHB30516)", tag: "qualification-cert3-barbering" },
    { value: "cert4", label: "Certificate IV in Hairdressing (SHB40216)", tag: "qualification-cert4" },
    { value: "apprentice", label: "Apprentice / in training", tag: "qualification-apprentice" },
  ],
  // UK: Ofqual RQF Diplomas (VTCT / City & Guilds) replaced the legacy NVQ
  // branding in England. SVQ is the Scottish equivalent (SQA). Hair Council
  // SRH registration is VOLUNTARY - flagged in the label.
  UK: [
    { value: "diploma2", label: "Level 2 Diploma in Hairdressing (RQF)", tag: "qualification-diploma-l2" },
    { value: "diploma3", label: "Level 3 Diploma in Hairdressing (RQF)", tag: "qualification-diploma-l3" },
    { value: "svq", label: "SVQ in Hairdressing (Scotland)", tag: "qualification-svq" },
    { value: "tlevel", label: "T Level in Hairdressing, Barbering & Beauty (DfE, 2023+)", tag: "qualification-tlevel" },
    { value: "apprentice_std", label: "Hairdressing Professional (Level 2 Apprenticeship, ST0213)", tag: "qualification-apprentice-standard" },
    { value: "srh", label: "State Registered Hairdresser (SRH, voluntary)", tag: "qualification-srh" },
    { value: "apprentice", label: "Apprentice / in training", tag: "qualification-apprentice" },
  ],
  // IE: QQI Level 5 is the standalone major award. The new SOLAS National
  // Hairdressing Apprenticeship (2024) is a Level 6, 3-year employer-based
  // programme - it replaces the standalone "QQI Level 6" listing.
  IE: [
    { value: "qqi5", label: "QQI Level 5 in Hairdressing (5M3351)", tag: "qualification-qqi5" },
    { value: "nha", label: "National Hairdressing Apprenticeship (Level 6, Limerick & Clare ETB)", tag: "qualification-nha" },
    { value: "apprentice", label: "Apprentice / in training (legacy)", tag: "qualification-apprentice" },
  ],
  // NZ: NZQA Ringa Hora WDC. Level 3 is "Salon Support" - Level 4 is
  // "Professional Stylist" (NZQA ID 2413).
  NZ: [
    {
      value: "nzcert3",
      label: "NZ Certificate in Hairdressing - Salon Support (Level 3)",
      tag: "qualification-nzcert3",
    },
    {
      value: "nzcert4",
      label: "NZ Certificate in Hairdressing - Professional Stylist (Level 4)",
      tag: "qualification-nzcert4",
    },
    { value: "apprentice", label: "Apprentice / in training", tag: "qualification-apprentice" },
  ],
  // ZA: QCTO Occupational Cert (SAQA 102497) is the current national
  // qualification. NC:Hairdressing is legacy SETA. C&G is a non-SAQA
  // international diploma. Local term for in-training is "learnership".
  ZA: [
    {
      value: "qcto_hairdresser",
      label: "QCTO Occupational Certificate: Hairdresser (NQF 4, SAQA 102497)",
      tag: "qualification-qcto-hairdresser",
    },
    {
      value: "nc_hairdressing",
      label: "National Certificate: Hairdressing (NQF 3/4, legacy)",
      tag: "qualification-nc-hairdressing",
    },
    {
      value: "cg_diploma",
      label: "City & Guilds International Diploma (non-SAQA)",
      tag: "qualification-cg-diploma",
    },
    { value: "apprentice", label: "Learnership (in training)", tag: "qualification-apprentice" },
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
        : "Upload your Certificate III in Hairdressing (SHB30416)*",
    hasQualification: true,
  },
  UK: {
    h1: "Provide your credentials",
    sub: "Enter your salon business ID and qualification",
    wholesaleCopy:
      "Wholesale pricing is exclusive to verified UK salon professionals. Hair Council SRH registration is voluntary in the UK.",
    licenseFieldLabel: (s) =>
      s ? "Companies House / VAT / UTR*" : "Diploma cert #, SRH #, VAT or UTR*",
    licenseFieldPlaceholder: (s) =>
      s ? "e.g. 8-digit Companies House #, VAT or UTR" : "e.g. Diploma cert #, SRH00000, UTR",
    uploadCopy: (s) =>
      s
        ? "Upload your Diploma or salon registration certificate*"
        : "Upload your Diploma / Hair Council certificate*",
    hasQualification: true,
  },
  IE: {
    h1: "Provide your credentials",
    sub: "Enter your qualification and salon details",
    wholesaleCopy: "Wholesale pricing is exclusive to verified Irish salon professionals.",
    licenseFieldLabel: (s) => (s ? "Salon CRO / VAT number*" : "QQI certificate # or CRO / VAT*"),
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
    sub: "Enter your qualification and salon details",
    wholesaleCopy:
      "Wholesale pricing is exclusive to verified South African salon professionals.",
    licenseFieldLabel: (s) =>
      s ? "Salon CIPC / VAT number*" : "SAQA credential ID or trade-test #*",
    licenseFieldPlaceholder: (s) =>
      s ? "e.g. CIPC or VAT number" : "e.g. SAQA cert ID, Services SETA cert #",
    uploadCopy: (s) =>
      s
        ? "Upload your QCTO / National Certificate or business registration*"
        : "Upload your QCTO, National Certificate, or City & Guilds diploma*",
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
