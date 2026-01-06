import { cn } from "@/lib/utils";
import { Label } from "./ui/label";
import { ReactNode } from "react";
import { CheckMarkIcon } from "./CheckMarkIcon";
import { Controller } from "react-hook-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { FormControlFieldProps } from "@/types/form";

export type SelectOption = {
  value: string;
  label: string | ReactNode;
  disabled?: boolean;
  triggerContent?: ReactNode;
};

type SelectInputProps = Omit<FormControlFieldProps, "type"> & {
  options: SelectOption[];
  isValid?: boolean;
  label?: ReactNode;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export function SelectInput({
  name,
  control,
  error,
  options,
  label = null,
  placeholder = "Select an option...",
  isValid = false,
  className = "",
  disabled = false,
}: SelectInputProps) {
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
      <div className="input-glow input-ripple rounded-form relative">
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <Select
              value={field.value?.toString() || ""}
              onValueChange={field.onChange}
              disabled={disabled}
            >
              <SelectTrigger
                className={cn(
                  "h-input rounded-form bg-muted border-border/50 focus:border-foreground/30 focus:bg-background transition-all duration-300 focus:shadow-input-focus",
                  error && "border-destructive/50 bg-destructive/5"
                )}
              >
                <SelectValue placeholder={placeholder}>
                  {field.value && options.find((opt) => opt.value === field.value)?.triggerContent}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <CheckMarkIcon show={isValid} className="right-10" />
      </div>
      {error?.message && <p className="text-xs text-destructive">{error.message}</p>}
    </div>
  );
}
