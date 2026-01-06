import { Control, FieldError, FieldPath, FieldValues, UseFormRegister } from "react-hook-form";

export type FormFieldProps<T extends FieldValues = FieldValues> = {
  type: React.HTMLInputTypeAttribute;
  placeholder?: string;
  name: FieldPath<T>;
  register: UseFormRegister<T>;
  error: FieldError | undefined;
  valueAsNumber?: boolean;
};

export type FormControlFieldProps<T extends FieldValues = FieldValues> = Omit<
  FormFieldProps<T>,
  "register"
> & {
  control: Control<T>;
};
