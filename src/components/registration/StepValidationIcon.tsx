import { Check, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ValidationStatus = "complete" | "in-progress" | "error";

interface StepValidationIconProps {
  status: ValidationStatus;
  className?: string;
}

export const StepValidationIcon = ({ status, className }: StepValidationIconProps) => {
  const baseClasses = "w-[14px] h-[14px] rounded-full flex items-center justify-center animate-pulse";
  
  if (status === "complete") {
    return (
      <div className={cn(baseClasses, "bg-status-green", className)}>
        <Check className="w-[8px] h-[8px] text-white" strokeWidth={3} />
      </div>
    );
  }
  
  if (status === "in-progress") {
    return (
      <div className={cn(baseClasses, "bg-status-amber", className)}>
        <Loader2 className="w-[8px] h-[8px] text-white animate-spin" strokeWidth={3} />
      </div>
    );
  }
  
  // error status
  return (
    <div className={cn(baseClasses, "bg-status-red", className)}>
      <AlertCircle className="w-[8px] h-[8px] text-white" strokeWidth={3} />
    </div>
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
