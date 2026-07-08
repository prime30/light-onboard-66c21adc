import { useCallback, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AuthMode, Step } from "@/types/auth";
import type { ValidFieldNames } from "@/lib/validations/auth-schemas";
import { FIELD_DISPLAY_NAMES } from "@/data/step-order";
import { useForm } from "./context";
import { useAutoApproval, useWelcomeOffer, useFounderCallHighVolumeOnly } from "@/lib/app-settings";
import { useCloseIframe } from "@/hooks/messages";
import { supabase } from "@/integrations/supabase/client";
import { buildRegistrationCloseExtras } from "@/lib/founder-call-eligibility";
import { isValidPhoneNumber } from "@/lib/validations/form-utils";
import { toast } from "sonner";

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
  const submitPopoverCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    getStepValidationStatus,
    currentStep,
    isFormValid,
    goToNextStep,
    goToPrevStep,
    goToStep,
    submitForm,
    setFocus,
    setError,
    setSubmitError,
    watch,
    errors,
    errorActions,
    submitErrorMessage,
    setEmailConflict,
    incompleteSteps,
  } = useForm();
  const [preflightChecking, setPreflightChecking] = useState(false);
  const navigate = useNavigate();
  const { enabled: autoApprove } = useAutoApproval();
  const { enabled: welcomeOfferEnabled } = useWelcomeOffer();
  const { enabled: founderHighVolumeOnly } = useFounderCallHighVolumeOnly();
  const { closeIframe, isInIframe } = useCloseIframe();
  const visibleSubmitError = submitErrorMessage || errors.root?.form?.message;

  const isScheduleConfirmedStep = currentStep === "schedule-confirmed";
  const showBackButton = mode === "signup" && currentStep !== "onboarding" && !isScheduleConfirmedStep;
  const isSummaryStep = currentStep === "summary";
  // When auto-approval is ON, the password step is the LAST gate before the
  // real backend submit fires. The summary "Submit application" button is a
  // faux submit that just advances to the assessing animation.
  const isLatePasswordStep = autoApprove && currentStep === "create-password";
  const isFauxSubmitStep = autoApprove && isSummaryStep;

  const isStepValid = getStepValidationStatus(currentStep) === "complete";

  // Popover content rules:
  //   • Summary + late create-password (in auto-approval mode) are the final
  //     submit gates - list every incomplete step across the whole form.
  //   • The faux "Submit application" in auto-approval mode hides the
  //     password step (it's collected AFTER summary), but still lists every
  //     other incomplete step.
  //   • Any other step: list the current step's missing fields PLUS any
  //     other incomplete steps so users who skipped via jump-to-step or who
  //     resumed a stale session can see exactly what's still blocking them.
  const popoverSteps = useMemo(() => {
    if (isFauxSubmitStep) {
      return incompleteSteps.filter((s) => s.step !== "create-password");
    }
    if (isSummaryStep || isLatePasswordStep) {
      return incompleteSteps;
    }
    // Put the current step first if it's incomplete so the most relevant
    // gap appears at the top of the popover.
    const current = incompleteSteps.find((s) => s.step === currentStep);
    const others = incompleteSteps.filter((s) => s.step !== currentStep);
    return current ? [current, ...others] : others;
  }, [incompleteSteps, isSummaryStep, isFauxSubmitStep, isLatePasswordStep, currentStep]);

  const continueBlocked = isSummaryStep
    ? (isFauxSubmitStep ? popoverSteps.length > 0 : !isFormValid && popoverSteps.length > 0)
    : isLatePasswordStep
      ? !isFormValid && popoverSteps.length > 0
      : !isStepValid && popoverSteps.length > 0;

  // Popover only surfaces on the final-gate steps: the review/summary page
  // and the late create-password page (the safety net if a user somehow got
  // past summary). On every other step, an invalid Continue just shakes the
  // missing fields without opening the "incomplete steps" list.
  const isFinalGateStep = isSummaryStep || isLatePasswordStep || isFauxSubmitStep;
  const showTooltip = isFinalGateStep && continueBlocked && popoverSteps.length > 0;

  const openSubmitTooltip = useCallback(() => {
    if (submitPopoverCloseTimer.current) {
      clearTimeout(submitPopoverCloseTimer.current);
      submitPopoverCloseTimer.current = null;
    }
    if (showTooltip) {
      setSubmitTooltipOpen(true);
    }
  }, [showTooltip]);

  const closeSubmitTooltip = useCallback(() => {
    if (submitPopoverCloseTimer.current) {
      clearTimeout(submitPopoverCloseTimer.current);
    }
    submitPopoverCloseTimer.current = setTimeout(() => {
      setSubmitTooltipOpen(false);
      submitPopoverCloseTimer.current = null;
    }, 220);
  }, []);

  const getButtonLabel = () => {
    if (isUploading) return null; // Will show upload progress
    if (isSubmitting) return null; // Will show Loader2 + "Submitting..."
    if (mode === "signin") return "Login";
    if (isScheduleConfirmedStep) return "Go to shop";
    if (isLatePasswordStep) return "Create account & continue";
    if (isSummaryStep) return "Submit application";
    if (currentStep === "onboarding") return "Get started";
    return "Continue";
  };

  const isProcessing = isSubmitting || isUploading || preflightChecking;

  // Briefly highlight + shake the missing fields so users see exactly what's
  // blocking submission. We target inputs by id (TextInput sets id={name}) and
  // also by [name=...] for radio/checkbox/file inputs.
  const shakeMissingFields = useCallback((fields: string[]) => {
    if (!fields.length) return;
    const animatedTargets = new Set<HTMLElement>();
    let firstTarget: HTMLElement | null = null;

    fields.forEach((field) => {
      const escaped = CSS.escape(field);
      // Try the explicit wrapper marker FIRST so non-input fields (file
      // uploads, custom selects, radio groups) animate even when there's no
      // matching input element to focus.
      const wrappers = document.querySelectorAll<HTMLElement>(
        `[data-field-wrapper="${escaped}"]`
      );
      const inputs = document.querySelectorAll<HTMLElement>(
        `#${escaped}, [name="${escaped}"]`
      );

      const collected: HTMLElement[] = [];
      wrappers.forEach((el) => collected.push(el));
      inputs.forEach((node) => {
        const wrapper = node.closest("[data-field-wrapper]") as HTMLElement | null;
        collected.push(wrapper || node);
      });

      collected.forEach((target) => {
        if (animatedTargets.has(target)) return;
        animatedTargets.add(target);
        if (!firstTarget) firstTarget = target;

        // Use Web Animations API for BOTH shake and red-flash so we don't
        // touch the wrapper's CSS `animation` property. The wrapper often
        // also carries `.animate-stagger-N` whose declaration sets
        // `opacity: 0` + a forwards-filling fade-in animation. If we added
        // a class like `.field-flash-error` (which sets its own `animation`
        // shorthand), the cascade would REPLACE the stagger animation,
        // causing the field to snap back to its declared `opacity: 0`
        // ground state - i.e. the field appears to vanish.
        const el = target as HTMLElement & { _shakeAnims?: Animation[] };
        if (el._shakeAnims) {
          el._shakeAnims.forEach((a) => a.cancel());
        }
        const shake = el.animate(
          [
            { transform: "translateX(0)" },
            { transform: "translateX(-4px)" },
            { transform: "translateX(4px)" },
            { transform: "translateX(-3px)" },
            { transform: "translateX(3px)" },
            { transform: "translateX(-2px)" },
            { transform: "translateX(0)" },
          ],
          { duration: 500, easing: "cubic-bezier(0.36, 0.07, 0.19, 0.97)" }
        );
        const flash = el.animate(
          [
            { boxShadow: "0 0 0 0 hsl(var(--destructive) / 0)", backgroundColor: "hsl(var(--destructive) / 0)" },
            { boxShadow: "0 0 0 4px hsl(var(--destructive) / 0.35)", backgroundColor: "hsl(var(--destructive) / 0.12)", offset: 0.15 },
            { boxShadow: "0 0 0 0 hsl(var(--destructive) / 0)", backgroundColor: "hsl(var(--destructive) / 0)" },
          ],
          { duration: 1200, easing: "cubic-bezier(0.4, 0, 0.2, 1)" }
        );
        // Border-color hint on inner inputs - applied via a marker class
        // that ONLY toggles `border-color`, never `animation`.
        el.classList.add("field-flash-border");
        el._shakeAnims = [shake, flash];
        window.setTimeout(() => el.classList.remove("field-flash-border"), 1300);

      });
    });

    // Scroll the first missing field into view, then try to focus it.
    if (firstTarget) {
      (firstTarget as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });
    }
    try {
      setFocus(fields[0] as ValidFieldNames);
    } catch {
      /* field may not be focusable (e.g. file upload / checkbox group) - ignore */
    }
  }, [setFocus]);

  const handleContinue = useCallback(() => {
    // Schedule-confirmed: button is "Go to shop" - close the iframe (Shopify
    // embed) or navigate to the shop home. Include qualified-candidate
    // metadata so the parent theme can route consistently (this user already
    // booked, so founderCallEligible should resolve to false post-booking
    // when welcome-offer mode is on, but we send the snapshot regardless).
    if (isScheduleConfirmedStep) {
      if (isInIframe) {
        const extras = buildRegistrationCloseExtras(
          { founderHighVolumeOnly, welcomeOfferEnabled },
          {
            accountType: (watch("accountType") as string | undefined) ?? null,
            monthlyOrderVolume: (watch("monthlyOrderVolume") as string | undefined) ?? null,
          }
        );
        closeIframe("registration_complete", extras);
      } else {
        window.location.href = "/";
      }
      return;
    }


    const shouldRunDuplicateEmailCheck = isFauxSubmitStep || (!autoApprove && isSummaryStep);
    const blockingSteps = shouldRunDuplicateEmailCheck
      ? popoverSteps.filter((s) => !s.missingFields.every((field) => field === "email"))
      : popoverSteps;

    if (continueBlocked && blockingSteps.length > 0) {
      // Disabled-but-clickable path: shake the missing fields. Only open the
      // popover on final-gate steps (summary / late password) - on regular
      // steps the inline field errors are enough.
      const missing = blockingSteps.flatMap((s) => s.missingFields);

      // Preferences: the SMS opt-in + phone-number pair is a cross-field
      // rule that doesn't map to a single "missing field" the schema knows
      // about. Explicitly explain why Continue is refusing to advance so
      // users aren't left staring at a shake with no message.
      if (currentStep === "preferences") {
        const sms = watch("acceptsSmsMarketing") as boolean | undefined;
        const phone = watch("phoneNumber") as string | undefined;
        if (sms && !isValidPhoneNumber(phone ?? "")) {
          toast.error("Please add a valid phone number for SMS updates", {
            description: "Or uncheck the SMS opt-in to continue.",
          });
          shakeMissingFields(["phoneNumber", "acceptsSmsMarketing"]);
          return;
        }
      }

      if (isFinalGateStep) setSubmitTooltipOpen(true);
      shakeMissingFields(missing);
      return;
    }

    if (currentStep === "contact-basics") {
      const email = ((watch("email") as string | undefined) ?? "").trim().toLowerCase();
      if (!email) {
        goToNextStep();
        return;
      }
      setPreflightChecking(true);
      supabase.functions
        .invoke("check-email", { body: { email } })
        .then(({ data, error }) => {
          if (error) {
            goToNextStep();
            return;
          }
          if ((data as { exists?: boolean } | undefined)?.exists) {
            const message = "An account with this email already exists. Please sign in instead.";
            setEmailConflict({ email, message });
            setError("email", { type: "manual", message });
            return;
          }
          setEmailConflict(null);
          goToNextStep();
        })
        .catch(() => goToNextStep())
        .finally(() => setPreflightChecking(false));
      return;
    }


    // Auto-approval flow: summary "Submit application" is a faux submit  - 
    // pre-flight check for duplicate email so we surface "Go to Login"
    // BEFORE the user lands on the late password step. Phone duplicates are
    // already caught on the Contact step.
    if (shouldRunDuplicateEmailCheck) {
      const email = ((watch("email") as string | undefined) ?? "").trim().toLowerCase();
      const continueAfterCheck = () => {
        if (isFauxSubmitStep) goToStep("assessing");
        else submitForm();
      };
      if (!email) {
        continueAfterCheck();
        return;
      }
      setPreflightChecking(true);
      supabase.functions
        .invoke("check-email", { body: { email } })
        .then(({ data, error }) => {
          if (error) {
            // Fail open - server-side submit will still catch it.
            continueAfterCheck();
            return;
          }
          if ((data as { exists?: boolean } | undefined)?.exists) {
            setError("email", {
              type: "manual",
              message:
                "An account with this email already exists. Please sign in instead.",
            });
            setSubmitError({
              message:
                "An account with this email already exists. Please sign in instead.",
              actions: [{ type: "LOGIN", label: "Go to Login", url: "/login" }],
            });
            return;
          }
          continueAfterCheck();
        })
        .catch(() => {
          continueAfterCheck();
        })
        .finally(() => setPreflightChecking(false));
      return;
    }

    // Final real submit: either the late password step (auto-approval ON)
    // or the summary step (auto-approval OFF, original flow).
    if (isLatePasswordStep || isSummaryStep) {
      submitForm();
      return;
    }

    goToNextStep();
  }, [
    isScheduleConfirmedStep,
    isInIframe,
    closeIframe,
    continueBlocked,
    popoverSteps,
    shakeMissingFields,
    goToNextStep,
    isSummaryStep,
    isFauxSubmitStep,
    autoApprove,
    isLatePasswordStep,
    isFinalGateStep,
    goToStep,
    submitForm,
    watch,
    setError,
    setSubmitError,
    setEmailConflict,
    errors,
  ]);


  return (
    <footer
      className={cn(
        "sticky bottom-[10px] mx-[10px] bg-background p-2.5 sm:p-5 lg:px-[25px] lg:py-[clamp(15px,2.5vh,30px)] pb-[max(0.625rem,env(safe-area-inset-bottom))] rounded-full border border-border/30 shadow-[0_0_20px_-5px_rgba(0,0,0,0.12)]",
        "lg:bottom-0 lg:mx-0 lg:rounded-none lg:border-x-0 lg:border-b-0 lg:shadow-none",
        footerEnterReady ? "animate-slide-up-fade" : "opacity-0 translate-y-[15px]"
      )}
    >
      <div className="lg:max-w-[38rem] mx-auto flex flex-col gap-[10px]">
        {visibleSubmitError && isFinalGateStep && (
          <div className="flex items-start gap-3 rounded-form border border-destructive/30 bg-destructive/10 p-4 shadow-[0_10px_30px_-20px_hsl(var(--destructive)/0.45)]">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div className="flex-1 space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">Unable to submit application</p>
                <p className="whitespace-pre-line text-sm text-destructive/80">
                  {visibleSubmitError}
                </p>
              </div>
              {errorActions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {errorActions.map((action, index) => (
                    <Button
                      key={index}
                      type="button"
                      variant="destructive"
                      onClick={() => action.url && navigate(action.url)}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
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
              onClick={
                currentStep === "schedule"
                  ? () => goToStep("success")
                  : isLatePasswordStep
                    ? () => goToStep("summary")
                    : goToPrevStep
              }
              aria-label="Go back"
              className="w-[55px] p-0 border-border hover:bg-muted/60 hover:border-foreground/30 group active:bg-muted/80 active:scale-95 transition-transform"
            >
              <ArrowLeft
                className="w-[18px] h-[18px] transition-transform duration-150 group-active:-translate-x-1"
                aria-hidden="true"
              />
            </Button>
          </div>

          {/* Main action button with custom hover/click popover for incomplete steps */}
          <div
            className="relative flex-1"
            onMouseEnter={openSubmitTooltip}
            onMouseLeave={closeSubmitTooltip}
            onFocus={openSubmitTooltip}
            onBlur={closeSubmitTooltip}
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

            {submitTooltipOpen && showTooltip && (
              <div
                role="dialog"
                aria-label="Incomplete application fields"
                className="absolute bottom-[calc(100%+10px)] left-1/2 z-[1000] w-[min(320px,calc(100vw-40px))] -translate-x-1/2 rounded-xl border-none bg-foreground p-3 text-background shadow-modal"
                onMouseEnter={openSubmitTooltip}
                onMouseLeave={closeSubmitTooltip}
              >
                <div className="space-y-2.5">
                  <p className="text-xs font-medium text-background/70 text-center">
                    Complete these steps first
                  </p>
                  <div className="space-y-2">
                    {popoverSteps.map(({ step, name, stepNumber, missingFields }) => (
                      <button
                        key={step}
                        onClick={() => {
                          setSubmitTooltipOpen(false);
                          goToStep(step);

                          if (missingFields.length > 0) {
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
              </div>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
