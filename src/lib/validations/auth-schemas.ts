import { z } from "zod";
import { countryCodes } from "../../data/country-codes.ts";
import { formatPhoneNumber } from "./form-utils.ts";
import { UploadFileItem, uploadFileItemSchema } from "./file-schema.ts";
import { isDisposableEmail } from "./disposable-email-domains.ts";
import {
  ALL_QUALIFICATION_VALUES,
  isCurrentQualificationForCountry,
} from "../../data/qualifications.ts";

const DISPOSABLE_EMAIL_MESSAGE =
  "Please use a permanent email address - disposable inboxes aren't accepted";

function convertFileUploadToUrl(value: UploadFileItem[] | string[] | undefined) {
  if (!value) return undefined;

  const converted: string[] = [];
  for (const item of value as (UploadFileItem | string)[]) {
    if (typeof item === "string") {
      if (item) converted.push(item);
      continue;
    }
    // Drop items that haven't finished uploading - they have no url yet and
    // would serialize to `null` over the wire, tripping the server-side
    // `z.array(z.string())` re-validation with a useless "expected string,
    // received null" error. Better to fail the client-side `.min(1)` check
    // with a clear message than to submit a broken payload.
    if (item && item.status === "completed" && typeof item.url === "string" && item.url) {
      converted.push(item.url);
    }
  }

  return converted;
}

const MISSING_FILE_MESSAGE = "Please attach at least one file";

function fileUploadSchema(optional: boolean) {
  let fileArraySchema = z
    .array(uploadFileItemSchema)
    .refine((items) => items.every((i) => i.status === "completed" && !!i.url), {
      message: "Please wait for your upload to finish, or re-attach the file",
    });
  let stringArraySchema = z.array(z.string().min(1));

  if (!optional) {
    fileArraySchema = fileArraySchema.refine((items) => items.length >= 1, {
      message: MISSING_FILE_MESSAGE,
    }) as typeof fileArraySchema;
    stringArraySchema = stringArraySchema.min(1, MISSING_FILE_MESSAGE);
  }

  // Custom `error` on the union so a missing value never surfaces Zod's raw
  // "Invalid input: expected array, received undefined" to the user.
  const filesSchema = z.union([fileArraySchema, stringArraySchema], {
    error: MISSING_FILE_MESSAGE,
  });

  if (optional) {
    return filesSchema.optional().nullable().overwrite(convertFileUploadToUrl);
  }
  return filesSchema.overwrite(convertFileUploadToUrl);
}


export type FileUploadField = z.Infer<ReturnType<typeof fileUploadSchema>>;

// Phone number validation - allow common separators and an optional leading "+".
// Pasting "+1 (415) 555-1212" or "+44 20 7946 0958" should pass.
const phoneRegex = /^\+?[\d\s\-().]+$/;
const isValidPhoneNumber = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
};

// Zip / postal code patterns per country. Falls back to a permissive
// alphanumeric match for countries we don't have a specific rule for.
const ZIP_PATTERNS: Record<string, { regex: RegExp; message: string }> = {
  US: { regex: /^\d{5}(-\d{4})?$/, message: "Enter a valid US ZIP (12345 or 12345-6789)" },
  CA: {
    regex: /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ \-]?\d[ABCEGHJ-NPRSTV-Z]\d$/i,
    message: "Enter a valid Canadian postal code (A1A 1A1)",
  },
  UK: {
    regex: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i,
    message: "Enter a valid UK postcode (e.g. SW1A 1AA)",
  },
  IE: {
    regex: /^[AC-FHKNPRTV-Y]\d{2} ?[0-9AC-FHKNPRTV-Y]{4}$/i,
    message: "Enter a valid Eircode (e.g. D02 X285)",
  },
  AU: { regex: /^\d{4}$/, message: "Enter a valid Australian postcode (4 digits)" },
  NZ: { regex: /^\d{4}$/, message: "Enter a valid NZ postcode (4 digits)" },
  ZA: { regex: /^\d{4}$/, message: "Enter a valid South African postal code (4 digits)" },
};

