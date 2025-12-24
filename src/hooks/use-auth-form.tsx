import { createContext, useContext, ReactNode, useCallback } from "react";
import { FieldError, useForm, UseFormRegister } from "react-hook-form";
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
  watch: ReturnType<typeof useForm<RegistrationFormData>>["watch"];
  reset: ReturnType<typeof useForm<RegistrationFormData>>["reset"];
  handleSubmit: ReturnType<typeof useForm<RegistrationFormData>>["handleSubmit"];
  setValue: ReturnType<typeof useForm<RegistrationFormData>>["setValue"];
  errors: ReturnType<typeof useForm<RegistrationFormData>>["formState"]["errors"];
  getValidationStatus: (fields: ValidFieldNames | ValidFieldNames[]) => ValidationStatus;
  dirtyFields: ReturnType<typeof useForm<RegistrationFormData>>["formState"]["dirtyFields"];
};

const defaultValues: Partial<RegistrationFormData> = {
  country: "US",
  subscribeOrderUpdates: true,
  subscribeMarketing: false,
  subscribePromotions: true,
};

// Create the context
const AuthFormContext = createContext<AuthFormContextType | null>(null);

// Provider component
export function AuthFormProvider({ children }: { children: ReactNode }) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, dirtyFields },
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues,
  });
  
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

  const value: AuthFormContextType = {
    register,
    watch,
    reset,
    handleSubmit,
    setValue,
    errors,
    getValidationStatus,
    dirtyFields,
  };

  return <AuthFormContext.Provider value={value}>{children}</AuthFormContext.Provider>;
}

// Hook to consume the context
export function useAuthForm(): AuthFormContextType {
  const context = useContext(AuthFormContext);

  if (!context) {
    throw new Error("useAuthFormContext must be used within an AuthFormProvider");
  }

  return context;
}
