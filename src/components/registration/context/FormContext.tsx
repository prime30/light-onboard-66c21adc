import { createContext, useContext, ReactNode } from "react";
import { FormDataProvider, useFormData } from "./FormDataContext";
import { StepProvider, useStepContext } from "./StepContext";

export type AuthFormContextType = {
  // Form-related (from FormDataContext)
  register: ReturnType<typeof useFormData>["register"];
  watch: ReturnType<typeof useFormData>["watch"];
  reset: ReturnType<typeof useFormData>["reset"];
  handleSubmit: ReturnType<typeof useFormData>["handleSubmit"];
  setValue: ReturnType<typeof useFormData>["setValue"];
  formState: ReturnType<typeof useFormData>["formState"];
  subscribe: ReturnType<typeof useFormData>["subscribe"];
  getValidationStatus: ReturnType<typeof useFormData>["getValidationStatus"];
  errors: ReturnType<typeof useFormData>["errors"];
  dirtyFields: ReturnType<typeof useFormData>["dirtyFields"];

  // Step-related (from StepContext)
  mode: ReturnType<typeof useStepContext>["mode"];
  setMode: ReturnType<typeof useStepContext>["setMode"];
  totalSteps: ReturnType<typeof useStepContext>["totalSteps"];
  currentStep: ReturnType<typeof useStepContext>["currentStep"];
  setCurrentStep: ReturnType<typeof useStepContext>["setCurrentStep"];
  goToNextStep: ReturnType<typeof useStepContext>["goToNextStep"];
  goToPrevStep: ReturnType<typeof useStepContext>["goToPrevStep"];
  showValidationErrors: ReturnType<typeof useStepContext>["showValidationErrors"];
  isTransitioning: ReturnType<typeof useStepContext>["isTransitioning"];
  setIsTransitioning: ReturnType<typeof useStepContext>["setIsTransitioning"];
  transitionDirection: ReturnType<typeof useStepContext>["transitionDirection"];
  setTransitionDirection: ReturnType<typeof useStepContext>["setTransitionDirection"];
  mainScrollRef: ReturnType<typeof useStepContext>["mainScrollRef"];

  // Computed values (now in StepContext)
  formProgress: number;
  completedSteps: ReturnType<typeof useStepContext>["completedSteps"];
  completedStepsSet: ReturnType<typeof useStepContext>["completedStepsSet"];
  getStepValidationStatus: ReturnType<typeof useStepContext>["getStepValidationStatus"];
};

// Create the context
const FormContext = createContext<AuthFormContextType | null>(null);

// Internal component that combines both contexts
function FormContextProvider({ children }: { children: ReactNode }) {
  const formDataContext = useFormData();
  const stepContext = useStepContext();

  const value: AuthFormContextType = {
    ...formDataContext,
    ...stepContext,
  };

  return <FormContext.Provider value={value}>{children}</FormContext.Provider>;
}

// Main provider component that wraps both contexts
export function FormProvider({ children }: { children: ReactNode }) {
  return (
    <FormDataProvider>
      <StepProvider>
        <FormContextProvider>{children}</FormContextProvider>
      </StepProvider>
    </FormDataProvider>
  );
}

// Hook to consume the combined context (maintains backward compatibility)
export function useForm(): AuthFormContextType {
  const context = useContext(FormContext);

  if (!context) {
    throw new Error("useForm must be used within a FormProvider");
  }

  return context;
}
