import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { z } from "zod";
import { ChevronLeft, ChevronRight, Check, BadgeCheck, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuthFormState } from "@/hooks/use-auth-form-state";
import { useFormValidation } from "@/hooks/use-form-validation";
import { useModalSwipe } from "@/hooks/use-modal-swipe";
import { useModeSwitch } from "@/hooks/use-mode-switch";
import { getStepValidationStatus } from "@/components/registration/StepValidationIcon";
import { FormSkeleton } from "@/components/registration/FormSkeleton";
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
import {
  RotatingStylistAvatars,
  TestimonialCarousel,
  CircularProgress,
  MagneticFeatureBox,
} from "@/components/registration/helpers";
import { isValidEmail, formatPhoneNumber } from "@/lib/validations/form-utils";
import { supabase } from "@/integrations/supabase/client";
import { signIn, signUp } from "@/lib/auth-service";
import { scrollToFirstError } from "@/lib/scroll-to-error";
import { useRegistrationUpload } from "@/hooks/use-registration-upload";
import { slides, features } from "@/data/auth-constants";
import {
  accountTypeSchema,
  businessOperationSchema,
  contactBasicsSchema,
  businessLocationSchema,
  licenseSchema,
  salonLicenseSchema,
  schoolInfoSchema,
  taxExemptionSchema,
  wholesaleTermsSchema,
} from "@/lib/validations/auth-schemas";
import { useRegistrationSync } from "@/hooks/use-registration-sync";
import type { Step, AccountType, BusinessOperationType } from "@/types/auth";
import salonHero from "@/assets/salon-hero.jpg";
import { TextSkeleton } from "@/components/registration/TextSkeleton";
import { MobileSavingProgress } from "@/components/registration/MobileSavingProgress";
import { MobileDragHandle } from "@/components/registration/MobileDragHandle";
import { AuthToggle } from "@/components/registration/AuthToggle";
import { CloseButton } from "@/components/registration/CloseButton";
import { useGlobalApp } from "@/contexts";
import { LeftPanel } from "@/components/registration/LeftPanel";
import { useStepContext } from "@/components/registration/context";

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
    mainScrollRef,
    transitionDirection,
    setTransitionDirection,
    isTransitioning,
    setIsTransitioning,
    showValidationErrors,
  } = useStepContext();
  const formState = useAuthFormState();
  const {
    currentSlide,
    setCurrentSlide,
    displayTotalSteps,
    accountType,
    setAccountType,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    preferredName,
    setPreferredName,
    email,
    setEmail,
    password,
    setPassword,
    phoneNumber,
    setPhoneNumber,
    phoneCountryCode,
    setPhoneCountryCode,
    businessName,
    setBusinessName,
    businessAddress,
    setBusinessAddress,
    suiteNumber,
    setSuiteNumber,
    country,
    setCountry,
    city,
    setCity,
    state,
    setState,
    zipCode,
    setZipCode,
    salonSize,
    setSalonSize,
    salonStructure,
    setSalonStructure,
    licenseNumber,
    setLicenseNumber,
    licenseFile,
    setLicenseFile,
    schoolName,
    setSchoolName,
    schoolState,
    setSchoolState,
    enrollmentProofFiles,
    setEnrollmentProofFiles,
    businessOperationType,
    setBusinessOperationType,
    licenseProofFiles,
    setLicenseProofFiles,
    hasTaxExemption,
    setHasTaxExemption,
    taxExemptFile,
    setTaxExemptFile,
    wholesaleAgreed,
    setWholesaleAgreed,
    birthdayMonth,
    setBirthdayMonth,
    birthdayDay,
    setBirthdayDay,
    socialMediaHandle,
    setSocialMediaHandle,
    referralSource,
    setReferralSource,
    subscribeOrderUpdates,
    setSubscribeOrderUpdates,
    subscribeMarketing,
    setSubscribeMarketing,
    subscribePromotions,
    setSubscribePromotions,
    setShowValidationErrors,
    isSubmitting,
    setIsSubmitting,
    showForgotPassword,
    setShowForgotPassword,
    isSendingReset,
    setIsSendingReset,
    completedSteps,
    setCompletedSteps,
    resetForm,
    hasFormProgress,
    pendingRestoreStep,
    triggerRestoreTransition,
  } = formState;

  // Form validation from dedicated hook
  const { isAllStepsValid, getIncompleteSteps, isFormReadyToSubmit, getFormProgress } =
    useFormValidation({
      mode,
      currentStep,
      accountType,
      firstName,
      lastName,
      email,
      password,
      phoneNumber,
      businessName,
      businessAddress,
      country,
      city,
      state,
      zipCode,
      licenseNumber,
      salonSize,
      salonStructure,
      schoolName,
      schoolState,
      enrollmentProofFiles,
      businessOperationType,
      hasTaxExemption,
      taxExemptFile,
      wholesaleAgreed,
    });

  // UI-only state (not persisted)
  const [modeTransitionDirection, setModeTransitionDirection] = useState<"left" | "right">("right");
  const [nextStep, setNextStep] = useState<Step | null>(null);
  const [highlightFields, setHighlightFields] = useState<string[]>([]);
  const [highlightWholesaleTerms, setHighlightWholesaleTerms] = useState(false);
  const [highlightWholesaleFade, setHighlightWholesaleFade] = useState(false);

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
      Country: "#country",
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

          // Special handling for wholesale terms button (uses React state)
          if (selector === "[data-field='wholesale-terms']") {
            setHighlightWholesaleTerms(true);
            setHighlightWholesaleFade(false);
            const fadeTimer = window.setTimeout(() => {
              setHighlightWholesaleFade(true);
              const removeTimer = window.setTimeout(() => {
                setHighlightWholesaleTerms(false);
                setHighlightWholesaleFade(false);
              }, FADE_DURATION);
              timers.push(removeTimer);
            }, HIGHLIGHT_DURATION);
            timers.push(fadeTimer);
            return;
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

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

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
  const [hasScrolled, setHasScrolled] = useState(false);
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [saveProgressText, setSaveProgressText] = useState<"saving" | "saved">("saving");
  const { fontsLoaded } = useGlobalApp();

  // Sync local state to RegistrationContext for step components
  useRegistrationSync(
    {
      accountType: accountType as AccountType,
      businessOperationType: businessOperationType as BusinessOperationType,
      firstName,
      lastName,
      preferredName,
      email,
      phoneNumber,
      phoneCountryCode,
      businessName,
      businessAddress,
      suiteNumber,
      country,
      city,
      state,
      zipCode,
      schoolName,
      schoolState,
      enrollmentProofFiles,
      licenseNumber,
      salonSize,
      salonStructure,
      licenseFile,
      licenseProofFiles,
      hasTaxExemption,
      taxExemptFile,
      wholesaleAgreed,
      birthdayMonth,
      birthdayDay,
      socialMediaHandle,
      referralSource,
      subscribeOrderUpdates,
      subscribeMarketing,
      subscribePromotions,
      password,
    },
    {
      currentStep,
      currentSlide,
      displayTotalSteps,
      completedSteps,
      showValidationErrors,
      isSubmitting,
      isTransitioning,
    }
  );

  // Mode switching logic (preserves state between sign-in and sign-up)
  const { handleModeChange } = useModeSwitch({
    currentState: {
      mode,
      currentStep,
      accountType,
      licenseNumber,
      state,
      firstName,
      lastName,
      email,
      password,
      businessName,
      businessAddress,
      suiteNumber,
      country,
      city,
      zipCode,
      wholesaleAgreed,
      hasTaxExemption,
      preferredName,
      phoneNumber,
      phoneCountryCode,
      salonSize,
      salonStructure,
      licenseFile,
      taxExemptFile,
      schoolName,
      schoolState,
      enrollmentProofFiles,
      businessOperationType,
      licenseProofFiles,
      completedSteps,
    },
    setters: {
      setMode,
      setCurrentStep,
      setAccountType,
      setLicenseNumber,
      setState,
      setFirstName,
      setLastName,
      setEmail,
      setPassword,
      setBusinessName,
      setBusinessAddress,
      setSuiteNumber,
      setCountry,
      setCity,
      setZipCode,
      setWholesaleAgreed,
      setHasTaxExemption,
      setPreferredName,
      setPhoneNumber,
      setPhoneCountryCode,
      setSalonSize,
      setSalonStructure,
      setLicenseFile,
      setTaxExemptFile,
      setSchoolName,
      setSchoolState,
      setEnrollmentProofFiles,
      setBusinessOperationType,
      setLicenseProofFiles,
      setCompletedSteps,
      setTransitionDirection,
    },
    mainScrollRef,
  });

  // Parallax scroll effect for mobile hero
  const [parallaxOffset, setParallaxOffset] = useState(0);
  const [headerGradientOpacity, setHeaderGradientOpacity] = useState(0);
  const [footerGradientOpacity, setFooterGradientOpacity] = useState(1);
  const [isScrollable, setIsScrollable] = useState(false);

  // Scroll hint reappear delay
  const scrollHintTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if content is scrollable
  useEffect(() => {
    const el = mainScrollRef.current;
    if (!el) return;

    const checkScrollable = () => {
      setIsScrollable(el.scrollHeight > el.clientHeight + 10);
    };

    // Check initially after a brief delay to let content render
    const timeout = setTimeout(checkScrollable, 100);

    // Recheck on resize
    const resizeObserver = new ResizeObserver(checkScrollable);
    resizeObserver.observe(el);

    return () => {
      clearTimeout(timeout);
      resizeObserver.disconnect();
    };
  }, [mode, currentStep]);

  useEffect(() => {
    const el = mainScrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const scrollTop = el.scrollTop;
      // Parallax factor - image moves at 30% of scroll speed
      setParallaxOffset(scrollTop * 0.3);

      // Dynamic header gradient opacity based on scroll position (0-200px range)
      const gradientOpacity = Math.min(scrollTop / 200, 1);
      setHeaderGradientOpacity(gradientOpacity);

      // Dynamic footer gradient opacity based on distance from bottom (stronger when further from bottom)
      const scrollHeight = el.scrollHeight;
      const clientHeight = el.clientHeight;
      const distanceFromBottom = scrollHeight - clientHeight - scrollTop;
      const footerOpacity = Math.min(distanceFromBottom / 150, 1);
      setFooterGradientOpacity(footerOpacity);

      // Hide scroll hint immediately when scrolling past 50px
      if (scrollTop > 50) {
        if (scrollHintTimeoutRef.current) {
          clearTimeout(scrollHintTimeoutRef.current);
          scrollHintTimeoutRef.current = null;
        }
        setHasScrolled(true);
      } else {
        // Delay showing hint again when back at top
        if (!scrollHintTimeoutRef.current && hasScrolled) {
          scrollHintTimeoutRef.current = setTimeout(() => {
            setHasScrolled(false);
            scrollHintTimeoutRef.current = null;
          }, 800);
        }
      }
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (scrollHintTimeoutRef.current) {
        clearTimeout(scrollHintTimeoutRef.current);
      }
    };
  }, [mode, currentStep, hasScrolled]);

  // Reset hasScrolled when step changes
  useEffect(() => {
    setHasScrolled(false);
  }, [currentStep]);

  // Handle restore transition - after showing onboarding with toast, animate to first incomplete step
  useEffect(() => {
    if (pendingRestoreStep && currentStep === "onboarding") {
      // Wait for toast to finish (4000ms duration) plus grace period before transitioning
      const timer = setTimeout(() => {
        setTransitionDirection("forward");
        triggerRestoreTransition();
      }, 4800); // Toast duration (4000ms) + grace period (800ms)

      return () => clearTimeout(timer);
    }
  }, [pendingRestoreStep, currentStep, triggerRestoreTransition]);

  // Safari-compatible viewport height fix
  useEffect(() => {
    const setAppHeight = () => {
      document.documentElement.style.setProperty("--app-height", `${window.innerHeight}px`);
    };
    setAppHeight();
    window.addEventListener("resize", setAppHeight);
    window.addEventListener("orientationchange", setAppHeight);
    return () => {
      window.removeEventListener("resize", setAppHeight);
      window.removeEventListener("orientationchange", setAppHeight);
    };
  }, []);
  // resetForm is provided by useAuthFormState hook
  const goToNextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, []);
  const goToPrevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  }, []);
  const handleTouchStart = (e: React.TouchEvent) => {
    console.log("start");
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      diff > 0 ? goToNextSlide() : goToPrevSlide();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

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
      handleModeChange("signin");
    }
    // Swipe right on sign-in → go to sign-up (onboarding)
    else if (diff < -threshold && mode === "signin") {
      handleModeChange("signup");
    }

    mainSwipeStartX.current = null;
    mainSwipeEndX.current = null;
  };

  const handleCloseModal = useCallback(() => {
    // Check if there's form progress to save (only in signup mode with an account type selected)
    const hasProgress =
      mode === "signup" &&
      accountType !== null &&
      (firstName.trim() !== "" ||
        lastName.trim() !== "" ||
        email.trim() !== "" ||
        phoneNumber.trim() !== "" ||
        businessName.trim() !== "" ||
        businessAddress.trim() !== "" ||
        licenseNumber.trim() !== "" ||
        schoolName.trim() !== "" ||
        wholesaleAgreed ||
        hasTaxExemption !== null ||
        businessOperationType !== null ||
        completedSteps.size > 1);

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
  }, [
    navigate,
    mode,
    accountType,
    firstName,
    lastName,
    email,
    phoneNumber,
    businessName,
    businessAddress,
    licenseNumber,
    schoolName,
    wholesaleAgreed,
    hasTaxExemption,
    businessOperationType,
    completedSteps,
    isSavingProgress,
    setIsClosing,
  ]);

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

  // Handle sign in with Supabase auth
  const handleSignIn = useCallback(async () => {
    if (!isValidEmail(email) || password.length < 8) {
      toast.error("Please enter valid credentials");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signIn({ email, password });

      if (result.success) {
        toast.success(result.message || "Signed in successfully!");
        // Clear form progress on successful login
        sessionStorage.removeItem("auth_form_progress");
        navigate("/");
      } else {
        toast.error(result.message || "Failed to sign in");
      }
    } catch (error: any) {
      toast.error(error.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }, [email, password, navigate]);

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
    uploadAllDocuments,
    resetDocumentUploadState,
  ]);

  // Handle business operation type selection with auto-advance
  const handleBusinessOperationTypeSelect = (type: "commission" | "independent") => {
    setBusinessOperationType(type);
    // Auto-advance after grace period
    setTimeout(() => {
      setCompletedSteps((prev) => new Set([...prev, 2]));
      setTransitionDirection("forward");
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentStep("contact-basics");
        setIsTransitioning(false);
      }, 150);
    }, 800);
  };

  // Validate current step using zod schemas and scroll to first error
  const validateCurrentStep = useCallback((): boolean => {
    let schema: z.ZodSchema | null = null;
    let dataToValidate: Record<string, unknown> = {};

    switch (currentStep) {
      case "account-type":
        schema = accountTypeSchema;
        dataToValidate = {
          accountType: accountType as "professional" | "salon" | "student" | undefined,
        };
        break;
      case "business-operation":
        schema = businessOperationSchema;
        dataToValidate = {
          businessOperationType: businessOperationType as "commission" | "independent" | undefined,
        };
        break;
      case "contact-basics":
        schema = contactBasicsSchema;
        dataToValidate = {
          firstName,
          lastName,
          preferredName,
          email,
          phoneNumber,
          phoneCountryCode,
        };
        break;
      case "business-location":
        schema = businessLocationSchema;
        dataToValidate = {
          businessName,
          businessAddress,
          suiteNumber,
          country,
          city,
          state,
          zipCode,
        };
        break;
      case "license":
        schema = accountType === "salon" ? salonLicenseSchema : licenseSchema;
        dataToValidate = {
          licenseNumber,
          salonSize,
          salonStructure,
          licenseFile,
          licenseProofFiles,
        };
        break;
      case "school-info":
        schema = schoolInfoSchema;
        dataToValidate = {
          schoolName,
          schoolState,
          enrollmentProofFiles,
        };
        break;
      case "tax-exemption":
        schema = taxExemptionSchema;
        dataToValidate = {
          hasTaxExemption,
          taxExemptFile,
        };
        break;
      case "wholesale-terms":
        schema = wholesaleTermsSchema;
        dataToValidate = {
          agreedToWholesaleTerms: wholesaleAgreed,
        };
        break;
    }

    const result = schema.safeParse(dataToValidate);

    if (!result.success) {
      // Convert zod errors to field errors format for scroll-to-error
      const fieldErrors: Record<string, { message: string }> = {};
      result.error.flatten((err) => {
        const fieldName = err.path[0]?.toString() || "";
        if (!fieldErrors[fieldName]) {
          fieldErrors[fieldName] = { message: err.message };
        }
      });

      // Scroll to first error
      scrollToFirstError(
        fieldErrors as any,
        { current: mainScrollRef.current } as React.RefObject<HTMLElement>
      );

      return false;
    }

    return true;
  }, [
    currentStep,
    accountType,
    businessOperationType,
    firstName,
    lastName,
    preferredName,
    email,
    phoneNumber,
    phoneCountryCode,
    businessName,
    businessAddress,
    suiteNumber,
    country,
    city,
    state,
    zipCode,
    licenseNumber,
    salonSize,
    salonStructure,
    licenseFile,
    licenseProofFiles,
    schoolName,
    schoolState,
    enrollmentProofFiles,
    hasTaxExemption,
    taxExemptFile,
    wholesaleAgreed,
  ]);

  const handleNext = () => {
    if (currentStep === "summary") {
      // Submit the application using the real auth service
      handleSignUpSubmit();
      return;
    } else {
      goToNextStep();
    }
  };

  const handleBack = () => {
    // Calculate previous step for skeleton
    let targetStep: Step = currentStep;
    switch (currentStep) {
      case "account-type":
        targetStep = "onboarding";
        break;
      case "business-operation":
        targetStep = "account-type";
        break;
      case "school-info":
        targetStep = "account-type";
        break;
      case "business-location":
        targetStep = accountType === "professional" ? "contact-basics" : "account-type";
        break;
      case "contact-basics":
        if (accountType === "student") targetStep = "school-info";
        else if (accountType === "professional") targetStep = "business-operation";
        else targetStep = "business-location";
        break;
      case "license":
        targetStep = accountType === "professional" ? "business-location" : "contact-basics";
        break;
      case "tax-exemption":
        if (accountType === "student") targetStep = "contact-basics";
        else if (accountType === "professional") targetStep = "license";
        else targetStep = "license";
        break;
      case "wholesale-terms":
        targetStep = "tax-exemption";
        break;
      case "contact-info":
        targetStep = "wholesale-terms";
        break;
      case "summary":
        targetStep = "contact-info";
        break;
    }
    setNextStep(targetStep);
    setTransitionDirection("backward");
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentStep(targetStep);
      setIsTransitioning(false);
      setNextStep(null);
      mainScrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
    }, 150);
  };
  const getTotalSteps = () => {
    // Student: account-type, school-info, contact-basics, tax-exemption, wholesale-terms, contact-info, summary = 7 steps
    // Professional: 9 steps (account-type, business-operation, contact-basics, license, business-location, tax-exemption, wholesale-terms, contact-info, summary)
    // Salon: 8 steps (account-type, business-location, contact-basics, license, tax-exemption, wholesale-terms, contact-info, summary)
    // Once account type is selected, use that type's total (even while still on account-type step)
    // Only show max steps (9) when no account type is selected yet
    if (!accountType) return 9;
    if (accountType === "student") return 7;
    if (accountType === "professional") return 9;
    return 8;
  };
  const getCurrentStepNumber = () => {
    if (currentStep === "account-type") return 1;
    if (accountType === "student") {
      // Student flow: account-type, school-info, contact-basics, tax-exemption, wholesale-terms, contact-info, summary
      if (currentStep === "school-info") return 2;
      if (currentStep === "contact-basics") return 3;
      if (currentStep === "tax-exemption") return 4;
      if (currentStep === "wholesale-terms") return 5;
      if (currentStep === "contact-info") return 6;
      if (currentStep === "summary") return 7;
      return 7;
    }
    if (accountType === "professional") {
      // Professional flow: account-type, business-operation, contact-basics, business-location, license, tax-exemption, wholesale-terms, contact-info, summary
      if (currentStep === "business-operation") return 2;
      if (currentStep === "contact-basics") return 3;
      if (currentStep === "business-location") return 4;
      if (currentStep === "license") return 5;
      if (currentStep === "tax-exemption") return 6;
      if (currentStep === "wholesale-terms") return 7;
      if (currentStep === "contact-info") return 8;
      if (currentStep === "summary") return 9;
      return 9;
    }
    // Salon flow: account-type, business-location, contact-basics, license, tax-exemption, wholesale-terms, contact-info, summary
    if (currentStep === "business-location") return 2;
    if (currentStep === "contact-basics") return 3;
    if (currentStep === "license") return 4;
    if (currentStep === "tax-exemption") return 5;
    if (currentStep === "wholesale-terms") return 6;
    if (currentStep === "contact-info") return 7;
    if (currentStep === "summary") return 8;
    return 8;
  };
  const getStepFromNumber = (stepNum: number): Step => {
    // Step 0 is always onboarding
    if (stepNum === 0) return "onboarding";

    if (accountType === "student") {
      // Student flow: account-type, school-info, contact-basics, tax-exemption, wholesale-terms, contact-info, summary
      switch (stepNum) {
        case 1:
          return "account-type";
        case 2:
          return "school-info";
        case 3:
          return "contact-basics";
        case 4:
          return "tax-exemption";
        case 5:
          return "wholesale-terms";
        case 6:
          return "contact-info";
        case 7:
          return "summary";
        default:
          return "account-type";
      }
    }
    if (accountType === "professional") {
      // Professional flow: account-type, business-operation, contact-basics, business-location, license, tax-exemption, wholesale-terms, contact-info, summary
      switch (stepNum) {
        case 1:
          return "account-type";
        case 2:
          return "business-operation";
        case 3:
          return "contact-basics";
        case 4:
          return "business-location";
        case 5:
          return "license";
        case 6:
          return "tax-exemption";
        case 7:
          return "wholesale-terms";
        case 8:
          return "contact-info";
        case 9:
          return "summary";
        default:
          return "account-type";
      }
    }
    // Salon flow: account-type, business-location, contact-basics, license, tax-exemption, wholesale-terms, contact-info, summary
    switch (stepNum) {
      case 1:
        return "account-type";
      case 2:
        return "business-location";
      case 3:
        return "contact-basics";
      case 4:
        return "license";
      case 5:
        return "tax-exemption";
      case 6:
        return "wholesale-terms";
      case 7:
        return "contact-info";
      case 8:
        return "summary";
      default:
        return "account-type";
    }
  };
  const goToStep = (stepNum: number, missingFields?: string[]) => {
    // Handle onboarding step (step 0) and success step
    const currentNum =
      currentStep === "onboarding"
        ? 0
        : currentStep === "success"
          ? displayTotalSteps + 1
          : getCurrentStepNumber();
    if (stepNum === currentNum) return;

    // If no account type selected and trying to go to step 7, show toast and go to account-type
    if (!accountType && stepNum === 7) {
      toast.error("You must select an account type to continue.");
      if (currentStep !== "account-type") {
        setNextStep("account-type");
        setTransitionDirection("backward");
        setIsTransitioning(true);
        setTimeout(() => {
          setCurrentStep("account-type");
          setIsTransitioning(false);
          setNextStep(null);
        }, 150);
      }
      return;
    }

    // Store all missing fields to highlight after navigation
    setHighlightFields(missingFields || []);

    const targetStep = getStepFromNumber(stepNum);
    setNextStep(targetStep);
    setTransitionDirection(stepNum > currentNum ? "forward" : "backward");
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentStep(targetStep);
      setIsTransitioning(false);
      setNextStep(null);
    }, 150);
  };

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
              <AuthToggle mode={mode} handleModeChange={handleModeChange} />
              <StepIndicatorBar onGoToStep={goToStep} />
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
                  handleNext();
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

            {isTransitioning ? (
              <div className="w-full max-w-[38rem]">
                <FormSkeleton
                  variant={
                    (nextStep || currentStep) === "account-type"
                      ? "account-type"
                      : (nextStep || currentStep) === "license" ||
                          (nextStep || currentStep) === "school-info"
                        ? "license"
                        : (nextStep || currentStep) === "business-location"
                          ? "location"
                          : (nextStep || currentStep) === "business-operation"
                            ? "business-operation"
                            : (nextStep || currentStep) === "wholesale-terms" ||
                                (nextStep || currentStep) === "tax-exemption"
                              ? "terms"
                              : (nextStep || currentStep) === "contact-info"
                                ? "contact"
                                : "default"
                  }
                />
              </div>
            ) : (
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
                        onContinue={handleNext}
                        onSignIn={() => {
                          setModeTransitionDirection("right");
                          setMode("signin");
                        }}
                        onStepClick={() => {
                          setShimmerKey((k) => k + 1);
                        }}
                        fontsLoaded={fontsLoaded}
                        isRestoring={!!pendingRestoreStep}
                      />
                    )}
                    {currentStep === "account-type" && <AccountTypeForm />}
                    {currentStep === "license" && (
                      <LicenseStep
                        accountType={accountType}
                        licenseNumber={licenseNumber}
                        salonSize={salonSize}
                        salonStructure={salonStructure}
                        licenseFile={licenseFile}
                        licenseProofFiles={licenseProofFiles}
                        onLicenseChange={setLicenseNumber}
                        onSalonSizeChange={setSalonSize}
                        onSalonStructureChange={setSalonStructure}
                        onLicenseFileChange={setLicenseFile}
                        onLicenseProofFilesChange={setLicenseProofFiles}
                        showValidationErrors={showValidationErrors}
                        validationStatus={getStepValidationStatus(
                          accountType === "salon"
                            ? licenseNumber.trim() !== "" &&
                                salonSize !== "" &&
                                salonStructure !== ""
                            : licenseNumber.trim() !== "",
                          licenseNumber.trim() !== "" || salonSize !== "" || salonStructure !== "",
                          showValidationErrors
                        )}
                      />
                    )}
                    {currentStep === "business-operation" && <BusinessOperationStep />}
                    {currentStep === "business-location" && <BusinessLocationStep />}
                    {currentStep === "school-info" && (
                      <SchoolInfoStep
                        schoolName={schoolName}
                        schoolState={schoolState}
                        enrollmentProofFiles={enrollmentProofFiles}
                        onSchoolNameChange={setSchoolName}
                        onSchoolStateChange={setSchoolState}
                        onEnrollmentProofFilesChange={setEnrollmentProofFiles}
                        showValidationErrors={showValidationErrors}
                        validationStatus={getStepValidationStatus(
                          schoolName.trim() !== "" &&
                            schoolState !== "" &&
                            enrollmentProofFiles.length > 0,
                          schoolName.trim() !== "" ||
                            schoolState !== "" ||
                            enrollmentProofFiles.length > 0,
                          showValidationErrors
                        )}
                      />
                    )}
                    {currentStep === "contact-basics" && <ContactBasicsStep />}
                    {currentStep === "wholesale-terms" && (
                      <WholesaleTermsStep
                        accountType={accountType}
                        agreed={wholesaleAgreed}
                        onAgreeChange={setWholesaleAgreed}
                        highlight={highlightWholesaleTerms}
                        highlightFade={highlightWholesaleFade}
                        showValidationErrors={showValidationErrors}
                        validationStatus={getStepValidationStatus(
                          wholesaleAgreed,
                          false,
                          showValidationErrors
                        )}
                      />
                    )}
                    {currentStep === "tax-exemption" && (
                      <TaxExemptionStep
                        accountType={accountType}
                        hasTaxExemption={hasTaxExemption}
                        taxExemptFile={taxExemptFile}
                        onTaxExemptionChange={setHasTaxExemption}
                        onTaxExemptFileChange={setTaxExemptFile}
                        onAutoAdvance={() => {
                          // Auto-advance to wholesale-terms step when No is selected
                          const stepNum =
                            accountType === "professional" ? 6 : accountType === "student" ? 4 : 5;
                          setCompletedSteps((prev) => new Set([...prev, stepNum]));
                          setTransitionDirection("forward");
                          setIsTransitioning(true);
                          setTimeout(() => {
                            setCurrentStep("wholesale-terms");
                            setIsTransitioning(false);
                          }, 150);
                        }}
                        showValidationErrors={showValidationErrors}
                        validationStatus={getStepValidationStatus(
                          hasTaxExemption !== null &&
                            (hasTaxExemption === false || taxExemptFile !== null),
                          hasTaxExemption !== null,
                          showValidationErrors
                        )}
                      />
                    )}
                    {currentStep === "contact-info" && (
                      <PreferencesStep
                        accountType={accountType}
                        birthdayMonth={birthdayMonth}
                        birthdayDay={birthdayDay}
                        socialMediaHandle={socialMediaHandle}
                        onBirthdayMonthChange={setBirthdayMonth}
                        onBirthdayDayChange={setBirthdayDay}
                        onSocialMediaHandleChange={setSocialMediaHandle}
                        subscribeOrderUpdates={subscribeOrderUpdates}
                        subscribeMarketing={subscribeMarketing}
                        subscribePromotions={subscribePromotions}
                        onSubscribeOrderUpdatesChange={setSubscribeOrderUpdates}
                        onSubscribeMarketingChange={setSubscribeMarketing}
                        onSubscribePromotionsChange={setSubscribePromotions}
                        showValidationErrors={showValidationErrors}
                        validationStatus={getStepValidationStatus(true, true, showValidationErrors)}
                        uploadedFiles={[
                          ...(licenseFile
                            ? [
                                {
                                  file: licenseFile,
                                  label: accountType === "salon" ? "Salon License" : "License",
                                },
                              ]
                            : []),
                          ...(accountType === "professional"
                            ? licenseProofFiles.map((f, i) => ({
                                file: f,
                                label:
                                  `License Photo ${licenseProofFiles.length > 1 ? i + 1 : ""}`.trim(),
                              }))
                            : []),
                          ...(accountType === "student"
                            ? enrollmentProofFiles.map((f, i) => ({
                                file: f,
                                label:
                                  `Enrollment Proof ${enrollmentProofFiles.length > 1 ? i + 1 : ""}`.trim(),
                              }))
                            : []),
                          ...(taxExemptFile
                            ? [
                                {
                                  file: taxExemptFile,
                                  label: "Tax Exemption Document",
                                },
                              ]
                            : []),
                        ]}
                      />
                    )}
                    {currentStep === "summary" && (
                      <SummaryForm
                        accountType={accountType}
                        firstName={firstName}
                        lastName={lastName}
                        preferredName={preferredName}
                        email={email}
                        phoneNumber={phoneNumber}
                        phoneCountryCode={phoneCountryCode}
                        licenseNumber={licenseNumber}
                        state={state}
                        businessName={businessName}
                        businessAddress={businessAddress}
                        suiteNumber={suiteNumber}
                        city={city}
                        zipCode={zipCode}
                        country={country}
                        schoolName={schoolName}
                        schoolState={schoolState}
                        businessOperationType={businessOperationType}
                        salonSize={salonSize}
                        salonStructure={salonStructure}
                        hasTaxExemption={hasTaxExemption}
                        birthdayMonth={birthdayMonth}
                        birthdayDay={birthdayDay}
                        socialMediaHandle={socialMediaHandle}
                        subscribeOrderUpdates={subscribeOrderUpdates}
                        subscribePromotions={subscribePromotions}
                        uploadedFiles={[
                          ...(licenseFile
                            ? [
                                {
                                  file: licenseFile,
                                  label: accountType === "salon" ? "Salon License" : "License",
                                },
                              ]
                            : []),
                          ...(accountType === "professional"
                            ? licenseProofFiles.map((f, i) => ({
                                file: f,
                                label:
                                  `License Photo ${licenseProofFiles.length > 1 ? i + 1 : ""}`.trim(),
                              }))
                            : []),
                          ...(accountType === "student"
                            ? enrollmentProofFiles.map((f, i) => ({
                                file: f,
                                label:
                                  `Enrollment Proof ${enrollmentProofFiles.length > 1 ? i + 1 : ""}`.trim(),
                              }))
                            : []),
                          ...(taxExemptFile
                            ? [{ file: taxExemptFile, label: "Tax Exemption Document" }]
                            : []),
                        ]}
                        onEditStep={goToStep}
                      />
                    )}
                    {currentStep === "success" && (
                      <SuccessForm
                        referralSource={referralSource}
                        onReferralSourceChange={setReferralSource}
                      />
                    )}
                  </>
                )}
              </div>
            )}
          </main>

          {/* Scroll down hint - mobile/tablet, positioned above footer, only if content is scrollable */}
          {mode === "signup" && currentStep === "onboarding" && isScrollable && (
            <div
              className={cn(
                "lg:hidden fixed bottom-[105px] sm:bottom-[120px] md:bottom-[150px] left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-opacity duration-500",
                hasScrolled ? "opacity-0" : "opacity-100"
              )}
            >
              <div className="w-[4px] h-[8px] rounded-full bg-muted-foreground/40 animate-scroll-wheel" />
            </div>
          )}

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
              onBack={handleBack}
              onNext={handleNext}
              onGoToStep={goToStep}
            />
          )}
        </div>
      </div>
    </div>
  );
};
export default Auth;
