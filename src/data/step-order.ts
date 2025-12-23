import type { Step, AccountType } from "@/types/auth";

/**
 * Step configuration by account type
 */
const STEP_ORDER: Record<string, Step[]> = {
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
