import {
  createContext,
  useContext,
  ReactNode,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  fieldsForStep,
  getStepOrder,
  getStepSchema,
  stepValidations,
  STEP_DISPLAY_NAMES,
} from "@/data/step-order";
import { useToast } from "@/hooks/use-toast";
import { Step, IncompleteStepInfo } from "@/types/auth";
import { QUALIFICATION_REQUIRED_COUNTRIES, ValidFieldNames } from "@/lib/validations/auth-schemas";
import { isCurrentQualificationForCountry } from "@/data/qualifications";
import { useFormData, ValidationStatus } from "./FormDataContext";
import { useModeContext } from "./ModeContext";
import { useOutletContext } from "react-router";
import { RegistrationLayoutOutletContext } from "../RegistrationLayout";
import { useBusinessOperationStepEnabled, useOrderVolumeStepEnabled, usePreferredMethodStepEnabled, useBusinessLocationStepEnabled,
  useReferralStepEnabled, useSummaryStepEnabled, useAutoApproval } from "@/lib/app-settings";
import { isValidPhoneNumber } from "@/lib/validations/form-utils";

export type StepContextType = {
  totalSteps: number;
  currentStep: Step;
  setCurrentStep: React.Dispatch<React.SetStateAction<Step>>;
  goToNextStep: () => void;
  goToPrevStep: () => void;
  goToStep: (step: Step) => void;
  showValidationErrors: boolean;
  completedSteps: Record<Step, ValidationStatus>;
  incompleteSteps: IncompleteStepInfo[];
  getStepValidationStatus: (step: Step) => ValidationStatus;
  getStepNumber: (step: Step) => number;
  getStepForField: (fieldName: ValidFieldNames) => Step | null;
  steps: Step[];
  visitedSteps: Set<Step>;
};

// Create the context
export const StepContext = createContext<StepContextType | null>(null);

type StepProviderProps = {
  children: ReactNode;
};