// ABN: 11 digits, spaces allowed as separators (e.g. "12 345 678 901").
// Australian Business Register checksum: subtract 1 from the first digit,
// apply weights 10,1,3,5,7,9,11,13,15,17,19, then require mod 89 === 0.
const isValidABN = (abn: string): boolean => {
  const digits = abn.replace(/\s+/g, "");
  if (!/^\d{11}$/.test(digits)) return false;
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  const sum = weights.reduce((total, weight, index) => {
    const value = Number(digits[index] ?? "0") - (index === 0 ? 1 : 0);
    return total + value * weight;
  }, 0);
  return sum % 89 === 0;
};
// NZBN: 13 digits, spaces allowed.
const isValidNZBN = (v: string): boolean => {
  const s = v.replace(/\s+/g, "");
  return s.length === 13 && /^\d+$/.test(s);
};
const isValidZipForCountry = (zip: string, country: string | undefined): true | string => {
  const trimmed = zip.trim();
  const pattern = country ? ZIP_PATTERNS[country.toUpperCase()] : undefined;
  if (pattern) return pattern.regex.test(trimmed) || pattern.message;
  // Generic fallback: 3-10 alphanumeric (allowing space/dash).
  return /^[A-Za-z0-9][A-Za-z0-9 \-]{1,9}$/.test(trimmed) || "Please enter a valid postal code";
};

// Countries that require the qualification dropdown on the license step.
// Countries that require the qualification dropdown on the license step.
// AU is intentionally excluded: Australia does not require a licence or
// national qualification to provide hair-extension services, so we do not
// force one on our AU applicants.
export const QUALIFICATION_REQUIRED_COUNTRIES = new Set(["UK", "IE", "NZ", "ZA"]);

// Account Type Schema
export const accountTypeSchema = z.object({
  accountType: z.enum(["professional", "salon", "student"], {
    error: "Please select an account type",
  }),
});

export type AccountType = z.infer<typeof accountTypeSchema>["accountType"];

// Business Operation Schema (for professionals)
const businessOperationValidators = {
  businessOperationType: z.enum(["commission", "independent"], {
    error: "Please select how you operate your business",
  }),
};
export const businessOperationSchema = z.object(businessOperationValidators);

// School Info Schema (for students)
const schoolInfoValidators = {
  schoolName: z
    .string({ error: "School/Apprenticeship name is required" })
    .trim()
    .min(1, "School/Apprenticeship name is required")
    .max(200, "Name must be less than 200 characters"),
  schoolState: z
    .string({ error: "State/Province is required" })
    .min(1, "State/Province is required"),
  enrollmentProofFiles: fileUploadSchema(false),
};
export const schoolInfoSchema = z.object(schoolInfoValidators);

// Contact Basics Schema
const contactBasicsValidators = {
  firstName: z
    .string({ error: "First name is required" })
    .trim()
    .min(1, "First name is required")
    .max(100, "First name must be less than 100 characters"),
  lastName: z
    .string({ error: "Last name is required" })
    .trim()
    .min(1, "Last name is required")
    .max(100, "Last name must be less than 100 characters"),
  preferredName: z
    .string()
    .trim()
    .max(100, "Preferred name must be less than 100 characters")
    .optional(),
  email: z
    .string({ error: "Please enter a valid email address" })
    .email("Please enter a valid email address")
    .trim()
    .max(255, "Email must be less than 255 characters")
    .transform((val) => val.toLowerCase())
    .refine((val) => !isDisposableEmail(val), DISPOSABLE_EMAIL_MESSAGE),
  phoneNumber: z
    .string({ error: "Phone number is required" })
    .min(1, "Phone number is required")
    .refine((val) => phoneRegex.test(val), "Please enter a valid phone number")
    .refine((val) => isValidPhoneNumber(val), "Please enter a valid phone number")
    .transform((val) => formatPhoneNumber(val)),
  phoneCountryCode: z
    .string({ error: "Country code is required" })
    .min(1, "Country code is required")
    .refine(
      (value) => countryCodes.some((country) => country.iso === value || country.code === value),
      "Invalid country selected"
    )
    .overwrite((value) => {
      const phoneCountryCode = countryCodes.find((c) => c.iso === value)?.code || value;
      return phoneCountryCode;
    }),
  // Instagram handle is required for every registration. Users type just
  // the handle; the client verifies it resolves to a real profile via the
  // verify-instagram-handle edge function and shows the confirmed URL.
  socialMediaHandle: z
    .string({ error: "Instagram handle is required" })
    .trim()
    .min(1, "Instagram handle is required")
    .transform((val) => val.replace(/^@+/, "").trim())
    .refine(
      (val) => /^[A-Za-z0-9._]{1,30}$/.test(val),
      "Enter a valid Instagram handle (letters, numbers, periods, and underscores only)"
    ),
};
export const contactBasicsSchema = z.object(contactBasicsValidators);

