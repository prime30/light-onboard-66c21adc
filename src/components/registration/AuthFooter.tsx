import { useCallback, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { AuthMode, Step } from "@/types/auth";
import type { ValidFieldNames } from "@/lib/validations/auth-schemas";
import { FIELD_DISPLAY_NAMES } from "@/data/step-order";
import { useForm } from "./context";

interface AuthFooterProps {
  mode: AuthMode;
  currentStep: Step;
  isAllStepsValid: boolean;
  isSubmitting: boolean;
  isUploading?: boolean;
  uploadProgress?: number;
  footerTransitionsEnabled: boolean;
  footerEnterReady: boolean;
  shimmerKey?: number;
}

export function AuthFooter({
  mode,
  isSubmitting,
  isUploading = false,
  uploadProgress = 0,
  footerTransitionsEnabled,
  footerEnterReady,
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
    submitForm,
    fullErrors,
    setFocus,
    incompleteSteps,
  } = useForm();

  console.log(incompleteSteps, fullErrors);

  const showBackButton = mode === "signup" && currentStep !== "onboarding";
  const isSummaryStep = currentStep === "summary";

  const isStepValid = getStepValidationStatus(currentStep) === "complete";

  // On non-summary steps, only surface the *current* step's missing fields so
  // the popover guides users to what's blocking the Continue button right here.
  // On the summary step, list every incomplete step across the whole form.
  const popoverSteps = useMemo(() => {
    if (isSummaryStep) return incompleteSteps;
    return incompleteSteps.filter((s) => s.step === currentStep);
  }, [incompleteSteps, isSummaryStep, currentStep]);

  const continueBlocked = isSummaryStep
    ? !isFormValid && popoverSteps.length > 0
    : !isStepValid && popoverSteps.length > 0;

  // Popover (with the list of incomplete steps/fields) is intentionally only
  // shown on the final summary step. Other steps still get the click-to-shake
  // + red flash on the missing fields, but no popover.
  const showTooltip = isSummaryStep && continueBlocked;

  const getButtonLabel = () => {
    if (isUploading) return null; // Will show upload progress
    if (isSubmitting) return null; // Will show Loader2 + "Submitting..."
    if (mode === "signin") return "Login";
    if (isSummaryStep) return "Submit application";
    if (currentStep === "onboarding") return "Get started";
    return "Continue";
  };

  const isProcessing = isSubmitting || isUploading;

  // Briefly highlight + shake the missing fields so users see exactly what's
  // blocking submission. We target inputs by id (TextInput sets id={name}) and
  // also by [name=...] for radio/checkbox/file inputs.
  const shakeMissingFields = useCallback((fields: string[]) => {
    if (!fields.length) return;
    fields.forEach((field) => {
      const nodes = document.querySelectorAll<HTMLElement>(
        `#${CSS.escape(field)}, [name="${CSS.escape(field)}"]`
      );
      nodes.forEach((node) => {
        // Walk up to the nearest field wrapper so the shake + red highlight
        // include the label and surrounding affordances.
        const target = (node.closest("[data-field-wrapper]") as HTMLElement) || node;
        target.classList.remove("shake-subtle", "field-flash-error");
        // Force reflow so the animations can replay on repeated clicks.
        void target.offsetWidth;
        target.classList.add("shake-subtle", "field-flash-error");
        window.setTimeout(() => {
          target.classList.remove("shake-subtle");
        }, 600);
        window.setTimeout(() => {
          target.classList.remove("field-flash-error");
        }, 1300);
      });
    });

    // Scroll the first missing field into view and focus it.
    try {
      setFocus(fields[0] as ValidFieldNames);
    } catch {
      /* field may not be focusable (e.g. checkbox group) — ignore */
    }
  }, [setFocus]);

  const handleContinue = useCallback(() => {
    if (continueBlocked) {
      // Disabled-but-clickable path: surface the popover and shake fields.
      const missing = popoverSteps.flatMap((s) => s.missingFields);
      setSubmitTooltipOpen(true);
      shakeMissingFields(missing);
      return;
    }

    if (isSummaryStep) {
      submitForm();
      return;
    }

    goToNextStep();
  }, [continueBlocked, popoverSteps, shakeMissingFields, goToNextStep, isSummaryStep, submitForm]);


  return (
    <footer
      className={cn(
        "sticky bottom-[10px] mx-[10px] bg-background p-2.5 sm:p-5 lg:px-[25px] lg:py-[clamp(15px,2.5vh,30px)] pb-[max(0.625rem,env(safe-area-inset-bottom))] rounded-full overflow-hidden border border-border/30 shadow-[0_0_20px_-5px_rgba(0,0,0,0.12)]",
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
              className="w-[55px] p-0 border-border hover:bg-muted/60 hover:border-foreground/30 group active:bg-muted/80 active:scale-95 transition-transform"
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
                  onClick={handleContinue}
                  // Stay clickable when blocked so the click can shake the
                  // missing fields and surface the popover. Only truly disable
                  // while a network/upload is in flight.
                  disabled={isProcessing}
                  aria-disabled={continueBlocked || isProcessing}
                  className={cn(
                    "btn-premium w-full bg-foreground text-background hover:bg-foreground disabled:opacity-40 font-medium text-base tracking-wide group active:scale-[0.98] transition-transform relative overflow-hidden",
                    shimmerKey > 0 && "shimmer-trigger",
                    continueBlocked && "opacity-40 hover:opacity-50"
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
                className="bg-foreground text-background border-none p-3 rounded-xl max-w-[320px] w-auto z-50"
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
                  <p className="text-xs font-medium text-background/70 text-center">
                    {isSummaryStep ? "Complete these steps first" : "Finish this step first"}
                  </p>
                  <div className="space-y-2">
                    {popoverSteps.map(({ step, name, stepNumber, missingFields }) => (
                      <button
                        key={step}
                        onClick={() => {
                          setSubmitTooltipOpen(false);
                          goToStep(step);

                          // Focus the first missing field after navigation
                          if (missingFields.length > 0) {
                            // Add a small delay to ensure the step transition completes
                            setTimeout(() => {
                              setFocus(missingFields[0] as ValidFieldNames);
                            }, 200);
                          }
                        }}
                        className="w-full p-3 hover:bg-background/10 focus:bg-background/10 rounded-lg transition-colors cursor-pointer group/step focus:outline-none focus-visible:ring-2 focus-visible:ring-background/30"
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 w-full">
                            <div className="w-5 h-5 rounded-full bg-background/20 group-hover/step:bg-background/30 group-focus/step:bg-background/30 flex items-center justify-center flex-shrink-0 transition-colors">
                              <span className="text-[10px] font-semibold">{stepNumber}</span>
                            </div>
                            <span className="text-sm font-medium whitespace-nowrap">{name}</span>
                            <ArrowRight className="w-3 h-3 text-background/50 ml-auto flex-shrink-0 opacity-0 group-hover/step:opacity-100 group-focus/step:opacity-100 transition-opacity" />
                          </div>
                          {missingFields.length > 0 && (
                            <div className="pl-7 flex flex-wrap gap-1">
                              {missingFields.map((field) => (
                                <span
                                  key={field}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/20 text-destructive font-medium"
                                >
                                  {FIELD_DISPLAY_NAMES[field as ValidFieldNames] || field}
                                </span>
                              ))}
                            </div>
                          )}
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
