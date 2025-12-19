import { useRef } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { AuthMode, Step } from "@/types/auth";

interface IncompleteStep {
  step: number;
  name: string;
  missingFields: string[];
}

interface AuthFooterProps {
  mode: AuthMode;
  currentStep: Step;
  canContinue: boolean;
  isAllStepsValid: boolean;
  isSubmitting: boolean;
  footerTransitionsEnabled: boolean;
  footerEnterReady: boolean;
  incompleteSteps: IncompleteStep[];
  onBack: () => void;
  onNext: () => void;
  onGoToStep: (step: number, missingFields?: string[]) => void;
}

export function AuthFooter({
  mode,
  currentStep,
  canContinue,
  isAllStepsValid,
  isSubmitting,
  footerTransitionsEnabled,
  footerEnterReady,
  incompleteSteps,
  onBack,
  onNext,
  onGoToStep,
}: AuthFooterProps) {
  const submitTooltipOpen = useRef(false);
  const submitPopoverCloseTimer = useRef<number | null>(null);

  const showBackButton = mode === "signup" && currentStep !== "onboarding";
  const isSummaryStep = currentStep === "summary";
  const showTooltip = isSummaryStep && !isAllStepsValid && incompleteSteps.length > 0;

  const getButtonLabel = () => {
    if (isSubmitting) return "Submitting...";
    if (mode === "signin") return "Login";
    if (isSummaryStep) return "Submit application";
    if (currentStep === "onboarding") return "Apply for wholesale";
    return "Continue";
  };

  return (
    <footer
      className={cn(
        "sticky bottom-[10px] mx-[10px] bg-background p-2.5 sm:p-5 lg:p-[25px] pb-[max(0.625rem,env(safe-area-inset-bottom))] rounded-[20px] overflow-hidden border border-border/30 shadow-[0_0_20px_-5px_rgba(0,0,0,0.12)]",
        "lg:bottom-0 lg:mx-0 lg:rounded-none lg:border-x-0 lg:border-b-0 lg:shadow-none",
        footerEnterReady ? "animate-slide-up-fade" : "opacity-0 translate-y-[15px]"
      )}
    >
      <div className="max-w-[38rem] mx-auto flex flex-col gap-[10px]">
        <div
          className={cn("flex", showBackButton ? "gap-[15px]" : "gap-0")}
          style={{ transition: footerTransitionsEnabled ? "gap 300ms ease-out" : "none" }}
        >
          {/* Back button */}
          <div
            className={cn(
              "overflow-hidden",
              showBackButton ? "w-[55px] opacity-100" : "w-0 opacity-0"
            )}
            style={{
              transition: footerTransitionsEnabled
                ? "width 300ms ease-out, opacity 300ms ease-out"
                : "none",
            }}
          >
            <Button
              variant="outline"
              size="lg"
              onClick={onBack}
              aria-label="Go back"
              className="h-button w-[55px] p-0 rounded-form border-border hover:bg-muted/60 hover:border-foreground/30 group active:bg-muted/80 active:scale-95 transition-transform"
            >
              <ArrowLeft
                className="w-[18px] h-[18px] transition-transform duration-150 group-active:-translate-x-1"
                aria-hidden="true"
              />
            </Button>
          </div>

          {/* Main action button with popover for incomplete steps */}
          <Popover>
            <PopoverTrigger asChild>
              <span
                className="flex-1 block"
                onMouseEnter={() => {
                  if (submitPopoverCloseTimer.current) {
                    window.clearTimeout(submitPopoverCloseTimer.current);
                    submitPopoverCloseTimer.current = null;
                  }
                  if (showTooltip) {
                    submitTooltipOpen.current = true;
                  }
                }}
                onMouseLeave={() => {
                  if (submitPopoverCloseTimer.current) {
                    window.clearTimeout(submitPopoverCloseTimer.current);
                  }
                  submitPopoverCloseTimer.current = window.setTimeout(() => {
                    submitTooltipOpen.current = false;
                    submitPopoverCloseTimer.current = null;
                  }, 220);
                }}
              >
                <Button
                  size="lg"
                  onClick={onNext}
                  disabled={isSummaryStep ? !isAllStepsValid || isSubmitting : !canContinue || isSubmitting}
                  className={cn(
                    "btn-premium w-full h-button rounded-form bg-foreground text-background hover:bg-foreground disabled:opacity-40 font-medium text-base tracking-wide group active:scale-[0.98] transition-transform",
                    showTooltip && "pointer-events-none"
                  )}
                >
                  <span className="relative z-10 flex items-center justify-center gap-[10px]">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-[18px] h-[18px] animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        {getButtonLabel()}
                        {!isSummaryStep && mode === "signup" && (
                          <ArrowRight
                            className="w-[18px] h-[18px] transition-transform duration-150 group-hover:translate-x-0.5"
                            aria-hidden="true"
                          />
                        )}
                      </>
                    )}
                  </span>
                </Button>
              </span>
            </PopoverTrigger>

            {showTooltip && (
              <PopoverContent
                className="w-[280px] p-3 rounded-xl border border-border/50 shadow-lg"
                side="top"
                align="center"
                sideOffset={8}
                onMouseEnter={() => {
                  if (submitPopoverCloseTimer.current) {
                    window.clearTimeout(submitPopoverCloseTimer.current);
                    submitPopoverCloseTimer.current = null;
                  }
                }}
                onMouseLeave={() => {
                  submitTooltipOpen.current = false;
                }}
              >
                <p className="text-sm font-medium text-foreground mb-2">
                  Complete these steps to submit:
                </p>
                <div className="space-y-1.5">
                  {incompleteSteps.map((item) => (
                    <button
                      key={item.step}
                      onClick={() => onGoToStep(item.step, item.missingFields)}
                      className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-muted/60 transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-muted text-muted-foreground text-xs font-medium flex items-center justify-center">
                          {item.step}
                        </span>
                        <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                          {item.name}
                        </span>
                      </div>
                      <div className="ml-7 text-xs text-muted-foreground mt-0.5">
                        {item.missingFields.join(", ")}
                      </div>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            )}
          </Popover>
        </div>
      </div>
    </footer>
  );
}