// Create-Password Schema (dedicated step right after Contact Basics).
// Password lets us auto-log the user into Shopify on submit success
// (via the Storefront API customer-login flow), instead of relying on the
// Shopify activation-email round-trip.
const createPasswordValidators = {
  password: z
    .string({ error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be less than 72 characters")
    .regex(/[a-z]/, "Password must include a lowercase letter")
    .regex(/[A-Z]/, "Password must include an uppercase letter")
    .regex(/\d/, "Password must include a number"),
  confirmPassword: z
    .string({ error: "Please confirm your password" })
    .min(1, "Please confirm your password"),
};
// Plain ZodObject used for step-level gating (consumed by step-order
// stepValidations, fieldsForStep, etc.). Cross-field equality is enforced by
// `registrationSchema.superRefine` so we can keep this as a ZodObject.
export const createPasswordStepSchema = z.object(createPasswordValidators);
export const createPasswordSchema = createPasswordStepSchema.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  }
);
export type CreatePasswordFormData = z.infer<typeof createPasswordSchema>;

// Business Location Schema
const businessLocationValidators = {
  businessName: z
    .string({ error: "Business or salon name is required" })
    .trim()
    .min(1, "Business or salon name is required")
    .max(200, "Business name must be less than 200 characters"),
  businessAddress: z
    .string({ error: "Address is required" })
    .trim()
    .min(1, "Address is required")
    .max(500, "Address must be less than 500 characters"),
  suiteNumber: z.string().trim().max(50, "Suite number must be less than 50 characters").optional(),
  countryCode: z.string({ error: "Country is required" }).min(1, "Country is required"),
  city: z
    .string({ error: "City is required" })
    .trim()
    .min(1, "City is required")
    .max(100, "City must be less than 100 characters"),
  provinceCode: z
    .string({ error: "State/Province is required" })
    .min(1, "State/Province is required"),
  zipCode: z
    .string({ error: "Zip/Postal code is required" })
    .trim()
    .min(1, "Zip/Postal code is required")
    .max(20, "Zip code must be less than 20 characters"),
};
export const businessLocationSchema = z
  .object(businessLocationValidators)
  .superRefine((data, ctx) => {
    const result = isValidZipForCountry(data.zipCode, data.countryCode);
    if (result !== true) {
      ctx.addIssue({ code: "custom", message: result, path: ["zipCode"] });
    }
  });

// License Schema (for professionals).
// On US/CA the licenseNumber holds a cosmetology license.
// On AU the licenseNumber holds the practitioner's ABN (11 digits) - the
// UI relabels the field to "ABN*" when countryCode === "AU". Country-specific
// qualification rules are validated by registrationSchema.superRefine below.
const licenseValidators = {
  // Optional in the union so AU (which requires no licence) can submit
  // without a value; enforced as required for other countries by
  // registrationSchema.superRefine below.
  licenseNumber: z
    .string()
    .trim()
    .max(100, "License number must be less than 100 characters")
    .optional(),
  licenseProofFiles: fileUploadSchema(true),
  qualification: z.enum(ALL_QUALIFICATION_VALUES).optional(),
};
export const licenseSchema = z.object(licenseValidators);

