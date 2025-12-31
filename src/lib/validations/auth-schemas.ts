import { z } from "zod";
import { countryCodes } from "../../data/country-codes.ts";
import { formatPhoneNumber } from "./form-utils.ts";
import { UploadFileItem, uploadFileItemSchema } from "./file-schema.ts";

function convertFileUploadToUrl(
  value: UploadFileItem | UploadFileItem[] | string | string[] | undefined
) {
  if (!value) return undefined;

  if (typeof value === "string") {
    return [value];
  }

  if (!Array.isArray(value)) {
    value = [value];
  }

  const converted: string[] = value.map((item: UploadFileItem | string) => {
    if (typeof item === "string") return item;
    return item.url;
  });

  return converted;
}

function fileUploadSchema(optional: boolean) {
  const fileSchema = z.union([
    z.array(uploadFileItemSchema).min(1),
    uploadFileItemSchema,
    z.string(),
    z.array(z.string()).min(1),
  ]);

  if (optional) {
    return fileSchema.optional().nullable().overwrite(convertFileUploadToUrl);
  }

  return fileSchema.overwrite(convertFileUploadToUrl);
}

// Phone number validation (10 digits, various formats)
const phoneRegex = /^[\d\s\-().]+$/;
const isValidPhoneNumber = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
};

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
    .string()
    .trim()
    .min(1, "School/Apprenticeship name is required")
    .max(200, "Name must be less than 200 characters"),
  schoolState: z.string().min(1, "State/Province is required"),
  enrollmentProofFiles: fileUploadSchema(true),
};
export const schoolInfoSchema = z.object(schoolInfoValidators);

// Contact Basics Schema
const contactBasicsValidators = {
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(100, "First name must be less than 100 characters"),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(100, "Last name must be less than 100 characters"),
  preferredName: z
    .string()
    .trim()
    .max(100, "Preferred name must be less than 100 characters")
    .optional(),
  email: z
    .email("Please enter a valid email address")
    .trim()
    .max(255, "Email must be less than 255 characters"),
  phoneNumber: z
    .string()
    .min(1, "Phone number is required")
    .refine((val) => phoneRegex.test(val), "Please enter a valid phone number")
    .refine((val) => isValidPhoneNumber(val), "Please enter a valid 10-digit phone number")
    .transform((val) => formatPhoneNumber(val)),
  phoneCountryCode: z
    .string()
    .min(1, "Country code is required")
    .refine(
      (value) => countryCodes.some((country) => country.iso === value || country.code === value),
      "Invalid country selected"
    )
    .overwrite((value) => {
      const phoneCountryCode = countryCodes.find((c) => c.iso === value)?.code || value;
      return phoneCountryCode;
    }),
};
export const contactBasicsSchema = z.object(contactBasicsValidators);

// Business Location Schema
const businessLocationValidators = {
  businessName: z
    .string()
    .trim()
    .min(1, "Business or salon name is required")
    .max(200, "Business name must be less than 200 characters"),
  businessAddress: z
    .string()
    .trim()
    .min(1, "Address is required")
    .max(500, "Address must be less than 500 characters"),
  suiteNumber: z.string().trim().max(50, "Suite number must be less than 50 characters").optional(),
  country: z.string().min(1, "Country is required"),
  city: z
    .string()
    .trim()
    .min(1, "City is required")
    .max(100, "City must be less than 100 characters"),
  state: z.string().min(1, "State/Province is required"),
  zipCode: z
    .string()
    .trim()
    .min(1, "Zip/Postal code is required")
    .max(20, "Zip code must be less than 20 characters"),
};
export const businessLocationSchema = z.object(businessLocationValidators);

// License Schema (for professionals)
const licenseValidators = {
  licenseNumber: z
    .string()
    .trim()
    .min(1, "License number is required")
    .max(100, "License number must be less than 100 characters"),
  licenseProofFiles: fileUploadSchema(true),
};
export const licenseSchema = z.object(licenseValidators);

// License Schema for salons (includes additional fields)
const salonLicenseValidators = {
  salonSize: z.string().min(1, "Salon size is required"),
  salonStructure: z.string().min(1, "Salon structure is required"),
};
export const salonLicenseSchema = z.object(salonLicenseValidators);

// Tax Exemption Schema
const taxExemptionValidators = {
  hasTaxExemption: z.boolean({
    error: "Please select an option",
  }),
  taxExemptFile: fileUploadSchema(true),
};
export const taxExemptionSchema = z.object(taxExemptionValidators);

// Wholesale Terms Schema
const wholesaleValidators = {
  wholesaleAgreed: z.literal(true, {
    error: "Please agree to the wholesale terms to continue",
  }),
};
export const wholesaleTermsSchema = z.object(wholesaleValidators);

// Preferences Schema
const preferencesValidators = {
  birthdayMonth: z.string().optional(),
  birthdayDay: z.string().optional(),
  socialMediaHandle: z
    .string()
    .trim()
    .max(100, "Handle must be less than 100 characters")
    .optional(),
  subscribeOrderUpdates: z
    .boolean()
    .optional()
    .transform((val) => val ?? true),
  subscribeMarketing: z
    .boolean()
    .optional()
    .transform((val) => val ?? false),
  subscribePromotions: z
    .boolean()
    .optional()
    .transform((val) => val ?? true),
};
export const preferencesSchema = z.object(preferencesValidators);

const baseValidators = {
  ...contactBasicsValidators,
  ...taxExemptionValidators,
  ...wholesaleValidators,
  ...preferencesValidators,
};

export const registrationSchema = z.discriminatedUnion("accountType", [
  z.object({ accountType: z.literal("professional") }).extend({
    ...baseValidators,
    ...businessOperationValidators,
    ...businessLocationValidators,
    ...licenseValidators,
  }),
  z.object({ accountType: z.literal("salon") }).extend({
    ...baseValidators,
    ...salonLicenseValidators,
    ...licenseValidators,
  }),
  z.object({ accountType: z.literal("student") }).extend({
    ...baseValidators,
    ...schoolInfoValidators,
  }),
]);

// Type exports for each account type
export type RegistrationFormData = z.infer<typeof registrationSchema>;
type KeysOfUnion<T> = T extends T ? keyof T : never;
export type ValidFieldNames = KeysOfUnion<RegistrationFormData>;

export type AccountTypeFormData = z.infer<typeof accountTypeSchema>;
export type BusinessOperationFormData = z.infer<typeof businessOperationSchema>;
export type SchoolInfoFormData = z.infer<typeof schoolInfoSchema>;
export type ContactBasicsFormData = z.infer<typeof contactBasicsSchema>;
export type BusinessLocationFormData = z.infer<typeof businessLocationSchema>;
export type LicenseFormData = z.infer<typeof licenseSchema>;
export type SalonLicenseFormData = z.infer<typeof salonLicenseSchema>;
export type TaxExemptionFormData = z.infer<typeof taxExemptionSchema>;
export type WholesaleTermsFormData = z.infer<typeof wholesaleTermsSchema>;
export type PreferencesFormData = z.infer<typeof preferencesSchema>;
