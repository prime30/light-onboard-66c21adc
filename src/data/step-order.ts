import { ValidFieldNames } from "@/lib/validations/auth-schemas";
import {
  accountTypeSchema,
  businessLocationSchema,
  businessOperationSchema,
  contactBasicsSchema,
  licenseSchema,
  preferencesSchema,
  schoolInfoSchema,
  taxExemptionSchema,
  wholesaleTermsSchema,
} from "@/lib/validations/auth-schemas";
import type { Step, AccountType } from "@/types/auth";
import { ZodObject } from "zod";

/**
 * Human-readable display names for steps
 */
export const STEP_DISPLAY_NAMES: Record<Step, string> = {
  onboarding: "Getting Started",
  reviews: "Reviews",
  "account-type": "Account Type",
  "contact-basics": "Contact Information",
  license: "Professional License",
  "business-operation": "Business Operations",
  "business-location": "Business Location",
  "school-info": "School Information",
  "wholesale-terms": "Wholesale Terms",
  "tax-exemption": "Tax Exemption",
  preferences: "Preferences",
  summary: "Review & Submit",
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
    "business-location",
    "license",
    "tax-exemption",
    "wholesale-terms",
    "preferences",
  ],
  salon: [
    "account-type",
    "business-location",
    "contact-basics",
    "license",
    "tax-exemption",
    "wholesale-terms",
    "preferences",
  ],
  student: [
    "account-type",
    "school-info",
    "contact-basics",
    "tax-exemption",
    "wholesale-terms",
    "preferences",
  ],
};

/**
 * Get the step order for a given account type
 */
export function getStepOrder(accountType: AccountType): Step[] {
  if (!accountType) return ["account-type"];
  return STEP_ORDER[accountType] || STEP_ORDER.professional;
}

export const stepValidations: Record<Step, ZodObject | null> = {
  reviews: null,
  onboarding: null,
  "account-type": accountTypeSchema,
  "contact-basics": contactBasicsSchema,
  license: licenseSchema,
  "business-operation": businessOperationSchema,
  "business-location": businessLocationSchema,
  "school-info": schoolInfoSchema,
  "wholesale-terms": wholesaleTermsSchema,
  "tax-exemption": taxExemptionSchema,
  preferences: preferencesSchema,
  summary: null,
  success: null,
};

export const fieldsForStep: Record<Step, ValidFieldNames[]> = Object.fromEntries(
  Object.entries(stepValidations).map(([step, schema]) => [
    step,
    schema ? Object.keys(schema.shape) : [],
  ])
) as Record<Step, ValidFieldNames[]>;

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
  summary: {
    name: "summary",
    displayName: STEP_DISPLAY_NAMES.summary,
    fields: fieldsForStep.summary,
    schema: stepValidations.summary,
    accountTypes: ["professional", "salon", "student"],
  },
  success: {
    name: "success",
    displayName: STEP_DISPLAY_NAMES.success,
    fields: fieldsForStep.success,
    schema: stepValidations.success,
    accountTypes: [],
  },
};
