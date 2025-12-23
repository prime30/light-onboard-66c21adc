import { FieldError, useForm, UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RegistrationFormData, registrationSchema } from "@/lib/validations/auth-schemas";

export type ValidFieldNames = keyof RegistrationFormData;

export type FormFieldProps = {
  type: string;
  placeholder: string;
  name: ValidFieldNames;
  register: UseFormRegister<FormData>;
  error: FieldError | undefined;
  valueAsNumber?: boolean;
};

const defaultValues: Partial<RegistrationFormData> = {
  country: "US",
  subscribeOrderUpdates: true,
  subscribeMarketing: false,
  subscribePromotions: true,
};

export function useAuthForm() {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues,
  });

  return {
    register,
    reset,
    handleSubmit,
    setValue,
    errors,
  };
}
