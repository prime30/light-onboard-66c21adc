import { RegistrationFormData, registrationSchema } from "@/lib/validations/auth-schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback } from "react";
import { FieldError, useForm, UseFormRegister } from "react-hook-form";

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

export const defaultValues: Partial<RegistrationFormData> = {
  country: "US",
  subscribeOrderUpdates: true,
  subscribeMarketing: false,
  subscribePromotions: true,
};

type UseRegistrationFormProps = {
  initialValues?: Partial<RegistrationFormData>;
};

export function useRegistrationForm({ initialValues = defaultValues }: UseRegistrationFormProps) {
  const { register, handleSubmit, reset, setValue, watch, formState, subscribe } =
    useForm<RegistrationFormData>({
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
    [errors]
  );

  return {
    register,
    watch,
    reset,
    handleSubmit,
    setValue,
    formState,
    subscribe,
    getValidationStatus,
  };
}
