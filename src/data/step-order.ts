import { ValidFieldNames } from "@/lib/validations/auth-schemas";
import {
  accountTypeSchema,
  businessLocationSchema,
  businessOperationSchema,
  contactBasicsSchema,
  createPasswordStepSchema,
  licenseSchema,
  preferencesSchema,
  preferredMethodSchema,
  salonLicenseStepSchema,
  schoolInfoSchema,
  taxExemptionSchema,
  wholesaleTermsSchema,
} from "@/lib/validations/auth-schemas";
import type { Step, AccountType } from "@/types/auth";
import { ZodObject } from "zod";

/**
 * Human-readable display names for steps
 */
/**
 * Human-readable display names for individual form fields.
 * Used in the "missing fields" popover on the submit step so users
 * see "Email" instead of raw schema keys like "email".
 */
export const FIELD_DISPLAY_NAMES: Partial<Record<ValidFieldNames, string>> = {
  accountType: "Account type",
  businessOperationType: "Business operation type",
  schoolName: "School / apprenticeship name",
  schoolState: "School state / province",
  enrollmentProofFiles: "Enrollment proof",
  firstName: "First name",
  lastName: "Last name",
  preferredName: "Preferred name",
  email: "Email",
  phoneNumber: "Phone number",
  phoneCountryCode: "Phone country code",
  password: "Password",
  confirmPassword: "Confirm password",
  businessName: "Business / salon name",
  businessAddress: "Street address",
  suiteNumber: "Suite number",
  countryCode: "Country",
  city: "City",
  provinceCode: "State / province",
  zipCode: "Zip / postal code",
  licenseNumber: "License number",
  licenseProofFiles: "License document",
  salonSize: "Salon size",
  salonStructure: "Salon structure",
  taxExempt: "Tax exemption choice",
  taxExemptFile: "Tax exemption document",
  wholesaleAgreed: "Wholesale terms agreement",
  preferredMethods: "Preferred methods",
  birthdayMonth: "Birthday month",
  birthdayDay: "Birthday day",
  socialMediaHandle: "Social media handle",
  referralSource: "How you heard about us",
  subscribeOrderUpdates: "Order update preference",
  acceptsMarketing: "Marketing preference",
};

export const STEP_DISPLAY_NAMES: Record<Step, string> = {
  onboarding: "Getting Started",
  reviews: "Reviews",
  "account-type": "Account Type",
  "contact-basics": "Contact Information",
  "create-password": "Create Password",
  license: "Professional License",
  "business-operation": "Business Operations",
  "business-location": "Business Location",
  "school-info": "School Information",
  "wholesale-terms": "Wholesale Terms",
  "tax-exemption": "Tax Exemption",
  "preferred-method": "Preferred Method",
  preferences: "Preferences",
  summary: "Review & Submit",
  assessing: "Assessing Application",
  success: "Success",
};

/**
 * Step configuration by account type
 */
export const STEP_ORDER: Record<string, Step[]> = {
  professional: [
    "account-type",
    "business-operation",
    "contact-basics",
    "create-password",
    "business-location",
    "license",
    "tax-exemption",
    "wholesale-terms",
    "preferred-method",
    "preferences",
  ],
  salon: [
    "account-type",
    "business-location",
    "contact-basics",
    "create-password",
    "license",
    "tax-exemption",
    "wholesale-terms",
    "preferred-method",
    "preferences",
  ],
  student: [
    "account-type",
    "school-info",
    "contact-basics",
    "create-password",
    "tax-exemption",
    "wholesale-terms",
    "preferred-method",
    "preferences",
  ],
};

/**
 * Get the step order for a given account type.
 *
 * When `autoApprove` is true we move the create-password step OUT of its
 * normal mid-flow position and the StepProvider will append it after the
 * faux "assessing" screen — so the user submits an "application" at the
 * summary, watches a 100% review animation, then sets a password to
 * actually create the account.
 */
export function getStepOrder(
  accountType: AccountType,
  autoApprove = false
): Step[] {
  if (!accountType) return ["account-type"];
  const order = STEP_ORDER[accountType] || STEP_ORDER.professional;
  if (!autoApprove) return order;
  return order.filter((s) => s !== "create-password");
}

export const stepValidations: Record<Step, ZodObject | null> = {
  reviews: null,
  onboarding: null,
  "account-type": accountTypeSchema,
  "contact-basics": contactBasicsSchema,
  // Plain ZodObject schema (refinement runs at registrationSchema level).
  "create-password": createPasswordStepSchema,
  license: licenseSchema,
  "business-operation": businessOperationSchema,
  "business-location": businessLocationSchema,
  "school-info": schoolInfoSchema,
  "wholesale-terms": wholesaleTermsSchema,
  "tax-exemption": taxExemptionSchema,
  "preferred-method": preferredMethodSchema,
  preferences: preferencesSchema,
  summary: null,
  assessing: null,
  success: null,
};

/**
 * Returns the schema that gates a given step for a given account type.
 *
 * Some steps (currently only "license") require different validation per
 * account type — e.g. salons must also fill salon size + structure AND must
 * upload a license proof, while individual professionals can skip the upload.
 * Use this everywhere you would otherwise read `stepValidations[step]`.
 */
