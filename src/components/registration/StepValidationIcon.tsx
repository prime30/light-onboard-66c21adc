import { cn } from "@/lib/utils";

type ValidationStatus = "complete" | "in-progress" | "error";

interface StepValidationIconProps {
  status: ValidationStatus;
  className?: string;
}

export const StepValidationIcon = ({ status, className }: StepValidationIconProps) => {
  const baseClasses = "w-[6px] h-[6px] rounded-full animate-pulse";
  
  if (status === "complete") {
    return (
      <div className={cn(baseClasses, "bg-status-green", className)} />
    );
  }
  
  if (status === "in-progress") {
    return (
      <div className={cn(baseClasses, "bg-foreground", className)} />
    );
  }
  
  // error status
  return (
    <div className={cn(baseClasses, "bg-status-red", className)} />
  );
};

// Helper to determine validation status based on field completion
export const getStepValidationStatus = (
  isComplete: boolean,
  hasStarted: boolean,
  showErrors: boolean
): ValidationStatus => {
  if (isComplete) return "complete";
  if (showErrors && !isComplete) return "error";
  if (hasStarted) return "in-progress";
  return "in-progress";
};
