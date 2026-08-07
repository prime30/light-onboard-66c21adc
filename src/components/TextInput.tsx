import { cn } from "@/lib/utils";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { CheckMarkIcon } from "./CheckMarkIcon";
import { FieldValues } from "react-hook-form";
import { FormFieldProps } from "@/types/form";

type TextInputProps<TFieldValues extends FieldValues = FieldValues> =
  React.ComponentProps<"input"> &
    FormFieldProps<TFieldValues> & {
      isValid?: boolean;
      label?: React.ReactNode;
      prefixIcon?: React.ReactNode;
      prefixChip?: React.ReactNode;
      className?: string;
    };

export function TextInput<TFieldValues extends FieldValues = FieldValues>({
  type,
  placeholder,
  name,
  register,
  onChange,
  error,
  valueAsNumber,
  label = null,
  prefixIcon = null,
  prefixChip = null,
  isValid = false,
  className = "",
  ...inputProps
}: TextInputProps<TFieldValues>) {
  return (
    <div className={cn("space-y-2.5 group text-left", className)}>
      {label && (
        <Label
          htmlFor={name}
          className={cn("text-sm font-medium label-float", error && "text-destructive")}
        >
          {label}
        </Label>
      )}
      <div className="input-glow input-ripple rounded-form relative">
        {prefixIcon}
        {prefixChip && (
          <div className="absolute left-[14px] top-1/2 -translate-y-1/2 z-10">
            {prefixChip}
          </div>
        )}
        <Input
          id={name}
          type={type}
          placeholder={placeholder}
          onChange={onChange}
          {...(register ? register(name, { valueAsNumber }) : {})}
          className={cn(
            "h-input rounded-form bg-muted border-border/50 focus:border-foreground/20 focus:bg-background transition-all duration-300",
            prefixIcon && !prefixChip && "pl-14",
            prefixChip && !prefixIcon && "pl-[198px]",
            prefixIcon && prefixChip && "pl-[212px]",
            error && "border-destructive/50 bg-destructive/5"
          )}
          {...inputProps}
        />
        <CheckMarkIcon show={isValid} />
      </div>
      {error?.message && <p className="text-xs text-destructive">{error.message}</p>}
    </div>
  );
}