// Provider component
export function StepProvider({ children }: StepProviderProps) {
  const { setFormProgress } = useOutletContext<RegistrationLayoutOutletContext>();
  const { watch, errors, subscribe, fullErrors, emailConflict, setError, setFocus, clearErrors } =
    useFormData();

  const accountType = watch("accountType");
  const countryCode = watch("countryCode");
  const { toast } = useToast();
  const { setTransitionDirection, setIsTransitioning, mainScrollRef } = useModeContext();
  const { enabled: autoApprove, loading: autoApproveLoading } = useAutoApproval();
  const { enabled: bizOpStepEnabled, loading: bizOpLoading } = useBusinessOperationStepEnabled();
  const { enabled: orderVolumeStepEnabled, loading: orderVolumeLoading } = useOrderVolumeStepEnabled();
  const { enabled: preferredMethodStepEnabled, loading: preferredMethodLoading } = usePreferredMethodStepEnabled();
  const { enabled: businessLocationStepEnabled, loading: businessLocationLoading } = useBusinessLocationStepEnabled();
  const { enabled: referralStepEnabled, loading: referralLoading } = useReferralStepEnabled();
  const { enabled: summaryStepEnabled, loading: summaryStepLoading } = useSummaryStepEnabled();

  // Until every flag has resolved we do not know the real step list. Building
  // it from placeholder defaults and then rebuilding once the flags land is
  // what made the flow look like it "skips" steps, so hold the list at the
  // pre-account-type prefix while loading.
  const flagsLoading =
    autoApproveLoading ||
    bizOpLoading ||
    orderVolumeLoading ||
    preferredMethodLoading ||
    businessLocationLoading ||
    referralLoading ||
    summaryStepLoading;

  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>("onboarding");
  const [dirtySteps, setDirtySteps] = useState<Set<Step>>(() => new Set());

  const [completedSteps, setCompletedSteps] = useState<Record<Step, ValidationStatus>>(
    {} as Record<Step, ValidationStatus>
  );

  const { steps, totalSteps, currentStepNumber } = useMemo(() => {
    if (flagsLoading) {
      const pending: Step[] = ["onboarding", "account-type"];
      return {
        steps: pending,
        totalSteps: pending.length,
        currentStepNumber: pending.indexOf(currentStep),
      };
    }
    const hiddenSteps: Step[] = [];
    if (!bizOpStepEnabled) hiddenSteps.push("business-operation");
    if (!orderVolumeStepEnabled) hiddenSteps.push("monthly-order-volume");
    if (!preferredMethodStepEnabled) hiddenSteps.push("preferred-method");
    if (!businessLocationStepEnabled) hiddenSteps.push("business-location");
    if (!referralStepEnabled) hiddenSteps.push("preferences");
    const newSteps = getStepOrder(accountType, autoApprove, countryCode, hiddenSteps).slice();
    newSteps.unshift("onboarding");
    if (summaryStepEnabled) {
      newSteps.push("summary");
    }
    // When auto-approval is ON, the password step moves to AFTER summary,
    // gated by a faux "assessing" review animation, and the welcome-offer
    // (subscribe) step comes right after the password. If the summary step is
    // hidden, the welcome-offer step becomes the final real submit gate.
    if (autoApprove && accountType) {
      newSteps.push("assessing", "create-password", "welcome-offer");
    }

    const totalSteps = newSteps.length;
    const currentStepNumber = newSteps.indexOf(currentStep);

    return {
      steps: newSteps,
      totalSteps,
      currentStepNumber,
    };
  }, [accountType, countryCode, currentStep, autoApprove, flagsLoading, bizOpStepEnabled, orderVolumeStepEnabled, preferredMethodStepEnabled, businessLocationStepEnabled, referralStepEnabled]);

  useEffect(() => {
    if (!steps.includes(currentStep)) return;

    setDirtySteps((prev) => {
      if (prev.has(currentStep)) return prev;
      const next = new Set(prev);
      next.add(currentStep);
      return next;
    });
  }, [currentStep, steps]);

  // Guard for mid-session auto-approval flips (and any other future setting
  // that mutates the step ordering). When auto-approval turns OFF, the
  // post-summary `assessing` and `create-password` steps disappear from
  // `steps`. If the user happened to be parked on one of them when the
  // setting changed, currentStepNumber becomes -1 and the next/prev
  // handlers send them back to onboarding. Snap them forward to `summary`
  // (the natural recovery point) instead. POST_FLOW steps live outside
  // `steps` by design - leave those alone.
  useEffect(() => {
    // While the flags load, `steps` is an intentional placeholder prefix - do
    // not treat a restored mid-flow step as invalid.
    if (flagsLoading) return;
    const POST_FLOW: Step[] = ["success", "schedule", "schedule-confirmed"];
    if (POST_FLOW.includes(currentStep)) return;
    if (steps.length === 0) return;
    if (steps.includes(currentStep)) return;
    setCurrentStep("summary");
  }, [steps, currentStep, flagsLoading]);


  const getStepValidationStatus = useCallback(
    (step: Step): ValidationStatus => {
      const schema = getStepSchema(step, accountType);

      if (!schema) {
        return "complete";
      }

      const values = watch();
      if (
        step === "contact-basics" &&
        emailConflict?.email === ((values.email ?? "") as string).trim().toLowerCase()
      ) {
        return "error";
      }
      const isValid = schema.safeParse(values);

      // Cross-field refinements not encoded in the per-step ZodObject must
      // also gate completion - otherwise the submit button stays enabled
      // and the user sees a generic "fix errors" toast with nothing
      // highlighted. Add each such rule here.
      const passesExtraRefinements = (() => {
        if (step === "create-password") {
          const { password, confirmPassword } = values as {
            password?: string;
            confirmPassword?: string;
          };
          if (password && confirmPassword && password !== confirmPassword) {
            return false;
          }
        }
        // Preferences: if the SMS opt-in is checked, we require a valid
        // phone number on file - otherwise the consent has nothing to send
        // to. Gate Continue on the same rule so users can't advance with
        // a checked SMS box and an empty/invalid number.
        if (step === "preferences" || step === "welcome-offer") {
          const { acceptsSmsMarketing, phoneNumber } = values as {
            acceptsSmsMarketing?: boolean;
            phoneNumber?: string;
          };
          if (acceptsSmsMarketing && !isValidPhoneNumber(phoneNumber ?? "")) {
            return false;
          }
        }
        // Contact Information now carries the credential fields, so the
        // country-aware credential gate lives here. Mirrors the top-level
        // superRefine rules (license number + qualification).
        if (step === "contact-basics") {
          const v = values as {
            countryCode?: string;
            qualification?: string;
            licenseNumber?: string;
            accountType?: string;
          };
          const country = (v.countryCode ?? "").toUpperCase();
          const isCredentialFlow =
            v.accountType === "professional" || v.accountType === "salon";
          if (
            isCredentialFlow &&
            country !== "AU" &&
            !(v.licenseNumber ?? "").trim()
          ) {
            return false;
          }
          if (QUALIFICATION_REQUIRED_COUNTRIES.has(country) && !v.qualification) {
            return false;
          }
          if (
            QUALIFICATION_REQUIRED_COUNTRIES.has(country) &&
            v.qualification &&
            !isCurrentQualificationForCountry(country, v.qualification)
          ) {
            return false;
          }
        }
        return true;
      })();

      if (isValid.success && passesExtraRefinements) {
        return "complete";
      }

      const stepFields = Object.keys(schema.shape) as ValidFieldNames[];

      if (stepFields.length === 0) {
        return "complete";
      }

      const hasErrors = stepFields.some((field) => {
        return errors[field as ValidFieldNames];
      });

      if (hasErrors || !passesExtraRefinements) {
        return "error";
      }

      return "in-progress";
    },
    [errors, watch, accountType, emailConflict]
  );

  const getStepNumber = useCallback(
    (step: Step): number => {
      return steps.indexOf(step);
    },
    [steps]
  );

  const getStepForField = useCallback((fieldName: ValidFieldNames): Step | null => {
    // Server-side Zod errors can carry dotted paths (e.g. "address.line1"
    // or "licenseProofFiles.0"). The fieldsForStep map is keyed by
    // top-level field names, so try an exact match first, then fall back
    // to matching by the first path segment so auto-nav still lands the
    // user on the correct step.
    const top = (fieldName ?? "").toString().split(".")[0];
    for (const step of steps) {
      const fields = fieldsForStep[step] || [];
      if (fields.includes(fieldName) || (top && fields.includes(top as ValidFieldNames))) {
        return step;
      }
    }
    return null;
  }, [steps]);

  useEffect(() => {
    const updateCompletedSteps = () => {
      const newCompletedSteps: Record<Step, ValidationStatus> = {} as Record<
        Step,
        ValidationStatus
      >;

      steps.forEach((step) => {
        newCompletedSteps[step] = getStepValidationStatus(step);
      });

      // Only update state if validation states actually changed
      setCompletedSteps((prev) => {
        const hasChanges = steps.some((step) => prev[step] !== newCompletedSteps[step]);
        return hasChanges ? newCompletedSteps : prev;
      });
    };

    // Initial update
    updateCompletedSteps();

    // Subscribe to form changes
    const unsubscribe = subscribe({
      formState: {
        errors: true,
        dirtyFields: true,
      },
      callback: () => {
        updateCompletedSteps();
      },
    });

    return () => unsubscribe();
  }, [steps, getStepValidationStatus, subscribe]);

  // Clear the manual credential errors as soon as the user fills them in.
  const licenseNumberValue = watch("licenseNumber") as unknown as string | undefined;
  const qualificationValue = watch("qualification" as never) as unknown as string | undefined;
  useEffect(() => {
    if ((licenseNumberValue ?? "").trim()) clearErrors("licenseNumber" as never);
  }, [licenseNumberValue, clearErrors]);
  useEffect(() => {
    if (qualificationValue) clearErrors("qualification" as never);
  }, [qualificationValue, clearErrors]);


  const goToNextStep = () => {
    const schema = getStepSchema(currentStep, accountType);
    if (schema) {
      const values = watch();
      if (
        currentStep === "contact-basics" &&
        emailConflict?.email === ((values.email ?? "") as string).trim().toLowerCase()
      ) {
        setShowValidationErrors(true);
        toast({
          title: "This email is already registered",
          variant: "destructive",
        });
        return;
      }
      // Perform validation using the corresponding Zod schema
      const result = schema.safeParse(values);

      if (!result.success) {
        setShowValidationErrors(true);
        toast({
          title: "Please complete all required fields",
          variant: "destructive",
        });
        return;
      }
    }

    // Mirror the cross-field refinements applied in getStepValidationStatus
    // so users can't skip past steps whose rules live on the union-level
    // registrationSchema (e.g. password / confirm-password must match).
    if (currentStep === "create-password") {
      const { password, confirmPassword } = watch() as {
        password?: string;
        confirmPassword?: string;
      };
      if (password && confirmPassword && password !== confirmPassword) {
        setShowValidationErrors(true);
        toast({
          title: "Passwords do not match",
          variant: "destructive",
        });
        return;
      }
    }

    if (currentStep === "preferences" || currentStep === "welcome-offer") {
      const { acceptsSmsMarketing, phoneNumber } = watch() as {
        acceptsSmsMarketing?: boolean;
        phoneNumber?: string;
      };
      if (acceptsSmsMarketing && !isValidPhoneNumber(phoneNumber ?? "")) {
        setShowValidationErrors(true);
        toast({
          title: "Please add a valid phone number for SMS updates",
          description: "Or uncheck the SMS opt-in to continue.",
          variant: "destructive",
        });
        return;
      }
    }

    if (currentStep === "contact-basics") {
      const v = watch() as {
        countryCode?: string;
        qualification?: string;
        licenseNumber?: string;
        accountType?: string;
      };
      const country = (v.countryCode ?? "").toUpperCase();
      const isCredentialFlow =
        v.accountType === "professional" || v.accountType === "salon";
      if (isCredentialFlow && country !== "AU" && !(v.licenseNumber ?? "").trim()) {
        setShowValidationErrors(true);
        // The union-level superRefine never runs while other branch fields are
        // missing, so set the field error manually to get the red highlight.
        setError("licenseNumber" as never, {
          type: "manual",
          message: "License number is required",
        });
        setFocus?.("licenseNumber" as never);
        toast({
          title: "Please enter your license number",
          variant: "destructive",
        });
        return;
      }
      if (QUALIFICATION_REQUIRED_COUNTRIES.has(country) && !v.qualification) {
        setShowValidationErrors(true);
        setError("qualification" as never, {
          type: "manual",
          message: "Please select your qualification",
        });
        toast({
          title: "Please select your qualification",
          variant: "destructive",
        });
        return;
      }

      if (
        QUALIFICATION_REQUIRED_COUNTRIES.has(country) &&
        v.qualification &&
        !isCurrentQualificationForCountry(country, v.qualification)
      ) {
        setShowValidationErrors(true);
        toast({
          title: "Please select a current qualification for your country",
          variant: "destructive",
        });
        return;
      }
    }

    const nextStep = steps[currentStepNumber + 1] || currentStep;
    goToStep(nextStep);
  };

  const goToPrevStep = () => {
    const previousStepNumber = Math.max(currentStepNumber - 1, 0);
    const prevStep = steps[previousStepNumber] || currentStep;
    goToStep(prevStep);
  };

  const goToStep = (step: Step) => {


    // Allow post-flow steps (success, schedule, schedule-confirmed) even
    // though they're intentionally outside the dynamic `steps` array.
    const POST_FLOW: Step[] = ["success", "schedule", "schedule-confirmed"];
    // Check if the step is valid (exists in the steps array)
    if (!steps.includes(step) && !POST_FLOW.includes(step)) {
      console.warn(`Invalid step: ${step}. Valid steps are:`, steps);
      return;
    }


    const targetStepNumber = steps.indexOf(step);
    const direction = targetStepNumber > currentStepNumber ? "forward" : "backward";

    setCurrentStep(step);
    setTransitionDirection(direction);
    setIsTransitioning(true);
    setTimeout(() => {
      setIsTransitioning(false);
      mainScrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
    }, 150);
  };

  const formProgress = useMemo(() => {
    // Once the user lands on the success step (or post-success schedule steps)
    // the form has already been reset (clearing completed-step status), so
    // always show 100%.
    if (currentStep === "success" || currentStep === "schedule" || currentStep === "schedule-confirmed") return 100;

    // Get only the valid steps (exclude onboarding and summary)
    const validSteps = steps.filter(
      (step) => step !== "onboarding" && step !== "summary" && step !== "assessing"
    );

    if (validSteps.length === 0) return 0;

    // Count completed steps
    const completedStepsCount = validSteps.filter(
      (step) => completedSteps[step] === "complete" && dirtySteps.has(step)
    ).length;

    const progress = (completedStepsCount / validSteps.length) * 100;
    return progress;
  }, [currentStep, steps, completedSteps, dirtySteps]);

  useEffect(() => {
    setFormProgress(formProgress);
  }, [formProgress, setFormProgress]);

  const incompleteSteps = useMemo(() => {
    return steps
      .filter((step) => completedSteps[step] !== "complete")
      .map((step): IncompleteStepInfo => {
        const stepFields = fieldsForStep[step] || [];
        const missingFields: string[] = [];

        // Get fields that have errors for this step from react-hook-form errors
        stepFields.forEach((fieldName) => {
          if (errors[fieldName]) {
            missingFields.push(fieldName);
          }
        });
          const currentData = watch();
          if (
            step === "contact-basics" &&
            emailConflict?.email === ((currentData.email ?? "") as string).trim().toLowerCase() &&
            !missingFields.includes("email")
          ) {
            missingFields.push("email");
          }

        // If no specific field errors but step is not complete,
        // check fullErrors for validation issues or empty required fields
        if (missingFields.length === 0 && stepFields.length > 0) {
          const currentData = watch();

          // Check for fields mentioned in fullErrors
          if (fullErrors.properties) {
            stepFields.forEach((fieldName) => {
              if (fullErrors.properties[fieldName]) {
                missingFields.push(fieldName);
              }
            });
          }

          // If still no errors found, check for empty values
          if (missingFields.length === 0) {
            stepFields.forEach((fieldName) => {
              const value = currentData[fieldName];
              if (value === undefined || value === null || value === "") {
                missingFields.push(fieldName);
              }
            });
          }
        }

        return {
          step,
          name: STEP_DISPLAY_NAMES[step] || step,
          stepNumber: getStepNumber(step),
          missingFields,
        };
      });
  }, [steps, completedSteps, errors, fullErrors, watch, getStepNumber, emailConflict]);

  /**
   * Steps the user has actually reached. A step counts as visited when it has
   * been landed on, or when any later step has been landed on (covers resumed
   * sessions where earlier steps were filled in a previous visit).
   * The step indicator uses this so future steps whose schemas happen to
   * validate (all-optional / defaulted fields) are NOT shown as completed.
   */
  const visitedSteps = useMemo(() => {
    let maxIndex = steps.indexOf(currentStep);
    dirtySteps.forEach((step) => {
      const i = steps.indexOf(step);
      if (i > maxIndex) maxIndex = i;
    });
    const POST_FLOW: Step[] = ["success", "schedule", "schedule-confirmed"];
    if (POST_FLOW.includes(currentStep)) maxIndex = steps.length - 1;
    return new Set(steps.slice(0, maxIndex + 1));
  }, [steps, currentStep, dirtySteps]);

  const value: StepContextType = {
    totalSteps,
    currentStep,
    setCurrentStep,
    goToNextStep,
    goToPrevStep,
    goToStep,
    showValidationErrors,
    completedSteps,
    incompleteSteps,
    getStepValidationStatus,
    getStepNumber,
    getStepForField,
    steps,
    visitedSteps,
  };

  return <StepContext.Provider value={value}>{children}</StepContext.Provider>;
}

