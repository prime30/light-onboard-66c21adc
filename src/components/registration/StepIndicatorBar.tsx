import { useRef } from "react";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import { StepIndicator } from "./StepIndicator";
import type { Step, AccountType } from "@/types/auth";

interface StepIndicatorBarProps {
  mode: "signup" | "signin";
  currentStep: Step;
  displayTotalSteps: number;
  getCurrentStepNumber: () => number;
  onGoToStep: (stepNum: number) => void;
}

export function StepIndicatorBar({
  mode,
  currentStep,
  displayTotalSteps,
  getCurrentStepNumber,
  onGoToStep,
}: StepIndicatorBarProps) {
  // Swipe refs
  const stepSwipeStartX = useRef<number | null>(null);
  const stepSwipeEndX = useRef<number | null>(null);

  const handleStepSwipeStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    stepSwipeStartX.current = e.touches[0].clientX;
    stepSwipeEndX.current = null;
  };

  const handleStepSwipeMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    stepSwipeEndX.current = e.touches[0].clientX;
  };

  const handleStepSwipeEnd = () => {
    if (stepSwipeStartX.current === null || stepSwipeEndX.current === null) return;
    
    const diff = stepSwipeStartX.current - stepSwipeEndX.current;
    const threshold = 30;
    const currentStepNum = currentStep === "onboarding" ? 0 : getCurrentStepNumber();
    
    // Swipe left → next step
    if (diff > threshold && currentStepNum < displayTotalSteps) {
      onGoToStep(currentStepNum + 1);
    }
    // Swipe right → previous step
    else if (diff < -threshold && currentStepNum >= 1) {
      onGoToStep(currentStepNum - 1);
    }
    
    stepSwipeStartX.current = null;
    stepSwipeEndX.current = null;
  };

  if (mode !== "signup") return null;

  // Determine current step number for indicator
  const stepNumber = currentStep === "onboarding" ? 0 : getCurrentStepNumber();

  return (
    <div
      className={cn(
        "flex justify-center items-center py-2",
        "touch-pan-x select-none"
      )}
      onTouchStart={handleStepSwipeStart}
      onTouchMove={handleStepSwipeMove}
      onTouchEnd={handleStepSwipeEnd}
    >
      <StepIndicator
        currentStep={stepNumber}
        totalSteps={displayTotalSteps}
        hasIntroStep={true}
        introIcon={Sparkles}
      />
    </div>
  );
}
