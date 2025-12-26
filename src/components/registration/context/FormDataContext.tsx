import { createContext, useContext, ReactNode, useEffect, useCallback, useMemo } from "react";
import { RegistrationFormData, registrationSchema } from "@/lib/validations/auth-schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { FieldError, useForm, UseFormRegister } from "react-hook-form";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { useAtom } from "jotai/react";

export type ValidFieldNames = keyof RegistrationFormData;
export type ValidationStatus = "complete" | "in-progress" | "error";

export type FormFieldProps = {
  type: string;
  placeholder?: string;
  name: ValidFieldNames;
  register: UseFormRegister<RegistrationFormData>;
  error: FieldError | undefined;
  valueAsNumber?: boolean;
};

export const defaultValues: Partial<RegistrationFormData> = {
  phoneCountryCode: "+1",
  country: "US",
  subscribeOrderUpdates: true,
  subscribeMarketing: false,
  subscribePromotions: true,
};

export type FormDataContextType = {
  register: UseFormRegister<RegistrationFormData>;
  watch: ReturnType<typeof useForm<RegistrationFormData>>["watch"];
  reset: ReturnType<typeof useForm<RegistrationFormData>>["reset"];
  handleSubmit: ReturnType<typeof useForm<RegistrationFormData>>["handleSubmit"];
  setValue: ReturnType<typeof useForm<RegistrationFormData>>["setValue"];
  formState: ReturnType<typeof useForm<RegistrationFormData>>["formState"];
  subscribe: ReturnType<typeof useForm<RegistrationFormData>>["subscribe"];
  getValidationStatus: (fields: ValidFieldNames | ValidFieldNames[]) => ValidationStatus;
  errors: ReturnType<typeof useForm<RegistrationFormData>>["formState"]["errors"];
  dirtyFields: ReturnType<typeof useForm<RegistrationFormData>>["formState"]["dirtyFields"];
};

export const dirtyFieldOptions = {
  shouldDirty: true,
  shouldTouch: true,
  shouldValidate: true,
};

// Create the context
const FormDataContext = createContext<FormDataContextType | null>(null);

// Storage
const storage = createJSONStorage(() => sessionStorage);
const formAtom = atomWithStorage("_registration_form", defaultValues, storage, {
  getOnInit: true,
});

type FormDataProviderProps = {
  children: ReactNode;
  initialValues?: Partial<RegistrationFormData>;
};

// Provider component
export function FormDataProvider({
  children,
  initialValues = defaultValues,
}: FormDataProviderProps) {
  const [storedForm, setStoredForm] = useAtom(formAtom);

  const { register, handleSubmit, reset, setValue, watch, formState, subscribe } =
    useForm<RegistrationFormData>({
      mode: "onChange",
      resolver: zodResolver(registrationSchema),
      defaultValues: initialValues,
    });

  const { errors, dirtyFields } = formState;

  const getValidationStatus = useCallback(
    (fields: ValidFieldNames | ValidFieldNames[]): ValidationStatus => {
      if (!Array.isArray(fields)) {
        fields = [fields];
      }

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
    [errors, dirtyFields]
  );

  // On mount, populate form with stored values
  useEffect(() => {
    if (storedForm) {
      Object.entries(storedForm).forEach(([key, value]) => {
        setValue(key as ValidFieldNames, value, dirtyFieldOptions);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  }, [subscribe, setStoredForm]);

  const value: FormDataContextType = {
    register,
    watch,
    reset,
    handleSubmit,
    setValue,
    formState,
    subscribe,
    getValidationStatus,
    errors,
    dirtyFields,
  };

  return <FormDataContext.Provider value={value}>{children}</FormDataContext.Provider>;
}

// Hook to consume the context
export function useFormData(): FormDataContextType {
  const context = useContext(FormDataContext);

  if (!context) {
    throw new Error("useFormData must be used within a FormDataProvider");
  }

  return context;
}
