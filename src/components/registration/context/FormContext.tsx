import { createContext, useContext, ReactNode, useEffect } from "react";
import { FormDataProvider, useFormData } from "./FormDataContext";
import { StepProvider, useStepContext } from "./StepContext";
import { AllRegistrationFormData } from "@/lib/validations/auth-schemas";
import { useGlobalApp } from "@/contexts";
import { IncompleteStepInfo } from "@/types/auth";

export type AuthFormContextType = {
  // Form-related (from FormDataContext)
  register: ReturnType<typeof useFormData>["register"];
  control: ReturnType<typeof useFormData>["control"];
  watch: ReturnType<typeof useFormData>["watch"];
  reset: ReturnType<typeof useFormData>["reset"];
  setFocus: ReturnType<typeof useFormData>["setFocus"];
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
  errorActions: ReturnType<typeof useFormData>["errorActions"];

  // Step-related (from StepContext)
  totalSteps: ReturnType<typeof useStepContext>["totalSteps"];
  currentStep: ReturnType<typeof useStepContext>["currentStep"];
  setCurrentStep: ReturnType<typeof useStepContext>["setCurrentStep"];
  goToNextStep: ReturnType<typeof useStepContext>["goToNextStep"];
  goToPrevStep: ReturnType<typeof useStepContext>["goToPrevStep"];
  goToStep: ReturnType<typeof useStepContext>["goToStep"];
  showValidationErrors: ReturnType<typeof useStepContext>["showValidationErrors"];

  // Computed values (now in StepContext)
  completedSteps: ReturnType<typeof useStepContext>["completedSteps"];
  incompleteSteps: IncompleteStepInfo[];
  getStepValidationStatus: ReturnType<typeof useStepContext>["getStepValidationStatus"];
  getStepNumber: ReturnType<typeof useStepContext>["getStepNumber"];
  getStepForField: ReturnType<typeof useStepContext>["getStepForField"];
  steps: ReturnType<typeof useStepContext>["steps"];
};

// Create the context
const FormContext = createContext<AuthFormContextType | null>(null);

// Internal component that combines all contexts
function FormContextProvider({ children }: { children: ReactNode }) {
  const { isSubmitSuccessful, watch, reset, setFocus, errorActions, ...formDataContext } =
    useFormData();
  const { setCurrentStep, ...stepContext } = useStepContext();
  const { setEmail } = useGlobalApp();

  const email = watch("email");

  // Reset form and move to success step on successful submission
  useEffect(() => {
    const accountType = watch("accountType");
    if (isSubmitSuccessful) {
      reset({ email, accountType } as Partial<AllRegistrationFormData>);
      setCurrentStep("success");
    }
  }, [email, isSubmitSuccessful, reset, setCurrentStep, watch]);

  // Sync email to global app context. Email is used for uploading files,
  // and shares the email between forms.
  useEffect(() => {
    setEmail(email || "");
  }, [email, setEmail]);

  const value: AuthFormContextType = {
    isSubmitSuccessful,
    watch,
    reset,
    setFocus,
    setCurrentStep,
    errorActions,
    ...formDataContext,
    ...stepContext,
  };

  return <FormContext.Provider value={value}>{children}</FormContext.Provider>;
}

// Main provider component that wraps form and step contexts
export function FormProvider({ children }: { children: ReactNode }) {
  const { email } = useGlobalApp();

  const initialValues: Partial<AllRegistrationFormData> = {};

  if (email) {
    initialValues.email = email;
  }

  return (
    <FormDataProvider initialValues={initialValues}>
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
