import { useState, useCallback, useRef, useEffect } from "react";
import { format } from "date-fns";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { ArrowLeft, ArrowRight, Sparkles, Star, Truck, Gift, ChevronLeft, ChevronRight, ChevronDown, Mail, Lock, User, FileCheck, MapPin, Check, ShoppingBag, Heart, ArrowUpRight, Building2, GraduationCap, X, Eye, EyeOff, Phone, Info, AlertTriangle, Clock, Headphones, Users, Tag, Loader2, BadgeCheck, Upload, ShieldCheck, Flag, Wand2, Scissors, Calendar } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useMagnetic } from "@/hooks/use-magnetic";
import { useCountdown } from "@/hooks/use-countdown";
import { useFontLoaded, TextSkeleton } from "@/hooks/use-font-loaded";
import { StateIcon, hasStateIcon } from "@/components/StateIcon";
import { StepValidationIcon, getStepValidationStatus } from "@/components/registration/StepValidationIcon";
import { FileUpload } from "@/components/registration/FileUpload";
import { MultiFileUpload } from "@/components/registration/MultiFileUpload";
import { FileSummary } from "@/components/registration/FileSummary";
import { FormSkeleton } from "@/components/registration/FormSkeleton";
import { ContactBasicsStep, countryCodes, CountryFlag, isValidPhoneNumber } from "@/components/registration/steps/ContactBasicsStep";
import { PreferencesStep } from "@/components/registration/steps/PreferencesStep";
import { BusinessLocationStep, countries, provinces, states } from "@/components/registration/steps/BusinessLocationStep";
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
import { PersonalInfoForm } from "@/components/registration/steps/PersonalInfoForm";
import {
  AnimatedNumber,
  AnimatedProductCount,
  OdometerCounter,
  RotatingStylistAvatars,
  RotatingStylistAvatarsLight,
  TestimonialCarousel,
  PasswordInputField,
  PasswordStrengthMeter,
  CircularProgress,
  MagneticFeatureBox,
  MarqueeBadges
} from "@/components/registration/helpers";
import { isValidEmail, formatPhoneNumber } from "@/lib/validations/form-utils";
import { supabase } from "@/integrations/supabase/client";
import { scrollToFirstError } from "@/lib/scroll-to-error";
import { slides, stats, features, testimonials } from "@/data/auth-constants";
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
  signInSchema,
} from "@/lib/validations/auth-schemas";
import colorRingProduct from "@/assets/color-ring-product.png";
import salonHero from "@/assets/salon-hero.jpg";
import logoSvg from "@/assets/logo.svg";
import stylistPink1 from "@/assets/avatars/stylist-pink-1.jpg";
import stylistPurple1 from "@/assets/avatars/stylist-purple-1.jpg";
import stylistBlue1 from "@/assets/avatars/stylist-blue-1.jpg";
import stylistOmbre1 from "@/assets/avatars/stylist-ombre-1.jpg";
import stylistTeal1 from "@/assets/avatars/stylist-teal-1.jpg";
import stylistLavender1 from "@/assets/avatars/stylist-lavender-1.jpg";
import stylistMagenta1 from "@/assets/avatars/stylist-magenta-1.jpg";
import stylistElectric1 from "@/assets/avatars/stylist-electric-1.jpg";
import blogResaleLicense from "@/assets/blog-resale-license.jpg";
type AuthMode = "signup" | "signin";
type Step = "onboarding" | "reviews" | "account-type" | "contact-basics" | "license" | "business-operation" | "business-location" | "school-info" | "wholesale-terms" | "tax-exemption" | "contact-info" | "summary" | "success";

// Email validation - requires @ symbol