// License Schema for salons (includes additional fields).
// Fields are optional in the union so AU salons - which have no salon
// licensing requirement - can submit; non-AU countries have them enforced
// as required by registrationSchema.superRefine.
const salonValidators = {
  salonSize: z.string().optional(),
  salonStructure: z.string().optional(),
};
export const salonSchema = z.object(salonValidators);

// Combined schema used to gate the "license" step for salon accounts.
// `licenseProofFiles` is overridden to be required (non-optional) here.
export const salonLicenseStepSchema = z.object({
  licenseNumber: licenseValidators.licenseNumber,
  licenseProofFiles: fileUploadSchema(false),
  qualification: licenseValidators.qualification,
  ...salonValidators,
});

// Tax Exemption Schema
const taxExemptionValidators = {
  taxExempt: z.boolean().optional(),
  taxExemptFile: fileUploadSchema(true),
};
export const taxExemptionSchema = z.object(taxExemptionValidators).refine(
  (data) => {
    if (!data.taxExempt) {
      return true;
    }

    // If tax exempt is true, tax exempt file is required
    if (!data.taxExemptFile || !Array.isArray(data.taxExemptFile)) return false;

    // Files are always arrays now, check if array has items
    return data.taxExemptFile.length > 0;
  },
  {
    message: "Tax exemption document is required when claiming tax exemption",
    path: ["taxExemptFile"],
  }
);


// Preferred Method Schema
export const PREFERRED_METHOD_OPTIONS = [
  "SuperWeft",
  "Keratin Tips",
  "SecreTapes",
  "Volume Weft",
] as const;
export type PreferredMethod = (typeof PREFERRED_METHOD_OPTIONS)[number];

const preferredMethodValidators = {
  preferredMethods: z
    .array(z.enum(PREFERRED_METHOD_OPTIONS), {
      error: "Please select at least one preferred method",
    })
    .min(1, "Please select at least one preferred method"),

};
export const preferredMethodSchema = z.object(preferredMethodValidators);
export type PreferredMethodFormData = z.infer<typeof preferredMethodSchema>;

// Monthly Order Volume Schema (professionals + salons only)
export const MONTHLY_ORDER_VOLUME_OPTIONS = ["None", "1-5", "6-10", "10+"] as const;
export type MonthlyOrderVolume = (typeof MONTHLY_ORDER_VOLUME_OPTIONS)[number];

const monthlyOrderVolumeValidators = {
  monthlyOrderVolume: z.enum(MONTHLY_ORDER_VOLUME_OPTIONS, {
    error: "Please select how many extensions you order per month",
  }),
};
export const monthlyOrderVolumeSchema = z.object(monthlyOrderVolumeValidators);
export type MonthlyOrderVolumeFormData = z.infer<typeof monthlyOrderVolumeSchema>;

// Preferences Schema (now also includes tax exemption fields, which used to
// live in their own step but were merged into Preferences).
const preferencesValidators = {
  ...taxExemptionValidators,
  birthdayMonth: z.string().optional(),
  birthdayDay: z.string().optional(),
  // socialMediaHandle now lives on Contact Basics (required for everyone).

  referralSource: z
    .string({ error: "Please tell us how you heard about us" })
    .trim()
    .min(1, "Please tell us how you heard about us"),
  subscribeOrderUpdates: z
    .boolean()
    .optional()
    .transform((val) => val ?? true),
  acceptsMarketing: z
    .boolean()
    .optional()
    .transform((val) => val ?? false),
  acceptsSmsMarketing: z
    .boolean()
    .optional()
    .transform((val) => val ?? false),
};
export const preferencesSchema = z.object(preferencesValidators).refine(
  (data) => {
    if (!data.taxExempt) return true;
    if (!data.taxExemptFile || !Array.isArray(data.taxExemptFile)) return false;
    return data.taxExemptFile.length > 0;
  },
  {
    message: "Tax exemption document is required when claiming tax exemption",
    path: ["taxExemptFile"],
  }
);

