import { cn } from "@/lib/utils";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { FormFieldProps } from "./registration/context";
import { ReactNode } from "react";
import { Check } from "lucide-react";

type TextInputProps = React.ComponentProps<"input"> &
  FormFieldProps & {
    isValid?: boolean;
    label?: ReactNode;
    prefixIcon?: ReactNode;
    className?: string;
  };

function CheckMarkIcon({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className={cn("absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none z-10")}>
      <div className="w-5 h-5 rounded-full bg-success/15 flex items-center justify-center animate-scale-in">
        <Check className="w-3.5 h-3.5 text-success" strokeWidth={2.5} />
      </div>
    </div>
  );
}

export function TextInput({
  type,
  placeholder,
  name,
  register,
  error,
  valueAsNumber,
  label = null,
  prefixIcon = null,
  isValid = false,
  className = "",
  ...inputProps
}: TextInputProps) {
  return (
    <div className={cn("space-y-2.5 group", className)}>
      {label && (
        <Label
          htmlFor={name}
          className={cn("text-sm font-medium label-float", error && "text-destructive")}
        >
          {label}
        </Label>
      )}
      <div className="input-glow input-ripple rounded-form">
        {prefixIcon}
        <Input
          id={name}
          type={type}
          placeholder={placeholder}
          {...register(name, { valueAsNumber })}
          className={cn(
            "h-input rounded-form bg-muted border-border/50 focus:border-foreground/30 focus:bg-background transition-all duration-300 focus:shadow-input-focus",
            prefixIcon && "pl-14",
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
