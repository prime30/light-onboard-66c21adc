import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { AuthMode, Step } from "@/types/auth";
import { useForm, useStepContext } from "./context";

interface IncompleteStep {
  step: number;
  name: string;
  missingFields: string[];
}

interface AuthFooterProps {
  mode: AuthMode;
  currentStep: Step;
  isAllStepsValid: boolean;
  isSubmitting: boolean;
  isUploading?: boolean;
  uploadProgress?: number;
  footerTransitionsEnabled: boolean;
  footerEnterReady: boolean;
  incompleteSteps: IncompleteStep[];
  shimmerKey?: number;
}

export function AuthFooter({
  mode,
  isSubmitting,
  isUploading = false,
  uploadProgress = 0,
  footerTransitionsEnabled,
  footerEnterReady,
  incompleteSteps,
  shimmerKey = 0,
}: AuthFooterProps) {
  const [submitTooltipOpen, setSubmitTooltipOpen] = useState(false);
  const submitPopoverCloseTimer = useRef<number | null>(null);
  const {
    getStepValidationStatus,
    currentStep,
    isFormValid,
    goToNextStep,
    goToPrevStep,
    goToStep,
    steps,
    errors,
  } = useForm();

  console.log(errors, isFormValid);

  const showBackButton = mode === "signup" && currentStep !== "onboarding";
  const isSummaryStep = currentStep === "summary";
  const showTooltip = isSummaryStep && !isFormValid && incompleteSteps.length > 0;

  const isStepValid = getStepValidationStatus(currentStep) === "complete";

  const getButtonLabel = () => {
    if (isUploading) return null; // Will show upload progress
    if (isSubmitting) return null; // Will show Loader2 + "Submitting..."
    if (mode === "signin") return "Login";
    if (isSummaryStep) return "Submit application";
    if (currentStep === "onboarding") return "Get started";
    return "Continue";
  };

  const isProcessing = isSubmitting || isUploading;

  return (
    <footer
      className={cn(
        "sticky bottom-[10px] mx-[10px] bg-background p-2.5 sm:p-5 lg:p-[25px] pb-[max(0.625rem,env(safe-area-inset-bottom))] rounded-full overflow-hidden border border-border/30 shadow-[0_0_20px_-5px_rgba(0,0,0,0.12)]",
        "lg:bottom-0 lg:mx-0 lg:rounded-none lg:border-x-0 lg:border-b-0 lg:shadow-none",
        footerEnterReady ? "animate-slide-up-fade" : "opacity-0 translate-y-[15px]"
      )}
    >
      <div className="lg:max-w-[38rem] mx-auto flex flex-col gap-[10px]">
        <div
          className={cn("flex", showBackButton ? "gap-[10px]" : "gap-0")}
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
              size="pill-lg"
              onClick={goToPrevStep}
              aria-label="Go back"
              className="h-button w-[55px] p-0 border-border hover:bg-muted/60 hover:border-foreground/30 group active:bg-muted/80 active:scale-95 transition-transform"
            >
              <ArrowLeft
                className="w-[18px] h-[18px] transition-transform duration-150 group-active:-translate-x-1"
                aria-hidden="true"
              />
            </Button>
          </div>

          {/* Main action button with popover for incomplete steps */}
          <Popover open={submitTooltipOpen} onOpenChange={setSubmitTooltipOpen}>
            <PopoverTrigger asChild>
              <span
                className="flex-1 block"
                onMouseEnter={() => {
                  if (submitPopoverCloseTimer.current) {
                    window.clearTimeout(submitPopoverCloseTimer.current);
                    submitPopoverCloseTimer.current = null;
                  }
                  if (showTooltip) {
                    setSubmitTooltipOpen(true);
                  }
                }}
                onMouseLeave={() => {
                  if (submitPopoverCloseTimer.current) {
                    window.clearTimeout(submitPopoverCloseTimer.current);
                  }
                  submitPopoverCloseTimer.current = window.setTimeout(() => {
                    setSubmitTooltipOpen(false);
                    submitPopoverCloseTimer.current = null;
                  }, 220);
                }}
              >
                <Button
                  key={`shimmer-${shimmerKey}`}
                  size="pill-lg"
                  onClick={goToNextStep}
                  disabled={
                    isSummaryStep ? !isFormValid || isProcessing : !isStepValid || isProcessing
                  }
                  className={cn(
                    "btn-premium w-full h-button bg-foreground text-background hover:bg-foreground disabled:opacity-40 font-medium text-base tracking-wide group active:scale-[0.98] transition-transform relative overflow-hidden",
                    shimmerKey > 0 && "shimmer-trigger",
                    showTooltip && "pointer-events-none"
                  )}
                >
                  {/* Upload progress bar overlay */}
                  {isUploading && (
                    <div
                      className="absolute inset-0 bg-primary/20 transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  )}
                  <span className="relative z-10 flex items-center justify-center gap-[10px]">
                    {isUploading ? (
                      <>
                        <Loader2 className="w-[18px] h-[18px] animate-spin" />
                        <span>Uploading documents... {uploadProgress}%</span>
                      </>
                    ) : isSubmitting ? (
                      <>
                        <Loader2 className="w-[18px] h-[18px] animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        {getButtonLabel()}
                        <ArrowRight
                          className="w-[18px] h-[18px] transition-all duration-150 group-hover:w-[24px] group-hover:translate-x-0.5 group-active:translate-x-1"
                          aria-hidden="true"
                        />
                      </>
                    )}
                  </span>
                </Button>
              </span>
            </PopoverTrigger>

            {showTooltip && (
              <PopoverContent
                side="top"
                className="bg-foreground text-background border-none px-4 py-3 rounded-xl max-w-[320px] w-auto z-50"
                onMouseEnter={() => {
                  if (submitPopoverCloseTimer.current) {
                    window.clearTimeout(submitPopoverCloseTimer.current);
                    submitPopoverCloseTimer.current = null;
                  }
                  setSubmitTooltipOpen(true);
                }}
                onMouseLeave={() => {
                  if (submitPopoverCloseTimer.current) {
                    window.clearTimeout(submitPopoverCloseTimer.current);
                  }
                  submitPopoverCloseTimer.current = window.setTimeout(() => {
                    setSubmitTooltipOpen(false);
                    submitPopoverCloseTimer.current = null;
                  }, 220);
                }}
                onPointerDownOutside={() => setSubmitTooltipOpen(false)}
              >
                <div className="space-y-2.5">
                  <p className="text-xs font-medium text-background/70">
                    Complete these steps first:
                  </p>
                  <div className="space-y-2">
                    {incompleteSteps.map(({ step, name, missingFields }) => (
                      <button
                        key={step}
                        onClick={() => {
                          setSubmitTooltipOpen(false);
                          if (name) {
                            goToStep(name);
                          }
                        }}
                        className="flex flex-col gap-1 w-full hover:bg-background/10 rounded-lg px-2 py-2 -mx-2 transition-colors cursor-pointer group/step"
                      >
                        <div className="flex items-center gap-2 w-full">
                          <div className="w-5 h-5 rounded-full bg-background/20 group-hover/step:bg-background/30 flex items-center justify-center flex-shrink-0 transition-colors">
                            <span className="text-[10px] font-semibold">{step}</span>
                          </div>
                          <span className="text-sm font-medium whitespace-nowrap">{name}</span>
                          <ArrowRight className="w-3 h-3 text-background/50 ml-auto flex-shrink-0 opacity-0 group-hover/step:opacity-100 transition-opacity" />
                        </div>
                        <div className="pl-7 flex flex-wrap gap-1">
                          {missingFields.map((field) => (
                            <span
                              key={field}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-medium"
                            >
                              {field}
                            </span>
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            )}
          </Popover>
        </div>
      </div>
    </footer>
  );
}
