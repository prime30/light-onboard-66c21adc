import {
  createContext,
  useContext,
  ReactNode,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from "react";
import { fieldsForStep, getStepOrder, stepValidations } from "@/data/step-order";
import { useToast } from "@/hooks/use-toast";
import { Step } from "@/types/auth";
import { defaultValues, ValidFieldNames } from "@/lib/validations/auth-schemas";
import { useFormData, ValidationStatus } from "./FormDataContext";
import { useModeContext } from "./ModeContext";
import { useOutletContext } from "react-router";
import { RegistrationLayoutOutletContext } from "../RegistrationLayout";

export type StepContextType = {
  totalSteps: number;
  currentStep: Step;
  setCurrentStep: React.Dispatch<React.SetStateAction<Step>>;
  goToNextStep: () => void;
  goToPrevStep: () => void;
  goToStep: (step: Step) => void;
  showValidationErrors: boolean;
  completedSteps: Record<Step, ValidationStatus>;
  incompleteSteps: Step[];
  getStepValidationStatus: (step: Step) => ValidationStatus;
  getStepNumber: (step: Step) => number;
  getStepForField: (fieldName: ValidFieldNames) => Step | null;
  steps: Step[];
};

// Create the context
const StepContext = createContext<StepContextType | null>(null);

type StepProviderProps = {
  children: ReactNode;
};

// Provider component
export function StepProvider({ children }: StepProviderProps) {
  const { setFormProgress } = useOutletContext<RegistrationLayoutOutletContext>();
  const { watch, errors, subscribe, reset } = useFormData();
  const accountType = watch("accountType");
  const { toast } = useToast();
  const { setTransitionDirection, setIsTransitioning, mainScrollRef } = useModeContext();

  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>("onboarding");
  const [dirtySteps, setDirtySteps] = useState<Set<Step>>(new Set() as Set<Step>);
  const [completedSteps, setCompletedSteps] = useState<Record<Step, ValidationStatus>>(
    {} as Record<Step, ValidationStatus>
  );

  // TODO: Remove after development
  useEffect(() => {
    // setTimeout(() => {
    //   reset(defaultValues);
    // }, 1000);
    // setCurrentStep("school-info");
  }, []);

  const { steps, totalSteps, currentStepNumber } = useMemo(() => {
    const newSteps = getStepOrder(accountType).slice();
    newSteps.unshift("onboarding");
    newSteps.push("summary");

    const totalSteps = newSteps.length;
    const currentStepNumber = newSteps.indexOf(currentStep);

    setDirtySteps((prev) => {
      return prev.add(currentStep);
    });

    return {
      steps: newSteps,
      totalSteps,
      currentStepNumber,
    };
  }, [accountType, currentStep]);

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

  const getStepForField = useCallback((fieldName: ValidFieldNames): Step | null => {
    for (const [step, fields] of Object.entries(fieldsForStep)) {
      if (fields.includes(fieldName)) {
        return step as Step;
      }
    }
    return null;
  }, []);

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
    goToStep(nextStep);
  };

  const goToPrevStep = () => {
    const previousStepNumber = Math.max(currentStepNumber - 1, 0);
    const prevStep = steps[previousStepNumber] || currentStep;
    goToStep(prevStep);
  };

  const goToStep = (step: Step) => {
    // Check if the step is valid (exists in the steps array)
    if (!steps.includes(step)) {
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
    // Get only the valid steps (exclude onboarding and summary)
    const validSteps = steps.filter((step) => step !== "onboarding" && step !== "summary");

    if (validSteps.length === 0) return 0;

    // Count completed steps
    const completedStepsCount = validSteps.filter(
      (step) => completedSteps[step] === "complete" && dirtySteps.has(step)
    ).length;

    const progress = (completedStepsCount / validSteps.length) * 100;
    return progress;
  }, [steps, completedSteps, dirtySteps]);

  useEffect(() => {
    setFormProgress(formProgress);
  }, [formProgress, setFormProgress]);

  const incompleteSteps = useMemo(() => {
    return steps.filter((step) => completedSteps[step] !== "complete");
  }, [steps, completedSteps]);

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
