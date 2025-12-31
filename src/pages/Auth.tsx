import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuthFormState } from "@/hooks/use-auth-form-state";
import { useFormValidation } from "@/hooks/use-form-validation";
import { useModalSwipe } from "@/hooks/use-modal-swipe";
import { AuthFooter } from "@/components/registration/AuthFooter";
import { StepIndicatorBar } from "@/components/registration/StepIndicatorBar";
import { ContactBasicsStep } from "@/components/registration/steps/ContactBasicsStep";
import { PreferencesStep } from "@/components/registration/steps/PreferencesStep";
import { BusinessLocationStep } from "@/components/registration/steps/BusinessLocationStep";
import { SchoolInfoStep } from "@/components/registration/steps/SchoolInfoStep";
import { LicenseStep } from "@/components/registration/steps/LicenseStep";
import { WholesaleTermsStep } from "@/components/registration/steps/WholesaleTermsStep";
import { TaxExemptionStep } from "@/components/registration/steps/TaxExemptionStep";
import { BusinessOperationStep } from "@/components/registration/steps/BusinessOperationStep";
import { OnboardingForm } from "@/components/registration/steps/OnboardingForm";
import { AccountTypeForm } from "@/components/registration/steps/AccountTypeForm";
import { SignInForm } from "@/components/registration/steps/SignInForm";
import { SummaryForm } from "@/components/registration/steps/SummaryForm";
import { SuccessForm } from "@/components/registration/steps/SuccessForm";
import { supabase } from "@/integrations/supabase/client";
import { signUp } from "@/lib/auth-service";
import { useRegistrationUpload } from "@/hooks/use-registration-upload";
import type { Step } from "@/types/auth";
import salonHero from "@/assets/salon-hero.jpg";
import { TextSkeleton } from "@/components/registration/TextSkeleton";
import { MobileSavingProgress } from "@/components/registration/MobileSavingProgress";
import { MobileDragHandle } from "@/components/registration/MobileDragHandle";
import { AuthToggle } from "@/components/registration/AuthToggle";
import { CloseButton } from "@/components/registration/CloseButton";
import { useGlobalApp } from "@/contexts";
import { LeftPanel } from "@/components/registration/LeftPanel";
import { useStepContext } from "@/components/registration/context";
import { useScroll } from "@/hooks/use-scroll";
import { useSafariViewportFix } from "@/hooks/use-safari-viewport-fix";

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Form state from centralized hook (includes sessionStorage persistence)
  const {
    mode,
    setMode,
    currentStep,
    setCurrentStep,
    goToNextStep,
    goToPrevStep,
    mainScrollRef,
    transitionDirection,
    setTransitionDirection,
    isTransitioning,
    setIsTransitioning,
  } = useStepContext();

  const formState = useAuthFormState();
  const {
    displayTotalSteps,
    accountType,
    firstName,
    lastName,
    preferredName,
    email,
    setEmail,
    password,
    setPassword,
    phoneNumber,
    phoneCountryCode,
    businessName,
    licenseFile,
    enrollmentProofFiles,
    licenseProofFiles,
    taxExemptFile,
    referralSource,
    setReferralSource,
    isSubmitting,
    setIsSubmitting,
    showForgotPassword,
    setShowForgotPassword,
    isSendingReset,
    setIsSendingReset,
  } = formState;

  // Form validation from dedicated hook
  const { isAllStepsValid, getIncompleteSteps, isFormReadyToSubmit, getFormProgress } =
    useFormValidation({});

  // UI-only state (not persisted)
  const [modeTransitionDirection, setModeTransitionDirection] = useState<"left" | "right">("right");
  const [highlightFields, setHighlightFields] = useState<string[]>([]);

  // File upload hook for registration documents
  const {
    isUploading: isUploadingDocuments,
    uploadProgress: documentUploadProgress,
    uploadAllDocuments,
    resetUploadState: resetDocumentUploadState,
  } = useRegistrationUpload();

  // Prevent footer layout transitions from running during the initial footer entrance animation
  const [footerTransitionsEnabled, setFooterTransitionsEnabled] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setFooterTransitionsEnabled(true), 900);
    return () => window.clearTimeout(t);
  }, []);

  // "Preload" footer layout for a frame before running entrance animation (prevents button width reflow during enter)
  const [footerEnterReady, setFooterEnterReady] = useState(false);
  const footerVisible = mode === "signin" || (mode === "signup" && currentStep !== "success");
  useEffect(() => {
    if (!footerVisible) {
      setFooterEnterReady(false);
      return;
    }
    setFooterEnterReady(false);
    const raf = window.requestAnimationFrame(() => setFooterEnterReady(true));
    return () => window.cancelAnimationFrame(raf);
  }, [footerVisible]);

  // Handle incoming navigation state or URL params to advance to specific step
  useEffect(() => {
    // Check URL query params first (e.g., ?step=1 goes to account-type)
    const searchParams = new URLSearchParams(location.search);
    const stepParam = searchParams.get("step");
    if (stepParam === "1") {
      setCurrentStep("account-type");
      // Clear the query param
      window.history.replaceState({}, document.title, location.pathname);
      return;
    }

    const state = location.state as { advanceToStep?: Step } | null;
    if (state?.advanceToStep) {
      setCurrentStep(state.advanceToStep);
      // Clear the state to prevent re-triggering on re-renders
      window.history.replaceState({}, document.title);
    }
  }, [location.state, location.search]);

  // Disable pull-to-refresh when modal is open to prevent interference with swipe-to-dismiss
  // But only block it in the drag handle areas (backdrop and top of modal), not in scrollable content
  const pullToRefreshStartY = useRef<number | null>(null);
  const shouldBlockPullToRefresh = useRef<boolean>(false);

  useEffect(() => {
    // Store original styles
    const originalBodyOverscroll = document.body.style.overscrollBehavior;
    const originalHtmlOverscroll = document.documentElement.style.overscrollBehavior;

    // Apply styles to prevent pull-to-refresh
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overscrollBehavior = "none";

    // Helper to check if element is inside scrollable content
    const isInsideScrollableContent = (element: Element | null): boolean => {
      while (element) {
        const style = window.getComputedStyle(element);
        const overflowY = style.overflowY;
        if (
          (overflowY === "auto" || overflowY === "scroll") &&
          element.scrollHeight > element.clientHeight
        ) {
          return true;
        }
        element = element.parentElement;
      }
      return false;
    };

    // Track touch start - determine if we should block pull-to-refresh
    const handleTouchStart = (e: TouchEvent) => {
      pullToRefreshStartY.current = e.touches[0]?.clientY ?? null;
      const target = e.target as Element | null;

      // Only block pull-to-refresh if touch started OUTSIDE scrollable content
      // (i.e., in backdrop or drag handle area)
      shouldBlockPullToRefresh.current = !isInsideScrollableContent(target);
    };

    // Prevent pull-to-refresh gesture only in non-scrollable areas
    const handleTouchMove = (e: TouchEvent) => {
      // If touch started in scrollable content, allow all scroll behavior
      if (!shouldBlockPullToRefresh.current) return;

      const startY = pullToRefreshStartY.current;
      const currentY = e.touches[0]?.clientY;

      if (startY == null || currentY == null) return;

      const deltaY = currentY - startY;

      // Block downward swipes (pull-to-refresh gesture) only in drag areas
      if (deltaY > 0) {
        e.preventDefault();
      }
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      document.body.style.overscrollBehavior = originalBodyOverscroll;
      document.documentElement.style.overscrollBehavior = originalHtmlOverscroll;
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      pullToRefreshStartY.current = null;
      shouldBlockPullToRefresh.current = false;
    };
  }, []);

  // Handle field highlighting after navigation from submit tooltip
  useEffect(() => {
    if (highlightFields.length === 0 || isTransitioning) return;

    // Map field labels to element selectors
    const fieldMap: Record<string, string> = {
      // Account type
      "Select account type": "[data-field='account-type']",
      // Contact info fields
      "First name": "#legalFirstName",
      "Last name": "#legalLastName",
      Email: "#email",
      "Phone number": "#phoneNumber",
      // Business location fields
      "Business name": "#businessName",
      Address: "#businessAddress",
      Country: "#countryCode",
      City: "#city",
      "State/province": "#stateProvince",
      "ZIP code": "#zipCode",
      // License fields
      "License number": "#license",
      "Salon size": "[data-field='salon-size']",
      "Salon structure": "[data-field='salon-structure']",
      // School fields
      "School name": "#schoolName",
      "Enrollment proof": "[data-field='enrollment-proof']",
      // Tax exemption
      "Exemption status": "[data-field='tax-exemption-yes'], [data-field='tax-exemption-no']",
      "Tax document": "[data-field='tax-document']",
      // Wholesale terms
      "Terms agreement": "[data-field='wholesale-terms']",
      // Business operation
      "Business type": "[data-field='business-type']",
      "Years in business": "[data-field='years-in-business']",
    };

    const timers: number[] = [];
    const STAGGER_DELAY = 300; // ms between each field highlight start
    const HIGHLIGHT_DURATION = 2000; // how long highlight stays before fade
    const FADE_DURATION = 1000; // fade transition duration

    // Delay to ensure step entrance animation completes before highlighting
    const initialDelay = window.setTimeout(() => {
      highlightFields.forEach((fieldLabel, index) => {
        const selector = fieldMap[fieldLabel];
        if (!selector) return;

        // Stagger the start of each highlight
        const startTimer = window.setTimeout(() => {
          const elements = document.querySelectorAll(selector);
          if (elements.length === 0) return;

          // Scroll to first field only
          if (index === 0) {
            elements[0]?.scrollIntoView({ behavior: "smooth", block: "center" });
          }

          // Add highlight class to all matched elements
          elements.forEach((el) => el.classList.add("field-highlight"));

          // Focus the first input element (only for first field)
          if (index === 0) {
            const firstEl = elements[0];
            if (
              firstEl instanceof HTMLInputElement ||
              firstEl instanceof HTMLSelectElement ||
              firstEl instanceof HTMLTextAreaElement
            ) {
              firstEl.focus();
            }
          }

          // Start fade after highlight duration
          const fadeTimer = window.setTimeout(() => {
            elements.forEach((el) => el.classList.add("field-highlight-fade"));
            // Remove classes after fade completes
            const removeTimer = window.setTimeout(() => {
              elements.forEach((el) =>
                el.classList.remove("field-highlight", "field-highlight-fade")
              );
            }, FADE_DURATION);
            timers.push(removeTimer);
          }, HIGHLIGHT_DURATION);
          timers.push(fadeTimer);
        }, index * STAGGER_DELAY);
        timers.push(startTimer);
      });

      // Clear highlightFields after all animations complete
      const totalDuration =
        (highlightFields.length - 1) * STAGGER_DELAY + HIGHLIGHT_DURATION + FADE_DURATION + 100;
      const clearTimer = window.setTimeout(() => {
        setHighlightFields([]);
      }, totalDuration);
      timers.push(clearTimer);
    }, 600);
    timers.push(initialDelay);

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [highlightFields, isTransitioning]);

  // Main content swipe refs for mode switching
  const mainSwipeStartX = useRef<number | null>(null);
  const mainSwipeEndX = useRef<number | null>(null);

  // Modal swipe handling - using a ref to hold the close function since it's defined later
  const handleCloseModalRef = useRef<() => void>(() => {});

  const {
    modalRef,
    modalDragOffset,
    isClosing,
    isBouncingBack,
    setIsClosing,
    handleModalTouchStart,
    handleModalTouchMove,
    handleModalTouchEnd,
    handleBackdropTouchStart,
  } = useModalSwipe({
    onClose: () => handleCloseModalRef.current(),
  });

  // UI-only local state (not persisted)
  const [shimmerKey, setShimmerKey] = useState(0);
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [saveProgressText, setSaveProgressText] = useState<"saving" | "saved">("saving");
  const { fontsLoaded } = useGlobalApp();

  // Scrolling and parallax effect hook
  useSafariViewportFix();
  const { parallaxOffset, headerGradientOpacity, footerGradientOpacity, resetScroll } = useScroll({
    mainScrollRef,
  });

  useEffect(() => {
    resetScroll();
  }, [mode, currentStep, resetScroll]);

  // Main content swipe handlers for mode switching (onboarding <-> sign-in)
  const handleMainSwipeStart = (e: React.TouchEvent) => {
    mainSwipeStartX.current = e.touches[0].clientX;
    mainSwipeEndX.current = null;
  };

  const handleMainSwipeMove = (e: React.TouchEvent) => {
    mainSwipeEndX.current = e.touches[0].clientX;
  };

  const handleMainSwipeEnd = () => {
    if (mainSwipeStartX.current === null || mainSwipeEndX.current === null) return;
    const diff = mainSwipeStartX.current - mainSwipeEndX.current;
    const threshold = 80;

    // Swipe left on onboarding → go to sign-in
    if (diff > threshold && mode === "signup" && currentStep === "onboarding") {
      setMode("signin");
    }
    // Swipe right on sign-in → go to sign-up (onboarding)
    else if (diff < -threshold && mode === "signin") {
      setMode("signup");
    }

    mainSwipeStartX.current = null;
    mainSwipeEndX.current = null;
  };

  const handleCloseModal = useCallback(() => {
    // Check if there's form progress to save (only in signup mode with an account type selected)
    // TODO: Check for progress.
    const hasProgress = true;

    if (hasProgress && !isSavingProgress) {
      // Show saving animation
      setIsSavingProgress(true);
      setSaveProgressText("saving");

      // After 1.2s, show "saved"
      setTimeout(() => {
        setSaveProgressText("saved");

        // After another 0.6s, close the modal
        setTimeout(() => {
          setIsSavingProgress(false);
          setIsClosing(true);
          setTimeout(() => {
            navigate("/");
          }, 300);
        }, 600);
      }, 1200);
    } else if (!isSavingProgress) {
      // No progress or signin mode, close immediately
      setIsClosing(true);
      setTimeout(() => {
        navigate("/");
      }, 300);
    }
  }, [navigate, isSavingProgress, setIsClosing]);

  // Update the ref so the modal swipe hook can call handleCloseModal
  handleCloseModalRef.current = handleCloseModal;

  const handleForgotPasswordSubmit = useCallback(async () => {
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }
    setIsSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Check your email for a reset link!");
        setShowForgotPassword(false);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset email");
    } finally {
      setIsSendingReset(false);
    }
  }, [email]);

  // Handle sign up submission
  const handleSignUpSubmit = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const result = await signUp({
        email,
        password,
        metadata: {
          firstName,
          lastName,
          preferredName,
          accountType: accountType || undefined,
          phoneNumber: phoneNumber ? `${phoneCountryCode}${phoneNumber}` : undefined,
          businessName: businessName || undefined,
        },
      });

      if (result.success && result.user?.id) {
        // Upload all registration documents
        const hasDocuments =
          licenseFile ||
          licenseProofFiles.length > 0 ||
          enrollmentProofFiles.length > 0 ||
          taxExemptFile;

        if (hasDocuments) {
          const uploadedPaths = await uploadAllDocuments(result.user.id, {
            licenseFile,
            licenseProofFiles,
            enrollmentProofFiles,
            taxExemptFile,
          });

          if (!uploadedPaths) {
            // Upload failed but user was created - show partial success
            toast.warning(
              "Account created but some documents failed to upload. You can upload them later."
            );
          }
        }

        // Clear form progress
        sessionStorage.removeItem("auth_form_progress");
        resetDocumentUploadState();

        // Show success step
        setCurrentStep("success");
        toast.success(result.message || "Application submitted successfully!");
        mainScrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
      } else if (result.success) {
        // User created but no ID returned - still show success
        sessionStorage.removeItem("auth_form_progress");
        setCurrentStep("success");
        toast.success(result.message || "Application submitted successfully!");
        mainScrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
      } else {
        toast.error(result.message || "Failed to submit application");
      }
    } catch (error: any) {
      toast.error(error.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    setIsSubmitting,
    email,
    password,
    firstName,
    lastName,
    preferredName,
    accountType,
    phoneNumber,
    phoneCountryCode,
    businessName,
    licenseFile,
    licenseProofFiles,
    enrollmentProofFiles,
    taxExemptFile,
    resetDocumentUploadState,
    setCurrentStep,
    mainScrollRef,
    uploadAllDocuments,
  ]);

  return (
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center p-0 pt-12 sm:p-5 lg:p-10 overflow-hidden"
      style={{
        height: "var(--app-height, 100vh)",
      }}
    >
      {/* Blurred darkened backdrop - also acts as drag area above modal */}
      <div
        className={cn(
          "fixed inset-0 backdrop-blur-md cursor-pointer transition-all duration-300",
          isClosing && "opacity-0 backdrop-blur-0"
        )}
        style={
          isClosing
            ? undefined
            : {
                backgroundColor: `hsl(var(--foreground) / ${Math.max(0.6 - modalDragOffset * 0.003, 0.2)})`,
              }
        }
        onClick={handleCloseModal}
        onTouchStart={handleBackdropTouchStart}
        onTouchMove={handleModalTouchMove}
        onTouchEnd={handleModalTouchEnd}
      />

      {/* Modal Container */}
      <div
        ref={modalRef}
        onTouchStart={handleModalTouchStart}
        onTouchMove={handleModalTouchMove}
        onTouchEnd={handleModalTouchEnd}
        className={cn(
          "relative z-10 bg-background rounded-t-[20px] sm:rounded-t-[20px] sm:rounded-b-[25px] lg:rounded-t-[20px] lg:rounded-b-[30px] shadow-2xl overflow-hidden flex flex-col lg:flex-row",
          "w-full sm:w-[95vw] lg:w-[90vw] h-[calc(var(--app-height,100vh)-3rem)] sm:h-[90vh] max-w-[1400px]",
          "overscroll-contain touch-pan-x",
          !isClosing && modalDragOffset === 0 && "animate-modal-enter",
          isClosing && "animate-modal-exit"
        )}
        style={
          isClosing
            ? undefined
            : {
                transform:
                  modalDragOffset > 0
                    ? `translateY(${modalDragOffset}px) scale(${1 - Math.min(modalDragOffset * 0.0003, 0.03)})`
                    : undefined,
                transition:
                  modalDragOffset > 0
                    ? "none"
                    : isBouncingBack
                      ? "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease-out"
                      : undefined,
                opacity:
                  modalDragOffset > 0 ? Math.max(1 - modalDragOffset * 0.002, 0.85) : undefined,
              }
        }
      >
        <MobileSavingProgress
          isSavingProgress={isSavingProgress}
          saveProgressText={saveProgressText}
          footerVisible={footerVisible}
        />
        <MobileDragHandle modalDragOffset={modalDragOffset} />

        {/* Left Panel - Hero/Branding */}
        <LeftPanel mode={mode} />

        {/* Right Panel - Form */}
        <div className="flex-1 flex flex-col bg-background lg:rounded-r-[20px] overflow-y-auto overflow-x-hidden">
          {/* Header - fixed height to keep toggle position consistent */}
          <header className="relative flex items-center justify-between px-3 py-2.5 sm:p-5 lg:p-[25px] pt-[max(1.25rem,env(safe-area-inset-top))] sm:pt-[max(1.25rem,env(safe-area-inset-top))] lg:pt-[max(1.5625rem,env(safe-area-inset-top))] pl-[max(0.75rem,env(safe-area-inset-left))] sm:pl-[max(1.25rem,env(safe-area-inset-left))] lg:pl-[max(1.5625rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:pr-[max(1.25rem,env(safe-area-inset-right))] lg:pr-[max(1.5625rem,env(safe-area-inset-right))] min-h-[60px] sm:min-h-[70px] lg:min-h-[80px]">
            {/* Left side - Auth Toggle + Step Indicator */}
            <div className="flex items-center flex-1 sm:flex-none justify-between sm:justify-start gap-[10px] min-h-[50px]">
              <AuthToggle mode={mode} handleModeChange={setMode} />
              <StepIndicatorBar />
            </div>

            <CloseButton
              isSavingProgress={isSavingProgress}
              saveProgressText={saveProgressText}
              handleCloseModal={handleCloseModal}
            />
          </header>

          {/* Subtle gradient below header on mobile */}
          <div
            className="lg:hidden absolute top-[70px] sm:top-[80px] left-0 right-0 h-[80px] pointer-events-none bg-gradient-to-b from-background via-background/70 via-40% to-transparent z-10 transition-all duration-300 ease-out"
            style={{
              opacity: headerGradientOpacity,
              transform: `translateY(${-8 + headerGradientOpacity * 8}px)`,
            }}
          />

          <main
            ref={mainScrollRef}
            className={cn(
              "flex-1 flex flex-col items-center px-5 sm:px-5 md:px-[25px] lg:px-[30px] pb-10 lg:pb-5 overflow-y-auto scrollbar-hide",
              mode === "signup" ? "pt-0" : "pt-2"
            )}
            onTouchStart={
              mode === "signin" || currentStep === "onboarding" ? handleMainSwipeStart : undefined
            }
            onTouchMove={
              mode === "signin" || currentStep === "onboarding" ? handleMainSwipeMove : undefined
            }
            onTouchEnd={
              mode === "signin" || currentStep === "onboarding" ? handleMainSwipeEnd : undefined
            }
          >
            {/* Mobile/Tablet Hero Banner - Only shown on onboarding step, scrolls with content */}
            {mode === "signup" && currentStep === "onboarding" && (
              <div
                className="lg:hidden cursor-pointer active:scale-[0.98] transition-transform w-full max-w-[38rem] mb-4"
                onClick={() => {
                  mainScrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
                  goToNextStep();
                }}
              >
                <div className="rounded-[20px] sm:rounded-[24px] p-4 sm:p-5 overflow-hidden relative">
                  {/* Hero image background with parallax */}
                  <img
                    src={salonHero}
                    alt="Professional salon"
                    className="absolute inset-0 w-full h-[120%] object-cover rounded-[20px] sm:rounded-[24px] transition-transform duration-100 ease-out"
                    style={{ transform: `translateY(-${Math.min(parallaxOffset, 30)}px)` }}
                  />
                  {/* Dark overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 to-foreground/60 rounded-[20px] sm:rounded-[24px]" />

                  <div className="relative z-10">
                    <div className="flex-1 min-w-0">
                      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-background/10 backdrop-blur-sm border border-background/10 mb-2 animate-fade-in">
                        <BadgeCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-background/80" />
                        <span className="text-[8px] font-medium text-background/80 uppercase tracking-widest">
                          Exclusively professional
                        </span>
                      </div>
                      <div
                        className="animate-fade-in min-h-[3.5rem] sm:min-h-[2.25rem]"
                        style={{
                          animationDelay: "100ms",
                          animationFillMode: "backwards",
                        }}
                      >
                        <h2 className="font-termina font-medium uppercase text-2xl sm:text-3xl text-background leading-tight text-balance">
                          {fontsLoaded ? (
                            <span className="animate-fade-in-text">Apply for a pro account</span>
                          ) : (
                            <>
                              <TextSkeleton width="100%" height="1.75rem" variant="light" />
                              <span className="block mt-1 sm:hidden">
                                <TextSkeleton width="60%" height="1.75rem" variant="light" />
                              </span>
                            </>
                          )}
                        </h2>
                      </div>
                      <p
                        className="text-xs sm:text-sm text-background/60 mt-2 animate-fade-in min-h-[1rem]"
                        style={{
                          animationDelay: "200ms",
                          animationFillMode: "backwards",
                        }}
                      >
                        {fontsLoaded ? (
                          <span className="animate-fade-in-text">
                            Unlock wholesale pricing on the industries best{" "}
                            <span className="whitespace-nowrap">hair and tools.</span>
                          </span>
                        ) : (
                          <TextSkeleton width="95%" height="0.875rem" variant="light" />
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div
              key={`${mode}-${currentStep}`}
              className={cn(
                "w-full max-w-[38rem]",
                currentStep === "success"
                  ? "animate-fade-in"
                  : mode === "signin"
                    ? modeTransitionDirection === "right"
                      ? "animate-step-enter-right"
                      : "animate-step-enter-left"
                    : currentStep === "onboarding"
                      ? modeTransitionDirection === "left"
                        ? "animate-step-enter-left"
                        : "animate-step-enter-right"
                      : transitionDirection === "forward"
                        ? "animate-step-enter-right"
                        : "animate-step-enter-left"
              )}
            >
              {mode === "signin" ? (
                <SignInForm
                  email={email}
                  password={password}
                  onEmailChange={setEmail}
                  onPasswordChange={setPassword}
                  onSignUp={() => {
                    setModeTransitionDirection("left");
                    setMode("signup");
                    setCurrentStep("onboarding");
                    setShowForgotPassword(false);
                  }}
                  showForgotPassword={showForgotPassword}
                  onForgotPasswordToggle={() => setShowForgotPassword(!showForgotPassword)}
                  onForgotPasswordSubmit={handleForgotPasswordSubmit}
                  isSendingReset={isSendingReset}
                  fontsLoaded={fontsLoaded}
                />
              ) : (
                <>
                  {currentStep === "onboarding" && (
                    <OnboardingForm
                      onContinue={goToNextStep}
                      onSignIn={() => {
                        setModeTransitionDirection("right");
                        setMode("signin");
                      }}
                      onStepClick={() => {
                        setShimmerKey((k) => k + 1);
                      }}
                      fontsLoaded={fontsLoaded}
                    />
                  )}
                  {currentStep === "account-type" && <AccountTypeForm />}
                  {currentStep === "license" && <LicenseStep />}
                  {currentStep === "business-operation" && <BusinessOperationStep />}
                  {currentStep === "business-location" && <BusinessLocationStep />}
                  {currentStep === "school-info" && <SchoolInfoStep />}
                  {currentStep === "contact-basics" && <ContactBasicsStep />}
                  {currentStep === "wholesale-terms" && <WholesaleTermsStep />}
                  {currentStep === "tax-exemption" && <TaxExemptionStep />}
                  {currentStep === "preferences" && <PreferencesStep />}
                  {currentStep === "summary" && <SummaryForm />}
                  {currentStep === "success" && (
                    <SuccessForm
                      referralSource={referralSource}
                      onReferralSourceChange={setReferralSource}
                    />
                  )}
                </>
              )}
            </div>
          </main>

          {/* Subtle gradient behind footer on mobile/tablet */}
          {footerVisible && (
            <div
              className="lg:hidden fixed bottom-0 inset-x-[10px] sm:inset-x-5 h-[200px] sm:h-[220px] pointer-events-none z-0 transition-opacity duration-300 blur-2xl"
              style={{
                opacity: footerGradientOpacity,
                background:
                  "linear-gradient(to top, hsl(var(--background)) 0%, hsl(var(--background) / 0.9) 35%, hsl(var(--background) / 0.55) 60%, hsl(var(--background) / 0.15) 80%, transparent 100%)",
              }}
            />
          )}

          {/* Footer */}
          {footerVisible && (
            <AuthFooter
              mode={mode}
              currentStep={currentStep}
              isAllStepsValid={isAllStepsValid()}
              isSubmitting={isSubmitting}
              isUploading={isUploadingDocuments}
              uploadProgress={documentUploadProgress}
              footerTransitionsEnabled={footerTransitionsEnabled}
              footerEnterReady={footerEnterReady}
              incompleteSteps={getIncompleteSteps()}
              shimmerKey={shimmerKey}
            />
          )}
        </div>
      </div>
    </div>
  );
};
export default Auth;
