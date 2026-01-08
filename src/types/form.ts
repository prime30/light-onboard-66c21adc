import { ChangeEventHandler } from "react";
import { Control, FieldError, FieldPath, FieldValues, UseFormRegister } from "react-hook-form";

type FormFieldUpdater<T extends FieldValues = FieldValues> =
  | {
      register: UseFormRegister<T>;
      onChange?: undefined;
    }
  | {
      register?: undefined;
      onChange: ChangeEventHandler<HTMLInputElement>;
    };

type BaseFieldProps<T extends FieldValues = FieldValues> = {
  type: React.HTMLInputTypeAttribute;
  placeholder?: string;
  name: FieldPath<T>;
  error: FieldError | undefined;
  valueAsNumber?: boolean;
};

export type FormFieldProps<T extends FieldValues = FieldValues> = BaseFieldProps<T> &
  FormFieldUpdater<T>;

export type FormControlFieldProps<T extends FieldValues = FieldValues> = BaseFieldProps<T> & {
  control: Control<T>;
};
