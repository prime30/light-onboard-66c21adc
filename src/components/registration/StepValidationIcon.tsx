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
      <div 
        className={cn(baseClasses, "bg-status-green", className)} 
        style={{ boxShadow: '0 0 8px hsl(var(--status-green) / 0.6)' }}
      />
    );
  }
  
  if (status === "in-progress") {
    return (
      <div 
        className={cn(baseClasses, "bg-foreground", className)} 
        style={{ boxShadow: '0 0 8px hsl(var(--foreground) / 0.3)' }}
      />
    );
  }
  
  // error status
  return (
    <div 
      className={cn(baseClasses, "bg-status-red", className)} 
      style={{ boxShadow: '0 0 8px hsl(var(--status-red) / 0.6)' }}
    />
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
