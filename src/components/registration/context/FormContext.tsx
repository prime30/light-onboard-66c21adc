import { createContext, useContext, ReactNode, useMemo, MutableRefObject, useEffect } from "react";
import { useForm as useReactHookForm, UseFormRegister } from "react-hook-form";
import { RegistrationFormData } from "@/lib/validations/auth-schemas";
import { AuthMode, Step } from "@/types/auth";
import { useStep } from "./use-step";
import {
  defaultValues,
  useRegistrationForm,
  ValidationStatus,
  ValidFieldNames,
} from "./use-registration-form";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { useAtom } from "jotai/react";

export type AuthFormContextType = {
  mode: AuthMode;
  setMode: React.Dispatch<React.SetStateAction<AuthMode>>;
  currentStep: Step;
  setCurrentStep: React.Dispatch<React.SetStateAction<Step>>;
  goToNextStep: () => void;
  register: UseFormRegister<RegistrationFormData>;
  watch: ReturnType<typeof useReactHookForm<RegistrationFormData>>["watch"];
  reset: ReturnType<typeof useReactHookForm<RegistrationFormData>>["reset"];
  handleSubmit: ReturnType<typeof useReactHookForm<RegistrationFormData>>["handleSubmit"];
  setValue: ReturnType<typeof useReactHookForm<RegistrationFormData>>["setValue"];
  errors: ReturnType<typeof useReactHookForm<RegistrationFormData>>["formState"]["errors"];
  getValidationStatus: (fields: ValidFieldNames | ValidFieldNames[]) => ValidationStatus;
  dirtyFields: ReturnType<
    typeof useReactHookForm<RegistrationFormData>
  >["formState"]["dirtyFields"];
  formProgress: number;
  isTransitioning: boolean;
  setIsTransitioning: React.Dispatch<React.SetStateAction<boolean>>;
  transitionDirection: "forward" | "backward";
  setTransitionDirection: React.Dispatch<React.SetStateAction<"forward" | "backward">>;
  mainScrollRef: MutableRefObject<HTMLElement> | null;
  showValidationErrors: boolean;
};

// Create the context
const FormContext = createContext<AuthFormContextType | null>(null);

// Storage
const storage = createJSONStorage(
  // getStringStorage
  () => sessionStorage // or sessionStorage, asyncStorage or alike
  // options (optional)
);
const formAtom = atomWithStorage("_registration_form", defaultValues, storage, {
  getOnInit: true,
});

// Provider component
export function FormProvider({ children }: { children: ReactNode }) {
  const [storedForm, setStoredForm] = useAtom(formAtom);
  console.log("storedForm", storedForm);

  const {
    watch,
    subscribe,
    formState: { errors, dirtyFields },
    ...registrationRest
  } = useRegistrationForm({ initialValues: storedForm });

  useEffect(() => {
    const callback = subscribe({
      formState: {
        values: true,
      },
      callback: ({ values }) => {
        setStoredForm(values);
      },
    });

    return () => callback();
  }, [subscribe]);

  const { totalSteps, ...stepRest } = useStep({ watch });

  console.log("total steps", totalSteps);
  console.log("current values:", watch());

  const formProgress = useMemo(() => {
    const dirtyFieldCount = Object.values(dirtyFields).filter(Boolean).length;
    const errorsCount = Object.keys(errors).length;
    const progress = ((dirtyFieldCount - errorsCount) / totalSteps) * 100;
    return progress > 0 ? progress : 0;
  }, [dirtyFields, errors, totalSteps]);

  const value: AuthFormContextType = {
    ...registrationRest,
    ...stepRest,
    watch,
    errors,
    dirtyFields,
    formProgress,
  };

  return <FormContext.Provider value={value}>{children}</FormContext.Provider>;
}

// Hook to consume the context
export function useForm(): AuthFormContextType {
  const context = useContext(FormContext);

  if (!context) {
    throw new Error("useAuthFormContext must be used within an AuthFormProvider");
  }

  return context;
}
