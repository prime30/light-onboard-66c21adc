## Australia registration branch (with NSW exception)

Add end-to-end AU support so Australian stylists, salons, and students can register. Uses ABN + Certificate III for most of AU, with an NSW hairdresser licence exception.

### 1. Data + validation

**`src/data/locations.ts`**
- Add Australian states/territories: NSW, VIC, QLD, WA, SA, TAS, ACT, NT.
- Add a new `AU` entry to `countries` with:
  - `subdivisionType: "state"`, `subdivisionLabel: "State/Territory"`
  - `postalCodeLabel: "Postcode"`
  - `subdivisions: australianStates`

**`src/data/country-codes.ts`**
- Add `{ code: "+61", country: "AU", iso: "au", name: "Australia" }`.
- Reorder so AU appears near the top (below US/CA/UK).

**`src/lib/validations/auth-schemas.ts`**
- Extend `ZIP_PATTERNS` with AU: 4 digits `^\d{4}$`.
- Update the license/business schemas so when `countryCode === "AU"`:
  - Replace `licenseNumber` requirement with `abn` (11 digits, spaces allowed) as the primary identifier.
  - Add `qualification` enum: `cert3` | `cert4` | `apprentice`.
  - Add `nswLicenseNumber` (optional, but required when `provinceCode === "NSW"`).
  - Keep `licenseProofFiles` required for salon/pro (Cert III photo or equivalent).
- School flow (AU students): swap `schoolName` label context to "TAFE / RTO name"; keep the field name for schema stability.

### 2. UI: Business Location step

- Country selector already exists; the new AU entry drops in automatically.
- Postcode field: driven by `selectedCountry.postalCodeLabel`, ZIP validity block gains an AU branch (`/^\d{4}$/`).
- Address autocomplete already accepts `countryCode`; no code change needed beyond passing AU through.
- Phone prefix on Contact Basics: no code change; country codes list now includes +61.

### 3. UI: License step (`LicenseStep.tsx`)

Branch on `countryCode`:
- **US/CA (existing)**: unchanged.
- **AU**:
  - Title: "Provide your credentials"
  - Copy: "Enter your ABN and hairdressing qualification."
  - Fields:
    - `abn` text input (label "ABN*", 11-digit format helper).
    - `qualification` select: Certificate III in Hairdressing, Certificate IV, Apprentice.
    - If `provinceCode === "NSW"` show `nswLicenseNumber` field ("NSW hairdresser licence number*").
    - `licenseProofFiles` upload: label becomes "Upload your Certificate III (or NSW licence)*"; required for salon + professional, optional for licensed_stylist.
  - Salon-only extras (salon size, structure) unchanged.

### 4. UI: School step (`SchoolInfoStep.tsx`)

Branch on `countryCode === "AU"`:
- Title: "Which TAFE or RTO do you attend?"
- School name label: "TAFE / RTO name*"
- State selector already covers AU via updated `locations.ts`.
- Enrollment proof upload copy: "Upload TAFE/RTO student ID or enrollment letter."

### 5. Downstream: Shopify tags

**`supabase/functions/create-customer/index.ts`**
- When `countryCode === "AU"` add tags:
  - `country-au`
  - `qualification-cert3` / `qualification-cert4` / `qualification-apprentice`
  - `nsw-licensed` when NSW licence number supplied.
- Store `abn`, `qualification`, `nswLicenseNumber` in Helium/Shopify metafields alongside existing license fields (reuse `licenseNumber` metafield for ABN if AU, or add new metafields — will use dedicated `abn` and `qualification` metafields to keep US data clean).

### 6. Admin analytics

**`RegistrationAnalyticsPanel.tsx`** and `admin-registration-analytics`
- Add a "Country" breakdown row (US / CA / AU) alongside the existing volume cohort chart.

### 7. Session-restore + summary

- `SummaryForm.tsx`: render ABN / qualification / NSW licence when country is AU (hide US license fields).
- No sessionStorage schema break: the new fields are additive optional strings.

### Technical notes

- No new tables; all additions are schema-side and Shopify-side.
- `qualification` enum lives in Zod + a shared const array in `src/data/qualifications.ts` for reuse in the Summary rendering.
- `check-phone` edge function already accepts arbitrary country prefixes, no change needed.
- Klaviyo profile-import: pass `country: "AU"` and the qualification so future flows can segment.

### Out of scope (call out to user)

- WeChat/AU-specific payment providers (not requested).
- Automatic ABN validation against the Australian Business Register API (would need a new edge function + secret; can add later if desired).
