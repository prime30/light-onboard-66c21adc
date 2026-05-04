import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { useNavigate, useLocation } from "react-router";
import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthFooter } from "@/components/registration/AuthFooter";
import { AdminJumpButton } from "@/components/registration/AdminJumpButton";
import { OnboardingForm } from "@/components/registration/steps/OnboardingForm";
import { FormSkeleton } from "@/components/registration/FormSkeleton";
import type { Step } from "@/types/auth";

// Lazy-load steps not visible on first paint
const AccountTypeForm = lazy(() => import("@/components/registration/steps/AccountTypeForm").then(m => ({ default: m.AccountTypeForm })));
const ContactBasicsStep = lazy(() => import("@/components/registration/steps/ContactBasicsStep").then(m => ({ default: m.ContactBasicsStep })));
const CreatePasswordStep = lazy(() => import("@/components/registration/steps/CreatePasswordStep").then(m => ({ default: m.CreatePasswordStep })));
const PreferencesStep = lazy(() => import("@/components/registration/steps/PreferencesStep").then(m => ({ default: m.PreferencesStep })));
const PreferredMethodStep = lazy(() => import("@/components/registration/steps/PreferredMethodStep").then(m => ({ default: m.PreferredMethodStep })));
const BusinessLocationStep = lazy(() => import("@/components/registration/steps/BusinessLocationStep").then(m => ({ default: m.BusinessLocationStep })));
const SchoolInfoStep = lazy(() => import("@/components/registration/steps/SchoolInfoStep").then(m => ({ default: m.SchoolInfoStep })));
const LicenseStep = lazy(() => import("@/components/registration/steps/LicenseStep").then(m => ({ default: m.LicenseStep })));
const WholesaleTermsStep = lazy(() => import("@/components/registration/steps/WholesaleTermsStep").then(m => ({ default: m.WholesaleTermsStep })));
const TaxExemptionStep = lazy(() => import("@/components/registration/steps/TaxExemptionStep").then(m => ({ default: m.TaxExemptionStep })));
const BusinessOperationStep = lazy(() => import("@/components/registration/steps/BusinessOperationStep").then(m => ({ default: m.BusinessOperationStep })));
const SummaryForm = lazy(() => import("@/components/registration/steps/SummaryForm").then(m => ({ default: m.SummaryForm })));
const AssessingStep = lazy(() => import("@/components/registration/steps/AssessingStep").then(m => ({ default: m.AssessingStep })));
const SuccessForm = lazy(() => import("@/components/registration/steps/SuccessForm").then(m => ({ default: m.SuccessForm })));
import salonHero from "@/assets/salon-hero.jpg";
import { FadeText } from "@/components/registration/FadeText";
import { useUploadFile } from "@/contexts";
import { useStepContext, useFormData } from "@/components/registration/context";
import { useModeContext } from "@/components/registration/context/ModeContext";
import { useScroll } from "@/hooks/use-scroll";
import { useSafariViewportFix } from "@/hooks/use-safari-viewport-fix";
import { StepIndicatorBar } from "@/components/registration/StepIndicatorBar";
import { prefetchNextStep, prefetchAllSteps } from "@/lib/step-prefetch";
import type { AccountType } from "@/types/auth";

type FormSkeletonVariant =
  | "default"
  | "account-type"
  | "license"
  | "location"
  | "terms"
  | "contact"
  | "business-operation";

