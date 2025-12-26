import {
  createContext,
  useContext,
  ReactNode,
  MutableRefObject,
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
import { getStepOrder } from "@/data/step-order";
import { useToast } from "@/hooks/use-toast";
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
import { AuthMode, Step } from "@/types/auth";
import z, { ZodObject } from "zod";
import { useFormData, ValidationStatus, ValidFieldNames } from "./FormDataContext";

const stepValidations: Record<Step, ZodObject | null> = {
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

export type StepContextType = {
  mode: AuthMode;
  setMode: React.Dispatch<React.SetStateAction<AuthMode>>;
  totalSteps: number;
  currentStep: Step;
  setCurrentStep: React.Dispatch<React.SetStateAction<Step>>;
  goToNextStep: () => void;
  goToPrevStep: () => void;
  showValidationErrors: boolean;
  isTransitioning: boolean;
  setIsTransitioning: React.Dispatch<React.SetStateAction<boolean>>;
  transitionDirection: "forward" | "backward";
  setTransitionDirection: React.Dispatch<React.SetStateAction<"forward" | "backward">>;
  mainScrollRef: MutableRefObject<HTMLElement | null>;
  formProgress: number;
  completedSteps: Record<Step, ValidationStatus>;
  getStepValidationStatus: (step: Step) => ValidationStatus;
  getStepNumber: (step: Step) => number;
  steps: Step[];
};

// Create the context
const StepContext = createContext<StepContextType | null>(null);

// Provider component
export function StepProvider({ children }: { children: ReactNode }) {
  const { watch, errors, dirtyFields, subscribe } = useFormData();
  const accountType = watch("accountType");
  const { toast } = useToast();

  const [mode, setMode] = useState<AuthMode>("signup");
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>("onboarding");
  const [completedSteps, setCompletedSteps] = useState<Record<Step, ValidationStatus>>(
    {} as Record<Step, ValidationStatus>
  );
  const [transitionDirection, setTransitionDirection] = useState<"forward" | "backward">("forward");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const mainScrollRef = useRef<HTMLElement | null>(null);

  // TODO: Remove after development
  useEffect(() => {
    setCurrentStep("business-location");
  }, []);

  const steps = useMemo(() => {
    const newSteps = getStepOrder(accountType).slice();
    newSteps.unshift("onboarding");
    newSteps.push("summary");
    return newSteps;
  }, [accountType]);

  const totalSteps = steps.length;
  const currentStepNumber = steps.indexOf(currentStep);

  const getStepValidationStatus = useCallback(
    (step: Step): ValidationStatus => {
      const schema = stepValidations[step];

      if (!schema) {
        return "complete";
      }

      const isValid = schema.safeParse(watch());
      if (isValid.success) {
        return "complete";
      }

      const stepFields = Object.keys(schema.shape) as ValidFieldNames[];

      if (stepFields.length === 0) {
        return "complete";
      }

      const hasErrors = stepFields.some((field) => {
        return errors[field as ValidFieldNames];
      });

      if (hasErrors) {
        return "error";
      }

      return "in-progress";
    },
    [errors, watch]
  );

  const getStepNumber = useCallback(
    (step: Step): number => {
      return steps.indexOf(step);
    },
    [steps]
  );

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

  const goToNextStep = () => {
    const schema = stepValidations[currentStep];
    if (schema) {
      // Perform validation using the corresponding Zod schema
      const result = schema.safeParse(watch());

      if (!result.success) {
        setShowValidationErrors(true);
        toast({
          title: "Please complete all required fields",
          variant: "destructive",
        });
        return;
      }
    }

    const nextStep = steps[currentStepNumber + 1] || currentStep;
    setCurrentStep(nextStep);

    setTransitionDirection("forward");
    setIsTransitioning(true);
    setTimeout(() => {
      mainScrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
      setIsTransitioning(false);
    }, 150);
  };

  const goToPrevStep = () => {
    const previousStepNumber = Math.max(currentStepNumber - 1, 0);
    const nextStep = steps[previousStepNumber] || currentStep;
    setCurrentStep(nextStep);
    setTransitionDirection("backward");
    setIsTransitioning(true);
    setTimeout(() => {
      setIsTransitioning(false);
      mainScrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
    }, 150);
  };

  const formProgress = useMemo(() => {
    const dirtyFieldCount = Object.values(dirtyFields).filter(Boolean).length;
    const errorsCount = Object.keys(errors).length;
    const progress = ((dirtyFieldCount - errorsCount) / totalSteps) * 100;
    return progress > 0 ? progress : 0;
  }, [dirtyFields, errors, totalSteps]);

  const value: StepContextType = {
    mode,
    setMode,
    totalSteps,
    currentStep,
    setCurrentStep,
    goToNextStep,
    goToPrevStep,
    showValidationErrors,
    isTransitioning,
    setIsTransitioning,
    transitionDirection,
    setTransitionDirection,
    mainScrollRef,
    formProgress,
    completedSteps,
    getStepValidationStatus,
    getStepNumber,
    steps,
  };

  return <StepContext.Provider value={value}>{children}</StepContext.Provider>;
}

/**
 * Hook to consume the StepContext - manages completedSteps as an object with ValidationStatus values.
 * Field validation is automatically derived from existing Zod schemas - no manual field mapping needed!
 *
 * @example
 * ```tsx
 * const { completedSteps, getStepValidationStatus, getStepNumber } = useStepContext();
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
