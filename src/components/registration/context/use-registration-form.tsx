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

const defaultValues: Partial<RegistrationFormData> = {
  country: "US",
  subscribeOrderUpdates: true,
  subscribeMarketing: false,
  subscribePromotions: true,
};

// Provider component
export function useRegistrationForm() {
  const { register, handleSubmit, reset, setValue, watch, formState } =
    useForm<RegistrationFormData>({
      resolver: zodResolver(registrationSchema),
      defaultValues,
    });
  const { errors, dirtyFields } = formState;

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

  return {
    register,
    watch,
    reset,
    handleSubmit,
    setValue,
    formState,
    getValidationStatus,
  };
}
