import type { Step, AccountType } from "@/types/auth";
import { STEP_ORDER } from "@/data/step-order";

// Asset URLs referenced inside lazy step components. Importing them here
// (top-level) lets Vite resolve the hashed URL at build time so we can warm
// the browser image cache before the step mounts — eliminating image FOUC.
import methodSuperweft from "@/assets/method-superweft.webp?url";
import methodKeratinTips from "@/assets/method-keratin-tips.webp?url";
import methodSecretapes from "@/assets/method-secretapes.webp?url";
import methodVolumeWeft from "@/assets/method-volume-weft.webp?url";
import blogResaleLicense from "@/assets/blog-resale-license.jpg?url";
import colorRingProduct from "@/assets/color-ring-product.png?url";

const STEP_IMAGE_URLS: string[] = [
  methodSuperweft,
  methodKeratinTips,
  methodSecretapes,
  methodVolumeWeft,
  blogResaleLicense,
  colorRingProduct,
];

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
  "preferred-method":   () => import("@/components/registration/steps/PreferredMethodStep"),
  "preferences":        () => import("@/components/registration/steps/PreferencesStep"),
  "summary":            () => import("@/components/registration/steps/SummaryForm"),
  "success":            () => import("@/components/registration/steps/SuccessForm"),
};

/** Fire-and-forget import for a single step. Safe to call multiple times. */
export function prefetchStep(step: Step): void {
  STEP_IMPORTS[step]?.()?.catch(() => {});
}

/**
 * Eagerly preload ALL step chunks. Called once when the auth flow mounts,
 * deferred via requestIdleCallback so it never competes with the first paint.
 * Once cached, every step transition becomes synchronous (no Suspense flash).
 */
let allStepsPrefetched = false;
export function prefetchAllSteps(): void {
  if (allStepsPrefetched) return;
  allStepsPrefetched = true;

  // Preferred-method images are visible above the fold on that step and must
  // not wait for browser idle time; fetch them immediately at high priority.
  warmStepImages();

  const run = () => {
    // Warm JS chunks
    for (const importer of Object.values(STEP_IMPORTS)) {
      try {
        importer?.()?.catch(() => {});
      } catch {
        /* noop */
      }
    }
    warmStepImages();
  };

  if (typeof window === "undefined") {
    run();
    return;
  }

  const ric = (window as unknown as {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  }).requestIdleCallback;

  if (typeof ric === "function") {
    ric(run, { timeout: 1500 });
  } else {
    window.setTimeout(run, 300);
  }
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
