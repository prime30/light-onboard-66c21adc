import { cn } from "@/lib/utils";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export const StepIndicator = ({ currentStep, totalSteps }: StepIndicatorProps) => {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            i + 1 === currentStep
              ? "w-8 bg-foreground"
              : i + 1 < currentStep
              ? "w-1.5 bg-foreground"
              : "w-1.5 bg-border"
          )}
        />
      ))}
    </div>
  );
};