function getSkeletonVariant(step: Step): FormSkeletonVariant {
  switch (step) {
    case "account-type":
      return "account-type";
    case "license":
      return "license";
    case "business-location":
      return "location";
    case "wholesale-terms":
      return "terms";
    case "contact-basics":
      return "contact";
    case "business-operation":
      return "business-operation";
    default:
      return "default";
  }
}

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { isFormValid, isSubmitting, watch } = useFormData();
  const { isUploading, overallProgress } = useUploadFile();

  // Form state from centralized hook (includes sessionStorage persistence)
  const { currentStep, setCurrentStep, goToNextStep } = useStepContext();

  // Eagerly preload ALL step chunks once on mount (deferred via requestIdleCallback).
  // This eliminates the Suspense fallback flash between steps — by the time the user
  // navigates, the chunk is already in the browser cache and React renders it synchronously.
  useEffect(() => {
    prefetchAllSteps();
  }, []);

  // Belt-and-braces: also prefetch the next step reactively (in case idle callback hasn't fired yet)
  const accountType = watch("accountType") as AccountType | undefined;
  useEffect(() => {
    prefetchNextStep(currentStep, accountType);
  }, [currentStep, accountType]);

  const { mode, mainScrollRef, transitionDirection, isTransitioning } = useModeContext();

  // UI-only state (not persisted)
  const [modeTransitionDirection, setModeTransitionDirection] = useState<"left" | "right">("right");
  const [highlightFields, setHighlightFields] = useState<string[]>([]);

  // Prevent footer layout transitions from running during the initial footer entrance animation
  const [footerTransitionsEnabled, setFooterTransitionsEnabled] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setFooterTransitionsEnabled(true), 900);
    return () => window.clearTimeout(t);
  }, []);

  // "Preload" footer layout for a frame before running entrance animation (prevents button width reflow during enter)
  const [footerEnterReady, setFooterEnterReady] = useState(false);
  const footerVisible =
    mode === "signin" ||
    (mode === "signup" && currentStep !== "success" && currentStep !== "assessing");
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
  }, [location.state, location.search, location.pathname, setCurrentStep]);

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

  // UI-only local state (not persisted)
  const [shimmerKey] = useState(0);

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
      navigate("/login");
    }
    // Swipe right on sign-in → go to sign-up (onboarding)
    else if (diff < -threshold && mode === "signin") {
      navigate("/auth");
    }

    mainSwipeStartX.current = null;
    mainSwipeEndX.current = null;
  };

  return (
    <>
      <StepIndicatorBar />

      <main
        ref={mainScrollRef}
        className="flex-1 flex flex-col items-center px-5 md:px-6 lg:px-8 pb-10 lg:pb-[clamp(5px,1vh,20px)] overflow-y-auto scrollbar-hide pt-0"
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
                width={608}
                height={730}
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
                    className="animate-fade-in"
                    style={{
                      animationDelay: "100ms",
                      animationFillMode: "backwards",
                    }}
                  >
                    <FadeText
                      as="h2"
                      variant="light"
                      className="font-termina font-medium uppercase text-2xl sm:text-3xl text-background leading-tight text-balance"
                    >
                      Apply for a pro account
                    </FadeText>
                  </div>
                  <div
                    className="animate-fade-in mt-2"
                    style={{
                      animationDelay: "200ms",
                      animationFillMode: "backwards",
                    }}
                  >
                    <FadeText
                      as="p"
                      variant="light"
                      className="text-xs sm:text-sm text-background/60"
                    >
                      Unlock wholesale pricing on the industries best{" "}
                      <span className="whitespace-nowrap">hair and tools.</span>
                    </FadeText>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div
          key={`${mode}-${currentStep}`}
          className={cn(
            "w-full max-w-[38rem]",
            currentStep === "onboarding" && "lg:flex-1 lg:flex lg:flex-col lg:min-h-0",
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
          {currentStep === "onboarding" && (
            <OnboardingForm
              onSignIn={() => {
                setModeTransitionDirection("right");
                navigate("/login");
              }}
            />
          )}
          {currentStep !== "onboarding" && (
            <Suspense fallback={null}>
              {currentStep === "account-type" && <AccountTypeForm />}
              {currentStep === "license" && <LicenseStep />}
              {currentStep === "business-operation" && <BusinessOperationStep />}
              {currentStep === "business-location" && <BusinessLocationStep />}
              {currentStep === "school-info" && <SchoolInfoStep />}
              {currentStep === "contact-basics" && <ContactBasicsStep />}
              {currentStep === "create-password" && <CreatePasswordStep />}
              {currentStep === "wholesale-terms" && <WholesaleTermsStep />}
              {currentStep === "tax-exemption" && <TaxExemptionStep />}
              {currentStep === "preferred-method" && <PreferredMethodStep />}
              {currentStep === "preferences" && <PreferencesStep />}
              {currentStep === "summary" && <SummaryForm />}
              {currentStep === "assessing" && <AssessingStep />}
              {currentStep === "success" && (
                <SuccessForm />
              )}
            </Suspense>
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
          isAllStepsValid={isFormValid}
          isSubmitting={isSubmitting}
          isUploading={isUploading}
          uploadProgress={overallProgress}
          footerTransitionsEnabled={footerTransitionsEnabled}
          footerEnterReady={footerEnterReady}
          shimmerKey={shimmerKey}
        />
      )}

      <AdminJumpButton />
    </>
  );
};
export default Auth;
