import { createContext, useContext, ReactNode, useEffect } from "react";
import { FormDataProvider, useFormData } from "./FormDataContext";
import { StepProvider, useStepContext } from "./StepContext";

export type AuthFormContextType = {
  // Form-related (from FormDataContext)
  register: ReturnType<typeof useFormData>["register"];
  control: ReturnType<typeof useFormData>["control"];
  watch: ReturnType<typeof useFormData>["watch"];
  reset: ReturnType<typeof useFormData>["reset"];
  submitForm: (e?: React.BaseSyntheticEvent) => Promise<void>;
  setValue: ReturnType<typeof useFormData>["setValue"];
  formState: ReturnType<typeof useFormData>["formState"];
  subscribe: ReturnType<typeof useFormData>["subscribe"];
  getValidationStatus: ReturnType<typeof useFormData>["getValidationStatus"];
  errors: ReturnType<typeof useFormData>["errors"];
  dirtyFields: ReturnType<typeof useFormData>["dirtyFields"];
  isFormValid: ReturnType<typeof useFormData>["isFormValid"];
  fullErrors: ReturnType<typeof useFormData>["fullErrors"];
  isSubmitted: ReturnType<typeof useFormData>["isSubmitted"];
  isSubmitSuccessful: ReturnType<typeof useFormData>["isSubmitSuccessful"];
  isSubmitting: ReturnType<typeof useFormData>["isSubmitting"];

  // Step-related (from StepContext)
  mode: ReturnType<typeof useStepContext>["mode"];
  setMode: ReturnType<typeof useStepContext>["setMode"];
  totalSteps: ReturnType<typeof useStepContext>["totalSteps"];
  currentStep: ReturnType<typeof useStepContext>["currentStep"];
  setCurrentStep: ReturnType<typeof useStepContext>["setCurrentStep"];
  goToNextStep: ReturnType<typeof useStepContext>["goToNextStep"];
  goToPrevStep: ReturnType<typeof useStepContext>["goToPrevStep"];
  goToStep: ReturnType<typeof useStepContext>["goToStep"];
  showValidationErrors: ReturnType<typeof useStepContext>["showValidationErrors"];
  isTransitioning: ReturnType<typeof useStepContext>["isTransitioning"];
  setIsTransitioning: ReturnType<typeof useStepContext>["setIsTransitioning"];
  transitionDirection: ReturnType<typeof useStepContext>["transitionDirection"];
  setTransitionDirection: ReturnType<typeof useStepContext>["setTransitionDirection"];
  mainScrollRef: ReturnType<typeof useStepContext>["mainScrollRef"];

  // Computed values (now in StepContext)
  formProgress: number;
  completedSteps: ReturnType<typeof useStepContext>["completedSteps"];
  incompleteSteps: ReturnType<typeof useStepContext>["incompleteSteps"];
  getStepValidationStatus: ReturnType<typeof useStepContext>["getStepValidationStatus"];
  getStepNumber: ReturnType<typeof useStepContext>["getStepNumber"];
  getStepForField: ReturnType<typeof useStepContext>["getStepForField"];
  steps: ReturnType<typeof useStepContext>["steps"];
};

// Create the context
const FormContext = createContext<AuthFormContextType | null>(null);

// Internal component that combines both contexts
function FormContextProvider({ children }: { children: ReactNode }) {
  const { handleSubmit, isSubmitSuccessful, watch, reset, ...formDataContext } = useFormData();
  const { setCurrentStep, ...stepContext } = useStepContext();

  const email = watch("email");

  const submitForm = handleSubmit(
    async (values) => {
      console.log("submit values:", values);

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-customer`;
      const result = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "CREATE_CUSTOMER",
          data: values,
        }),
      });

      const resultData = await result.json();
      return resultData;
    },
    (errors) => {
      console.log("errors: ", errors);
    }
  );

  useEffect(() => {
    if (isSubmitSuccessful) {
      reset({ email });
      setCurrentStep("success");
    }
  }, [isSubmitSuccessful, setCurrentStep, email, reset]);

  const value: AuthFormContextType = {
    submitForm,
    setCurrentStep,
    isSubmitSuccessful,
    watch,
    reset,
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