const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<AuthMode>("signup");
  const [modeTransitionDirection, setModeTransitionDirection] = useState<"left" | "right">("right");
  const [currentStep, setCurrentStep] = useState<Step>("onboarding");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [transitionDirection, setTransitionDirection] = useState<"forward" | "backward">("forward");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [nextStep, setNextStep] = useState<Step | null>(null);
  const [highlightFields, setHighlightFields] = useState<string[]>([]);
  const [highlightWholesaleTerms, setHighlightWholesaleTerms] = useState(false);
  const [highlightWholesaleFade, setHighlightWholesaleFade] = useState(false);
  // Display total steps - locked during account-type step to prevent indicator jump
  const [displayTotalSteps, setDisplayTotalSteps] = useState(7);

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
    const stepParam = searchParams.get('step');
    if (stepParam === '1') {
      setCurrentStep('account-type');
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
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';
    
    // Helper to check if element is inside scrollable content
    const isInsideScrollableContent = (element: Element | null): boolean => {
      while (element) {
        const style = window.getComputedStyle(element);
        const overflowY = style.overflowY;
        if ((overflowY === 'auto' || overflowY === 'scroll') && element.scrollHeight > element.clientHeight) {
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
    
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    
    return () => {
      document.body.style.overscrollBehavior = originalBodyOverscroll;
      document.documentElement.style.overscrollBehavior = originalHtmlOverscroll;
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
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
      "Email": "#email",
      "Phone number": "#phoneNumber",
      // Business location fields
      "Business name": "#businessName",
      "Address": "#businessAddress",
      "Country": "#country",
      "City": "#city",
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
          elements.forEach(el => el.classList.add("field-highlight"));
          
          // Focus the first input element (only for first field)
          if (index === 0) {
            const firstEl = elements[0];
            if (firstEl instanceof HTMLInputElement || firstEl instanceof HTMLSelectElement || firstEl instanceof HTMLTextAreaElement) {
              firstEl.focus();
            }
          }
          
          // Start fade after highlight duration
          const fadeTimer = window.setTimeout(() => {
            elements.forEach(el => el.classList.add("field-highlight-fade"));
            // Remove classes after fade completes
            const removeTimer = window.setTimeout(() => {
              elements.forEach(el => el.classList.remove("field-highlight", "field-highlight-fade"));
            }, FADE_DURATION);
            timers.push(removeTimer);
          }, HIGHLIGHT_DURATION);
          timers.push(fadeTimer);
        }, index * STAGGER_DELAY);
        timers.push(startTimer);
      });
      
      // Clear highlightFields after all animations complete
      const totalDuration = (highlightFields.length - 1) * STAGGER_DELAY + HIGHLIGHT_DURATION + FADE_DURATION + 100;
      const clearTimer = window.setTimeout(() => {
        setHighlightFields([]);
      }, totalDuration);
      timers.push(clearTimer);
    }, 600);
    timers.push(initialDelay);

    return () => {
      timers.forEach(t => window.clearTimeout(t));
    };
  }, [highlightFields, isTransitioning]);

  const [submitTooltipOpen, setSubmitTooltipOpen] = useState(false);
  const submitPopoverCloseTimer = useRef<number | null>(null);

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  
  // Main content swipe refs for mode switching
  const mainSwipeStartX = useRef<number | null>(null);
  const mainSwipeEndX = useRef<number | null>(null);
  
  // Step indicator swipe refs
  const stepSwipeStartX = useRef<number | null>(null);
  const stepSwipeEndX = useRef<number | null>(null);
  
  // Modal swipe-down refs and state
  const modalTouchStartY = useRef<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const isDragFromTop = useRef<boolean>(false);
  const [modalDragOffset, setModalDragOffset] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const [isBouncingBack, setIsBouncingBack] = useState(false);

  // Form state
  const [accountType, setAccountType] = useState<string | null>(null);

  // Keep the step indicator's total in sync with the selected flow.
  // (Important for restored sessions from localStorage where accountType is set without using handleAccountTypeSelect.)
  useEffect(() => {
    if (!accountType) return;
    setDisplayTotalSteps(accountType === "student" ? 7 : accountType === "professional" ? 9 : 8);
  }, [accountType]);

  const [licenseNumber, setLicenseNumber] = useState("");
  const [state, setState] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Preserved state for mode switching
  const signupStateRef = useRef<{
    step: Step;
    accountType: string | null;
    licenseNumber: string;
    state: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    businessName: string;
    businessAddress: string;
    suiteNumber: string;
    country: string;
    city: string;
    zipCode: string;
    wholesaleAgreed: boolean;
    hasTaxExemption: boolean | null;
    preferredName: string;
    phoneNumber: string;
    phoneCountryCode: string;
    salonSize: string;
    salonStructure: string;
    licenseFile: File | null;
    taxExemptFile: File | null;
    schoolName: string;
    schoolState: string;
    enrollmentProofFiles: File[];
    businessOperationType: "commission" | "independent" | null;
    licenseProofFiles: File[];
    completedSteps: Set<number>;
  } | null>(null);
  
  const signinStateRef = useRef<{
    email: string;
    password: string;
  } | null>(null);

  // New pro flow fields
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [suiteNumber, setSuiteNumber] = useState("");
  const [country, setCountry] = useState("United States");
  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [wholesaleAgreed, setWholesaleAgreed] = useState(false);
  const [hasTaxExemption, setHasTaxExemption] = useState<boolean | null>(null);
  const [preferredName, setPreferredName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+1");

  // Salon-specific fields
  const [salonSize, setSalonSize] = useState("");
  const [salonStructure, setSalonStructure] = useState("");
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [taxExemptFile, setTaxExemptFile] = useState<File | null>(null);

  // Student-specific fields
  const [schoolName, setSchoolName] = useState("");
  const [schoolState, setSchoolState] = useState("");
  const [enrollmentProofFiles, setEnrollmentProofFiles] = useState<File[]>([]);

  // Licensed stylist-specific fields
  const [businessOperationType, setBusinessOperationType] = useState<"commission" | "independent" | null>(null);
  const [licenseProofFiles, setLicenseProofFiles] = useState<File[]>([]);

  // Additional profile fields (optional)
  const [birthdayMonth, setBirthdayMonth] = useState("");
  const [birthdayDay, setBirthdayDay] = useState("");
  const [socialMediaHandle, setSocialMediaHandle] = useState("");
  const [referralSource, setReferralSource] = useState("");

  // Subscription preferences
  const [subscribeOrderUpdates, setSubscribeOrderUpdates] = useState(true);
  const [subscribeMarketing, setSubscribeMarketing] = useState(true);
  const [subscribePromotions, setSubscribePromotions] = useState(true);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [shimmerKey, setShimmerKey] = useState(0);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [saveProgressText, setSaveProgressText] = useState<"saving" | "saved">("saving");
  const [showAccountTypeConfirm, setShowAccountTypeConfirm] = useState(false);
  const [pendingAccountType, setPendingAccountType] = useState<string | null>(null);
  const fontsLoaded = useFontLoaded();

  // sessionStorage persistence keys (cleared when browser tab closes)
  const STORAGE_KEY = "auth_form_progress";

  // Helper function to calculate completed steps based on form data
  const calculateCompletedSteps = (data: {
    accountType: "professional" | "salon" | "student" | null;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    businessName: string;
    businessAddress: string;
    country: string;
    city: string;
    state: string;
    zipCode: string;
    licenseNumber: string;
    salonSize: string;
    salonStructure: string;
    schoolName: string;
    schoolState: string;
    enrollmentProofFilesCount: number;
    businessOperationType: "independent" | "salon-booth" | "salon-owner" | null;
    hasTaxExemption: boolean | null;
    hasTaxExemptFile: boolean;
    wholesaleAgreed: boolean;
  }): Set<number> => {
    const completed = new Set<number>();
    
    // Step 1 is always complete if we have an account type
    if (!data.accountType) return completed;
    completed.add(1);
    
    // Contact basics validation (shared across all flows)
    const contactBasicsValid = 
      data.firstName.trim() !== "" && 
      data.lastName.trim() !== "" && 
      isValidEmail(data.email) && 
      isValidPhoneNumber(data.phoneNumber);
    
    // Tax exemption validation (shared across all flows)
    const taxExemptionValid = 
      data.hasTaxExemption === false || 
      (data.hasTaxExemption === true && data.hasTaxExemptFile);
    
    if (data.accountType === "student") {
      // Student flow: 1-account-type, 2-school-info, 3-contact-basics, 4-tax-exemption, 5-wholesale-terms, 6-contact-info
      const schoolInfoValid = 
        data.schoolName.trim() !== "" && 
        data.schoolState !== "" && 
        data.enrollmentProofFilesCount > 0;
      
      if (schoolInfoValid) completed.add(2);
      if (contactBasicsValid) completed.add(3);
      if (taxExemptionValid) completed.add(4);
      if (data.wholesaleAgreed) completed.add(5);
      // Step 6 (contact-info) is optional, always complete
      completed.add(6);
    } else if (data.accountType === "salon") {
      // Salon flow: 1-account-type, 2-business-location, 3-contact-basics, 4-license, 5-tax-exemption, 6-wholesale-terms, 7-contact-info
      const businessLocationValid = 
        data.businessName.trim() !== "" && 
        data.businessAddress.trim() !== "" && 
        data.country !== "" && 
        data.city.trim() !== "" && 
        data.state !== "" && 
        data.zipCode.trim() !== "";
      
      const licenseValid = 
        data.licenseNumber.trim() !== "" && 
        data.salonSize !== "" && 
        data.salonStructure !== "";
      
      if (businessLocationValid) completed.add(2);
      if (contactBasicsValid) completed.add(3);
      if (licenseValid) completed.add(4);
      if (taxExemptionValid) completed.add(5);
      if (data.wholesaleAgreed) completed.add(6);
      // Step 7 (contact-info) is optional, always complete
      completed.add(7);
    } else {
      // Professional flow: 1-account-type, 2-business-operation, 3-contact-basics, 4-business-location, 5-license, 6-tax-exemption, 7-wholesale-terms, 8-contact-info
      const businessOperationValid = data.businessOperationType !== null;
      
      const businessLocationValid = 
        data.businessName.trim() !== "" && 
        data.businessAddress.trim() !== "" && 
        data.country !== "" && 
        data.city.trim() !== "" && 
        data.state !== "" && 
        data.zipCode.trim() !== "";
      
      const licenseValid = data.licenseNumber.trim() !== "";
      
      if (businessOperationValid) completed.add(2);
      if (contactBasicsValid) completed.add(3);
      if (businessLocationValid) completed.add(4);
      if (licenseValid) completed.add(5);
      if (taxExemptionValid) completed.add(6);
      if (data.wholesaleAgreed) completed.add(7);
      // Step 8 (contact-info) is optional, always complete
      completed.add(8);
    }
    
    return completed;
  };

  // Load from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.mode) setMode(data.mode);
        if (data.currentStep && data.currentStep !== "success") setCurrentStep(data.currentStep);
        if (data.accountType) setAccountType(data.accountType);
        if (data.licenseNumber) setLicenseNumber(data.licenseNumber);
        if (data.state) setState(data.state);
        if (data.firstName) setFirstName(data.firstName);
        if (data.lastName) setLastName(data.lastName);
        if (data.email) setEmail(data.email);
        // Note: password intentionally not persisted for security
        if (data.businessName) setBusinessName(data.businessName);
        if (data.businessAddress) setBusinessAddress(data.businessAddress);
        if (data.suiteNumber) setSuiteNumber(data.suiteNumber);
        if (data.country) setCountry(data.country);
        if (data.city) setCity(data.city);
        if (data.zipCode) setZipCode(data.zipCode);
        if (data.wholesaleAgreed !== undefined) setWholesaleAgreed(data.wholesaleAgreed);
        if (data.hasTaxExemption !== undefined) setHasTaxExemption(data.hasTaxExemption);
        if (data.preferredName) setPreferredName(data.preferredName);
        if (data.phoneNumber) setPhoneNumber(data.phoneNumber);
        if (data.phoneCountryCode) setPhoneCountryCode(data.phoneCountryCode);
        if (data.salonSize) setSalonSize(data.salonSize);
        if (data.salonStructure) setSalonStructure(data.salonStructure);
        if (data.schoolName) setSchoolName(data.schoolName);
        if (data.schoolState) setSchoolState(data.schoolState);
        if (data.businessOperationType) setBusinessOperationType(data.businessOperationType);
        if (data.birthdayMonth) setBirthdayMonth(data.birthdayMonth);
        if (data.birthdayDay) setBirthdayDay(data.birthdayDay);
        if (data.socialMediaHandle) setSocialMediaHandle(data.socialMediaHandle);
        if (data.referralSource) setReferralSource(data.referralSource);
        
        // Recalculate completed steps based on restored form data
        // Note: Files can't be restored from sessionStorage, so file-dependent steps won't show as complete
        const recalculatedSteps = calculateCompletedSteps({
          accountType: data.accountType || null,
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          email: data.email || "",
          phoneNumber: data.phoneNumber || "",
          businessName: data.businessName || "",
          businessAddress: data.businessAddress || "",
          country: data.country || "",
          city: data.city || "",
          state: data.state || "",
          zipCode: data.zipCode || "",
          licenseNumber: data.licenseNumber || "",
          salonSize: data.salonSize || "",
          salonStructure: data.salonStructure || "",
          schoolName: data.schoolName || "",
          schoolState: data.schoolState || "",
          enrollmentProofFilesCount: 0, // Files can't be restored
          businessOperationType: data.businessOperationType || null,
          hasTaxExemption: data.hasTaxExemption ?? null,
          hasTaxExemptFile: false, // Files can't be restored
          wholesaleAgreed: data.wholesaleAgreed || false,
        });
        setCompletedSteps(recalculatedSteps);
        
        // Show toast notification if meaningful progress was restored
        // Only show if user had progressed past the initial steps
        if (data.currentStep && data.currentStep !== "onboarding" && data.currentStep !== "reviews") {
          setTimeout(() => {
            toast("Welcome back!", {
              description: "Your previous progress has been restored.",
              duration: 4000,
            });
          }, 500);
        }
      }
    } catch (e) {
      console.warn("Failed to load form progress from sessionStorage:", e);
    }
  }, []);

  // Save to sessionStorage when form state changes
  useEffect(() => {
    // Don't save if on success step
    if (currentStep === "success") {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    
    try {
      const data = {
        mode,
        currentStep,
        accountType,
        licenseNumber,
        state,
        firstName,
        lastName,
        email,
        // password intentionally not saved for security
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
        schoolName,
        schoolState,
        businessOperationType,
        birthdayMonth,
        birthdayDay,
        socialMediaHandle,
        referralSource,
        completedSteps: Array.from(completedSteps)
        // Note: File objects cannot be serialized to sessionStorage
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn("Failed to save form progress to sessionStorage:", e);
    }
  }, [
    mode, currentStep, accountType, licenseNumber, state, firstName, lastName, email,
    businessName, businessAddress, suiteNumber, country, city, zipCode, wholesaleAgreed,
    hasTaxExemption, preferredName, phoneNumber, phoneCountryCode, salonSize, salonStructure,
    schoolName, schoolState, businessOperationType, birthdayMonth, birthdayDay, socialMediaHandle, referralSource,
    completedSteps
  ]);

  // Main content refs
  const mainContentRef = useRef<HTMLDivElement | null>(null);
  const mainScrollRef = useRef<HTMLElement | null>(null);
  
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
    
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', handleScroll);
      if (scrollHintTimeoutRef.current) {
        clearTimeout(scrollHintTimeoutRef.current);
      }
    };
  }, [mode, currentStep, hasScrolled]);

  // Reset hasScrolled when step changes
  useEffect(() => {
    setHasScrolled(false);
  }, [currentStep]);

  // Safari-compatible viewport height fix
  useEffect(() => {
    const setAppHeight = () => {
      document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
    };
    setAppHeight();
    window.addEventListener('resize', setAppHeight);
    window.addEventListener('orientationchange', setAppHeight);
    return () => {
      window.removeEventListener('resize', setAppHeight);
      window.removeEventListener('orientationchange', setAppHeight);
    };
  }, []);
  const resetForm = () => {
    setCurrentStep("onboarding");
    setAccountType(null);
    setLicenseNumber("");
    setState("");
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setBusinessName("");
    setBusinessAddress("");
    setSuiteNumber("");
    setCountry("United States");
    setCity("");
    setZipCode("");
    setWholesaleAgreed(false);
    setHasTaxExemption(null);
    setPreferredName("");
    setPhoneNumber("");
    setPhoneCountryCode("+1");
    setSalonSize("");
    setSalonStructure("");
    setLicenseFile(null);
    setTaxExemptFile(null);
    setSchoolName("");
    setSchoolState("");
    setEnrollmentProofFiles([]);
    setBusinessOperationType(null);
    setLicenseProofFiles([]);
    setSubscribeOrderUpdates(true);
    setSubscribeMarketing(true);
    setSubscribePromotions(true);
    setShowValidationErrors(false);
    setCompletedSteps(new Set());
  };
  const handleModeChange = (newMode: AuthMode) => {
    // Set transition direction: signin→signup feels like going back, signup→signin feels like going forward
    setTransitionDirection(newMode === "signup" ? "backward" : "forward");
    
    // Save current mode's state before switching
    if (mode === "signup") {
      signupStateRef.current = {
        step: currentStep,
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
        completedSteps
      };
    } else {
      signinStateRef.current = {
        email,
        password
      };
    }
    
    setMode(newMode);
    
    // Restore the other mode's state if it exists
    if (newMode === "signup" && signupStateRef.current) {
      const saved = signupStateRef.current;
      setCurrentStep(saved.step);
      setAccountType(saved.accountType);
      setLicenseNumber(saved.licenseNumber);
      setState(saved.state);
      setFirstName(saved.firstName);
      setLastName(saved.lastName);
      setEmail(saved.email);
      setPassword(saved.password);
      setBusinessName(saved.businessName);
      setBusinessAddress(saved.businessAddress);
      setSuiteNumber(saved.suiteNumber);
      setCountry(saved.country);
      setCity(saved.city);
      setZipCode(saved.zipCode);
      setWholesaleAgreed(saved.wholesaleAgreed);
      setHasTaxExemption(saved.hasTaxExemption);
      setPreferredName(saved.preferredName);
      setPhoneNumber(saved.phoneNumber);
      setPhoneCountryCode(saved.phoneCountryCode);
      setSalonSize(saved.salonSize);
      setSalonStructure(saved.salonStructure);
      setLicenseFile(saved.licenseFile);
      setTaxExemptFile(saved.taxExemptFile);
      setSchoolName(saved.schoolName);
      setSchoolState(saved.schoolState);
      setEnrollmentProofFiles(saved.enrollmentProofFiles);
      setBusinessOperationType(saved.businessOperationType);
      setLicenseProofFiles(saved.licenseProofFiles);
      setCompletedSteps(saved.completedSteps);
    } else if (newMode === "signin" && signinStateRef.current) {
      const saved = signinStateRef.current;
      setEmail(saved.email);
      setPassword(saved.password);
    } else if (newMode === "signup") {
      // First time switching to signup, reset to defaults
      setCurrentStep("onboarding");
    }
    
    // Scroll to top when switching modes
    mainScrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  };
  const goToNextSlide = useCallback(() => {
    setCurrentSlide(prev => (prev + 1) % slides.length);
  }, []);
  const goToPrevSlide = useCallback(() => {
    setCurrentSlide(prev => (prev - 1 + slides.length) % slides.length);
  }, []);
  const handleTouchStart = (e: React.TouchEvent) => {
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
  
  // Step indicator swipe handlers
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
    // Handle onboarding as step 0
    const currentStepNum = currentStep === "onboarding" ? 0 : getCurrentStepNumber();
    const totalSteps = getTotalSteps();
    
    // Swipe left → next step
    if (diff > threshold && currentStepNum < totalSteps) {
      goToStep(currentStepNum + 1);
    }
    // Swipe right → previous step (allow going back to onboarding which is step 0)
    else if (diff < -threshold && currentStepNum >= 1) {
      goToStep(currentStepNum - 1);
    }
    
    stepSwipeStartX.current = null;
    stepSwipeEndX.current = null;
  };
  
  // Modal swipe-down handlers (mobile only)
  const handleModalTouchStart = (e: React.TouchEvent) => {
    // Only enable swipe-down on mobile (< 640px)
    if (window.innerWidth >= 640) return;
    
    // Check if touch started in the top drag zone
    const modalElement = modalRef.current;
    if (!modalElement) return;
    
    const modalRect = modalElement.getBoundingClientRect();
    const touchY = e.touches[0].clientY;
    const relativeY = touchY - modalRect.top;
    
    // Allow drag if started within top 50px (just the drag handle area)
    if (relativeY <= 50) {
      isDragFromTop.current = true;
      modalTouchStartY.current = touchY;
    } else {
      isDragFromTop.current = false;
      modalTouchStartY.current = null;
    }
  };
  
  const handleModalTouchMove = (e: React.TouchEvent) => {
    if (window.innerWidth >= 640 || !isDragFromTop.current || modalTouchStartY.current === null) return;
    const currentY = e.touches[0].clientY;
    const rawDiff = currentY - modalTouchStartY.current;
    // Only allow dragging down, not up
    if (rawDiff > 0) {
      // Add resistance: drag slows down progressively
      // Before threshold: normal drag
      // After threshold: diminishing returns (rubber band effect)
      const threshold = 100;
      let resistedDiff;
      if (rawDiff <= threshold) {
        resistedDiff = rawDiff;
      } else {
        // Apply logarithmic resistance past threshold
        const overflow = rawDiff - threshold;
        resistedDiff = threshold + (overflow * 0.3);
      }
      setModalDragOffset(resistedDiff);
    }
  };
  
  const handleModalTouchEnd = () => {
    if (!isDragFromTop.current || modalTouchStartY.current === null) return;
    // If dragged more than 100px, close the modal
    if (modalDragOffset > 100) {
      handleCloseModal();
    } else if (modalDragOffset > 0) {
      // Snap back with bounce
      setIsBouncingBack(true);
      setModalDragOffset(0);
      setTimeout(() => {
        setIsBouncingBack(false);
      }, 500);
    }
    modalTouchStartY.current = null;
    isDragFromTop.current = false;
  };
  
  // Backdrop touch handler - any touch on backdrop initiates drag
  const handleBackdropTouchStart = (e: React.TouchEvent) => {
    // Only enable swipe-down on mobile (< 640px)
    if (window.innerWidth >= 640) return;
    
    const modalElement = modalRef.current;
    if (!modalElement) return;
    
    const modalRect = modalElement.getBoundingClientRect();
    const touchY = e.touches[0].clientY;
    
    // If touch is above the modal, allow drag
    if (touchY < modalRect.top) {
      isDragFromTop.current = true;
      modalTouchStartY.current = touchY;
    }
  };

  const handleCloseModal = useCallback(() => {
    // Check if there's form progress to save (only in signup mode with an account type selected)
    const hasProgress = 
      mode === "signup" && 
      accountType !== null && (
        firstName.trim() !== "" ||
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
        completedSteps.size > 1
      );
    
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
  }, [navigate, mode, accountType, firstName, lastName, email, phoneNumber, businessName, businessAddress, licenseNumber, schoolName, wholesaleAgreed, hasTaxExemption, businessOperationType, completedSteps, isSavingProgress]);

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
  
  const canContinue = () => {
    if (mode === "signin") {
      return isValidEmail(email) && password.length >= 8;
    }
    switch (currentStep) {
      case "onboarding":
        return true;
      case "account-type":
        return accountType !== null;
      case "contact-basics":
        return firstName.trim() !== "" && lastName.trim() !== "" && isValidEmail(email) && isValidPhoneNumber(phoneNumber);
      case "license":
        if (accountType === "salon") {
          return licenseNumber.trim() !== "" && salonSize !== "" && salonStructure !== "";
        }
        return licenseNumber.trim() !== "";
      case "business-operation":
        return businessOperationType !== null;
      case "business-location":
        return businessName.trim() !== "" && businessAddress.trim() !== "" && country !== "" && city.trim() !== "" && state !== "" && zipCode.trim() !== "";
      case "school-info":
        return schoolName.trim() !== "" && schoolState !== "" && enrollmentProofFiles.length > 0;
      case "wholesale-terms":
        return wholesaleAgreed;
      case "tax-exemption":
        if (hasTaxExemption === true) {
          return taxExemptFile !== null;
        }
        return hasTaxExemption !== null;
      case "contact-info":
        // This step now only has optional fields (birthday, social media, preferences)
        return true;
      case "summary":
        // Summary is a review step, always valid if user reaches it
        return isAllStepsValid();
      default:
        return true;
    }
  };

  // Check if ALL steps in the form are valid (for final submission)
  const isAllStepsValid = () => {
    if (mode === "signin") {
      return isValidEmail(email) && password.length >= 8;
    }

    // Must have account type selected
    if (!accountType) return false;

    // Contact basics validation (required for all flows)
    const contactBasicsValid = firstName.trim() !== "" && lastName.trim() !== "" && isValidEmail(email) && isValidPhoneNumber(phoneNumber);

    // Student flow - 6 steps (account-type, school-info, contact-basics, tax-exemption, wholesale-terms, contact-info)
    if (accountType === "student") {
      const schoolValid = schoolName.trim() !== "" && schoolState !== "" && enrollmentProofFiles.length > 0;
      const wholesaleValid = wholesaleAgreed;
      const taxValid = hasTaxExemption === false || hasTaxExemption === true && taxExemptFile !== null;
      return schoolValid && contactBasicsValid && wholesaleValid && taxValid;
    }

    // Salon flow - 7 steps
    if (accountType === "salon") {
      const licenseValid = licenseNumber.trim() !== "" && salonSize !== "" && salonStructure !== "";
      const businessValid = businessName.trim() !== "" && businessAddress.trim() !== "" && country !== "" && city.trim() !== "" && state !== "" && zipCode.trim() !== "";
      const wholesaleValid = wholesaleAgreed;
      const taxValid = hasTaxExemption === false || hasTaxExemption === true && taxExemptFile !== null;
      return licenseValid && businessValid && contactBasicsValid && wholesaleValid && taxValid;
    }

    // Professional flow - 8 steps
    const licenseValid = licenseNumber.trim() !== "";
    const businessOperationValid = businessOperationType !== null;
    const businessValid = businessName.trim() !== "" && businessAddress.trim() !== "" && country !== "" && city.trim() !== "" && state !== "" && zipCode.trim() !== "";
    const wholesaleValid = wholesaleAgreed;
    const taxValid = hasTaxExemption === false || hasTaxExemption === true && taxExemptFile !== null;
    return licenseValid && businessOperationValid && businessValid && contactBasicsValid && wholesaleValid && taxValid;
  };

  // Get list of incomplete steps for tooltip display
  const getIncompleteSteps = (): {
    step: number;
    name: string;
    missingFields: string[];
  }[] => {
    if (mode !== "signup") return [];
    const incomplete: {
      step: number;
      name: string;
      missingFields: string[];
    }[] = [];

    // Step 1: Account Type - check if selected
    if (!accountType) {
      incomplete.push({
        step: 1,
        name: "Account type",
        missingFields: ["Select account type"]
      });
      // Can't determine other steps without account type, return early
      return incomplete;
    }

    if (accountType === "student") {
      // Student flow: account-type, school-info, contact-basics, tax-exemption, wholesale-terms, contact-info
      // Step 2: School Info
      const schoolMissing: string[] = [];
      if (schoolName.trim() === "") schoolMissing.push("School name");
      if (schoolState === "") schoolMissing.push("State/province");
      if (enrollmentProofFiles.length === 0) schoolMissing.push("Enrollment proof");
      if (schoolMissing.length > 0) {
        incomplete.push({
          step: 2,
          name: "School information",
          missingFields: schoolMissing
        });
      }
      // Step 3: Contact Basics
      const studentContactBasicsMissing: string[] = [];
      if (firstName.trim() === "") studentContactBasicsMissing.push("First name");
      if (lastName.trim() === "") studentContactBasicsMissing.push("Last name");
      if (!isValidEmail(email)) studentContactBasicsMissing.push("Email");
      if (!isValidPhoneNumber(phoneNumber)) studentContactBasicsMissing.push("Phone number");
      if (studentContactBasicsMissing.length > 0) {
        incomplete.push({
          step: 3,
          name: "Contact information",
          missingFields: studentContactBasicsMissing
        });
      }
      // Step 4: Tax Exemption
      const studentTaxMissing: string[] = [];
      if (hasTaxExemption === null) studentTaxMissing.push("Exemption status");
      else if (hasTaxExemption === true && !taxExemptFile) studentTaxMissing.push("Tax document");
      if (studentTaxMissing.length > 0) {
        incomplete.push({
          step: 4,
          name: "Tax exemption",
          missingFields: studentTaxMissing
        });
      }
      // Step 5: Wholesale Terms
      if (!wholesaleAgreed) {
        incomplete.push({
          step: 5,
          name: "Wholesale terms",
          missingFields: ["Terms agreement"]
        });
      }
      // Step 6: Preferences and Details (all optional)
      return incomplete;
    }
    if (accountType === "salon") {
      // Salon flow: account-type, business-location, contact-basics, license, tax-exemption, wholesale-terms, contact-info
      // Step 2: Business Location
      const locationMissing: string[] = [];
      if (businessName.trim() === "") locationMissing.push("Business name");
      if (businessAddress.trim() === "") locationMissing.push("Address");
      if (country === "") locationMissing.push("Country");
      if (city.trim() === "") locationMissing.push("City");
      if (state === "") locationMissing.push("State/province");
      if (zipCode.trim() === "") locationMissing.push("ZIP code");
      if (locationMissing.length > 0) {
        incomplete.push({
          step: 2,
          name: "Business location",
          missingFields: locationMissing
        });
      }
      // Step 3: Contact Basics
      const salonContactBasicsMissing: string[] = [];
      if (firstName.trim() === "") salonContactBasicsMissing.push("First name");
      if (lastName.trim() === "") salonContactBasicsMissing.push("Last name");
      if (!isValidEmail(email)) salonContactBasicsMissing.push("Email");
      if (!isValidPhoneNumber(phoneNumber)) salonContactBasicsMissing.push("Phone number");
      if (salonContactBasicsMissing.length > 0) {
        incomplete.push({
          step: 3,
          name: "Contact information",
          missingFields: salonContactBasicsMissing
        });
      }
      // Step 4: License
      const licenseMissing: string[] = [];
      if (licenseNumber.trim() === "") licenseMissing.push("License number");
      if (salonSize === "") licenseMissing.push("Salon size");
      if (salonStructure === "") licenseMissing.push("Salon structure");
      if (licenseMissing.length > 0) {
        incomplete.push({
          step: 4,
          name: "License verification",
          missingFields: licenseMissing
        });
      }
      // Step 5: Tax Exemption
      const taxMissing: string[] = [];
      if (hasTaxExemption === null) taxMissing.push("Exemption status");
      else if (hasTaxExemption === true && !taxExemptFile) taxMissing.push("Tax document");
      if (taxMissing.length > 0) {
        incomplete.push({
          step: 5,
          name: "Tax exemption",
          missingFields: taxMissing
        });
      }
      // Step 6: Wholesale Terms
      if (!wholesaleAgreed) {
        incomplete.push({
          step: 6,
          name: "Wholesale terms",
          missingFields: ["Terms agreement"]
        });
      }
      // Step 7: Preferences and Details (all optional)
      return incomplete;
    }

    // Professional flow: account-type, business-operation, contact-basics, license, business-location, tax-exemption, wholesale-terms, contact-info
    // Step 2: Business Operation
    if (businessOperationType === null) {
      incomplete.push({
        step: 2,
        name: "Business operation",
        missingFields: ["Operation type"]
      });
    }
    // Step 3: Contact Basics
    const proContactBasicsMissing: string[] = [];
    if (firstName.trim() === "") proContactBasicsMissing.push("First name");
    if (lastName.trim() === "") proContactBasicsMissing.push("Last name");
    if (!isValidEmail(email)) proContactBasicsMissing.push("Email");
    if (!isValidPhoneNumber(phoneNumber)) proContactBasicsMissing.push("Phone number");
    if (proContactBasicsMissing.length > 0) {
      incomplete.push({
        step: 3,
        name: "Contact information",
        missingFields: proContactBasicsMissing
      });
    }
    // Step 4: Business Location
    const proLocationMissing: string[] = [];
    if (businessName.trim() === "") proLocationMissing.push("Business name");
    if (businessAddress.trim() === "") proLocationMissing.push("Address");
    if (country === "") proLocationMissing.push("Country");
    if (city.trim() === "") proLocationMissing.push("City");
    if (state === "") proLocationMissing.push("State/province");
    if (zipCode.trim() === "") proLocationMissing.push("ZIP code");
    if (proLocationMissing.length > 0) {
      incomplete.push({
        step: 4,
        name: "Business location",
        missingFields: proLocationMissing
      });
    }
    // Step 5: License
    if (licenseNumber.trim() === "") {
      incomplete.push({
        step: 5,
        name: "License verification",
        missingFields: ["License number"]
      });
    }
    // Step 6: Tax Exemption
    const proTaxMissing: string[] = [];
    if (hasTaxExemption === null) proTaxMissing.push("Exemption status");
    else if (hasTaxExemption === true && !taxExemptFile) proTaxMissing.push("Tax document");
    if (proTaxMissing.length > 0) {
      incomplete.push({
        step: 6,
        name: "Tax exemption",
        missingFields: proTaxMissing
      });
    }
    // Step 7: Wholesale Terms
    if (!wholesaleAgreed) {
      incomplete.push({
        step: 7,
        name: "Wholesale terms",
        missingFields: ["Terms agreement"]
      });
    }
    // Step 8: Preferences and Details (all optional)
    return incomplete;
  };

  // Check if form is ready to submit (on final step with all fields complete)
  const isFormReadyToSubmit = mode === "signup" && currentStep === "summary" && isAllStepsValid();

  // Calculate overall form progress as percentage
  const getFormProgress = () => {
    if (mode === "signin") {
      let filled = 0;
      if (email.trim() !== "") filled++;
      if (password.length >= 8) filled++;
      return filled / 2 * 100;
    }

    // For signup, calculate based on account type - must match isAllStepsValid logic exactly
    if (accountType === "student") {
      // Student: accountType (1), school-info (3), contact-basics (4), tax (1-2), wholesale (1)
      let filled = 0;
      let total = 10; // Added email field
      if (accountType) filled++;
      if (schoolName.trim() !== "") filled++;
      if (schoolState !== "") filled++;
      if (enrollmentProofFiles.length > 0) filled++;
      if (firstName.trim() !== "") filled++;
      if (lastName.trim() !== "") filled++;
      if (email.trim() !== "") filled++;
      if (phoneNumber.trim() !== "" && phoneNumber.replace(/\D/g, "").length >= 10) filled++;
      if (hasTaxExemption !== null) filled++;
      if (hasTaxExemption === true) {
        total = 11;
        if (taxExemptFile) filled++;
      }
      if (wholesaleAgreed) filled++;
      return filled / total * 100;
    }
    
    if (accountType === "salon") {
      // Salon: accountType (1), business location (6), contact-basics (4), license (3), tax (1-2), wholesale (1)
      let filled = 0;
      let total = 16; // Added email field
      if (accountType) filled++;
      if (businessName.trim() !== "") filled++;
      if (businessAddress.trim() !== "") filled++;
      if (country !== "") filled++;
      if (city.trim() !== "") filled++;
      if (state !== "") filled++;
      if (zipCode.trim() !== "") filled++;
      if (firstName.trim() !== "") filled++;
      if (lastName.trim() !== "") filled++;
      if (email.trim() !== "") filled++;
      if (phoneNumber.trim() !== "" && phoneNumber.replace(/\D/g, "").length >= 10) filled++;
      if (licenseNumber.trim() !== "") filled++;
      if (salonSize !== "") filled++;
      if (salonStructure !== "") filled++;
      if (hasTaxExemption !== null) filled++;
      if (hasTaxExemption === true) {
        total = 17;
        if (taxExemptFile) filled++;
      }
      if (wholesaleAgreed) filled++;
      return filled / total * 100;
    }

    // Professional (stylist): accountType (1), businessOperation (1), contact-basics (4),
    // license (1), business location (6), tax (1-2), wholesale (1)
    let filled = 0;
    let total = 15; // Added email field
    if (accountType) filled++;
    if (businessOperationType !== null) filled++;
    if (firstName.trim() !== "") filled++;
    if (lastName.trim() !== "") filled++;
    if (email.trim() !== "") filled++;
    if (phoneNumber.trim() !== "" && phoneNumber.replace(/\D/g, "").length >= 10) filled++;
    if (licenseNumber.trim() !== "") filled++;
    if (businessName.trim() !== "") filled++;
    if (businessAddress.trim() !== "") filled++;
    if (country !== "") filled++;
    if (city.trim() !== "") filled++;
    if (state !== "") filled++;
    if (zipCode.trim() !== "") filled++;
    if (hasTaxExemption !== null) filled++;
    if (hasTaxExemption === true) {
      total = 16;
      if (taxExemptFile) filled++;
    }
    if (wholesaleAgreed) filled++;
    return filled / total * 100;
  };
  
  // Check if user has meaningful form progress
  const hasFormProgress = () => {
    // Check if any form fields beyond account type have been filled
    return (
      firstName.trim() !== "" ||
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
      completedSteps.size > 1
    );
  };

  // Execute account type selection and auto-advance
  const executeAccountTypeSelect = (type: string | null, previousType: string | null) => {
    setAccountType(type);
    if (type) {
      // Auto-advance after grace period - navigate directly to next step
      setTimeout(() => {
        // Update display total steps based on selected type BEFORE transitioning
        const newTotal = type === "student" ? 7 : type === "professional" ? 9 : 8;
        setDisplayTotalSteps(newTotal);
        
        // When switching to a different account type, reset form fields and completed steps
        if (previousType !== type && previousType !== null) {
          // Clear all form progress for the new flow
          setLicenseNumber("");
          setState("");
          setBusinessName("");
          setBusinessAddress("");
          setSuiteNumber("");
          setCity("");
          setZipCode("");
          setCountry("");
          setSalonSize("");
          setSalonStructure("");
          setSchoolName("");
          setSchoolState("");
          setEnrollmentProofFiles([]);
          setBusinessOperationType(null);
          setHasTaxExemption(null);
          setTaxExemptFile(null);
          setWholesaleAgreed(false);
          setLicenseFile(null);
          setLicenseProofFiles([]);
          // Keep personal info (firstName, lastName, email, phone) as it's reusable
          // Start fresh - only mark step 1 as completed
          setCompletedSteps(new Set([1]));
        } else if (previousType !== type) {
          // First time selecting, just mark step 1 as completed
          setCompletedSteps(new Set([1]));
        } else {
          // Same type selected again, just mark step 1 as completed
          setCompletedSteps(prev => new Set([...prev, 1]));
        }
        
        // Calculate next step based on selected type
        const nextStep: Step = type === "student" ? "school-info" : type === "professional" ? "business-operation" : "business-location";
        setTransitionDirection("forward");
        setIsTransitioning(true);
        setTimeout(() => {
          setCurrentStep(nextStep);
          setIsTransitioning(false);
        }, 150);
      }, 800);
    }
  };

  // Handle account type selection with auto-advance
  const handleAccountTypeSelect = (type: string | null) => {
    const previousType = accountType;

    // If switching to a different account type and there's existing progress, show confirmation overlay
    if (type && previousType && previousType !== type && hasFormProgress()) {
      setPendingAccountType(type);
      setShowAccountTypeConfirm(true);
      return;
    }

    // No existing progress or same type selected, proceed directly
    executeAccountTypeSelect(type, previousType);
  };

  // Handle business operation type selection with auto-advance
  const handleBusinessOperationTypeSelect = (type: "commission" | "independent") => {
    setBusinessOperationType(type);
    // Auto-advance after grace period
    setTimeout(() => {
      setCompletedSteps(prev => new Set([...prev, 2]));
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

    if (!schema) {
      // No zod schema for this step, use existing canContinue logic
      return canContinue();
    }

    const result = schema.safeParse(dataToValidate);
    
    if (!result.success) {
      // Convert zod errors to field errors format for scroll-to-error
      const fieldErrors: Record<string, { message: string }> = {};
      result.error.errors.forEach((err) => {
        const fieldName = err.path[0]?.toString() || "";
        if (!fieldErrors[fieldName]) {
          fieldErrors[fieldName] = { message: err.message };
        }
      });
      
      // Scroll to first error
      scrollToFirstError(fieldErrors as any, { current: mainScrollRef.current } as React.RefObject<HTMLElement>);
      
      return false;
    }

    return true;
  }, [
    currentStep, accountType, businessOperationType, firstName, lastName, preferredName, email, phoneNumber, phoneCountryCode,
    businessName, businessAddress, suiteNumber, country, city, state, zipCode,
    licenseNumber, salonSize, salonStructure, licenseFile, licenseProofFiles,
    schoolName, schoolState, enrollmentProofFiles, hasTaxExemption, taxExemptFile, wholesaleAgreed
  ]);

  const handleNext = () => {
    // For steps with zod validation, use the new validation
    const stepsWithZodValidation = ["account-type", "business-operation", "contact-basics", "business-location", "license", "school-info", "tax-exemption", "wholesale-terms"];
    
    if (mode === "signup" && stepsWithZodValidation.includes(currentStep)) {
      if (!validateCurrentStep()) {
        setShowValidationErrors(true);
        toast.error("Please complete all required fields");
        return;
      }
    } else if (!canContinue()) {
      setShowValidationErrors(true);
      toast.error("Please complete all required fields");
      return;
    }
    
    setShowValidationErrors(false);
    if (mode === "signin") {
      toast.success("Signed in successfully!");
      navigate("/");
      return;
    }

    // Mark current step as completed
    const currentStepNum = getCurrentStepNumber();
    setCompletedSteps(prev => new Set([...prev, currentStepNum]));

    // Calculate next step for skeleton
    let targetStep: Step = currentStep;
    switch (currentStep) {
      case "onboarding":
        targetStep = "account-type";
        break;
      case "account-type":
        if (accountType === "student") targetStep = "school-info";else if (accountType === "professional") targetStep = "business-operation";else targetStep = "business-location";
        break;
      case "business-operation":
        targetStep = "contact-basics";
        break;
      case "school-info":
        targetStep = "contact-basics";
        break;
      case "business-location":
        targetStep = accountType === "professional" ? "license" : "contact-basics";
        break;
      case "contact-basics":
        targetStep = accountType === "student" ? "tax-exemption" : accountType === "professional" ? "business-location" : "license";
        break;
      case "license":
        targetStep = accountType === "professional" ? "tax-exemption" : "tax-exemption";
        break;
      case "tax-exemption":
        targetStep = "wholesale-terms";
        break;
      case "wholesale-terms":
        targetStep = "contact-info";
        break;
      case "contact-info":
        targetStep = "summary";
        break;
      case "summary":
        targetStep = "success";
        break;
    }
    if (currentStep === "summary") {
      // Don't use transition skeleton for summary->success, just show submitting state
      setIsSubmitting(true);
      setTimeout(() => {
        setIsSubmitting(false);
        setCurrentStep("success");
        toast.success("Submitted. Our team will review and notify you within 24 hours.");
        mainScrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
        // Auto-scroll to offer section after toast ends (~4s)
        setTimeout(() => {
          const offerSection = document.getElementById('success-offer-section');
          offerSection?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 4200);
      }, 1500);
    } else {
      setNextStep(targetStep);
      setTransitionDirection("forward");
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentStep(targetStep);
        mainScrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
        setIsTransitioning(false);
        setNextStep(null);
      }, 150);
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
        if (accountType === "student") targetStep = "school-info";else if (accountType === "professional") targetStep = "business-operation";else targetStep = "business-location";
        break;
      case "license":
        targetStep = accountType === "professional" ? "business-location" : "contact-basics";
        break;
      case "tax-exemption":
        if (accountType === "student") targetStep = "contact-basics";else if (accountType === "professional") targetStep = "license";else targetStep = "license";
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
      mainScrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
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
    const currentNum = currentStep === "onboarding" ? 0 : currentStep === "success" ? displayTotalSteps + 1 : getCurrentStepNumber();
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
  const slide = slides[currentSlide];
  const showStepIndicator = mode === "signup";
  return <div
      className="fixed inset-0 flex items-end sm:items-center justify-center p-0 pt-12 sm:p-5 lg:p-10 overflow-hidden"
      style={{
        height: "var(--app-height, 100vh)"
      }}
    >
      {/* Blurred darkened backdrop - also acts as drag area above modal */}
      <div 
        className={cn(
          "fixed inset-0 backdrop-blur-md cursor-pointer transition-all duration-300",
          isClosing && "opacity-0 backdrop-blur-0"
        )}
        style={isClosing ? undefined : {
          backgroundColor: `hsl(var(--foreground) / ${Math.max(0.6 - modalDragOffset * 0.003, 0.2)})`
        }}
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
        style={isClosing ? undefined : {
          transform: modalDragOffset > 0 
            ? `translateY(${modalDragOffset}px) scale(${1 - Math.min(modalDragOffset * 0.0003, 0.03)})` 
            : undefined,
          transition: modalDragOffset > 0 
            ? 'none' 
            : isBouncingBack 
              ? 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease-out' 
              : undefined,
          opacity: modalDragOffset > 0 ? Math.max(1 - modalDragOffset * 0.002, 0.85) : undefined
        }}
      >
        {/* Mobile background gradient - fades to light gray at bottom */}
        <div className="lg:hidden absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-muted/30 via-40% to-muted" />

        {/* Account type change confirmation overlay */}
        {showAccountTypeConfirm && (
          <div className="absolute inset-0 z-[80]">
            <div className="absolute inset-0 bg-black/50 animate-fade-in" />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="w-full max-w-sm bg-white rounded-2xl p-4 border border-border/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)] animate-scale-in">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">Change account type?</p>
                  <p className="text-sm text-muted-foreground">Selecting a new account type will clear your form progress. Do you wish to proceed?</p>
                </div>
                <div className="flex gap-2 w-full mt-3">
                  <button
                    onClick={() => {
                      setShowAccountTypeConfirm(false);
                      setPendingAccountType(null);
                    }}
                    className="flex-1 px-4 py-2 text-sm font-medium rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
                  >
                    No, keep current
                  </button>
                  <button
                    onClick={() => {
                      const nextType = pendingAccountType;
                      setShowAccountTypeConfirm(false);
                      setPendingAccountType(null);
                      if (nextType) executeAccountTypeSelect(nextType, accountType);
                    }}
                    className="flex-1 px-4 py-2 text-sm font-medium rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"
                  >
                    Yes, change
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Mobile Saving Progress Overlay */}
        {isSavingProgress && (
          <div className={cn(
            "sm:hidden absolute inset-0 z-[90] flex justify-center bg-background/80 backdrop-blur-sm animate-fade-in",
            footerVisible ? "items-end pb-[130px]" : "items-center"
          )}>
            <div className="flex flex-col items-center gap-3">
              {/* Animated circle */}
              <div className="relative w-16 h-16">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                  {/* Background circle */}
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    fill="none"
                    stroke="hsl(var(--muted-foreground) / 0.2)"
                    strokeWidth="3"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    fill="none"
                    stroke={saveProgressText === "saved" ? "rgb(16 185 129)" : "hsl(var(--muted-foreground))"}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="175.9"
                    strokeDashoffset="175.9"
                    className={cn(
                      saveProgressText === "saving" && "animate-save-progress-large",
                    )}
                    style={{
                      strokeDashoffset: saveProgressText === "saved" ? 0 : undefined,
                      transition: saveProgressText === "saved" ? "stroke 0.3s ease-out" : undefined,
                    }}
                  />
                </svg>
                {/* Center icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {saveProgressText === "saved" ? (
                    <Check className="w-6 h-6 text-emerald-600 animate-scale-in" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-muted-foreground/20" />
                  )}
                </div>
              </div>
              {/* Text */}
              <span className={cn(
                "text-sm font-medium transition-colors duration-300",
                saveProgressText === "saving" ? "text-muted-foreground" : "text-emerald-600"
              )}>
                {saveProgressText === "saving" ? "Saving progress..." : "Saved!"}
              </span>
            </div>
          </div>
        )}
        
        {/* Drag Handle - Mobile Only */}
        <div 
          className={cn(
            "sm:hidden absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full z-10 transition-all duration-150",
            modalDragOffset >= 100 
              ? "bg-destructive/60 w-12 scale-110" 
              : modalDragOffset > 50 
                ? "bg-muted-foreground/50 w-11" 
                : "bg-muted-foreground/30"
          )}
        />

        {/* Left Panel - Hero/Branding */}
        <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} className="relative hidden lg:flex flex-col w-full lg:w-1/2 h-[200px] sm:h-[250px] lg:h-auto lg:min-h-0 flex-shrink-0 bg-foreground overflow-hidden m-2.5 sm:m-5 mt-0 sm:mt-0 lg:mt-5 rounded-form sm:rounded-[20px] mr-0 sm:mr-0 lg:mr-0">
        {/* Sliding Background + Content Container */}
        <div key={mode === "signin" ? "signin-panel" : currentSlide} className="absolute inset-0" style={{
          animation: 'slideIn 0.5s ease-out forwards'
        }}>
          {/* Hero image background */}
          <img src={salonHero} alt="Professional salon interior" className="absolute inset-0 w-full h-full object-cover" />
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-foreground via-foreground/70 to-foreground/40" />
          
          {/* Noise texture */}
          <div className="absolute inset-0 opacity-[0.1]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
          }} />
          
          {/* Content - Different for sign-in vs sign-up */}
          <div className={cn("absolute inset-0 flex flex-col justify-end p-5 md:p-5 lg:p-10 pb-[70px] lg:pb-[80px]", mode === "signup" ? "xl:pb-[180px]" : "xl:pb-[80px]")}>
            {mode === "signin" ? (/* Sign-in content - Static, welcoming for returning users */
            <div className="flex flex-col gap-0 pb-0">
                <div className="inline-flex items-center gap-[5px] md:gap-2.5 px-2.5 md:px-[15px] py-[5px] rounded-full bg-background/10 backdrop-blur-sm border border-background/10 mb-[15px] md:mb-5 lg:mb-[25px] w-fit pl-[5px] md:pl-[10px]">
                  <BadgeCheck className="w-2.5 md:w-[15px] h-2.5 md:h-[15px] text-background/80" />
                  <span className="text-[10px] md:text-xs font-medium text-background/80 uppercase tracking-widest">
                    {fontsLoaded ? "Exclusively professional" : <TextSkeleton width="120px" height="0.9em" variant="light" />}
                  </span>
                </div>

                <div className="space-y-0 mb-2.5 md:mb-[15px] lg:mb-5">
                  <h2 className="font-termina font-medium uppercase text-[clamp(1.25rem,4vw,2rem)] md:text-[clamp(1.5rem,3.5vw,2.5rem)] lg:text-[clamp(1.75rem,3vw,2.75rem)] xl:text-[clamp(2.5rem,4vw,4rem)] text-background/50 leading-[1]">
                    {fontsLoaded ? <span className="animate-fade-in-text">Great to</span> : <TextSkeleton width="50%" height="1em" variant="light" />}
                  </h2>
                  <h1 className="font-termina font-medium uppercase text-[clamp(1.25rem,4vw,2rem)] md:text-[clamp(1.5rem,3.5vw,2.5rem)] lg:text-[clamp(1.75rem,3vw,2.75rem)] xl:text-[clamp(2.5rem,4vw,4rem)] text-background leading-[1]">
                    {fontsLoaded ? <span className="animate-fade-in-text">See You Again</span> : <TextSkeleton width="80%" height="1em" variant="light" />}
                  </h1>
                </div>

                <p className="text-xs md:text-sm lg:text-base text-background/50 md:whitespace-nowrap">
                  {fontsLoaded ? <span className="animate-fade-in-text">Your pro account is waiting for you</span> : <TextSkeleton width="70%" height="0.9em" variant="light" />}
                </p>
                {/* Testimonial Carousel */}
                <div className="hidden xl:block">
                  <TestimonialCarousel />
                </div>
              </div>) : (/* Sign-up content - Carousel slides */
            <div className="flex flex-col gap-0 pb-[20px]">
                {/* Carousel content - keyed for animations */}
                <div key={currentSlide}>
                  {/* Eyebrow */}
                  <div style={{
                  animationDelay: '100ms',
                  animationFillMode: 'forwards'
                }} className="inline-flex items-center gap-[5px] md:gap-2.5 px-2.5 md:px-[15px] py-[5px] rounded-full bg-background/10 backdrop-blur-sm border border-background/10 mb-[15px] md:mb-5 lg:mb-[25px] w-fit opacity-0 animate-fade-in pl-[5px] md:pl-[10px]">
                    <BadgeCheck className="w-2.5 md:w-[15px] h-2.5 md:h-[15px] text-background/80" />
                    <span className="text-[10px] md:text-xs font-medium text-background/80 uppercase tracking-widest">
                      {fontsLoaded ? slide.eyebrow : <TextSkeleton width="100px" height="0.9em" variant="light" />}
                    </span>
                  </div>

                  {/* Large Typography */}
                  <div className="space-y-0 mb-2.5 md:mb-[15px] lg:mb-5">
                    <h2 className="font-termina font-medium uppercase text-[clamp(1.25rem,4vw,2rem)] md:text-[clamp(1.5rem,3.5vw,2.5rem)] lg:text-[clamp(1.75rem,3vw,2.75rem)] xl:text-[clamp(2.5rem,4vw,4rem)] text-background/50 leading-[1] opacity-0 animate-fade-in" style={{
                    animationDelay: '200ms',
                    animationFillMode: 'forwards'
                  }}>
                      {fontsLoaded ? slide.title : <TextSkeleton width="60%" height="1em" variant="light" />}
                    </h2>
                    <h1 className="font-termina font-medium uppercase text-[clamp(1.25rem,4vw,2rem)] md:text-[clamp(1.5rem,3.5vw,2.5rem)] lg:text-[clamp(1.75rem,3vw,2.75rem)] xl:text-[clamp(2.5rem,4vw,4rem)] text-background leading-[1] opacity-0 animate-fade-in" style={{
                    animationDelay: '300ms',
                    animationFillMode: 'forwards'
                  }}>
                      {fontsLoaded ? slide.highlight : <TextSkeleton width="75%" height="1em" variant="light" />}
                    </h1>
                  </div>

                  <p className="text-xs md:text-sm lg:text-base text-background/50 md:whitespace-nowrap mb-0 opacity-0 animate-fade-in" style={{
                  animationDelay: '400ms',
                  animationFillMode: 'forwards'
                }}>
                    {fontsLoaded ? slide.description : <TextSkeleton width="85%" height="0.9em" variant="light" />}
                  </p>
                </div>
              </div>)}
          </div>
        </div>

        {/* Feature Pills - Fixed (do not re-animate on carousel) */}
        {mode === "signup" && (
          <div className="absolute left-5 md:left-5 lg:left-10 right-5 md:right-5 lg:right-10 bottom-[90px] lg:bottom-[110px] hidden xl:flex flex-wrap gap-2.5 z-10 pointer-events-none">
            {features.map((feature, i) => (
              <div
                key={i}
                className="pointer-events-auto animate-haptic-pop"
                style={{ animationDelay: `${600 + i * 100}ms`, animationFillMode: 'both' }}
              >
                <MagneticFeatureBox icon={feature.icon} label={feature.label} desc={feature.desc} />
              </div>
            ))}
          </div>
        )}

        {/* Circular Progress Indicator - Fixed - Only show on sign-up */}
        {mode === "signup" && <div className="absolute top-5 md:top-5 lg:top-10 right-5 md:right-5 lg:right-10 z-10">
            <CircularProgress progress={getFormProgress()} />
          </div>}

        {/* Fixed Logo */}
        <div className="absolute top-5 md:top-5 lg:top-10 left-5 md:left-5 lg:left-10 z-10">
          <img src={logoSvg} alt="Drop Dead" className="h-4 md:h-5 w-auto" />
        </div>

        {/* Fixed Bottom Navigation - Only show slide controls on sign-up */}
        <div className="absolute bottom-5 md:bottom-5 lg:bottom-10 left-5 md:left-5 lg:left-10 right-5 md:right-5 lg:right-10 z-10 flex items-center justify-between">
          {/* Slide Indicators - Only on sign-up */}
          {mode === "signup" ? <div className="flex gap-2.5">
              {slides.map((_, i) => <button key={i} onClick={() => setCurrentSlide(i)} className={cn("h-[5px] rounded-full transition-all duration-300", i === currentSlide ? "w-10 bg-background" : "w-[5px] bg-background/20")} />)}
            </div> : <div />}

          {/* Trust Badge - visible on all sizes */}
          <RotatingStylistAvatars />

          {/* Nav Arrows - Desktop - Only on sign-up */}
          {mode === "signup" ? <div className="hidden lg:flex gap-2.5">
              <button onClick={goToPrevSlide} className="p-2.5 rounded-full bg-background/5 border border-background/10 hover:bg-background/10 transition-all" aria-label="Previous slide">
                <ChevronLeft className="w-[15px] h-[15px] text-background/70" />
              </button>
              <button onClick={goToNextSlide} className="p-2.5 rounded-full bg-background/5 border border-background/10 hover:bg-background/10 transition-all" aria-label="Next slide">
                <ChevronRight className="w-[15px] h-[15px] text-background/70" />
              </button>
            </div> : <div />}
        </div>

        {/* Progress Bar - Mobile/Tablet only - Only on sign-up */}
        {mode === "signup" && <div className="absolute bottom-0 left-0 right-0 h-1 bg-background/10 lg:hidden z-10">
            <div className="h-full bg-background/60 transition-all duration-500" style={{
            width: `${(currentSlide + 1) / slides.length * 100}%`
          }} />
          </div>}
      </div>

      {/* Right Panel - Form */}
      <div ref={mainContentRef} className="flex-1 flex flex-col bg-background lg:rounded-r-[20px] overflow-y-auto overflow-x-hidden">
        {/* Header - fixed height to keep toggle position consistent */}
        <header className="relative flex items-center justify-between px-3 py-2.5 sm:p-5 lg:p-[25px] pt-[max(1.25rem,env(safe-area-inset-top))] sm:pt-[max(1.25rem,env(safe-area-inset-top))] lg:pt-[max(1.5625rem,env(safe-area-inset-top))] pl-[max(0.75rem,env(safe-area-inset-left))] sm:pl-[max(1.25rem,env(safe-area-inset-left))] lg:pl-[max(1.5625rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:pr-[max(1.25rem,env(safe-area-inset-right))] lg:pr-[max(1.5625rem,env(safe-area-inset-right))] min-h-[60px] sm:min-h-[70px] lg:min-h-[80px]">
          {/* Left side - Auth Toggle + Step Indicator */}
          <div className="flex items-center flex-1 sm:flex-none justify-between sm:justify-start gap-[10px] min-h-[50px]">
            {/* Auth Toggle */}
            <div className="inline-flex bg-muted backdrop-blur-sm rounded-full p-[5px] border border-border/50 relative flex-shrink-0">
              {/* Sliding pill indicator */}
              <div className="absolute top-[5px] bottom-[5px] rounded-full bg-foreground shadow-lg shadow-foreground/10 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]" style={{
                left: mode === "signup" ? "5px" : "50%",
                width: "calc(50% - 5px)"
              }} />
              <button onClick={() => handleModeChange("signup")} className={cn("relative z-10 px-[15px] sm:px-[20px] py-2 sm:py-[10px] rounded-full text-sm font-medium transition-colors duration-300", mode === "signup" ? "text-background" : "text-muted-foreground hover:text-foreground")}>
                Apply
              </button>
              <button onClick={() => handleModeChange("signin")} className={cn("relative z-10 px-[15px] sm:px-[20px] py-2 sm:py-[10px] rounded-full text-sm font-medium transition-colors duration-300", mode === "signin" ? "text-background" : "text-muted-foreground hover:text-foreground")}>
                Login
              </button>
            </div>
            
            {/* Step Indicator */}
            {showStepIndicator && <div 
              className="flex items-center justify-center h-[50px] flex-1 touch-pan-y"
              onTouchStart={handleStepSwipeStart}
              onTouchMove={handleStepSwipeMove}
              onTouchEnd={handleStepSwipeEnd}
            >
              <div className="relative flex items-center justify-center overflow-visible w-[160px] sm:w-[280px] lg:w-[320px]" style={{
              height: '50px',
              maskImage: 'linear-gradient(to right, transparent 0%, white 15%, white 85%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, white 15%, white 85%, transparent 100%)'
            }}>
                {/* Sliding track that moves based on current step */}
                <div className="flex items-center transition-transform duration-500 ease-out" style={{
                // Adjust transform to account for intro step (step 0) and success step at end
                // Total visual steps = 1 (intro) + displayTotalSteps + 1 (success)
                transform: `translateX(${((displayTotalSteps + 2) / 2 - (currentStep === "onboarding" ? 0 : currentStep === "success" ? displayTotalSteps + 1 : getCurrentStepNumber()) - 0.5) * 44}px)`
              }}>
                  {/* Intro/Onboarding step with icon */}
                  <button 
                    onClick={() => currentStep !== "onboarding" && goToStep(0)}
                    aria-label="Go to introduction step"
                    className="flex items-center cursor-pointer hover:opacity-100 transition-opacity"
                    style={{
                      opacity: currentStep === "onboarding" ? 1 : 0.6,
                      transform: `scale(${currentStep === "onboarding" ? 1 : 0.85})`,
                      transition: 'all 0.5s ease-out'
                    }}
                  >
                    <div className={cn(
                      "relative flex items-center justify-center transition-all duration-500",
                      currentStep === "onboarding" ? "w-[20px] h-[20px]" : "w-[20px] h-[20px]"
                    )}>
                      {/* Active step glow ring */}
                      {currentStep === "onboarding" && (
                        <>
                          <div className="absolute inset-[3px] rounded-full border border-foreground/30 animate-[ripple_2s_ease-out_infinite]" />
                          <div className="absolute inset-[3px] rounded-full border border-foreground/20 animate-[ripple_2s_ease-out_infinite_0.5s]" />
                        </>
                      )}
                      <div className={cn(
                        "rounded-full transition-all duration-500 flex items-center justify-center",
                        currentStep === "onboarding" 
                          ? "w-[6px] h-[6px] bg-foreground" 
                          : "w-[20px] h-[20px] bg-[hsl(142_71%_75%)] dark:bg-[hsl(142_71%_30%)] text-[hsl(142_71%_25%)] dark:text-[hsl(142_71%_75%)]"
                      )}>
                        {currentStep !== "onboarding" && (
                          <Check className="w-[10px] h-[10px]" strokeWidth={3} />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Connecting line after intro */}
                  <div className="relative h-px w-[12px] bg-border/60 rounded-full overflow-hidden mx-[6px]">
                    <div
                      className={cn(
                        "absolute inset-0 bg-foreground/50 rounded-full origin-left transition-transform duration-500 ease-out",
                        currentStep !== "onboarding" ? "scale-x-100" : "scale-x-0"
                      )}
                    />
                  </div>

                  {/* Regular numbered steps */}
                  {Array.from({
                  length: displayTotalSteps
                }, (_, i) => {
                  const stepNum = i + 1;
                  const currentStepNum = currentStep === "onboarding" ? 0 : getCurrentStepNumber();
                  const distance = Math.abs(stepNum - currentStepNum);
                  const isActive = stepNum === currentStepNum;
                  const isPassed = currentStepNum > stepNum;
                  const isCompleted = completedSteps.has(stepNum);
                  const isPassedButIncomplete = isPassed && !isCompleted;
                  const isLastStep = i === displayTotalSteps - 1;

                  // Calculate opacity based on distance from center
                  const opacity = isActive ? 1 : distance === 1 ? 0.6 : distance === 2 ? 0.3 : 0.15;
                  // Calculate scale based on distance
                  const scale = isActive ? 1 : distance === 1 ? 0.85 : 0.7;
                  
                  // Determine background color based on state
                  const getStepBgClass = () => {
                    if (isActive) return "bg-foreground text-background";
                    if (isCompleted) return "bg-[hsl(142_71%_75%)] dark:bg-[hsl(142_71%_30%)] text-[hsl(142_71%_25%)] dark:text-[hsl(142_71%_75%)]";
                    if (isPassedButIncomplete) return "bg-[hsl(0_84%_80%)] dark:bg-[hsl(0_60%_30%)] text-[hsl(0_84%_35%)] dark:text-[hsl(0_84%_75%)]";
                    return "bg-border/60 text-muted-foreground";
                  };
                  
                  return <div key={i} className="flex items-center">
                    <button onClick={() => goToStep(stepNum)} aria-label={`Go to step ${stepNum}`} className="flex items-center cursor-pointer hover:opacity-100 transition-opacity" style={{
                      opacity,
                      transform: `scale(${scale})`,
                      transition: 'all 0.5s ease-out'
                    }}>
                      <div className={cn("relative flex items-center justify-center transition-all duration-500", isActive ? "w-[32px] h-[32px]" : "w-[20px] h-[20px]")}>
                        {/* Active step glow ring */}
                        {isActive && <div className="absolute inset-0 rounded-full border border-foreground/30 animate-pulse" style={{
                          boxShadow: '0 0 16px hsl(var(--foreground) / 0.15)'
                        }} />}
                        <div className={cn("rounded-full transition-all duration-500 flex items-center justify-center font-semibold", isActive ? "w-[24px] h-[24px] text-[10px]" : "w-[20px] h-[20px] text-[9px]", getStepBgClass())}>
                          {isCompleted && !isActive ? <Check className="w-[10px] h-[10px]" strokeWidth={3} /> : <span>{stepNum}</span>}
                        </div>
                      </div>
                    </button>
                    {/* Connecting line after each step */}
                    <div className="relative h-px w-[12px] bg-border/60 rounded-full overflow-hidden mx-[6px]">
                      <div
                        className={cn(
                          "absolute inset-0 bg-foreground/50 rounded-full origin-left transition-transform duration-500 ease-out",
                          isPassed || currentStep === "success" ? "scale-x-100" : "scale-x-0"
                        )}
                      />
                    </div>
                  </div>;
                })}

                  {/* Success step with flag icon */}
                  {(() => {
                    const successStepNum = displayTotalSteps + 1;
                    const currentStepNum = currentStep === "onboarding" ? 0 : currentStep === "success" ? successStepNum : getCurrentStepNumber();
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
                          transition: 'all 0.5s ease-out'
                        }}
                      >
                        <div className={cn(
                          "relative flex items-center justify-center transition-all duration-500",
                          isActive ? "w-[32px] h-[32px]" : "w-[20px] h-[20px]"
                        )}>
                          {/* Active step glow ring */}
                          {isActive && (
                            <div className="absolute inset-0 rounded-full border border-foreground/30 animate-pulse" style={{
                              boxShadow: '0 0 16px hsl(var(--foreground) / 0.15)'
                            }} />
                          )}
                          <div className={cn(
                            "rounded-full transition-all duration-500 flex items-center justify-center",
                            isActive 
                              ? "w-[24px] h-[24px] bg-foreground text-background" 
                              : "w-[20px] h-[20px] bg-border/60 text-muted-foreground"
                          )}>
                            <Flag className={cn(
                              "transition-all duration-300",
                              isActive ? "w-[12px] h-[12px]" : "w-[10px] h-[10px]"
                            )} />
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>}
          </div>
          
          {/* Close Button - Hidden on mobile (swipe to dismiss available), shown on tablet/desktop */}
          <div className="hidden sm:flex items-center flex-shrink-0 relative">
            {/* Saving text - positioned absolutely to the left so button doesn't move */}
            <span className={cn(
              "absolute right-full mr-2 text-sm font-medium whitespace-nowrap transition-all duration-300",
              isSavingProgress ? "opacity-100" : "opacity-0 pointer-events-none",
              saveProgressText === "saving" ? "text-muted-foreground" : "text-emerald-600"
            )}>
              {/* Use invisible text to maintain consistent width */}
              <span className="invisible">Saving...</span>
              <span className="absolute inset-0 flex items-center justify-end">
                {saveProgressText === "saving" ? "Saving..." : "Saved"}
              </span>
            </span>
            <button 
              onClick={handleCloseModal} 
              disabled={isSavingProgress}
              className="relative p-2.5 rounded-full bg-muted hover:bg-muted/80 transition-colors group disabled:cursor-default" 
              aria-label="Close"
            >
              {/* Animated saving circle */}
              {isSavingProgress && (
                <svg 
                  className="absolute inset-0 w-full h-full -rotate-90"
                  viewBox="0 0 44 44"
                >
                  {/* Background circle */}
                  <circle
                    cx="22"
                    cy="22"
                    r="20"
                    fill="none"
                    stroke="hsl(var(--muted-foreground) / 0.2)"
                    strokeWidth="2"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="22"
                    cy="22"
                    r="20"
                    fill="none"
                    stroke={saveProgressText === "saved" ? "rgb(16 185 129)" : "hsl(var(--muted-foreground))"}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray="125.6"
                    strokeDashoffset="125.6"
                    className={cn(
                      saveProgressText === "saving" && "animate-save-progress",
                      saveProgressText === "saved" && "!stroke-dashoffset-0"
                    )}
                    style={{
                      strokeDashoffset: saveProgressText === "saved" ? 0 : undefined,
                      transition: saveProgressText === "saved" ? "stroke 0.3s ease-out" : undefined,
                    }}
                  />
                </svg>
              )}
              {isSavingProgress && saveProgressText === "saved" ? (
                <Check className="w-5 h-5 text-emerald-600 animate-scale-in" />
              ) : (
                <X className={cn(
                  "w-5 h-5 text-muted-foreground transition-transform duration-200",
                  !isSavingProgress && "group-hover:rotate-90 group-active:scale-75"
                )} />
              )}
            </button>
          </div>
        </header>

        {/* Subtle gradient below header on mobile */}
        <div 
          className="lg:hidden absolute top-[70px] sm:top-[80px] left-0 right-0 h-[80px] pointer-events-none bg-gradient-to-b from-background via-background/70 via-40% to-transparent z-10 transition-all duration-300 ease-out"
          style={{ 
            opacity: headerGradientOpacity,
            transform: `translateY(${-8 + headerGradientOpacity * 8}px)`
          }}
        />

        <main 
          ref={mainScrollRef} 
          className={cn("flex-1 flex flex-col items-center px-5 sm:px-5 md:px-[25px] lg:px-[30px] pb-10 lg:pb-5 overflow-y-auto scrollbar-hide", showStepIndicator ? "pt-0" : "pt-2")}
          onTouchStart={(mode === "signin" || currentStep === "onboarding") ? handleMainSwipeStart : undefined}
          onTouchMove={(mode === "signin" || currentStep === "onboarding") ? handleMainSwipeMove : undefined}
          onTouchEnd={(mode === "signin" || currentStep === "onboarding") ? handleMainSwipeEnd : undefined}
        >
          {/* Mobile/Tablet Hero Banner - Only shown on onboarding step, scrolls with content */}
          {mode === 'signup' && currentStep === 'onboarding' && <div
            className="lg:hidden cursor-pointer active:scale-[0.98] transition-transform w-full max-w-[38rem] mb-4"
            onClick={() => {
              mainScrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
              handleNext();
            }}
          >
              <div className="rounded-form p-4 sm:p-5 overflow-hidden relative">
                {/* Hero image background with parallax */}
                <img 
                  src={salonHero} 
                  alt="Professional salon" 
                  className="absolute inset-0 w-full h-[120%] object-cover rounded-form transition-transform duration-100 ease-out"
                  style={{ transform: `translateY(-${Math.min(parallaxOffset, 30)}px)` }}
                />
                {/* Dark overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 to-foreground/60 rounded-form" />
                
                <div className="relative z-10">
                  <div className="flex-1 min-w-0">
                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-background/10 backdrop-blur-sm border border-background/10 mb-2 animate-fade-in">
                      <BadgeCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-background/80" />
                      <span className="text-[8px] font-medium text-background/80 uppercase tracking-widest">
                        Exclusively professional
                      </span>
                    </div>
                    <div className="animate-fade-in min-h-[3.5rem] sm:min-h-[2.25rem]" style={{
                    animationDelay: '100ms',
                    animationFillMode: 'backwards'
                  }}>
                      <h2 className="font-termina font-medium uppercase text-2xl sm:text-3xl text-background leading-tight text-balance">
                        {fontsLoaded ? <span className="animate-fade-in-text">Apply for a pro account</span> : <><TextSkeleton width="100%" height="1.75rem" variant="light" /><span className="block mt-1 sm:hidden"><TextSkeleton width="60%" height="1.75rem" variant="light" /></span></>}
                      </h2>
                    </div>
                    <p className="text-xs sm:text-sm text-background/60 mt-2 animate-fade-in min-h-[1rem]" style={{
                    animationDelay: '200ms',
                    animationFillMode: 'backwards'
                  }}>
                      {fontsLoaded ? <span className="animate-fade-in-text">Unlock wholesale pricing on the industries best{" "}<span className="whitespace-nowrap">hair and tools.</span></span> : <TextSkeleton width="95%" height="0.875rem" variant="light" />}
                    </p>
                  </div>
                </div>
              </div>
            </div>}

          {isTransitioning ? <div className="w-full max-w-[38rem]">
              <FormSkeleton variant={(nextStep || currentStep) === "account-type" ? "account-type" : (nextStep || currentStep) === "license" || (nextStep || currentStep) === "school-info" ? "license" : (nextStep || currentStep) === "business-location" ? "location" : (nextStep || currentStep) === "business-operation" ? "business-operation" : (nextStep || currentStep) === "wholesale-terms" || (nextStep || currentStep) === "tax-exemption" ? "terms" : (nextStep || currentStep) === "contact-info" ? "contact" : "default"} />
            </div> : <div key={`${mode}-${currentStep}`} className={cn("w-full max-w-[38rem]", currentStep === "success" ? "animate-fade-in" : mode === "signin" ? (modeTransitionDirection === "right" ? "animate-step-enter-right" : "animate-step-enter-left") : currentStep === "onboarding" ? (modeTransitionDirection === "left" ? "animate-step-enter-left" : "animate-step-enter-right") : transitionDirection === "forward" ? "animate-step-enter-right" : "animate-step-enter-left")}>
              {mode === "signin" ? <SignInForm 
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
              /> : <>
                  {currentStep === "onboarding" && <OnboardingForm onContinue={handleNext} onSignIn={() => {
                    setModeTransitionDirection("right");
                    setMode("signin");
                  }} onStepClick={() => {
                    setShimmerKey(k => k + 1);
                  }} fontsLoaded={fontsLoaded} />}
                  {currentStep === "account-type" && <AccountTypeForm selectedType={accountType} onSelect={handleAccountTypeSelect} validationStatus={getStepValidationStatus(accountType !== null, true, showValidationErrors)} />}
                  {currentStep === "license" && <LicenseStep accountType={accountType} licenseNumber={licenseNumber} salonSize={salonSize} salonStructure={salonStructure} licenseFile={licenseFile} licenseProofFiles={licenseProofFiles} onLicenseChange={setLicenseNumber} onSalonSizeChange={setSalonSize} onSalonStructureChange={setSalonStructure} onLicenseFileChange={setLicenseFile} onLicenseProofFilesChange={setLicenseProofFiles} showValidationErrors={showValidationErrors} validationStatus={getStepValidationStatus(accountType === "salon" ? licenseNumber.trim() !== "" && salonSize !== "" && salonStructure !== "" : licenseNumber.trim() !== "", licenseNumber.trim() !== "" || salonSize !== "" || salonStructure !== "", showValidationErrors)} />}
                  {currentStep === "business-operation" && <BusinessOperationStep businessOperationType={businessOperationType} onBusinessOperationTypeChange={handleBusinessOperationTypeSelect} showValidationErrors={showValidationErrors} validationStatus={getStepValidationStatus(businessOperationType !== null, false, showValidationErrors)} />}
                  {currentStep === "business-location" && <BusinessLocationStep accountType={accountType} businessName={businessName} businessAddress={businessAddress} suiteNumber={suiteNumber} country={country} city={city} state={state} zipCode={zipCode} onBusinessNameChange={setBusinessName} onBusinessAddressChange={setBusinessAddress} onSuiteNumberChange={setSuiteNumber} onCountryChange={setCountry} onCityChange={setCity} onStateChange={setState} onZipCodeChange={setZipCode} showValidationErrors={showValidationErrors} validationStatus={getStepValidationStatus(businessName.trim() !== "" && businessAddress.trim() !== "" && country !== "" && city.trim() !== "" && state !== "" && zipCode.trim() !== "", businessName.trim() !== "" || businessAddress.trim() !== "" || city.trim() !== "" || zipCode.trim() !== "", showValidationErrors)} />}
                  {currentStep === "school-info" && <SchoolInfoStep schoolName={schoolName} schoolState={schoolState} enrollmentProofFiles={enrollmentProofFiles} onSchoolNameChange={setSchoolName} onSchoolStateChange={setSchoolState} onEnrollmentProofFilesChange={setEnrollmentProofFiles} showValidationErrors={showValidationErrors} validationStatus={getStepValidationStatus(schoolName.trim() !== "" && schoolState !== "" && enrollmentProofFiles.length > 0, schoolName.trim() !== "" || schoolState !== "" || enrollmentProofFiles.length > 0, showValidationErrors)} />}
                  {currentStep === "contact-basics" && <ContactBasicsStep accountType={accountType} firstName={firstName} lastName={lastName} preferredName={preferredName} email={email} phoneNumber={phoneNumber} phoneCountryCode={phoneCountryCode} onFirstNameChange={setFirstName} onLastNameChange={setLastName} onPreferredNameChange={setPreferredName} onEmailChange={setEmail} onPhoneNumberChange={value => setPhoneNumber(formatPhoneNumber(value))} onPhoneCountryCodeChange={setPhoneCountryCode} showValidationErrors={showValidationErrors} validationStatus={getStepValidationStatus(firstName.trim() !== "" && lastName.trim() !== "" && isValidEmail(email) && isValidPhoneNumber(phoneNumber), firstName.trim() !== "" || lastName.trim() !== "" || email.trim() !== "" || phoneNumber.trim() !== "", showValidationErrors)} />}
                  {currentStep === "wholesale-terms" && <WholesaleTermsStep accountType={accountType} agreed={wholesaleAgreed} onAgreeChange={setWholesaleAgreed} highlight={highlightWholesaleTerms} highlightFade={highlightWholesaleFade} showValidationErrors={showValidationErrors} validationStatus={getStepValidationStatus(wholesaleAgreed, false, showValidationErrors)} />}
                  {currentStep === "tax-exemption" && <TaxExemptionStep accountType={accountType} hasTaxExemption={hasTaxExemption} taxExemptFile={taxExemptFile} onTaxExemptionChange={setHasTaxExemption} onTaxExemptFileChange={setTaxExemptFile} onAutoAdvance={() => {
                    // Auto-advance to wholesale-terms step when No is selected
                    const stepNum = accountType === "professional" ? 6 : accountType === "student" ? 4 : 5;
                    setCompletedSteps(prev => new Set([...prev, stepNum]));
                    setTransitionDirection("forward");
                    setIsTransitioning(true);
                    setTimeout(() => {
                      setCurrentStep("wholesale-terms");
                      setIsTransitioning(false);
                    }, 150);
                  }} showValidationErrors={showValidationErrors} validationStatus={getStepValidationStatus(hasTaxExemption !== null && (hasTaxExemption === false || taxExemptFile !== null), hasTaxExemption !== null, showValidationErrors)} />}
                  {currentStep === "contact-info" && <PreferencesStep accountType={accountType} birthdayMonth={birthdayMonth} birthdayDay={birthdayDay} socialMediaHandle={socialMediaHandle} onBirthdayMonthChange={setBirthdayMonth} onBirthdayDayChange={setBirthdayDay} onSocialMediaHandleChange={setSocialMediaHandle} subscribeOrderUpdates={subscribeOrderUpdates} subscribeMarketing={subscribeMarketing} subscribePromotions={subscribePromotions} onSubscribeOrderUpdatesChange={setSubscribeOrderUpdates} onSubscribeMarketingChange={setSubscribeMarketing} onSubscribePromotionsChange={setSubscribePromotions} showValidationErrors={showValidationErrors} validationStatus={getStepValidationStatus(true, true, showValidationErrors)} uploadedFiles={[...(licenseFile ? [{
                file: licenseFile,
                label: accountType === "salon" ? "Salon License" : "License"
              }] : []), ...(accountType === "professional" ? licenseProofFiles.map((f, i) => ({
                file: f,
                label: `License Photo ${licenseProofFiles.length > 1 ? i + 1 : ""}`.trim()
              })) : []), ...(accountType === "student" ? enrollmentProofFiles.map((f, i) => ({
                file: f,
                label: `Enrollment Proof ${enrollmentProofFiles.length > 1 ? i + 1 : ""}`.trim()
              })) : []), ...(taxExemptFile ? [{
                file: taxExemptFile,
                label: "Tax Exemption Document"
              }] : [])]} />}
                  {currentStep === "summary" && <SummaryForm 
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
                      ...(licenseFile ? [{ file: licenseFile, label: accountType === "salon" ? "Salon License" : "License" }] : []),
                      ...(accountType === "professional" ? licenseProofFiles.map((f, i) => ({ file: f, label: `License Photo ${licenseProofFiles.length > 1 ? i + 1 : ""}`.trim() })) : []),
                      ...(accountType === "student" ? enrollmentProofFiles.map((f, i) => ({ file: f, label: `Enrollment Proof ${enrollmentProofFiles.length > 1 ? i + 1 : ""}`.trim() })) : []),
                      ...(taxExemptFile ? [{ file: taxExemptFile, label: "Tax Exemption Document" }] : [])
                    ]}
                    onEditStep={goToStep}
                  />}
                  {currentStep === "success" && <SuccessForm referralSource={referralSource} onReferralSourceChange={setReferralSource} />}
                </>}
            </div>}
        </main>


        {/* Scroll down hint - mobile only, positioned above footer, only if content is scrollable */}
        {mode === "signup" && currentStep === "onboarding" && isScrollable && (
          <div className={cn(
            "lg:hidden fixed bottom-[105px] left-1/2 -translate-x-1/2 z-30 pointer-events-none transition-opacity duration-500",
            hasScrolled ? "opacity-0" : "opacity-100"
          )}>
            <div className="w-[4px] h-[8px] rounded-full bg-muted-foreground/40 animate-scroll-wheel" />
          </div>
        )}

        {/* Subtle gradient behind footer on mobile */}
        {footerVisible && (
          <div 
            className="lg:hidden fixed bottom-[80px] left-0 right-0 h-[80px] pointer-events-none bg-gradient-to-t from-background via-background/60 to-transparent z-0 transition-opacity duration-300"
            style={{ opacity: footerGradientOpacity }}
          />
        )}

        {/* Footer */}
        {footerVisible && (
          <footer className={cn(
            "sticky bottom-[10px] mx-[10px] bg-background p-2.5 sm:p-5 lg:p-[25px] pb-[max(0.625rem,env(safe-area-inset-bottom))] rounded-[20px] overflow-hidden border border-border/30 shadow-[0_0_20px_-5px_rgba(0,0,0,0.12)]",
            "lg:bottom-0 lg:mx-0 lg:rounded-none lg:border-x-0 lg:border-b-0 lg:shadow-none",
            footerEnterReady ? "animate-slide-up-fade" : "opacity-0 translate-y-[15px]"
          )}>
            <div className="max-w-[38rem] mx-auto flex flex-col gap-[10px]">
              <div className={cn(
                "flex",
                mode === "signup" && currentStep !== "onboarding" ? "gap-[15px]" : "gap-0"
              )} style={{ transition: footerTransitionsEnabled ? "gap 300ms ease-out" : "none" }}>
                <div 
                  className={cn(
                    "overflow-hidden",
                    mode === "signup" && currentStep !== "onboarding" ? "w-[55px] opacity-100" : "w-0 opacity-0"
                  )}
                  style={{ transition: footerTransitionsEnabled ? "width 300ms ease-out, opacity 300ms ease-out" : "none" }}
                >
                  <Button variant="outline" size="lg" onClick={handleBack} aria-label="Go back" className="h-button w-[55px] p-0 rounded-form border-border hover:bg-muted/60 hover:border-foreground/30 group active:bg-muted/80 active:scale-95 transition-transform">
                    <ArrowLeft className="w-[18px] h-[18px] transition-transform duration-150 group-active:-translate-x-1" aria-hidden="true" />
                  </Button>
                </div>
                <Popover open={submitTooltipOpen} onOpenChange={setSubmitTooltipOpen}>
                  <PopoverTrigger asChild>
                    {/* Wrap the button so hover works even when the button is disabled */}
                    <span
                      className="flex-1 block"
                      onMouseEnter={() => {
                        if (submitPopoverCloseTimer.current) {
                          window.clearTimeout(submitPopoverCloseTimer.current);
                          submitPopoverCloseTimer.current = null;
                        }
                        if (currentStep === "summary" && !isAllStepsValid() && getIncompleteSteps().length > 0) {
                          setSubmitTooltipOpen(true);
                        }
                      }}
                      onMouseLeave={() => {
                        if (submitPopoverCloseTimer.current) {
                          window.clearTimeout(submitPopoverCloseTimer.current);
                        }
                        // small grace period so you can move into the popover
                        submitPopoverCloseTimer.current = window.setTimeout(() => {
                          setSubmitTooltipOpen(false);
                          submitPopoverCloseTimer.current = null;
                        }, 220);
                      }}
                    >
                      <Button
                        key={`shimmer-${shimmerKey}`}
                        size="lg"
                        onClick={handleNext}
                        disabled={currentStep === "summary" ? !isAllStepsValid() || isSubmitting : !canContinue() || isSubmitting}
                        className={cn(
                          "btn-premium w-full h-button rounded-form bg-foreground text-background hover:bg-foreground disabled:opacity-40 font-medium text-base tracking-wide group active:scale-[0.98] transition-transform",
                          shimmerKey > 0 && "shimmer-trigger",
                          // when disabled, popover is triggered by wrapper, not the button
                          currentStep === "summary" && !isAllStepsValid() && getIncompleteSteps().length > 0 && "pointer-events-none"
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
                              {mode === "signin"
                                ? "Login"
                                : currentStep === "onboarding"
                                  ? "Get started"
                                  : currentStep === "summary"
                                    ? "Submit application"
                                    : "Continue"}
                              <ArrowRight className="w-[18px] h-[18px] transition-all duration-150 group-hover:w-[24px] group-hover:translate-x-0.5 group-active:translate-x-1" />
                            </>
                          )}
                        </span>
                      </Button>
                    </span>
                  </PopoverTrigger>
                  {currentStep === "summary" && !isAllStepsValid() && getIncompleteSteps().length > 0 && (
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
                        <p className="text-xs font-medium text-background/70">Complete these steps first:</p>
                        <div className="space-y-2">
                          {getIncompleteSteps().map(({
                            step,
                            name,
                            missingFields
                          }) => (
                            <button 
                              key={step} 
                              onClick={() => {
                                setSubmitTooltipOpen(false);
                                goToStep(step, missingFields);
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
                                  <span key={field} className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-medium">
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
        )}
      </div>
      </div>
    </div>;
};
export default Auth;