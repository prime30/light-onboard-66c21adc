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
    required_error: "Please select an account type",
  }),
});

// Business Operation Schema (for professionals)
export const businessOperationSchema = z.object({
  businessOperationType: z.enum(["commission", "independent"], {
    required_error: "Please select how you operate your business",
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
    .string()
    .trim()
    .email("Please enter a valid email address")
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
  licenseNumber: z
    .string()
    .trim()
    .min(1, "License number is required")
    .max(100, "License number must be less than 100 characters"),
  salonSize: z.string().min(1, "Salon size is required"),
  salonStructure: z.string().min(1, "Salon structure is required"),
  licenseFile: z.instanceof(File).nullable().optional(),
  licenseProofFiles: z.array(z.instanceof(File)).optional(),
});

// Tax Exemption Schema
export const taxExemptionSchema = z.object({
  hasTaxExemption: z.boolean({
    required_error: "Please select an option",
  }),
  taxExemptFile: z.instanceof(File).nullable().optional(),
});

// Wholesale Terms Schema
export const wholesaleTermsSchema = z.object({
  agreedToWholesaleTerms: z.literal(true, {
    errorMap: () => ({ message: "Please agree to the wholesale terms to continue" }),
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
  subscribeOrderUpdates: z.boolean().default(true),
  subscribeMarketing: z.boolean().default(false),
  subscribePromotions: z.boolean().default(true),
});

// Password Schema for signup
export const passwordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be less than 128 characters")
      .refine((val) => /[A-Z]/.test(val), "Password must contain at least one uppercase letter")
      .refine((val) => /[0-9]/.test(val), "Password must contain at least one number"),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.confirmPassword && data.password !== data.confirmPassword) {
        return false;
      }
      return true;
    },
    {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }
  );

// Sign-in Schema
export const signInSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

// Forgot Password Schema
export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
});

// Complete signup form schema (all fields combined)
export const completeSignupSchema = z.object({
  // Account type
  accountType: z.enum(["professional", "salon", "student"]),

  // Business operation (professional only)
  businessOperationType: z.enum(["commission", "independent"]).nullable().optional(),

  // Contact basics
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  preferredName: z.string().trim().max(100).optional(),
  email: z.string().trim().email().max(255),
  phoneNumber: z.string().min(1),
  phoneCountryCode: z.string().min(1),

  // Business location (professional and salon)
  businessName: z.string().optional(),
  businessAddress: z.string().optional(),
  suiteNumber: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),

  // School info (student only)
  schoolName: z.string().optional(),
  schoolState: z.string().optional(),

  // License (professional and salon)
  licenseNumber: z.string().optional(),
  salonSize: z.string().optional(),
  salonStructure: z.string().optional(),

  // Tax exemption
  hasTaxExemption: z.boolean().nullable(),

  // Wholesale terms
  agreedToWholesaleTerms: z.boolean(),

  // Preferences
  birthdayMonth: z.string().optional(),
  birthdayDay: z.string().optional(),
  socialMediaHandle: z.string().optional(),
  subscribeOrderUpdates: z.boolean(),
  subscribeMarketing: z.boolean(),
  subscribePromotions: z.boolean(),

  // Password
  password: z.string().min(8),
});

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
export type PasswordFormData = z.infer<typeof passwordSchema>;
export type SignInFormData = z.infer<typeof signInSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type CompleteSignupFormData = z.infer<typeof completeSignupSchema>;
