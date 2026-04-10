import type { Step, AccountType } from "@/types/auth";
import { STEP_ORDER } from "@/data/step-order";

/**
 * Dynamic import for each lazy-loaded step.
 * Calling the function triggers the network fetch; the module is cached by
 * the browser after the first call so React.lazy renders it synchronously.
 */
const STEP_IMPORTS: Partial<Record<Step, () => Promise<unknown>>> = {
  "account-type":       () => import("@/components/registration/steps/AccountTypeForm"),
  "business-operation": () => import("@/components/registration/steps/BusinessOperationStep"),
  "contact-basics":     () => import("@/components/registration/steps/ContactBasicsStep"),
  "business-location":  () => import("@/components/registration/steps/BusinessLocationStep"),
  "school-info":        () => import("@/components/registration/steps/SchoolInfoStep"),
  "license":            () => import("@/components/registration/steps/LicenseStep"),
  "tax-exemption":      () => import("@/components/registration/steps/TaxExemptionStep"),
  "wholesale-terms":    () => import("@/components/registration/steps/WholesaleTermsStep"),
  "preferences":        () => import("@/components/registration/steps/PreferencesStep"),
  "summary":            () => import("@/components/registration/steps/SummaryForm"),
  "success":            () => import("@/components/registration/steps/SuccessForm"),
};

/** Fire-and-forget import for a single step. Safe to call multiple times. */
export function prefetchStep(step: Step): void {
  STEP_IMPORTS[step]?.()?.catch(() => {});
}

/**
 * Prefetch the next step in the flow for the given account type.
 * When accountType is unknown (e.g. onboarding), prefetches all three
 * possible first steps so any selection is instant.
 */
export function prefetchNextStep(current: Step, accountType: AccountType | undefined): void {
  if (!accountType) {
    // On onboarding / before account type is chosen, warm up the first step
    prefetchStep("account-type");
    return;
  }

  const order = STEP_ORDER[accountType];
  if (!order) return;

  const idx = order.indexOf(current);

  // Prefetch next step
  if (idx !== -1 && idx + 1 < order.length) {
    prefetchStep(order[idx + 1]);
  }

  // Also prefetch the step after that so two taps ahead is instant
  if (idx !== -1 && idx + 2 < order.length) {
    prefetchStep(order[idx + 2]);
  }

  // Always warm summary + success — they're always the last two
  prefetchStep("summary");
  prefetchStep("success");
}
