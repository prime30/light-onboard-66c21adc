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
  completedStepsSet: Set<number>; // For backward compatibility
  getStepValidationStatus: (step: Step) => ValidationStatus;
};

// Create the context
const StepContext = createContext<StepContextType | null>(null);

// Provider component
export function StepProvider({ children }: { children: ReactNode }) {
  const { watch, errors, dirtyFields, getValidationStatus, subscribe } = useFormData();
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

  const steps = useMemo(() => {
    const newSteps = getStepOrder(accountType).slice();
    newSteps.unshift("onboarding");
    newSteps.push("summary");
    return newSteps;
  }, [accountType]);

  const totalSteps = steps.length;
  const currentStepNumber = steps.indexOf(currentStep);

  // Function to get validation status for a specific step
  // This dynamically extracts field names from the step's Zod schema,
  // ensuring we always validate the correct fields without manual maintenance
  const getStepValidationStatus = useCallback(
    (step: Step): ValidationStatus => {
      const schema = stepValidations[step];

      // Steps without schema are considered complete (e.g., onboarding, summary, success, reviews)
      if (!schema) {
        return "complete";
      }

      // Extract field names directly from the Zod schema shape
      // This automatically includes all fields defined in the schema,
      // so when fields are added/removed from schemas, this stays in sync
      const stepFields = Object.keys(schema.shape) as ValidFieldNames[];

      if (stepFields.length === 0) {
        return "complete";
      }

      return getValidationStatus(stepFields);
    },
    [getValidationStatus]
  );

  // Subscribe to form data changes and update completed steps
  useEffect(() => {
    const updateCompletedSteps = () => {
      const newCompletedSteps: Record<Step, ValidationStatus> = {} as Record<
        Step,
        ValidationStatus
      >;

      steps.forEach((step) => {
        newCompletedSteps[step] = getStepValidationStatus(step);
      });

      setCompletedSteps(newCompletedSteps);
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

  // Create Set<number> version for backward compatibility
  const completedStepsSet = useMemo(() => {
    const set = new Set<number>();
    steps.forEach((step, index) => {
      if (completedSteps[step] === "complete") {
        set.add(index + 1); // Add 1-based step numbers
      }
    });
    return set;
  }, [completedSteps, steps]);

  const goToNextStep = () => {
    console.log("goNext");

    const schema = stepValidations[currentStep];
    if (schema) {
      // Perform validation using the corresponding Zod schema
      const result = schema.safeParse(watch());

      if (!result.success) {
        console.log("Validation errors:", z.treeifyError(result.error));
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
    completedStepsSet,
    getStepValidationStatus,
  };

  return <StepContext.Provider value={value}>{children}</StepContext.Provider>;
}

/**
 * Hook to consume the StepContext - manages completedSteps as an object with ValidationStatus values.
 * Field validation is automatically derived from existing Zod schemas - no manual field mapping needed!
 *
 * @example
 * ```tsx
 * const { completedSteps, getStepValidationStatus } = useStepContext();
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
