import { createContext, useContext, ReactNode, useEffect, useRef } from "react";
import { FormDataProvider, useFormData } from "./FormDataContext";
import { StepProvider, useStepContext } from "./StepContext";
import { AllRegistrationFormData } from "@/lib/validations/auth-schemas";
import { useGlobalApp } from "@/contexts";
import { IncompleteStepInfo } from "@/types/auth";
import { emitApplicationSubmitted } from "@/lib/parent-breadcrumb";
import { useBounceTelemetry } from "@/hooks/use-bounce-telemetry";


export type AuthFormContextType = {
  // Form-related (from FormDataContext)
  register: ReturnType<typeof useFormData>["register"];
  control: ReturnType<typeof useFormData>["control"];
  watch: ReturnType<typeof useFormData>["watch"];
  reset: ReturnType<typeof useFormData>["reset"];
  setFocus: ReturnType<typeof useFormData>["setFocus"];
  setError: ReturnType<typeof useFormData>["setError"];
  clearErrors: ReturnType<typeof useFormData>["clearErrors"];
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
  submitErrorMessage: ReturnType<typeof useFormData>["submitErrorMessage"];
  emailConflict: ReturnType<typeof useFormData>["emailConflict"];
  setEmailConflict: ReturnType<typeof useFormData>["setEmailConflict"];
  setSubmitError: ReturnType<typeof useFormData>["setSubmitError"];

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
  const { setCurrentStep, currentStep, goToStep, getStepForField, ...stepContext } =
    useStepContext();
  const { setEmail } = useGlobalApp();

  const email = watch("email");
  const accountType = watch("accountType");

  // Bounce diagnostics: device, last focused field, validation errors.
  useBounceTelemetry({
    email,
    currentStep,
    errors: formDataContext.errors,
    accountType: accountType ?? null,
  });

  // Auto-navigate to the step that owns the first server-returned field error
  // so the user lands on the page where they can actually fix it.
  const serverErrorField = formDataContext.serverErrorField;
  useEffect(() => {
    if (!serverErrorField) return;
    const targetStep = getStepForField(serverErrorField.field);
    if (targetStep && targetStep !== currentStep) {
      goToStep(targetStep);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverErrorField?.bump]);



  // Reset form and move to success step on successful submission
  useEffect(() => {
    const accountType = watch("accountType");
    const firstName = watch("firstName");
    const lastName = watch("lastName");
    const phoneNumber = watch("phoneNumber");
    const phoneCountryCode = watch("phoneCountryCode");
    if (isSubmitSuccessful) {
      // Notify the parent Shopify theme (when embedded) that an application
      // was submitted, so it can set the dd_applied cookie used to gate the
      // "Discount unlocked" banner on the Color Ring PDP. Fires before any
      // step transition so the message is sent prior to potential navigation.
      emitApplicationSubmitted();
      // Preserve identity + contact fields so the post-submit ScheduleStep
      // can prefill name/email and send a valid phone to Calendly. Without
      // these, toE164() returns "Phone number is required" and booking is
      // blocked even though the user just entered the phone.
      reset({
        email,
        accountType,
        firstName,
        lastName,
        phoneNumber,
        phoneCountryCode,
      } as Partial<AllRegistrationFormData>);
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
    currentStep,
    errorActions,
    goToStep,
    getStepForField,
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
