import { z } from "zod";

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
export const businessOperationSchema = z.object({
  businessOperationType: z.enum(["commission", "independent"], {
    error: "Please select how you operate your business",
  }),
});

// School Info Schema (for students)
export const schoolInfoSchema = z.object({
  schoolName: z
    .string()
    .trim()
    .min(1, "School/Apprenticeship name is required")
    .max(200, "Name must be less than 200 characters"),
  schoolState: z.string().min(1, "State/Province is required"),
  enrollmentProofFiles: z
    .array(z.instanceof(File))
    .min(1, "Please upload at least one proof of enrollment"),
});

// Contact Basics Schema
export const contactBasicsSchema = z.object({
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
    .refine((val) => isValidPhoneNumber(val), "Please enter a valid 10-digit phone number"),
  phoneCountryCode: z.string().min(1, "Country code is required"),
});

// Business Location Schema
export const businessLocationSchema = z.object({
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
});

// License Schema (for professionals)
export const licenseSchema = z.object({
  licenseNumber: z
    .string()
    .trim()
    .min(1, "License number is required")
    .max(100, "License number must be less than 100 characters"),
  licenseFile: z.instanceof(File).nullable().optional(),
  licenseProofFiles: z.array(z.instanceof(File)).optional(),
});

// License Schema for salons (includes additional fields)
export const salonLicenseSchema = z.object({
  salonSize: z.string().min(1, "Salon size is required"),
  salonStructure: z.string().min(1, "Salon structure is required"),
});

// Tax Exemption Schema
export const taxExemptionSchema = z.object({
  hasTaxExemption: z.boolean({
    error: "Please select an option",
  }),
  taxExemptFile: z.instanceof(File).nullable().optional(),
});

// Wholesale Terms Schema
export const wholesaleTermsSchema = z.object({
  wholesaleAgreed: z.literal(true, {
    error: "Please agree to the wholesale terms to continue",
  }),
});

// Preferences Schema
export const preferencesSchema = z.object({
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
});

export const registrationSchema = accountTypeSchema
  .and(businessOperationSchema)
  .and(schoolInfoSchema)
  .and(contactBasicsSchema)
  .and(businessLocationSchema)
  .and(licenseSchema)
  .and(salonLicenseSchema)
  .and(taxExemptionSchema)
  .and(wholesaleTermsSchema)
  .and(preferencesSchema);
export type RegistrationFormData = z.infer<typeof registrationSchema>;

// Type exports
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