/**
 * Hook to consume the StepContext - manages completedSteps as an object with ValidationStatus values.
 * Field validation is automatically derived from existing Zod schemas - no manual field mapping needed!
 *
 * @example
 * ```tsx
 * const { completedSteps, getStepValidationStatus, getStepNumber, goToStep } = useStepContext();
 *
 * // Check if a step is complete
 * if (completedSteps["contact-basics"] === "complete") {
 *   // Step is fully completed
 * }
 *
 * // Get current validation status for any step
 * const status = getStepValidationStatus("business-location");
 * // Returns: "complete" | "in-progress" | "error"
 *
 * // Get step number (1-based index)
 * const stepNum = getStepNumber("contact-basics");
 * // Returns: number representing the step position in the flow
 *
 * // Navigate directly to any valid step
 * goToStep("business-location");
 * // Automatically handles transition direction and scroll behavior
 * // Validates that the step exists in the current flow
 *
 * // Find which step contains a specific field
 * const stepForField = getStepForField("companyName");
 * // Returns: "contact-basics" | null if field not found
 *
 * // The completedSteps object automatically updates when form data changes
 * // and reflects real-time validation status for each step
 *
 * // When you add/remove fields from schemas, the step validation automatically stays in sync
 * // No need to maintain separate field mappings!
 * ```
 */
export function useStepContext(): StepContextType {
  const context = useContext(StepContext);

  if (!context) {
    throw new Error("useStepContext must be used within a StepProvider");
  }

  return context;
}
