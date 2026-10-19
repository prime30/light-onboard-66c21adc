import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
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
  const isPassword = type === "password";
  const [revealed, setRevealed] = useState(false);
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
          type={isPassword && revealed ? "text" : type}
          placeholder={placeholder}
          onChange={onChange}
          // Phones must never capitalise or "correct" a password, otherwise
          // the saved password silently differs from what the person typed.
          {...(isPassword || /password/i.test(String(name))
            ? { autoCapitalize: "none", autoCorrect: "off", spellCheck: false }
            : {})}
          {...(register ? register(name, { valueAsNumber }) : {})}
          className={cn(
            "h-input rounded-form bg-muted border-border/50 focus:border-foreground/20 focus:bg-background transition-all duration-300",
            prefixIcon && !prefixChip && "pl-14",
            prefixChip && !prefixIcon && "pl-[126px]",
            prefixIcon && prefixChip && "pl-[160px]",
            isPassword && (isValid ? "pr-20" : "pr-12"),
            error && "border-destructive/50 bg-destructive/5"
          )}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors",
              isValid ? "right-12" : "right-3"
            )}
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            tabIndex={-1}
          >
            {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
        <CheckMarkIcon show={isValid} />
      </div>
      {error?.message && <p className="text-xs text-destructive">{error.message}</p>}
    </div>
  );
}