// These two steps can be hidden by an admin toggle, so the full-registration
// schema keeps them optional. The per-step schemas above still require them
// whenever the step is actually part of the flow.
const relaxedBusinessOperationValidators = {
  businessOperationType: z.enum(["commission", "independent"]).nullish(),
};
const relaxedPreferredMethodValidators = {
  preferredMethods: z.array(z.enum(PREFERRED_METHOD_OPTIONS)).nullish(),
};
const relaxedMonthlyOrderVolumeValidators = {
  monthlyOrderVolume: z.enum(MONTHLY_ORDER_VOLUME_OPTIONS).nullish(),
};

const baseValidators = {
  ...contactBasicsValidators,
  ...createPasswordValidators,
  ...taxExemptionValidators,
  ...relaxedPreferredMethodValidators,
  ...preferencesValidators,
};

export const registrationSchema = z
  .discriminatedUnion("accountType", [
    z.object({ accountType: z.literal("professional") }).extend({
      ...baseValidators,
      ...relaxedBusinessOperationValidators,
      ...businessLocationValidators,
      ...licenseValidators,
      ...relaxedMonthlyOrderVolumeValidators,
    }),
    z.object({ accountType: z.literal("salon") }).extend({
      ...baseValidators,
      ...businessLocationValidators,
      ...salonValidators,
      ...licenseValidators,
      ...relaxedMonthlyOrderVolumeValidators,
      // licenseProofFiles stays optional here; enforced as required for
      // non-AU salons by registrationSchema.superRefine below.
    }),
    z.object({ accountType: z.literal("student") }).extend({
      ...baseValidators,
      ...schoolInfoValidators,
    }),
  ])
  .superRefine((data, ctx) => {
    // Cross-field check for the dedicated create-password step.
    // discriminatedUnion can't .refine, so we enforce confirmPassword here.
    const d = data as {
      password?: string;
      confirmPassword?: string;
      zipCode?: string;
      countryCode?: string;
      provinceCode?: string;
      accountType?: string;
      licenseNumber?: string;
      qualification?: string;
      licenseProofFiles?: unknown;
      salonSize?: string;
      salonStructure?: string;
      socialMediaHandle?: string;
    };
    if (d.password && d.confirmPassword && d.password !== d.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
    }
    if (d.zipCode) {
      const result = isValidZipForCountry(d.zipCode, d.countryCode);
      if (result !== true) {
        ctx.addIssue({ code: "custom", message: result, path: ["zipCode"] });
      }
    }

    // Country-aware credential validation for professional + salon flows.
    const country = (d.countryCode ?? "").toUpperCase();
    const isCredentialFlow = d.accountType === "professional" || d.accountType === "salon";
    if (isCredentialFlow) {
      // Australia does not require a licence, ABN, national qualification,
      // or salon-licensing paperwork to provide hair-extension services, so
      // we skip every credential check for AU. Non-AU countries still get
      // the licence + qualification + salon checks enforced below.
      if (country !== "AU") {
        // licenseNumber is required for non-AU credential flows.
        if (!d.licenseNumber || d.licenseNumber.trim().length === 0) {
          ctx.addIssue({
            code: "custom",
            message: "License number is required",
            path: ["licenseNumber"],
          });
        }

        // NZBN check on NZ - only enforce if it looks numeric (allow Hair Council/cert #s).
        if (
          country === "NZ" &&
          d.licenseNumber &&
          /^[\d\s]+$/.test(d.licenseNumber) &&
          !isValidNZBN(d.licenseNumber)
        ) {
          ctx.addIssue({
            code: "custom",
            message: "Enter a valid NZBN (13 digits) or a certificate number",
            path: ["licenseNumber"],
          });
        }

        // Qualification required for UK/IE/NZ/ZA and must match the country.
        if (QUALIFICATION_REQUIRED_COUNTRIES.has(country) && !d.qualification) {
          ctx.addIssue({
            code: "custom",
            message: "Please select your qualification",
            path: ["qualification"],
          });
        }
        if (
          QUALIFICATION_REQUIRED_COUNTRIES.has(country) &&
          d.qualification &&
          !isCurrentQualificationForCountry(country, d.qualification)
        ) {
          ctx.addIssue({
            code: "custom",
            message: "Please select a current qualification for your country",
            path: ["qualification"],
          });
        }

        // Salon-only: require salon size + structure + licence proof upload.
        if (d.accountType === "salon") {
          if (!d.salonSize || d.salonSize.trim().length === 0) {
            ctx.addIssue({
              code: "custom",
              message: "Salon size is required",
              path: ["salonSize"],
            });
          }
          if (!d.salonStructure || d.salonStructure.trim().length === 0) {
            ctx.addIssue({
              code: "custom",
              message: "Salon structure is required",
              path: ["salonStructure"],
            });
          }
          const files = d.licenseProofFiles;
          if (!Array.isArray(files) || files.length === 0) {
            ctx.addIssue({
              code: "custom",
              message: "At least one file is required",
              path: ["licenseProofFiles"],
            });
          }
        }
      }
      // socialMediaHandle is required on Contact Basics for everyone now,
      // so no additional country-scoped rule is needed here.

    }
  });