export function getStepSchema(step: Step, accountType: AccountType): ZodObject | null {
  if (step === "license" && accountType === "salon") {
    return salonLicenseStepSchema;
  }
  return stepValidations[step];
}

export const fieldsForStep: Record<Step, ValidFieldNames[]> = Object.fromEntries(
  Object.entries(stepValidations).map(([step, schema]) => [
    step,
    schema ? Object.keys(schema.shape) : [],
  ])
) as Record<Step, ValidFieldNames[]>;

// Salons need salonSize + salonStructure + licenseProofFiles surfaced as
// "missing fields" on the license step. Inject them into the field map for the
// license step so the popover/shake helpers treat them as required.
fieldsForStep.license = [
  ...new Set([
    ...fieldsForStep.license,
    ...(Object.keys(salonLicenseStepSchema.shape) as ValidFieldNames[]),
  ]),
];

type StepInfo = {
  name: Step;
  displayName: string;
  fields: ValidFieldNames[];
  schema: ZodObject | null;
  accountTypes?: AccountType[];
};

export const STEPS: Record<Step, StepInfo> = {
  reviews: {
    name: "reviews",
    displayName: STEP_DISPLAY_NAMES.reviews,
    fields: fieldsForStep.reviews,
    schema: stepValidations.reviews,
    accountTypes: [],
  },
  onboarding: {
    name: "onboarding",
    displayName: STEP_DISPLAY_NAMES.onboarding,
    fields: fieldsForStep.onboarding,
    schema: stepValidations.onboarding,
    accountTypes: [],
  },
  "account-type": {
    name: "account-type",
    displayName: STEP_DISPLAY_NAMES["account-type"],
    fields: fieldsForStep["account-type"],
    schema: stepValidations["account-type"],
    accountTypes: ["professional", "salon", "student"],
  },
  "contact-basics": {
    name: "contact-basics",
    displayName: STEP_DISPLAY_NAMES["contact-basics"],
    fields: fieldsForStep["contact-basics"],
    schema: stepValidations["contact-basics"],
    accountTypes: ["professional", "salon", "student"],
  },
  "create-password": {
    name: "create-password",
    displayName: STEP_DISPLAY_NAMES["create-password"],
    fields: fieldsForStep["create-password"],
    schema: stepValidations["create-password"],
    accountTypes: ["professional", "salon", "student"],
  },
  license: {
    name: "license",
    displayName: STEP_DISPLAY_NAMES.license,
    fields: fieldsForStep.license,
    schema: stepValidations.license,
    accountTypes: ["professional", "salon"],
  },
  "business-operation": {
    name: "business-operation",
    displayName: STEP_DISPLAY_NAMES["business-operation"],
    fields: fieldsForStep["business-operation"],
    schema: stepValidations["business-operation"],
    accountTypes: ["professional"],
  },
  "business-location": {
    name: "business-location",
    displayName: STEP_DISPLAY_NAMES["business-location"],
    fields: fieldsForStep["business-location"],
    schema: stepValidations["business-location"],
    accountTypes: ["professional", "salon"],
  },
  "school-info": {
    name: "school-info",
    displayName: STEP_DISPLAY_NAMES["school-info"],
    fields: fieldsForStep["school-info"],
    schema: stepValidations["school-info"],
    accountTypes: ["student"],
  },
  "wholesale-terms": {
    name: "wholesale-terms",
    displayName: STEP_DISPLAY_NAMES["wholesale-terms"],
    fields: fieldsForStep["wholesale-terms"],
    schema: stepValidations["wholesale-terms"],
    accountTypes: ["professional", "salon", "student"],
  },
  "tax-exemption": {
    name: "tax-exemption",
    displayName: STEP_DISPLAY_NAMES["tax-exemption"],
    fields: fieldsForStep["tax-exemption"],
    schema: stepValidations["tax-exemption"],
    accountTypes: ["professional", "salon", "student"],
  },
  preferences: {
    name: "preferences",
    displayName: STEP_DISPLAY_NAMES.preferences,
    fields: fieldsForStep["preferences"],
    schema: stepValidations["preferences"],
    accountTypes: ["professional", "salon", "student"],
  },
  "preferred-method": {
    name: "preferred-method",
    displayName: STEP_DISPLAY_NAMES["preferred-method"],
    fields: fieldsForStep["preferred-method"],
    schema: stepValidations["preferred-method"],
    accountTypes: ["professional", "salon", "student"],
  },
  summary: {
    name: "summary",
    displayName: STEP_DISPLAY_NAMES.summary,
    fields: fieldsForStep.summary,
    schema: stepValidations.summary,
    accountTypes: ["professional", "salon", "student"],
  },
  assessing: {
    name: "assessing",
    displayName: STEP_DISPLAY_NAMES.assessing,
    fields: [],
    schema: null,
    accountTypes: [],
  },
  success: {
    name: "success",
    displayName: STEP_DISPLAY_NAMES.success,
    fields: fieldsForStep.success,
    schema: stepValidations.success,
    accountTypes: [],
  },
};
