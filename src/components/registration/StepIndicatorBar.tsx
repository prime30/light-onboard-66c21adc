import { useRef, memo, useMemo, useCallback, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Check, Flag, AlertCircle } from "lucide-react";
import { useStepContext } from "./context/StepContext";
import { useModeContext } from "./context/ModeContext";
import { useFormData } from "./context";
import { createPortal } from "react-dom";
import { useAdminMode } from "@/lib/admin-mode";

export const StepIndicatorBar = memo(function StepIndicatorBar() {
  const { watch } = useFormData();
  // Get all step data from context
  const {
    currentStep,
    totalSteps: displayTotalSteps,
    completedSteps,
    steps,
    goToStep,
    goToNextStep,
    goToPrevStep,
  } = useStepContext();

  const { mode } = useModeContext();
  const isAdmin = useAdminMode();

  const [inDelay, setInDelay] = useState(true);
  const accountType = watch("accountType");

  useEffect(() => {
    if (currentStep === "account-type") {
      setInDelay(true);
      return;
    }

    if (inDelay) {
      setInDelay(false);
    }
  }, [accountType, currentStep, inDelay]);

  // Memoize the current step number to prevent recalculation on every render.
  // The "success" step isn't in the steps array — it conceptually sits one
  // past the last real step (where the flag is rendered), so map it there.
  const getCurrentStepNumber = useMemo(() => {
    if (currentStep === "success") return steps.length;
    const index = steps.indexOf(currentStep);
    return index === -1 ? 0 : index;
  }, [currentStep, steps]);

  // Memoize the translation calculation to prevent unnecessary re-renders
  const translateX = useMemo(() => {
    return ((displayTotalSteps + 1) / 2 - getCurrentStepNumber - 1) * 40;
  }, [displayTotalSteps, getCurrentStepNumber]);

  // Memoize step validation states to prevent re-renders when other steps change
  const currentStepValidationStates = useMemo(() => {
    const relevantSteps = steps.slice(1); // Skip onboarding only; flag is rendered separately
    return relevantSteps.map((step) => ({
      step,
      status: completedSteps[step] || "in-progress",
    }));
  }, [steps, completedSteps]);

  // Swipe refs - must be called before early return
  const stepSwipeStartX = useRef<number | null>(null);
  const stepSwipeEndX = useRef<number | null>(null);

  const handleStepSwipeStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    stepSwipeStartX.current = e.touches[0].clientX;
    stepSwipeEndX.current = null;
  }, []);

  const handleStepSwipeMove = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    stepSwipeEndX.current = e.touches[0].clientX;
  }, []);

  const handleStepSwipeEnd = useCallback(() => {
    if (!isAdmin) return;
    if (stepSwipeStartX.current === null || stepSwipeEndX.current === null) return;

    const diff = stepSwipeStartX.current - stepSwipeEndX.current;
    const threshold = 30;

    // Swipe left → next step
    if (diff > threshold) {
      goToNextStep();
    }
    // Swipe right → previous step
    else if (diff < -threshold) {
      goToPrevStep();
    }

    stepSwipeStartX.current = null;
    stepSwipeEndX.current = null;
  }, [goToNextStep, goToPrevStep, isAdmin]);

  // Only show for signup mode
  if (mode !== "signup") return null;

  const root = document.getElementById("step-indicator-root");

  if (!root) return null;

  return createPortal(
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
          className={cn(
            "flex items-center",
            !inDelay && "transition-transform duration-500 ease-out"
          )}
          style={{
            transform: `translateX(${translateX}px)`,
          }}
        >
          {/* Intro/Onboarding step with icon */}
          <button
            onClick={() => currentStep !== "onboarding" && goToStep("onboarding")}
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
          {currentStepValidationStates.map(({ step, status }, i) => {
            const stepNum = i + 1;
            const stepIndex = i + 1; // actual index in steps array (skip onboarding at 0)
            const currentStepNum = getCurrentStepNumber;
            const distance = Math.abs(stepIndex - currentStepNum);
            const isActive = stepIndex === currentStepNum;
            const isPassed = currentStepNum > stepIndex;

            // Get the step validation status from memoized data
            const validationStatus = status;
            const isCompleted = validationStatus === "complete";
            const hasError = validationStatus === "error";

            // Calculate opacity based on distance from center
            const opacity = isActive ? 1 : distance === 1 ? 0.6 : distance === 2 ? 0.3 : 0.15;
            // Calculate scale based on distance
            const scale = isActive ? 1 : distance === 1 ? 0.85 : 0.7;

            // Determine background color based on state
            const getStepBgClass = () => {
              if (isActive) return "bg-foreground text-background";
              if (isCompleted)
                return "bg-[hsl(142_71%_75%)] dark:bg-[hsl(142_71%_30%)] text-[hsl(142_71%_25%)] dark:text-[hsl(142_71%_75%)]";
              if (hasError)
                return "bg-[hsl(0_84%_80%)] dark:bg-[hsl(0_60%_30%)] text-[hsl(0_84%_35%)] dark:text-[hsl(0_84%_75%)]";
              if (validationStatus === "in-progress")
                return "bg-muted-foreground/25 text-muted-foreground";
              return "bg-border/60 text-muted-foreground";
            };

            return (
              <div key={step} className="flex items-center">
                <button
                  onClick={() => goToStep(step)}
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
                      ) : hasError && !isActive ? (
                        <AlertCircle className="w-[10px] h-[10px]" strokeWidth={3} />
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
            const successStepIndex = steps.length; // one past the last actual step
            const currentStepNum = getCurrentStepNumber;
            const distance = Math.abs(successStepIndex - currentStepNum);
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
    </div>,
    root
  );
});
