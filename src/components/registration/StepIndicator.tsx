import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  /** If true, shows an icon-based intro step (step 0) before the numbered steps */
  hasIntroStep?: boolean;
  /** Icon to show for intro step (defaults to Sparkles) */
  introIcon?: LucideIcon;
}

export const StepIndicator = ({ 
  currentStep, 
  totalSteps, 
  hasIntroStep = false,
  introIcon: IntroIcon = Sparkles 
}: StepIndicatorProps) => {
  // When hasIntroStep is true, step 0 = intro, steps 1+ = regular numbered steps
  // totalSteps still represents numbered steps only
  
  return (
    <div className="flex items-center justify-center gap-2">
      {/* Intro step with icon */}
      {hasIntroStep && (
        <div
          className={cn(
            "flex items-center justify-center rounded-full transition-all duration-300",
            currentStep === 0
              ? "w-7 h-7 bg-foreground text-background"
              : "w-6 h-6 bg-foreground/80 text-background"
          )}
        >
          <IntroIcon className={cn(
            "transition-all duration-300",
            currentStep === 0 ? "w-4 h-4" : "w-3.5 h-3.5"
          )} />
        </div>
      )}
      
      {/* Regular numbered steps with connecting lines */}
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNumber = i + 1;
        const isActive = currentStep === stepNumber;
        const isCompleted = currentStep > stepNumber;
        const isFirst = i === 0;
        
        return (
          <div key={i} className="flex items-center gap-2">
            {/* Connecting line before step (except first, unless there's an intro step) */}
            {(!isFirst || hasIntroStep) && (
              <div className="relative h-[2px] w-4 bg-border rounded-full overflow-hidden">
                {/* Animated fill */}
                <div
                  className={cn(
                    "absolute inset-0 bg-foreground rounded-full origin-left transition-transform duration-500 ease-out",
                    isCompleted || isActive ? "scale-x-100" : "scale-x-0"
                  )}
                />
              </div>
            )}
            {/* Step indicator */}
            <div
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                isActive
                  ? "w-8 bg-foreground"
                  : isCompleted
                  ? "w-1.5 bg-foreground"
                  : "w-1.5 bg-border"
              )}
            />
          </div>
        );
      })}
    </div>
  );
};