// Type exports for each account type
export type RegistrationFormData = z.infer<typeof registrationSchema>;
type KeysOfUnion<T> = T extends T ? keyof T : never;
export type ValidFieldNames = KeysOfUnion<RegistrationFormData>;

export const defaultValues: Partial<RegistrationFormData> = {
  phoneCountryCode: "us",
  countryCode: "US",
  subscribeOrderUpdates: true,
  acceptsMarketing: false,
  acceptsSmsMarketing: false,
  referralSource: "",
};

// Generic type to extract specific account type data (supports single or multiple types)
export type RegistrationFormDataByType<T extends AccountType | AccountType[]> =
  T extends AccountType[]
    ? Extract<RegistrationFormData, { accountType: T[number] }>
    : Extract<RegistrationFormData, { accountType: T }>;

export type ProfessionalRegistrationData = Omit<
  RegistrationFormDataByType<"professional">,
  "accountType"
>;
export type SalonRegistrationData = Omit<RegistrationFormDataByType<"salon">, "accountType">;
export type StudentRegistrationData = RegistrationFormDataByType<"student">;

export type AllRegistrationFormData = { accountType: AccountType } & Omit<
  RegistrationFormDataByType<"professional">,
  "accountType"
> &
  Omit<RegistrationFormDataByType<"salon">, "accountType"> &
  Omit<RegistrationFormDataByType<"student">, "accountType">;

export type AccountTypeFormData = z.infer<typeof accountTypeSchema>;
export type BusinessOperationFormData = z.infer<typeof businessOperationSchema>;
export type SchoolInfoFormData = z.infer<typeof schoolInfoSchema>;
export type ContactBasicsFormData = z.infer<typeof contactBasicsSchema>;
export type BusinessLocationFormData = z.infer<typeof businessLocationSchema>;
export type LicenseFormData = z.infer<typeof licenseSchema>;
export type SalonLicenseFormData = z.infer<typeof salonSchema>;
export type TaxExemptionFormData = z.infer<typeof taxExemptionSchema>;

export type PreferencesFormData = z.infer<typeof preferencesSchema>;

type LoginFormType = "login" | "forgot_password";

export const loginSchema = z.discriminatedUnion("formType", [
  z.object({
    formType: z.literal("login"),
    email: z.email("Please enter a valid email address").trim(),
    password: z.string().min(1, "Password is required"),
  }),
  z.object({
    formType: z.literal("forgot_password"),
    email: z
      .email("Please enter a valid email address")
      .trim()
      .refine((val) => !isDisposableEmail(val), DISPOSABLE_EMAIL_MESSAGE),
  }),
]);
type BaseLoginFormData<T extends LoginFormType> = Extract<
  z.infer<typeof loginSchema>,
  { formType: T }
>;

export type LoginFormData = { formType: LoginFormType } & Omit<
  BaseLoginFormData<"login">,
  "formType"
> &
  Omit<BaseLoginFormData<"forgot_password">, "formType">;
