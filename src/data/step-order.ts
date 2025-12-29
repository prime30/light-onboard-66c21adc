import { ValidFieldNames } from "@/components/registration/context";
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
    "contact-info",
    "summary",
  ],
  salon: [
    "account-type",
    "business-location",
    "contact-basics",
    "license",
    "tax-exemption",
    "wholesale-terms",
    "contact-info",
    "summary",
  ],
  student: [
    "account-type",
    "school-info",
    "contact-basics",
    "tax-exemption",
    "wholesale-terms",
    "contact-info",
    "summary",
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
  "contact-info": preferencesSchema,
  summary: null,
  success: null,
};

export const fieldsForStep: Record<Step, ValidFieldNames[]> = Object.fromEntries(
  Object.entries(stepValidations).map(([step, schema]) => [
    step,
    schema ? Object.keys(schema.shape) : [],
  ])
) as Record<Step, ValidFieldNames[]>;
