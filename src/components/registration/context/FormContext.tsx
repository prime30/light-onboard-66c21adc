import { createContext, useContext, ReactNode, useCallback, useMemo } from "react";
import { FieldError, useForm as useReactHookForm, UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RegistrationFormData, registrationSchema } from "@/lib/validations/auth-schemas";

export type ValidFieldNames = keyof RegistrationFormData;
export type ValidationStatus = "complete" | "in-progress" | "error";

export type FormFieldProps = {
  type: string;
  placeholder: string;
  name: ValidFieldNames;
  register: UseFormRegister<RegistrationFormData>;
  error: FieldError | undefined;
  valueAsNumber?: boolean;
};

export type AuthFormContextType = {
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
};

const defaultValues: Partial<RegistrationFormData> = {
  country: "US",
  subscribeOrderUpdates: true,
  subscribeMarketing: false,
  subscribePromotions: true,
};

// Create the context
const FormContext = createContext<AuthFormContextType | null>(null);

// Provider component
export function FormProvider({ children }: { children: ReactNode }) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, dirtyFields },
  } = useReactHookForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues,
  });
  const totalFields = 10;

  console.log("current values:", watch());

  const getValidationStatus = useCallback(
    (fields: ValidFieldNames | ValidFieldNames[]): ValidationStatus => {
      if (!Array.isArray(fields)) {
        fields = [fields];
      }

      console.log(errors);
      const hasErrors = fields.some((field) => errors[field as ValidFieldNames]);
      if (hasErrors) {
        return "error";
      }

      const allDirty = fields.every((field) => dirtyFields[field as ValidFieldNames]);
      if (allDirty) {
        return "complete";
      }

      return "in-progress";
    },
    [errors]
  );

  const formProgress = useMemo(() => {
    const dirtyFieldCount = Object.values(dirtyFields).filter(Boolean).length;
    const errorsCount = Object.keys(errors).length;
    const progress = ((dirtyFieldCount - errorsCount) / totalFields) * 100;
    return progress > 0 ? progress : 0;
  }, [dirtyFields, errors, totalFields]);

  const value: AuthFormContextType = {
    register,
    watch,
    reset,
    handleSubmit,
    setValue,
    errors,
    getValidationStatus,
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
