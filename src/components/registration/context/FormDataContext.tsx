import { createContext, useContext, ReactNode, useEffect, useCallback, useMemo } from "react";
import {
  AllRegistrationFormData,
  defaultValues,
  RegistrationFormData,
  registrationSchema,
  ValidFieldNames,
} from "@/lib/validations/auth-schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { Control, FieldError, useForm, UseFormRegister } from "react-hook-form";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { useAtom } from "jotai/react";
import z from "zod";

export type ValidationStatus = "complete" | "in-progress" | "error";

export type FormFieldProps = {
  type: string;
  placeholder?: string;
  name: ValidFieldNames;
  register: UseFormRegister<RegistrationFormData>;
  error: FieldError | undefined;
  valueAsNumber?: boolean;
};

export type FormControlFieldProps = Omit<FormFieldProps, "register"> & {
  control: Control<RegistrationFormData>;
};

export type FormDataContextType = {
  register: UseFormRegister<RegistrationFormData>;
  control: Control<RegistrationFormData>;
  watch: ReturnType<typeof useForm<RegistrationFormData>>["watch"];
  reset: ReturnType<typeof useForm<RegistrationFormData>>["reset"];
  handleSubmit: ReturnType<typeof useForm<RegistrationFormData>>["handleSubmit"];
  setValue: ReturnType<typeof useForm<RegistrationFormData>>["setValue"];
  formState: ReturnType<typeof useForm<RegistrationFormData>>["formState"];
  subscribe: ReturnType<typeof useForm<RegistrationFormData>>["subscribe"];
  getValidationStatus: (fields: ValidFieldNames | ValidFieldNames[]) => ValidationStatus;
  errors: ReturnType<typeof useForm<AllRegistrationFormData>>["formState"]["errors"];
  dirtyFields: ReturnType<typeof useForm<RegistrationFormData>>["formState"]["dirtyFields"];
  isFormValid: boolean;
  fullErrors: ReturnType<typeof z.treeifyError<RegistrationFormData>>;
  isSubmitted: boolean;
  isSubmitSuccessful: boolean;
  isSubmitting: boolean;
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

  const {
    register,
    handleSubmit,
    reset: hookFormReset,
    setValue,
    watch,
    formState,
    subscribe,
    control,
  } = useForm<RegistrationFormData>({
    mode: "onChange",
    resolver: zodResolver(registrationSchema),
    defaultValues: initialValues,
  });

  const { errors, dirtyFields, isSubmitted, isSubmitSuccessful, isSubmitting } = formState;

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

  const fields = watch();
  const { isFormValid, fullErrors } = useMemo(() => {
    const currentData = fields;
    const result = registrationSchema.safeParse(currentData);
    const fullErrors: ReturnType<typeof z.treeifyError<RegistrationFormData>> = result.success
      ? { errors: [], properties: {} }
      : z.treeifyError(result.error);
    return {
      isFormValid: result.success,
      fullErrors,
    };
  }, [fields]);

  // On mount, populate form with stored values
  useEffect(() => {
    if (storedForm) {
      Object.entries(storedForm).forEach(([key, value]) => {
        setValue(key as ValidFieldNames, value, dirtyFieldOptions);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setStoredFormValues = useCallback(
    ({ values }: { values: Partial<RegistrationFormData> }) => {
      type ValueType = (typeof values)[keyof typeof values];
      const newStore = Object.entries(values).reduce((acc, [key, value]: [string, ValueType]) => {
        if (
          (Array.isArray(value) && value.length === 0) ||
          (Array.isArray(value) && typeof value[0] === "object" && value[0].file instanceof File)
        ) {
          return acc;
        }

        if (value !== undefined && value !== "") {
          acc[key] = value;
        }

        return acc;
      }, {} as Partial<RegistrationFormData>);
      setStoredForm(newStore);
    },
    [setStoredForm]
  );

  useEffect(() => {
    const callback = subscribe({
      formState: {
        values: true,
      },
      callback: setStoredFormValues,
    });

    return () => callback();
  }, [subscribe, setStoredForm, setStoredFormValues]);

  const reset = useCallback(
    (values: Partial<RegistrationFormData> = {}) => {
      const resetValues = { ...defaultValues, ...values };
      hookFormReset(resetValues);
      setStoredFormValues({ values: resetValues });
    },
    [hookFormReset, setStoredFormValues]
  );

  console.log(storedForm);

  const value: FormDataContextType = {
    register,
    control,
    watch,
    reset,
    handleSubmit,
    setValue,
    formState,
    subscribe,
    getValidationStatus,
    errors,
    dirtyFields,
    isFormValid,
    fullErrors,
    isSubmitted,
    isSubmitSuccessful,
    isSubmitting,
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
