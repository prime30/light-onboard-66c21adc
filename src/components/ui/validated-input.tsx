import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "./input";

type ValidationRule = "email" | "phone" | "password" | "required" | "license" | "zipCode";

interface ValidatedInputProps extends React.ComponentProps<"input"> {
  validationRule?: ValidationRule;
  customValidator?: (value: string) => boolean;
  showValidation?: boolean;
  /** Whether to wrap in a relative container (set false if parent is already relative) */
  wrapperClassName?: string;
}

const validators: Record<ValidationRule, (value: string) => boolean> = {
  email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  phone: (value) => value.replace(/\D/g, "").length >= 10,
  password: (value) => value.length >= 8,
  required: (value) => value.trim().length > 0,
  license: (value) => value.trim().length >= 4,
  zipCode: (value) => /^\d{5}(-\d{4})?$/.test(value.trim()),
};

const ValidatedInput = React.forwardRef<HTMLInputElement, ValidatedInputProps>(
  (
    {
      className,
      validationRule,
      customValidator,
      showValidation = true,
      wrapperClassName,
      value,
      ...props
    },
    ref
  ) => {
    const stringValue = typeof value === "string" ? value : String(value ?? "");

    const isValid = React.useMemo(() => {
      if (!stringValue || stringValue.length === 0) return false;

      if (customValidator) {
        return customValidator(stringValue);
      }

      if (validationRule && validators[validationRule]) {
        return validators[validationRule](stringValue);
      }

      return false;
    }, [stringValue, validationRule, customValidator]);

    const showCheckmark = showValidation && isValid;

    return (
      <>
        <Input
          ref={ref}
          value={value}
          className={cn(showCheckmark && "pr-10", className)}
          {...props}
        />
        {showCheckmark && (
          <div
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none z-10",
              wrapperClassName
            )}
          >
            <div className="w-5 h-5 rounded-full bg-success/15 flex items-center justify-center animate-scale-in">
              <Check className="w-3.5 h-3.5 text-success" strokeWidth={2.5} />
            </div>
          </div>
        )}
      </>
    );
  }
);

ValidatedInput.displayName = "ValidatedInput";

export { ValidatedInput, type ValidationRule };
