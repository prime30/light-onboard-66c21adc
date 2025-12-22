import { useRef } from "react";
import { cn } from "@/lib/utils";
import { Check, Flag } from "lucide-react";
import type { Step } from "@/types/auth";

interface StepIndicatorBarProps {
  mode: "signup" | "signin";
  currentStep: Step;
  displayTotalSteps: number;
  completedSteps: Set<number>;
  getCurrentStepNumber: () => number;
  onGoToStep: (stepNum: number) => void;
}

export function StepIndicatorBar({
  mode,
  currentStep,
  displayTotalSteps,
  completedSteps,
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

  return (
    <div
      className="flex items-center justify-center h-[50px] flex-1 touch-pan-y"
      onTouchStart={handleStepSwipeStart}
      onTouchMove={handleStepSwipeMove}
      onTouchEnd={handleStepSwipeEnd}
    >
      <div
        className="relative flex items-center justify-center overflow-visible w-[160px] sm:w-[280px] lg:w-[320px]"
        style={{
          height: "50px",
          maskImage:
            "linear-gradient(to right, transparent 0%, white 15%, white 85%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, white 15%, white 85%, transparent 100%)",
        }}
      >
        {/* Sliding track that moves based on current step */}
        <div
          className="flex items-center transition-transform duration-500 ease-out"
          style={{
            transform: `translateX(${((displayTotalSteps + 2) / 2 - (currentStep === "onboarding" ? 0 : currentStep === "success" ? displayTotalSteps + 1 : getCurrentStepNumber()) - 0.5) * 44}px)`,
          }}
        >
          {/* Intro/Onboarding step with icon */}
          <button
            onClick={() => currentStep !== "onboarding" && onGoToStep(0)}
            aria-label="Go to introduction step"
            className="flex items-center cursor-pointer hover:opacity-100 transition-opacity"
            style={{
              opacity: currentStep === "onboarding" ? 1 : 0.6,
              transform: `scale(${currentStep === "onboarding" ? 1 : 0.85})`,
              transition: "all 0.5s ease-out",
            }}
          >
            <div
              className={cn(
                "relative flex items-center justify-center transition-all duration-500",
                "w-[20px] h-[20px]"
              )}
            >
              {/* Active step glow ring */}
              {currentStep === "onboarding" && (
                <>
                  <div className="absolute inset-[3px] rounded-full border border-foreground/30 animate-[ripple_2s_ease-out_infinite]" />
                  <div className="absolute inset-[3px] rounded-full border border-foreground/20 animate-[ripple_2s_ease-out_infinite_0.5s]" />
                </>
              )}
              <div
                className={cn(
                  "rounded-full transition-all duration-500 flex items-center justify-center",
                  currentStep === "onboarding"
                    ? "w-[6px] h-[6px] bg-foreground"
                    : "w-[20px] h-[20px] bg-[hsl(142_71%_75%)] dark:bg-[hsl(142_71%_30%)] text-[hsl(142_71%_25%)] dark:text-[hsl(142_71%_75%)]"
                )}
              >
                {currentStep !== "onboarding" && (
                  <Check className="w-[10px] h-[10px]" strokeWidth={3} />
                )}
              </div>
            </div>
          </button>

          {/* Connecting line after intro */}
          <div className="relative h-px w-[10px] bg-border/60 rounded-full overflow-hidden mx-[5px]">
            <div
              className={cn(
                "absolute inset-0 bg-foreground/50 rounded-full origin-left transition-transform duration-500 ease-out",
                currentStep !== "onboarding" ? "scale-x-100" : "scale-x-0"
              )}
            />
          </div>

          {/* Regular numbered steps */}
          {Array.from({ length: displayTotalSteps }, (_, i) => {
            const stepNum = i + 1;
            const currentStepNum = currentStep === "onboarding" ? 0 : getCurrentStepNumber();
            const distance = Math.abs(stepNum - currentStepNum);
            const isActive = stepNum === currentStepNum;
            const isPassed = currentStepNum > stepNum;
            const isCompleted = completedSteps.has(stepNum);
            const isPassedButIncomplete = isPassed && !isCompleted;

            // Calculate opacity based on distance from center
            const opacity = isActive ? 1 : distance === 1 ? 0.6 : distance === 2 ? 0.3 : 0.15;
            // Calculate scale based on distance
            const scale = isActive ? 1 : distance === 1 ? 0.85 : 0.7;

            // Determine background color based on state
            const getStepBgClass = () => {
              if (isActive) return "bg-foreground text-background";
              if (isCompleted)
                return "bg-[hsl(142_71%_75%)] dark:bg-[hsl(142_71%_30%)] text-[hsl(142_71%_25%)] dark:text-[hsl(142_71%_75%)]";
              if (isPassedButIncomplete)
                return "bg-[hsl(0_84%_80%)] dark:bg-[hsl(0_60%_30%)] text-[hsl(0_84%_35%)] dark:text-[hsl(0_84%_75%)]";
              return "bg-border/60 text-muted-foreground";
            };

            return (
              <div key={i} className="flex items-center">
                <button
                  onClick={() => onGoToStep(stepNum)}
                  aria-label={`Go to step ${stepNum}`}
                  className="flex items-center cursor-pointer hover:opacity-100 transition-opacity"
                  style={{
                    opacity,
                    transform: `scale(${scale})`,
                    transition: "all 0.5s ease-out",
                  }}
                >
                  <div
                    className={cn(
                      "relative flex items-center justify-center transition-all duration-500",
                      isActive ? "w-[32px] h-[32px]" : "w-[20px] h-[20px]"
                    )}
                  >
                    {/* Active step glow ring */}
                    {isActive && (
                      <div
                        className="absolute inset-0 rounded-full border border-foreground/30 animate-pulse"
                        style={{ boxShadow: "0 0 16px hsl(var(--foreground) / 0.15)" }}
                      />
                    )}
                    <div
                      className={cn(
                        "rounded-full transition-all duration-500 flex items-center justify-center font-semibold",
                        isActive ? "w-[24px] h-[24px] text-[10px]" : "w-[20px] h-[20px] text-[9px]",
                        getStepBgClass()
                      )}
                    >
                      {isCompleted && !isActive ? (
                        <Check className="w-[10px] h-[10px]" strokeWidth={3} />
                      ) : (
                        <span>{stepNum}</span>
                      )}
                    </div>
                  </div>
                </button>
                {/* Connecting line after each step */}
                <div className="relative h-px w-[10px] bg-border/60 rounded-full overflow-hidden mx-[5px]">
                  <div
                    className={cn(
                      "absolute inset-0 bg-foreground/50 rounded-full origin-left transition-transform duration-500 ease-out",
                      isPassed || currentStep === "success" ? "scale-x-100" : "scale-x-0"
                    )}
                  />
                </div>
              </div>
            );
          })}

          {/* Success step with flag icon */}
          {(() => {
            const successStepNum = displayTotalSteps + 1;
            const currentStepNum =
              currentStep === "onboarding"
                ? 0
                : currentStep === "success"
                  ? successStepNum
                  : getCurrentStepNumber();
            const distance = Math.abs(successStepNum - currentStepNum);
            const isActive = currentStep === "success";
            const opacity = isActive ? 1 : distance === 1 ? 0.6 : distance === 2 ? 0.3 : 0.15;
            const scale = isActive ? 1 : distance === 1 ? 0.85 : 0.7;

            return (
              <div
                className="flex items-center"
                style={{
                  opacity,
                  transform: `scale(${scale})`,
                  transition: "all 0.5s ease-out",
                }}
              >
                <div
                  className={cn(
                    "relative flex items-center justify-center transition-all duration-500",
                    isActive ? "w-[32px] h-[32px]" : "w-[20px] h-[20px]"
                  )}
                >
                  {/* Active step glow ring */}
                  {isActive && (
                    <div
                      className="absolute inset-0 rounded-full border border-foreground/30 animate-pulse"
                      style={{ boxShadow: "0 0 16px hsl(var(--foreground) / 0.15)" }}
                    />
                  )}
                  <div
                    className={cn(
                      "rounded-full transition-all duration-500 flex items-center justify-center",
                      isActive
                        ? "w-[24px] h-[24px] bg-foreground text-background"
                        : "w-[20px] h-[20px] bg-border/60 text-muted-foreground"
                    )}
                  >
                    <Flag
                      className={cn(
                        "transition-all duration-300",
                        isActive ? "w-[12px] h-[12px]" : "w-[10px] h-[10px]"
                      )}
                    />
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
