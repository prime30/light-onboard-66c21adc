import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, ArrowRight, Sparkles, Star, Truck, Gift, ChevronLeft, ChevronRight, Mail, Lock, User, FileCheck, MapPin, Check, ShoppingBag, Heart, ArrowUpRight, Building2, GraduationCap, X, Eye, EyeOff, Phone, Info, AlertTriangle, Clock, Headphones, Users, Tag, Loader2, BadgeCheck, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useMagnetic } from "@/hooks/use-magnetic";
import { useCountdown } from "@/hooks/use-countdown";
import { StateIcon, hasStateIcon } from "@/components/StateIcon";
import { StepValidationIcon, getStepValidationStatus } from "@/components/registration/StepValidationIcon";
import { FileUpload } from "@/components/registration/FileUpload";
import { MultiFileUpload } from "@/components/registration/MultiFileUpload";
import { FileSummary } from "@/components/registration/FileSummary";
import { FormSkeleton } from "@/components/registration/FormSkeleton";
import colorRingProduct from "@/assets/color-ring-product.png";
import salonHero from "@/assets/salon-hero.jpg";
import logoSvg from "@/assets/logo.svg";
type AuthMode = "signup" | "signin";
type Step = "onboarding" | "account-type" | "license" | "business-operation" | "business-location" | "school-info" | "wholesale-terms" | "tax-exemption" | "contact-info" | "success";
const slides = [{
  eyebrow: "Exclusively Professional",
  title: "Apply for a",
  highlight: "pro account",
  description: "Cosmetology license, proof of student status, or equivalent required to shop."
}, {
  eyebrow: "Quality",
  title: "Premium",
  highlight: "Products",
  description: "Curated professional-grade extensions & supplies"
}, {
  eyebrow: "Community",
  title: "Grow",
  highlight: "Together",
  description: "Connect, learn, and scale with fellow pros"
}];
const stats = [{
  value: 8,
  suffix: "K+",
  label: "Stylists"
}, {
  value: 50,
  suffix: "%",
  label: "Savings"
}, {
  value: 24,
  suffix: "hr",
  label: "Approval"
}];
const features = [{
  icon: Gift,
  label: "Rewards",
  desc: "On every order"
}, {
  icon: Truck,
  label: "Free Shipping",
  desc: "2-day delivery on $250+"
}, {
  icon: Tag,
  label: "Wholesale",
  desc: "Pro pricing"
}];
const states = ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"];
const testimonials = [{
  quote: "Finally, a wholesale platform that actually understands what stylists need. The pricing is unbeatable.",
  name: "Sarah Mitchell",
  role: "Hair Stylist, 8 years",
  avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face"
}, {
  quote: "Switching to Drop Dead saved my salon 50% on supplies. The quality is top-notch.",
  name: "Marcus Chen",
  role: "Salon Owner",
  avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face"
}, {
  quote: "The community here is incredible. It's like having thousands of mentors at your fingertips.",
  name: "Jessica Torres",
  role: "Extension Specialist",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=face"
}, {
  quote: "2-day delivery means I never run out of product mid-appointment. Game changer!",
  name: "Amanda Brooks",
  role: "Color Expert",
  avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face"
}];

// Country codes for phone numbers
const countryCodes = [{
  code: "+1",
  country: "US",
  flag: "🇺🇸"
}, {
  code: "+1",
  country: "CA",
  flag: "🇨🇦"
}, {
  code: "+44",
  country: "UK",
  flag: "🇬🇧"
}, {
  code: "+61",
  country: "AU",
  flag: "🇦🇺"
}, {
  code: "+33",
  country: "FR",
  flag: "🇫🇷"
}, {
  code: "+49",
  country: "DE",
  flag: "🇩🇪"
}, {
  code: "+39",
  country: "IT",
  flag: "🇮🇹"
}, {
  code: "+34",
  country: "ES",
  flag: "🇪🇸"
}, {
  code: "+81",
  country: "JP",
  flag: "🇯🇵"
}, {
  code: "+86",
  country: "CN",
  flag: "🇨🇳"
}, {
  code: "+91",
  country: "IN",
  flag: "🇮🇳"
}, {
  code: "+52",
  country: "MX",
  flag: "🇲🇽"
}, {
  code: "+55",
  country: "BR",
  flag: "🇧🇷"
}];

// Phone number validation - validates the local number part (without country code)
const isValidPhoneNumber = (phone: string): boolean => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  // Must have exactly 10 digits for US/CA format
  return cleaned.length === 10;
};

// Format phone number as user types (local number only, no country code)
const formatPhoneNumber = (value: string): string => {
  // Remove all non-digit characters
  const cleaned = value.replace(/\D/g, '').slice(0, 10);

  // US format: (555) 123-4567
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
};
const AnimatedNumber = ({
  value,
  suffix,
  delay = 0
}: {
  value: number;
  suffix: string;
  delay?: number;
}) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const duration = 2000;

    // Ease-out cubic function for natural deceleration
    const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
    const timeoutId = setTimeout(() => {
      const startTime = performance.now();
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOutCubic(progress);
        setCount(Math.floor(easedProgress * value));
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setCount(value);
        }
      };
      requestAnimationFrame(animate);
    }, delay);
    return () => clearTimeout(timeoutId);
  }, [value, delay]);
  return <span>{count}{suffix}</span>;
};
interface FeatureBoxProps {
  icon: React.ElementType;
  label: string;
  desc: string;
}
const MagneticFeatureBox = ({
  icon: Icon,
  label,
  desc
}: FeatureBoxProps) => {
  const magnetic = useMagnetic({
    strength: 0.12
  });
  return <div ref={magnetic.ref} style={magnetic.style} onMouseMove={magnetic.onMouseMove} onMouseLeave={magnetic.onMouseLeave} className="group/pill flex items-center gap-2.5 px-[15px] py-2.5 rounded-[10px] bg-white/10 backdrop-blur-md border border-white/20 hover:border-white/30 hover:bg-white/15 transition-all cursor-default">
      <div className="w-[30px] h-[30px] rounded-[10px] bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
        <Icon className="w-[15px] h-[15px] text-white" />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-white">{label}</span>
        <span className="text-xs text-white/60">{desc}</span>
      </div>
    </div>;
};

// Testimonial Carousel for Sign-in Hero
const TestimonialCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);
  const testimonial = testimonials[currentIndex];
  return <div className="space-y-4">
      <div key={currentIndex} className="animate-fade-in">
        <blockquote className="text-sm lg:text-base text-background/90 italic leading-relaxed mb-4">
          "{testimonial.quote}"
        </blockquote>
        <div className="flex items-center gap-3">
          <img src={testimonial.avatar} alt={testimonial.name} className="w-10 h-10 rounded-full border-2 border-background/20 object-cover" />
          <div>
            <p className="text-sm font-medium text-background">{testimonial.name}</p>
            <p className="text-xs text-background/50">{testimonial.role}</p>
          </div>
        </div>
      </div>
      
      {/* Carousel dots */}
      <div className="flex gap-1.5">
        {testimonials.map((_, i) => <button key={i} onClick={() => setCurrentIndex(i)} className={cn("h-1 rounded-full transition-all duration-300", i === currentIndex ? "w-6 bg-background/60" : "w-1 bg-background/20 hover:bg-background/30")} />)}
      </div>
    </div>;
};

// Rotating Stylist Avatars Component
const stylistAvatars = ["https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=face", "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face", "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face", "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&crop=face", "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&h=80&fit=crop&crop=face", "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=80&h=80&fit=crop&crop=face"];
const RotatingStylistAvatars = () => {
  const [visibleIndices, setVisibleIndices] = useState([0, 1, 2]);
  const [fadingIndex, setFadingIndex] = useState<number | null>(null);
  const [floatingEmoji, setFloatingEmoji] = useState<{
    position: number;
    emoji: string;
    id: number;
  } | null>(null);
  const emojiIdRef = useRef(0);
  const reactionEmojis = ["💇", "✨", "💕", "🔥", "💅", "⭐", "💖", "👏", "🙌", "💯"];
  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleIndices(prev => {
        const nextIndex = (Math.max(...prev) + 1) % stylistAvatars.length;
        const positionToReplace = Math.floor(Math.random() * 3);
        setFadingIndex(positionToReplace);

        // Trigger floating emoji when new avatar appears
        const randomEmoji = reactionEmojis[Math.floor(Math.random() * reactionEmojis.length)];
        emojiIdRef.current += 1;
        setFloatingEmoji({
          position: positionToReplace,
          emoji: randomEmoji,
          id: emojiIdRef.current
        });
        setTimeout(() => {
          setFadingIndex(null);
        }, 300);

        // Clear emoji after animation
        setTimeout(() => {
          setFloatingEmoji(null);
        }, 1000);
        const newIndices = [...prev];
        newIndices[positionToReplace] = nextIndex;
        return newIndices;
      });
    }, 2500);
    return () => clearInterval(interval);
  }, []);
  return <div className="flex items-center gap-2.5">
      <span className="text-xs text-background/40 hidden lg:inline">Loved by</span>
      <div className="flex -space-x-[5px]">
        {visibleIndices.map((avatarIndex, i) => <div key={`${i}-${avatarIndex}`} className="relative">
            <img src={stylistAvatars[avatarIndex]} alt={`Stylist ${avatarIndex + 1}`} className={cn("w-5 h-5 rounded-full border-2 border-foreground object-cover transition-all duration-300", fadingIndex === i ? "opacity-0 scale-75" : "opacity-100 scale-100")} />
            {/* Floating emoji reaction */}
            {floatingEmoji && floatingEmoji.position === i && <span key={floatingEmoji.id} className="absolute -top-1 left-1/2 -translate-x-1/2 text-sm animate-float-up pointer-events-none">
                {floatingEmoji.emoji}
              </span>}
          </div>)}
      </div>
      <span className="text-xs text-background/50">8K+ pros</span>
    </div>;
};

// Circular Progress Indicator Component
const CircularProgress = ({
  progress
}: {
  progress: number;
}) => {
  const [showGlow, setShowGlow] = useState(false);
  const prevProgressRef = useRef(progress);
  const size = 40;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - progress / 100 * circumference;

  // Trigger glow once when reaching 100%
  useEffect(() => {
    if (progress >= 100 && prevProgressRef.current < 100) {
      setShowGlow(true);
      const timer = setTimeout(() => {
        setShowGlow(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
    prevProgressRef.current = progress;
  }, [progress]);

  // Color based on progress: green when complete, amber when partial, white/gray when empty
  const getProgressColor = () => {
    if (progress >= 100) return "hsl(142, 76%, 45%)"; // Green
    if (progress > 0) return "hsl(38, 92%, 55%)"; // Amber
    return "rgba(255, 255, 255, 0.3)";
  };
  const getTextColor = () => {
    if (progress >= 100) return "hsl(142, 76%, 45%)";
    if (progress > 0) return "hsl(38, 92%, 55%)";
    return "rgba(255, 255, 255, 0.6)";
  };
  return <div className="relative flex items-center justify-center">
      {/* Pulsating glow effect - shows once on reaching 100% */}
      {showGlow && <div className="absolute inset-[-8px] rounded-full animate-celebration-glow" />}
      
      <svg width={size} height={size} className="transform -rotate-90 relative z-10">
        {/* Background circle */}
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255, 255, 255, 0.1)" strokeWidth={strokeWidth} />
        {/* Progress circle */}
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={getProgressColor()} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-500 ease-out" />
      </svg>
      <span className="absolute text-[10px] font-semibold transition-colors duration-500 z-10" style={{
      color: getTextColor()
    }}>
        {Math.round(progress)}%
      </span>
    </div>;
};
const Auth = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("signup");
  const [currentStep, setCurrentStep] = useState<Step>("onboarding");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [transitionDirection, setTransitionDirection] = useState<"forward" | "backward">("forward");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [nextStep, setNextStep] = useState<Step | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Form state
  const [accountType, setAccountType] = useState<string | null>(null);
  const [licenseNumber, setLicenseNumber] = useState("");
  const [state, setState] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
  
  // Subscription preferences
  const [subscribeOrderUpdates, setSubscribeOrderUpdates] = useState(true);
  const [subscribeMarketing, setSubscribeMarketing] = useState(true);
  const [subscribePromotions, setSubscribePromotions] = useState(true);
  
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [showSpotlight, setShowSpotlight] = useState(false);
  const [isSpotlightFadingOut, setIsSpotlightFadingOut] = useState(false);
  const [hasShownSpotlight, setHasShownSpotlight] = useState(false);
  const spotlightTimerRef = useRef<NodeJS.Timeout | null>(null);
  const spotlightHideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const spotlightFadeTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Mobile hero scroll behavior
  const [mobileHeroVisible, setMobileHeroVisible] = useState(true);
  const mainContentRef = useRef<HTMLDivElement | null>(null);
  const mainScrollRef = useRef<HTMLElement | null>(null);
  
  // Track scroll direction for mobile hero hide/show
  useEffect(() => {
    const els = [mainScrollRef.current, mainContentRef.current].filter(Boolean) as HTMLElement[];
    if (!els.length) return;

    const lastByEl = new WeakMap<HTMLElement, number>();
    els.forEach((el) => lastByEl.set(el, el.scrollTop));

    const scrollThreshold = 6; // Minimum scroll distance to trigger
    const hideAfter = 20; // Start hiding once content is scrolled

    const onScroll = (e: Event) => {
      const el = e.currentTarget as HTMLElement | null;
      if (!el) return;

      const prev = lastByEl.get(el) ?? 0;
      const current = el.scrollTop;
      const delta = current - prev;

      // Always show when at (or near) the top.
      if (current <= hideAfter) {
        setMobileHeroVisible(true);
        lastByEl.set(el, current);
        return;
      }

      if (Math.abs(delta) > scrollThreshold) {
        if (delta > 0) setMobileHeroVisible(false);
        else setMobileHeroVisible(true);
      }

      lastByEl.set(el, current);
    };

    els.forEach((el) => el.addEventListener("scroll", onScroll, { passive: true }));
    return () => els.forEach((el) => el.removeEventListener("scroll", onScroll));
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
    setMode(newMode);
    resetForm();
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
  const canContinue = () => {
    if (mode === "signin") {
      return email.trim() !== "" && password.length >= 8;
    }
    switch (currentStep) {
      case "onboarding":
        return true;
      case "account-type":
        return accountType !== null;
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
        return firstName.trim() !== "" && lastName.trim() !== "" && isValidPhoneNumber(phoneNumber);
      default:
        return true;
    }
  };

  // Check if ALL steps in the form are valid (for final submission)
  const isAllStepsValid = () => {
    if (mode === "signin") {
      return email.trim() !== "" && password.length >= 8;
    }

    // Must have account type selected
    if (!accountType) return false;

    // Student flow - 4 steps (account-type, school-info, wholesale-terms, contact-info)
    if (accountType === "student") {
      const schoolValid = schoolName.trim() !== "" && schoolState !== "" && enrollmentProofFiles.length > 0;
      const wholesaleValid = wholesaleAgreed;
      const contactValid = firstName.trim() !== "" && lastName.trim() !== "" && isValidPhoneNumber(phoneNumber);
      return schoolValid && wholesaleValid && contactValid;
    }

    // Salon flow
    if (accountType === "salon") {
      const licenseValid = licenseNumber.trim() !== "" && salonSize !== "" && salonStructure !== "";
      const businessValid = businessName.trim() !== "" && businessAddress.trim() !== "" && country !== "" && city.trim() !== "" && state !== "" && zipCode.trim() !== "";
      const wholesaleValid = wholesaleAgreed;
      const taxValid = hasTaxExemption === false || hasTaxExemption === true && taxExemptFile !== null;
      const contactValid = firstName.trim() !== "" && lastName.trim() !== "" && isValidPhoneNumber(phoneNumber);
      return licenseValid && businessValid && wholesaleValid && taxValid && contactValid;
    }

    // Professional flow
    const licenseValid = licenseNumber.trim() !== "";
    const businessOperationValid = businessOperationType !== null;
    const businessValid = businessName.trim() !== "" && businessAddress.trim() !== "" && country !== "" && city.trim() !== "" && state !== "" && zipCode.trim() !== "";
    const wholesaleValid = wholesaleAgreed;
    const taxValid = hasTaxExemption === false || hasTaxExemption === true && taxExemptFile !== null;
    const contactValid = firstName.trim() !== "" && lastName.trim() !== "" && isValidPhoneNumber(phoneNumber);
    return licenseValid && businessOperationValid && businessValid && wholesaleValid && taxValid && contactValid;
  };

  // Get list of incomplete steps for tooltip display
  const getIncompleteSteps = (): {
    step: number;
    name: string;
  }[] => {
    if (mode !== "signup" || !accountType) return [];
    const incomplete: {
      step: number;
      name: string;
    }[] = [];

    // Step 1: Account Type (always complete if we're past it)

    if (accountType === "student") {
      // Student flow: account-type, school-info, wholesale-terms, contact-info
      // Step 2: School Info
      if (schoolName.trim() === "" || schoolState === "" || enrollmentProofFiles.length === 0) {
        incomplete.push({
          step: 2,
          name: "School Information"
        });
      }
      // Step 3: Wholesale Terms
      if (!wholesaleAgreed) {
        incomplete.push({
          step: 3,
          name: "Wholesale Terms"
        });
      }
      // Step 4: Contact Info
      if (firstName.trim() === "" || lastName.trim() === "" || !isValidPhoneNumber(phoneNumber)) {
        incomplete.push({
          step: 4,
          name: "Contact Info"
        });
      }
      return incomplete;
    }
    if (accountType === "salon") {
      // Step 2: Business Location
      if (businessName.trim() === "" || businessAddress.trim() === "" || country === "" || city.trim() === "" || state === "" || zipCode.trim() === "") {
        incomplete.push({
          step: 2,
          name: "Business Location"
        });
      }
      // Step 3: License
      if (licenseNumber.trim() === "" || salonSize === "" || salonStructure === "") {
        incomplete.push({
          step: 3,
          name: "License Verification"
        });
      }
      // Step 4: Wholesale Terms
      if (!wholesaleAgreed) {
        incomplete.push({
          step: 4,
          name: "Wholesale Terms"
        });
      }
      // Step 5: Tax Exemption
      if (hasTaxExemption === null || hasTaxExemption === true && !taxExemptFile) {
        incomplete.push({
          step: 5,
          name: "Tax Exemption"
        });
      }
      // Step 6: Contact Info
      if (firstName.trim() === "" || lastName.trim() === "" || !isValidPhoneNumber(phoneNumber)) {
        incomplete.push({
          step: 6,
          name: "Contact Info"
        });
      }
      return incomplete;
    }

    // Professional flow
    // Step 2: License
    if (licenseNumber.trim() === "") {
      incomplete.push({
        step: 2,
        name: "License Verification"
      });
    }
    // Step 3: Business Operation
    if (businessOperationType === null) {
      incomplete.push({
        step: 3,
        name: "Business Operation"
      });
    }
    // Step 4: Business Location
    if (businessName.trim() === "" || businessAddress.trim() === "" || country === "" || city.trim() === "" || state === "" || zipCode.trim() === "") {
      incomplete.push({
        step: 4,
        name: "Business Location"
      });
    }
    // Step 5: Wholesale Terms
    if (!wholesaleAgreed) {
      incomplete.push({
        step: 5,
        name: "Wholesale Terms"
      });
    }
    // Step 6: Tax Exemption
    if (hasTaxExemption === null || hasTaxExemption === true && !taxExemptFile) {
      incomplete.push({
        step: 6,
        name: "Tax Exemption"
      });
    }
    // Step 7: Contact Info
    if (firstName.trim() === "" || lastName.trim() === "" || !isValidPhoneNumber(phoneNumber)) {
      incomplete.push({
        step: 7,
        name: "Contact Info"
      });
    }
    return incomplete;
  };

  // Check if form is ready to submit (on final step with all fields complete)
  const isFormReadyToSubmit = mode === "signup" && currentStep === "contact-info" && isAllStepsValid();

  // Delay spotlight effect until after the 100% glow animation completes, show once only
  useEffect(() => {
    if (isFormReadyToSubmit && !hasShownSpotlight) {
      // Wait for the celebration glow animation to finish (1.5s)
      spotlightTimerRef.current = setTimeout(() => {
        setShowSpotlight(true);
        setHasShownSpotlight(true);
        // Start fade out after 3 seconds
        spotlightHideTimerRef.current = setTimeout(() => {
          setIsSpotlightFadingOut(true);
          // Remove from DOM after fade animation completes (500ms)
          spotlightFadeTimerRef.current = setTimeout(() => {
            setShowSpotlight(false);
            setIsSpotlightFadingOut(false);
          }, 500);
        }, 3000);
      }, 1500);
    } else if (!isFormReadyToSubmit) {
      setShowSpotlight(false);
      setIsSpotlightFadingOut(false);
      // Reset hasShownSpotlight if user goes back/edits form
      setHasShownSpotlight(false);
      if (spotlightTimerRef.current) {
        clearTimeout(spotlightTimerRef.current);
      }
      if (spotlightHideTimerRef.current) {
        clearTimeout(spotlightHideTimerRef.current);
      }
      if (spotlightFadeTimerRef.current) {
        clearTimeout(spotlightFadeTimerRef.current);
      }
    }
    return () => {
      if (spotlightTimerRef.current) {
        clearTimeout(spotlightTimerRef.current);
      }
      if (spotlightHideTimerRef.current) {
        clearTimeout(spotlightHideTimerRef.current);
      }
      if (spotlightFadeTimerRef.current) {
        clearTimeout(spotlightFadeTimerRef.current);
      }
    };
  }, [isFormReadyToSubmit, hasShownSpotlight]);

  // Calculate overall form progress as percentage
  const getFormProgress = () => {
    if (mode === "signin") {
      let filled = 0;
      if (email.trim() !== "") filled++;
      if (password.length >= 8) filled++;
      return filled / 2 * 100;
    }

    // For signup, calculate based on account type
    if (accountType === "student") {
    // Student: account-type (1), school-info (3: schoolName, schoolState, enrollmentProofFiles), wholesale (1), contact (3)
      let filled = 0;
      const total = 8;
      if (accountType) filled++;
      if (schoolName.trim() !== "") filled++;
      if (schoolState !== "") filled++;
      if (enrollmentProofFiles.length > 0) filled++;
      if (wholesaleAgreed) filled++;
      if (firstName.trim() !== "") filled++;
      if (lastName.trim() !== "") filled++;
      if (phoneNumber.trim() !== "") filled++;
      return filled / total * 100;
    }
    if (accountType === "salon") {
      // Salon: account-type (1), license fields (3: licenseNumber, salonSize, salonStructure), 
      // business location (6: businessName, businessAddress, country, city, state, zipCode), 
      // wholesale (1), tax exemption (1 or 2), contact (3: firstName, lastName, phoneNumber)
      let filled = 0;
      // Base total without tax file (when hasTaxExemption is false or null)
      let total = 15;
      if (accountType) filled++;
      if (licenseNumber.trim() !== "") filled++;
      if (salonSize !== "") filled++;
      if (salonStructure !== "") filled++;
      if (businessName.trim() !== "") filled++;
      if (businessAddress.trim() !== "") filled++;
      if (country !== "") filled++;
      if (city.trim() !== "") filled++;
      if (state !== "") filled++;
      if (zipCode.trim() !== "") filled++;
      if (wholesaleAgreed) filled++;
      if (hasTaxExemption !== null) filled++;
      // Only count tax file if user selected yes for tax exemption
      if (hasTaxExemption === true) {
        total = 16; // Add tax file to total
        if (taxExemptFile) filled++;
      }
      if (firstName.trim() !== "") filled++;
      if (lastName.trim() !== "") filled++;
      if (phoneNumber.trim() !== "") filled++;
      return filled / total * 100;
    }

    // Professional: account-type (1), license (1), business-operation (1), business location (6), wholesale (1), tax (1 or 2), contact (3)
    let filled = 0;
    // Base total without tax file
    let total = 14;
    if (accountType) filled++;
    if (licenseNumber.trim() !== "") filled++;
    if (businessOperationType !== null) filled++;
    if (businessName.trim() !== "") filled++;
    if (businessAddress.trim() !== "") filled++;
    if (country !== "") filled++;
    if (city.trim() !== "") filled++;
    if (state !== "") filled++;
    if (zipCode.trim() !== "") filled++;
    if (wholesaleAgreed) filled++;
    if (hasTaxExemption !== null) filled++;
    // Only count tax file if user selected yes for tax exemption
    if (hasTaxExemption === true) {
      total = 15; // Add tax file to total
      if (taxExemptFile) filled++;
    }
    if (firstName.trim() !== "") filled++;
    if (lastName.trim() !== "") filled++;
    if (phoneNumber.trim() !== "") filled++;
    return filled / total * 100;
  };
  const handleNext = () => {
    if (!canContinue()) {
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
        if (accountType === "student") targetStep = "school-info";
        else if (accountType === "professional") targetStep = "license";
        else targetStep = "business-location";
        break;
      case "business-location":
        targetStep = "license";
        break;
      case "school-info":
        targetStep = "wholesale-terms";
        break;
      case "license":
        targetStep = accountType === "professional" ? "business-operation" : "wholesale-terms";
        break;
      case "business-operation":
        targetStep = "business-location";
        break;
      case "wholesale-terms":
        targetStep = accountType === "student" ? "contact-info" : "tax-exemption";
        break;
      case "tax-exemption":
        targetStep = "contact-info";
        break;
      case "contact-info":
        targetStep = "success";
        break;
    }
    
    setNextStep(targetStep);
    setTransitionDirection("forward");
    setIsTransitioning(true);
    setTimeout(() => {
      if (currentStep === "contact-info") {
        setIsSubmitting(true);
        setTimeout(() => {
          setIsSubmitting(false);
          setCurrentStep("success");
          toast.success("Submitted. Our team will review and notify you within 24 hours.");
          setNextStep(null);
        }, 1500);
      } else {
        setCurrentStep(targetStep);
      }
      setIsTransitioning(false);
      setNextStep(null);
    }, 150);
  };
  const handleBack = () => {
    // Calculate previous step for skeleton
    let targetStep: Step = currentStep;
    switch (currentStep) {
      case "account-type":
        targetStep = "onboarding";
        break;
      case "license":
        targetStep = accountType === "professional" ? "account-type" : "business-location";
        break;
      case "business-operation":
        targetStep = "license";
        break;
      case "business-location":
        targetStep = accountType === "professional" ? "business-operation" : "account-type";
        break;
      case "school-info":
        targetStep = "account-type";
        break;
      case "wholesale-terms":
        if (accountType === "student") targetStep = "school-info";
        else if (accountType === "professional") targetStep = "business-location";
        else targetStep = "license";
        break;
      case "tax-exemption":
        targetStep = "wholesale-terms";
        break;
      case "contact-info":
        targetStep = accountType === "student" ? "wholesale-terms" : "tax-exemption";
        break;
    }
    
    setNextStep(targetStep);
    setTransitionDirection("backward");
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentStep(targetStep);
      setIsTransitioning(false);
      setNextStep(null);
    }, 150);
  };
  const getTotalSteps = () => {
    // Student: account-type, school-info, wholesale-terms, contact-info = 4 steps
    // Professional: 7 steps (account-type, license, business-operation, business-location, wholesale-terms, tax-exemption, contact-info)
    // Salon: 6 steps
    if (accountType === "student") return 4;
    if (accountType === "professional") return 7;
    return 6;
  };
  const getCurrentStepNumber = () => {
    if (currentStep === "account-type") return 1;
    if (accountType === "student") {
      // Student flow
      if (currentStep === "school-info") return 2;
      if (currentStep === "wholesale-terms") return 3;
      if (currentStep === "contact-info") return 4;
      return 4;
    }
    if (accountType === "professional") {
      // Professional flow: account-type, license, business-operation, business-location, wholesale-terms, tax-exemption, contact-info
      if (currentStep === "license") return 2;
      if (currentStep === "business-operation") return 3;
      if (currentStep === "business-location") return 4;
      if (currentStep === "wholesale-terms") return 5;
      if (currentStep === "tax-exemption") return 6;
      if (currentStep === "contact-info") return 7;
      return 7;
    }
    // Salon flow
    if (currentStep === "business-location") return 2;
    if (currentStep === "license") return 3;
    if (currentStep === "wholesale-terms") return 4;
    if (currentStep === "tax-exemption") return 5;
    if (currentStep === "contact-info") return 6;
    return 6;
  };
  const getStepFromNumber = (stepNum: number): Step => {
    if (accountType === "student") {
      // Student flow
      switch (stepNum) {
        case 1:
          return "account-type";
        case 2:
          return "school-info";
        case 3:
          return "wholesale-terms";
        case 4:
          return "contact-info";
        default:
          return "account-type";
      }
    }
    if (accountType === "professional") {
      // Professional flow
      switch (stepNum) {
        case 1:
          return "account-type";
        case 2:
          return "license";
        case 3:
          return "business-operation";
        case 4:
          return "business-location";
        case 5:
          return "wholesale-terms";
        case 6:
          return "tax-exemption";
        case 7:
          return "contact-info";
        default:
          return "account-type";
      }
    }
    // Salon flow
    switch (stepNum) {
      case 1:
        return "account-type";
      case 2:
        return "business-location";
      case 3:
        return "license";
      case 4:
        return "wholesale-terms";
      case 5:
        return "tax-exemption";
      case 6:
        return "contact-info";
      default:
        return "account-type";
    }
  };
  const goToStep = (stepNum: number) => {
    const currentNum = getCurrentStepNumber();
    if (stepNum === currentNum) return;
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
  const showStepIndicator = mode === "signup" && currentStep !== "success" && currentStep !== "onboarding";
  return <div className="min-h-screen flex items-center justify-center p-4 sm:p-5 lg:p-10">
      {/* Blurred darkened backdrop */}
      <div className="fixed inset-0 bg-foreground/60 backdrop-blur-md cursor-pointer" onClick={() => navigate("/")} />
      
      {/* Modal Container */}
      <div className={cn("relative z-10 bg-background rounded-[20px] sm:rounded-[25px] lg:rounded-[30px] shadow-2xl overflow-hidden flex flex-col lg:flex-row transition-all duration-300", "w-full sm:w-[95vw] lg:w-[90vw] h-[95vh] sm:h-[90vh] max-w-[1400px]")} style={{
      animation: 'modalEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards'
    }}>
        {/* Close Button */}
        <button onClick={() => navigate("/")} className="absolute top-2.5 sm:top-5 right-2.5 sm:right-5 z-20 p-2.5 rounded-full bg-foreground/5 hover:bg-foreground/10 transition-colors" aria-label="Close">
          <X className="w-5 h-5 text-foreground" />
        </button>

        {/* Left Panel - Hero/Branding */}
        <div className="relative hidden lg:flex flex-col w-full lg:w-1/2 h-[200px] sm:h-[250px] lg:h-auto lg:min-h-0 flex-shrink-0 bg-foreground overflow-hidden m-2.5 sm:m-5 mt-0 sm:mt-0 lg:mt-5 rounded-[15px] sm:rounded-[20px]" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
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
          <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-5 lg:p-10 pb-[70px] lg:pb-[80px]">
            {mode === "signin" ? (/* Sign-in content - Static, welcoming for returning users */
            <div className="flex flex-col gap-0 pb-[20px]">
                <div className="inline-flex items-center gap-[5px] md:gap-2.5 px-2.5 md:px-[15px] py-[5px] rounded-full bg-background/10 backdrop-blur-sm border border-background/10 mb-[15px] md:mb-5 lg:mb-[25px] w-fit">
                  <Sparkles className="w-2.5 md:w-[15px] h-2.5 md:h-[15px] text-background/80" />
                  <span className="text-[10px] md:text-xs font-medium text-background/80 uppercase tracking-widest">
                    Welcome Back
                  </span>
                </div>

                <div className="space-y-[5px] mb-2.5 md:mb-[15px] lg:mb-5">
                  <h2 className="text-xl md:text-3xl lg:text-4xl font-light text-background/50 tracking-tight leading-none xl:text-7xl">
                    Great to
                  </h2>
                  <h1 className="text-xl md:text-3xl lg:text-4xl font-semibold text-background tracking-tight leading-none xl:text-7xl">
                    See You Again
                  </h1>
                </div>

                <p className="text-xs md:text-sm lg:text-base text-background/50 md:whitespace-nowrap mb-10 lg:mb-[60px]">
                  Your pro account is waiting for you
                </p>
                {/* Testimonial Carousel */}
                <div className="hidden xl:block">
                  <TestimonialCarousel />
                </div>
              </div>) : (/* Sign-up content - Carousel slides */
            <div key={currentSlide} className="flex flex-col gap-0 pb-[20px]">
                {/* Eyebrow */}
                <div style={{
                animationDelay: '100ms',
                animationFillMode: 'forwards'
              }} className="inline-flex items-center gap-[5px] md:gap-2.5 px-2.5 md:px-[15px] py-[5px] rounded-full bg-background/10 backdrop-blur-sm border border-background/10 mb-[15px] md:mb-5 lg:mb-[25px] w-fit opacity-0 animate-fade-in pl-[10px]">
                  <BadgeCheck className="w-2.5 md:w-[15px] h-2.5 md:h-[15px] text-background/80" />
                  <span className="text-[10px] md:text-xs font-medium text-background/80 uppercase tracking-widest">
                    {slide.eyebrow}
                  </span>
                </div>

                {/* Large Typography */}
                <div className="space-y-[5px] mb-2.5 md:mb-[15px] lg:mb-5">
                  <h2 className="text-xl md:text-3xl lg:text-4xl font-light text-background/50 tracking-tight leading-none xl:text-7xl opacity-0 animate-fade-in" style={{
                  animationDelay: '200ms',
                  animationFillMode: 'forwards'
                }}>
                    {slide.title}
                  </h2>
                  <h1 className="text-xl md:text-3xl lg:text-4xl font-semibold text-background tracking-tight leading-none xl:text-7xl opacity-0 animate-fade-in" style={{
                  animationDelay: '300ms',
                  animationFillMode: 'forwards'
                }}>
                    {slide.highlight}
                  </h1>
                </div>

                <p className="text-xs md:text-sm lg:text-base text-background/50 md:whitespace-nowrap mb-10 lg:mb-[60px] opacity-0 animate-fade-in" style={{
                animationDelay: '400ms',
                animationFillMode: 'forwards'
              }}>
                  {slide.description}
                </p>

                {/* Feature Pills - Slides with content */}
                <div className="hidden xl:flex flex-wrap gap-2.5">
                  {features.map((feature, i) => <MagneticFeatureBox key={i} icon={feature.icon} label={feature.label} desc={feature.desc} />)}
                </div>
              </div>)}
          </div>
        </div>

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
              <button onClick={goToPrevSlide} className="p-2.5 rounded-full bg-background/5 border border-background/10 hover:bg-background/10 transition-all">
                <ChevronLeft className="w-[15px] h-[15px] text-background/70" />
              </button>
              <button onClick={goToNextSlide} className="p-2.5 rounded-full bg-background/5 border border-background/10 hover:bg-background/10 transition-all">
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
      <div ref={mainContentRef} className="flex-1 flex flex-col bg-background lg:rounded-r-[20px] overflow-auto">
        {/* Header - fixed height to keep toggle position consistent */}
        <header className="relative flex items-center p-2.5 sm:p-5 lg:p-[25px] min-h-[60px] sm:min-h-[70px] lg:min-h-[80px]">
          {/* Auth Toggle - Left aligned */}
          <div className="inline-flex bg-muted/60 backdrop-blur-sm rounded-full p-[5px] border border-border/30 relative">
            {/* Sliding pill indicator */}
            <div className="absolute top-[5px] bottom-[5px] rounded-full bg-foreground shadow-lg shadow-foreground/10 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]" style={{
              left: mode === "signup" ? "5px" : "50%",
              width: "calc(50% - 5px)"
            }} />
            <button onClick={() => handleModeChange("signup")} className={cn("relative z-10 px-[15px] sm:px-[20px] py-2 sm:py-[10px] rounded-full text-sm font-medium transition-colors duration-300", mode === "signup" ? "text-background" : "text-muted-foreground hover:text-foreground")}>
              Sign up
            </button>
            <button onClick={() => handleModeChange("signin")} className={cn("relative z-10 px-[15px] sm:px-[20px] py-2 sm:py-[10px] rounded-full text-sm font-medium transition-colors duration-300", mode === "signin" ? "text-background" : "text-muted-foreground hover:text-foreground")}>
              Sign in
            </button>
          </div>
          
          {/* Step Indicator - Right aligned on mobile, centered on desktop */}
          {showStepIndicator && <div className="absolute right-10 sm:right-12 lg:right-auto lg:left-1/2 lg:-translate-x-1/2 flex items-center justify-center">
              {/* Dial container with mask for fade effect */}
              <div className="relative flex items-center justify-center overflow-hidden" style={{
              width: '160px',
              maskImage: 'linear-gradient(to right, transparent 0%, white 25%, white 75%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, white 25%, white 75%, transparent 100%)'
            }}>
                {/* Sliding track that moves based on current step */}
                <div className="flex items-center gap-[12px] transition-transform duration-500 ease-out" style={{
                transform: `translateX(${(getTotalSteps() / 2 - getCurrentStepNumber() + 0.5) * 32}px)`
              }}>
                  {Array.from({
                  length: getTotalSteps()
                }, (_, i) => {
                  const stepNum = i + 1;
                  const currentStepNum = getCurrentStepNumber();
                  const distance = Math.abs(stepNum - currentStepNum);
                  const isActive = stepNum === currentStepNum;
                  const isCompleted = stepNum < currentStepNum;

                  // Calculate opacity based on distance from center
                  const opacity = isActive ? 1 : distance === 1 ? 0.6 : distance === 2 ? 0.3 : 0.15;
                  // Calculate scale based on distance
                  const scale = isActive ? 1 : distance === 1 ? 0.85 : 0.7;
                  return <button key={i} onClick={() => goToStep(stepNum)} className="flex items-center gap-[12px] cursor-pointer hover:opacity-100 transition-opacity" style={{
                    opacity,
                    transform: `scale(${scale})`,
                    transition: 'all 0.5s ease-out'
                  }}>
                        <div className={cn("relative flex items-center justify-center transition-all duration-500", isActive ? "w-[32px] h-[32px]" : "w-[20px] h-[20px]")}>
                          {/* Active step glow ring */}
                          {isActive && <div className="absolute inset-0 rounded-full border border-foreground/30 animate-pulse" style={{
                        boxShadow: '0 0 16px hsl(var(--foreground) / 0.15)'
                      }} />}
                          <div className={cn("rounded-full transition-all duration-500 flex items-center justify-center font-semibold", isActive ? "w-[24px] h-[24px] bg-foreground text-background text-[10px]" : completedSteps.has(stepNum) ? "w-[20px] h-[20px] bg-foreground text-background" : "w-[20px] h-[20px] bg-border/60 text-muted-foreground text-[9px]")}>
                            {completedSteps.has(stepNum) && !isActive ? <Check className="w-[10px] h-[10px]" strokeWidth={3} /> : <span>{stepNum}</span>}
                          </div>
                        </div>
                      </button>;
                })}
                </div>
              </div>
            </div>}
        </header>

        {/* Mobile/Tablet Hero Banner - Collapses on scroll down, slides in on scroll up */}
        {(mode === 'signin' || currentStep === 'account-type' || currentStep === 'onboarding') && (
          <div 
            className={cn(
              "lg:hidden transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] overflow-hidden",
              mobileHeroVisible 
                ? "max-h-[200px] opacity-100" 
                : "max-h-0 opacity-0"
            )}
          >
            <div 
              className={cn(
                "rounded-[15px] mx-2.5 sm:mx-4 p-4 sm:p-5 overflow-hidden relative transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                mobileHeroVisible ? "translate-y-0" : "-translate-y-4"
              )}
            >
              {/* Hero image background */}
              <img src={salonHero} alt="Professional salon" className="absolute inset-0 w-full h-full object-cover rounded-[15px]" />
              {/* Dark overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 to-foreground/60 rounded-[15px]" />
              
              <div className="relative z-10 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-background/10 backdrop-blur-sm border border-background/10 mb-2 animate-fade-in">
                    <BadgeCheck className="w-2 h-2 text-background/80" />
                    <span className="text-[8px] font-medium text-background/80 uppercase tracking-widest">
                      {mode === "signin" ? "Welcome Back" : "Exclusively Professional"}
                    </span>
                  </div>
                  <div className="space-y-0.5 animate-fade-in" style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}>
                    <h2 className="text-lg sm:text-xl font-semibold text-background leading-tight">
                      {mode === "signin" ? "Great to See You Again" : "Apply for a pro account"}
                    </h2>
                  </div>
                  <p className="text-xs text-background/50 mt-1 hidden sm:block animate-fade-in" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
                    {mode === "signin" ? "Your pro account is waiting for you" : "Cosmetology license, proof of student status, or equivalent required to shop."}
                  </p>
                </div>
                
                {/* Mini stats */}
                <div className="flex gap-3 sm:gap-4">
                  <div className="text-center animate-slide-up-fade" style={{ animationDelay: '250ms', animationFillMode: 'both' }}>
                    <div className="text-base sm:text-lg font-semibold text-background">8K+</div>
                    <div className="text-[9px] text-background/40 uppercase">Pros</div>
                  </div>
                  <div className="text-center animate-slide-up-fade" style={{ animationDelay: '350ms', animationFillMode: 'both' }}>
                    <div className="text-base sm:text-lg font-semibold text-background">50%</div>
                    <div className="text-[9px] text-background/40 uppercase">Savings</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <main ref={mainScrollRef} className="flex-1 flex items-start justify-center px-2.5 sm:px-5 md:px-[25px] lg:px-[30px] py-5 overflow-y-auto">
          {isTransitioning ? (
            <div className="w-full max-w-lg">
              <FormSkeleton variant={
                (nextStep || currentStep) === "account-type" ? "account-type" :
                (nextStep || currentStep) === "license" || (nextStep || currentStep) === "school-info" ? "license" :
                (nextStep || currentStep) === "business-location" ? "location" :
                (nextStep || currentStep) === "business-operation" ? "business-operation" :
                (nextStep || currentStep) === "wholesale-terms" || (nextStep || currentStep) === "tax-exemption" ? "terms" :
                (nextStep || currentStep) === "contact-info" ? "contact" : "default"
              } />
            </div>
          ) : (
            <div key={currentStep} className={cn("w-full max-w-lg", transitionDirection === "forward" ? "animate-step-enter-right" : "animate-step-enter-left")}>
              {mode === "signin" ? <SignInForm email={email} password={password} onEmailChange={setEmail} onPasswordChange={setPassword} onSignUp={() => {
                setMode("signup");
                setCurrentStep("onboarding");
              }} /> : <>
                  {currentStep === "onboarding" && <OnboardingForm onContinue={handleNext} onSignIn={() => setMode("signin")} />}
                  {currentStep === "account-type" && <AccountTypeForm selectedType={accountType} onSelect={setAccountType} validationStatus={getStepValidationStatus(accountType !== null, true, showValidationErrors)} />}
                  {currentStep === "license" && <LicenseForm accountType={accountType} licenseNumber={licenseNumber} salonSize={salonSize} salonStructure={salonStructure} licenseFile={licenseFile} licenseProofFiles={licenseProofFiles} onLicenseChange={setLicenseNumber} onSalonSizeChange={setSalonSize} onSalonStructureChange={setSalonStructure} onLicenseFileChange={setLicenseFile} onLicenseProofFilesChange={setLicenseProofFiles} showValidationErrors={showValidationErrors} validationStatus={getStepValidationStatus(accountType === "salon" ? licenseNumber.trim() !== "" && salonSize !== "" && salonStructure !== "" : licenseNumber.trim() !== "", licenseNumber.trim() !== "" || salonSize !== "" || salonStructure !== "", showValidationErrors)} />}
                  {currentStep === "business-operation" && <BusinessOperationForm businessOperationType={businessOperationType} onBusinessOperationTypeChange={setBusinessOperationType} showValidationErrors={showValidationErrors} validationStatus={getStepValidationStatus(businessOperationType !== null, false, showValidationErrors)} />}
                  {currentStep === "business-location" && <BusinessLocationForm accountType={accountType} businessName={businessName} businessAddress={businessAddress} suiteNumber={suiteNumber} country={country} city={city} state={state} zipCode={zipCode} onBusinessNameChange={setBusinessName} onBusinessAddressChange={setBusinessAddress} onSuiteNumberChange={setSuiteNumber} onCountryChange={setCountry} onCityChange={setCity} onStateChange={setState} onZipCodeChange={setZipCode} showValidationErrors={showValidationErrors} validationStatus={getStepValidationStatus(businessName.trim() !== "" && businessAddress.trim() !== "" && country !== "" && city.trim() !== "" && state !== "" && zipCode.trim() !== "", businessName.trim() !== "" || businessAddress.trim() !== "" || city.trim() !== "" || zipCode.trim() !== "", showValidationErrors)} />}
                  {currentStep === "school-info" && <SchoolInfoForm schoolName={schoolName} schoolState={schoolState} enrollmentProofFiles={enrollmentProofFiles} onSchoolNameChange={setSchoolName} onSchoolStateChange={setSchoolState} onEnrollmentProofFilesChange={setEnrollmentProofFiles} showValidationErrors={showValidationErrors} validationStatus={getStepValidationStatus(schoolName.trim() !== "" && schoolState !== "" && enrollmentProofFiles.length > 0, schoolName.trim() !== "" || schoolState !== "" || enrollmentProofFiles.length > 0, showValidationErrors)} />}
                  {currentStep === "wholesale-terms" && <WholesaleTermsForm accountType={accountType} agreed={wholesaleAgreed} onAgreeChange={setWholesaleAgreed} showValidationErrors={showValidationErrors} validationStatus={getStepValidationStatus(wholesaleAgreed, false, showValidationErrors)} />}
                  {currentStep === "tax-exemption" && <TaxExemptionForm accountType={accountType} hasTaxExemption={hasTaxExemption} taxExemptFile={taxExemptFile} onTaxExemptionChange={setHasTaxExemption} onTaxExemptFileChange={setTaxExemptFile} showValidationErrors={showValidationErrors} validationStatus={getStepValidationStatus(hasTaxExemption !== null && (hasTaxExemption === false || taxExemptFile !== null), hasTaxExemption !== null, showValidationErrors)} />}
                  {currentStep === "contact-info" && <ContactInfoForm accountType={accountType} firstName={firstName} lastName={lastName} preferredName={preferredName} phoneNumber={phoneNumber} phoneCountryCode={phoneCountryCode} onFirstNameChange={setFirstName} onLastNameChange={setLastName} onPreferredNameChange={setPreferredName} onPhoneNumberChange={value => setPhoneNumber(formatPhoneNumber(value))} onPhoneCountryCodeChange={setPhoneCountryCode} subscribeOrderUpdates={subscribeOrderUpdates} subscribeMarketing={subscribeMarketing} subscribePromotions={subscribePromotions} onSubscribeOrderUpdatesChange={setSubscribeOrderUpdates} onSubscribeMarketingChange={setSubscribeMarketing} onSubscribePromotionsChange={setSubscribePromotions} showValidationErrors={showValidationErrors} validationStatus={getStepValidationStatus(firstName.trim() !== "" && lastName.trim() !== "" && isValidPhoneNumber(phoneNumber), firstName.trim() !== "" || lastName.trim() !== "" || phoneNumber.trim() !== "", showValidationErrors)} uploadedFiles={[
                    ...(licenseFile ? [{ file: licenseFile, label: accountType === "salon" ? "Salon License" : "License" }] : []),
                    ...(accountType === "professional" ? licenseProofFiles.map((f, i) => ({ file: f, label: `License Photo ${licenseProofFiles.length > 1 ? i + 1 : ""}`.trim() })) : []),
                    ...(accountType === "student" ? enrollmentProofFiles.map((f, i) => ({ file: f, label: `Enrollment Proof ${enrollmentProofFiles.length > 1 ? i + 1 : ""}`.trim() })) : []),
                    ...(taxExemptFile ? [{ file: taxExemptFile, label: "Tax Exemption Document" }] : [])
                  ]} />}
                  {currentStep === "success" && <SuccessForm />}
                </>}
            </div>
          )}
        </main>

        {/* Spotlight overlay when form is ready to submit */}
        {showSpotlight && <div className={cn("absolute inset-0 bg-background/60 backdrop-blur-sm z-40 pointer-events-none transition-opacity duration-500", isSpotlightFadingOut ? "opacity-0" : "animate-fade-in")} />}

        {/* Footer */}
        {(mode === "signin" || mode === "signup" && currentStep !== "success") && <footer className={cn("p-2.5 sm:p-5 lg:p-[25px] pt-0 pb-5 sm:pb-[25px] lg:pb-[30px]", showSpotlight && "relative z-50")}>
            <div className="max-w-lg mx-auto flex flex-col gap-[10px]">
              {/* Step label above buttons */}
              {showStepIndicator && <div className={cn("text-center", showSpotlight && "opacity-0")}>
                  <span className="text-[11px] text-muted-foreground/60 tracking-wider">
                    Step {getCurrentStepNumber().toString().padStart(2, '0')} / {getTotalSteps().toString().padStart(2, '0')}
                  </span>
                </div>}
              <div className="flex gap-[15px]">
                {mode === "signup" && currentStep !== "onboarding" && <Button variant="outline" size="lg" onClick={handleBack} className={cn("h-[55px] w-[55px] p-0 rounded-[15px] border-border/40 hover:bg-muted/50 hover:border-foreground/20 btn-lift group", showSpotlight && "opacity-0 pointer-events-none")}>
                    <ArrowLeft className="w-[18px] h-[18px] transition-transform duration-300 group-hover:-translate-x-0.5" />
                  </Button>}
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex-1">
                        <Button size="lg" onClick={handleNext} disabled={currentStep === "contact-info" ? !isAllStepsValid() || isSubmitting : !canContinue() || isSubmitting} className={cn("btn-premium w-full h-[55px] rounded-[15px] bg-foreground text-background hover:bg-foreground disabled:opacity-40 font-medium text-base tracking-wide group active:scale-[0.98] transition-transform", showSpotlight && "animate-spotlight-button shadow-[0_0_30px_10px_rgba(0,0,0,0.15)] dark:shadow-[0_0_30px_10px_rgba(255,255,255,0.15)]")}>
                          <span className="relative z-10 flex items-center justify-center gap-[10px]">
                            {isSubmitting ? <>
                                <Loader2 className="w-[18px] h-[18px] animate-spin" />
                                Creating account...
                              </> : <>
                                {mode === "signin" ? "Sign in" : currentStep === "onboarding" ? "Get Started" : currentStep === "contact-info" ? "Create Account" : "Continue"}
                                <ArrowRight className="w-[18px] h-[18px] transition-all duration-300 group-hover:w-[24px] group-hover:translate-x-0.5" />
                              </>}
                          </span>
                        </Button>
                      </div>
                    </TooltipTrigger>
                    {currentStep === "contact-info" && !isAllStepsValid() && getIncompleteSteps().length > 0 && <TooltipContent side="top" className="bg-foreground text-background border-none px-4 py-3 rounded-xl max-w-[280px]">
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-background/70">Complete these steps first:</p>
                          <div className="space-y-1.5">
                            {getIncompleteSteps().map(({
                          step,
                          name
                        }) => <button key={step} onClick={() => goToStep(step)} className="flex items-center gap-2 w-full hover:bg-background/10 rounded-lg px-2 py-1.5 -mx-2 transition-colors cursor-pointer group/step">
                                <div className="w-5 h-5 rounded-full bg-background/20 group-hover/step:bg-background/30 flex items-center justify-center flex-shrink-0 transition-colors">
                                  <span className="text-[10px] font-semibold">{step}</span>
                                </div>
                                <span className="text-sm">{name}</span>
                                <ArrowRight className="w-3 h-3 text-background/50 ml-auto flex-shrink-0 opacity-0 group-hover/step:opacity-100 transition-opacity" />
                              </button>)}
                          </div>
                        </div>
                      </TooltipContent>}
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </footer>}
      </div>
      </div>
    </div>;
};

// Sub-components

const SignInForm = ({
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onSignUp
}: {
  email: string;
  password: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSignUp: () => void;
}) => <div className="space-y-[clamp(15px,4vh,30px)] text-center">
    <div className="space-y-[12px] animate-stagger-1">
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-foreground tracking-[-0.02em] leading-[1.1] font-display whitespace-nowrap">
        Welcome back
      </h1>
      <p className="text-sm sm:text-base text-muted-foreground/70 leading-relaxed">
        Sign in to access your pro account
      </p>
    </div>


    <div className="space-y-[clamp(12px,2.5vh,20px)] animate-stagger-3">
      <div className="space-y-2.5">
        <Label htmlFor="login-email" className="text-xs font-medium text-muted-foreground uppercase tracking-[0.1em] label-float transition-all duration-300 group-focus-within:text-foreground text-left block">
          Email address
        </Label>
        <div className="relative group input-ultra input-ripple rounded-[15px]">
          <div className="absolute left-[15px] top-1/2 -translate-y-1/2 w-[35px] h-[35px] rounded-[12px] bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center transition-all duration-500 group-focus-within:from-foreground group-focus-within:to-foreground/80 group-focus-within:shadow-lg group-focus-within:shadow-foreground/10">
            <Mail className="w-[15px] h-[15px] text-muted-foreground group-focus-within:text-background transition-all duration-300 icon-haptic" />
          </div>
          <Input id="login-email" type="email" placeholder="you@example.com" value={email} onChange={e => onEmailChange(e.target.value)} className="h-[60px] pl-[60px] rounded-[15px] bg-muted/30 border-border/30 focus:border-foreground/20 focus:bg-background transition-all duration-500 text-base placeholder:text-muted-foreground/40 focus:shadow-[inset_0_0_20px_rgba(0,0,0,0.03)]" />
        </div>
      </div>

      <PasswordInputField id="login-password" label="Password" value={password} onChange={onPasswordChange} placeholder="••••••••" />

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2.5 cursor-pointer group">
          <div className="relative w-[18px] h-[18px]">
            <input type="checkbox" className="peer sr-only" />
            <div className="w-full h-full rounded-[5px] border-2 border-border/50 bg-muted/30 peer-checked:bg-foreground peer-checked:border-foreground transition-all duration-300 peer-focus-visible:ring-2 peer-focus-visible:ring-foreground/20 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background" />
            <Check className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-background opacity-0 peer-checked:opacity-100 transition-opacity duration-200" />
          </div>
          <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">Remember me</span>
        </label>

        <button className="group inline-flex items-center gap-[5px] text-sm text-muted-foreground hover:text-foreground transition-all duration-300">
          <span className="relative">
            Forgot password?
            <span className="absolute left-0 bottom-0 w-0 h-px bg-foreground transition-all duration-300 group-hover:w-full" />
          </span>
          <ArrowUpRight className="w-[15px] h-[15px] opacity-0 -translate-x-1 -translate-y-0.5 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-300" />
        </button>
      </div>
    </div>

    <div className="flex items-center justify-center gap-2 sm:gap-3 pt-[clamp(10px,2.5vh,20px)] animate-stagger-4">
      <div className="group flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-gradient-to-br from-foreground/8 to-foreground/3 border border-foreground/10 hover:border-foreground/20 hover:from-foreground/12 hover:to-foreground/6 transition-all duration-300 cursor-default">
        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-foreground/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          <Headphones className="w-3 h-3 sm:w-4 sm:h-4 text-foreground/70" />
        </div>
        <span className="text-[10px] sm:text-xs font-medium text-foreground/80">Support</span>
      </div>
      <div className="group flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-gradient-to-br from-foreground/8 to-foreground/3 border border-foreground/10 hover:border-foreground/20 hover:from-foreground/12 hover:to-foreground/6 transition-all duration-300 cursor-default">
        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-foreground/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          <Users className="w-3 h-3 sm:w-4 sm:h-4 text-foreground/70" />
        </div>
        <span className="text-[10px] sm:text-xs font-medium text-foreground/80">Community</span>
      </div>
      <div className="group flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-gradient-to-br from-foreground/8 to-foreground/3 border border-foreground/10 hover:border-foreground/20 hover:from-foreground/12 hover:to-foreground/6 transition-all duration-300 cursor-default">
        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-foreground/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          <Tag className="w-3 h-3 sm:w-4 sm:h-4 text-foreground/70" />
        </div>
        <span className="text-[10px] sm:text-xs font-medium text-foreground/80">Pro Pricing</span>
      </div>
    </div>


    <p className="text-xs text-muted-foreground text-center pt-2">
      Don't have an account?{" "}
      <button onClick={onSignUp} className="text-foreground underline underline-offset-2 hover:no-underline">
        Sign up
      </button>
    </p>
  </div>;
const OnboardingForm = ({
  onContinue,
  onSignIn
}: {
  onContinue: () => void;
  onSignIn: () => void;
}) => <div className="space-y-6 sm:space-y-8">

    {/* Hero section */}
    <div className="text-center space-y-3 animate-stagger-1">
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-foreground tracking-[-0.02em] leading-[1.1] font-display">
        Let's get started
      </h1>
      <p className="text-sm sm:text-base text-muted-foreground/70 leading-relaxed max-w-sm mx-auto">
        Unlock wholesale pricing on the industries best hair and tools.
      </p>
    </div>

    {/* Trust badges */}
    <div className="flex flex-wrap justify-center gap-2 animate-stagger-2">
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20">
        <Check className="w-3 h-3 text-green-600" />
        <span className="text-[11px] text-green-700 font-medium">Professional only</span>
      </div>
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 border border-border/50">
        <Users className="w-3 h-3 text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground">Exclusive community</span>
      </div>
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 border border-border/50">
        <GraduationCap className="w-3 h-3 text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground">Advanced education</span>
      </div>
    </div>

    {/* Steps preview */}
    <div className="grid gap-3 pt-2">
      {[{
      icon: User,
      label: "Tell us who you are"
    }, {
      icon: FileCheck,
      label: "Provide your license number"
    }, {
      icon: Tag,
      label: "Follow post-approval instructions to finalize account"
    }].map((item, i) => <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-muted/50 to-transparent border border-border/50 text-left opacity-0 animate-fade-in" style={{
      animationDelay: `${200 + i * 100}ms`,
      animationFillMode: 'forwards'
    }}>
            <div className="relative w-12 h-12 rounded-xl bg-foreground flex items-center justify-center flex-shrink-0">
              <item.icon className="w-5 h-5 text-background" />
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-background border-2 border-foreground flex items-center justify-center">
                <span className="text-[9px] font-bold text-foreground">{i + 1}</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{item.label}</p>
            </div>
          </div>)}
    </div>

    {/* Benefits highlight with animated counters */}
    <div className="flex justify-center gap-6 pt-2 text-center animate-stagger-3">
      <div>
        <div className="text-2xl font-semibold text-foreground">
          <AnimatedNumber value={50} suffix="%" delay={200} />
        </div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg. Savings</div>
      </div>
      <div className="w-px bg-border" />
      <div>
        <div className="text-2xl font-semibold text-foreground">
          <AnimatedNumber value={8} suffix="K+" delay={400} />
        </div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Pro Stylists</div>
      </div>
      <div className="w-px bg-border" />
      <div>
        <div className="text-2xl font-semibold text-foreground">
          <AnimatedNumber value={24} suffix="hr" delay={600} />
        </div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Approval</div>
      </div>
    </div>

    <p className="text-xs text-muted-foreground text-center">
      Already have an account?{" "}
      <button onClick={onSignIn} className="inline-flex items-center gap-1 text-foreground font-medium underline underline-offset-2 hover:text-foreground/80 transition-all duration-200 group">
        Sign in
        <ArrowUpRight className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </button>
    </p>
  </div>;
const AccountTypeForm = ({
  selectedType,
  onSelect,
  validationStatus
}: {
  selectedType: string | null;
  onSelect: (type: string) => void;
  validationStatus: "complete" | "in-progress" | "error";
}) => {
  const types = [{
    id: "professional",
    icon: User,
    title: "Licensed Stylist",
    description: "Commission, or Independent Stylist",
    features: ["Pro wholesale pricing", "Stylist to stylist priority support", "Community access"]
  }, {
    id: "salon",
    icon: Building2,
    title: "Salon Owner or Manager",
    description: "Business accounts",
    features: ["Team accounts", "Bulk discounts", "Salon owner only community"]
  }, {
    id: "student",
    icon: GraduationCap,
    title: "Student",
    description: "Currently enrolled",
    features: ["Student pricing", "Learning resources", "Community access"]
  }];
  return <div className="space-y-5 sm:space-y-[30px]">
      <div className="space-y-[10px] text-center animate-stagger-1">
        <div className="inline-flex items-center gap-2.5 px-[15px] py-[6px] rounded-full bg-muted border border-border/50 mb-[5px] animate-badge-pop">
          <StepValidationIcon status={validationStatus} />
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
            Step 1
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-foreground tracking-[-0.02em] leading-[1.1] font-display">
          Tell us who you are
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground/70 leading-relaxed">
          Select the account type that fits you best.
        </p>
      </div>

      <div className="space-y-2.5 sm:space-y-[15px]">
        {types.map((type, index) => <button key={type.id} onClick={() => onSelect(type.id)} className={cn("relative w-full p-[15px] sm:p-5 rounded-[15px] sm:rounded-[20px] border-2 text-left group overflow-hidden", "transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)]", "hover:-translate-y-0.5 active:scale-[0.98]", selectedType === type.id ? "border-foreground bg-foreground/5 shadow-lg shadow-foreground/5" : "border-border hover:border-foreground/30 hover:bg-muted/50 hover:shadow-md hover:shadow-foreground/5")} style={{
        animationDelay: `${index * 0.05}s`,
        transform: selectedType === type.id ? 'translateY(-2px)' : undefined
      }}>
            {/* Selection ripple effect */}
            <div className={cn("absolute inset-0 bg-gradient-to-r from-foreground/5 via-foreground/10 to-foreground/5 opacity-0 transition-opacity duration-500", selectedType === type.id && "opacity-100")} />
            
            {/* Shine sweep on selection */}
            <div className={cn("absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-foreground/10 to-transparent skew-x-12 transition-transform duration-700", selectedType === type.id && "translate-x-full")} />

            {/* Check mark with bounce animation */}
            <div className={cn("absolute top-[15px] sm:top-5 right-[15px] sm:right-5 w-6 h-6 rounded-full bg-foreground flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]", selectedType === type.id ? "scale-100 opacity-100" : "scale-0 opacity-0")}>
              <Check className={cn("w-[14px] h-[14px] text-background transition-transform duration-300 delay-100", selectedType === type.id ? "scale-100" : "scale-0")} strokeWidth={3} />
            </div>

            <div className="relative">
              {/* Top row: Icon + Content */}
              <div className="flex items-start gap-[15px] sm:gap-5">
                {/* Icon with haptic bounce */}
                <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-[10px] sm:rounded-[15px] flex items-center justify-center flex-shrink-0 transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)]", selectedType === type.id ? "bg-foreground scale-110 shadow-lg shadow-foreground/20" : "bg-muted group-hover:scale-105 group-hover:bg-muted/80")}>
                  <type.icon className={cn("w-5 h-5 sm:w-6 sm:h-6 transition-all duration-300", selectedType === type.id ? "text-background scale-110" : "text-foreground group-hover:scale-105")} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm sm:text-base font-medium text-foreground transition-all duration-300", selectedType === type.id && "translate-x-0.5")}>{type.title}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{type.description}</p>
                  {/* Features - inline on desktop */}
                  <div className="hidden sm:flex flex-wrap gap-[5px] mt-2.5">
                    {type.features.map((feature, i) => <span key={i} className={cn("text-[10px] px-2.5 py-[5px] rounded-full transition-all duration-300", selectedType === type.id ? "bg-foreground/10 text-foreground" : "bg-muted text-muted-foreground")} style={{
                  transitionDelay: `${i * 50}ms`
                }}>
                        {feature}
                      </span>)}
                  </div>
                </div>
              </div>
              
              {/* Features - Full width row on mobile */}
              <div className="flex sm:hidden flex-wrap gap-[5px] mt-3 pt-3 border-t border-border/40">
                {type.features.map((feature, i) => <span key={i} className={cn("text-[10px] px-2.5 py-[5px] rounded-full transition-all duration-300", selectedType === type.id ? "bg-foreground/10 text-foreground" : "bg-muted text-muted-foreground")} style={{
              transitionDelay: `${i * 50}ms`
            }}>
                    {feature}
                  </span>)}
              </div>
            </div>
          </button>)}
      </div>

      {/* Non-professional link */}
      <p className="text-center text-sm text-muted-foreground">
        Not a professional? Find a stylist/retailer{" "}
        <a 
          href="#" 
          className="inline-flex items-center gap-1 text-foreground font-medium underline underline-offset-2 hover:text-foreground/80 transition-all duration-200 group"
        >
          here
          <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>
      </p>
    </div>;
};
const salonSizes = ["1-3 stylists", "4-10 stylists", "11-25 stylists", "26+ stylists"];
const salonStructures = ["Booth Rental", "Commission-based", "Hybrid", "Owner-operated"];
const LicenseForm = ({
  accountType,
  licenseNumber,
  salonSize,
  salonStructure,
  licenseFile,
  licenseProofFiles,
  onLicenseChange,
  onSalonSizeChange,
  onSalonStructureChange,
  onLicenseFileChange,
  onLicenseProofFilesChange,
  showValidationErrors = false,
  validationStatus
}: {
  accountType: string | null;
  licenseNumber: string;
  salonSize: string;
  salonStructure: string;
  licenseFile: File | null;
  licenseProofFiles: File[];
  onLicenseChange: (value: string) => void;
  onSalonSizeChange: (value: string) => void;
  onSalonStructureChange: (value: string) => void;
  onLicenseFileChange: (file: File | null) => void;
  onLicenseProofFilesChange: (files: File[]) => void;
  showValidationErrors?: boolean;
  validationStatus: "complete" | "in-progress" | "error";
}) => {
  const isSalon = accountType === "salon";
  const licenseError = showValidationErrors && licenseNumber.trim() === "";
  const salonSizeError = showValidationErrors && isSalon && salonSize === "";
  const salonStructureError = showValidationErrors && isSalon && salonStructure === "";
  const stepNumber = accountType === "salon" ? 3 : 2;
  return <div className="space-y-5 sm:space-y-[30px]">
      <div className="space-y-[10px] text-center animate-stagger-1">
        <div className="inline-flex items-center gap-2.5 px-[15px] py-[6px] rounded-full bg-muted border border-border/50 mb-[5px] animate-badge-pop">
          <StepValidationIcon status={validationStatus} />
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
            Step {stepNumber}
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-foreground tracking-[-0.02em] leading-[1.1] font-display">
          Provide your license number
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground/70 leading-relaxed">
          {isSalon ? "Let us make sure you are a salon manager" : "Enter your cosmetology license details"}
        </p>
      </div>

      <div className="flex gap-[15px] p-5 rounded-[15px] bg-muted/50 border border-border/50 animate-stagger-2">
        <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-[2px]" />
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isSalon ? "We are a manufacturer and supplier of professional products. The prices displayed reflect professional wholesale pricing, not available to the general public." : "We display professional wholesale pricing. Please enter your license exactly as it appears from the state."}
        </p>
      </div>

      <div className="space-y-5">
        {/* License Number */}
        <div className="space-y-2.5">
          <Label htmlFor="license" className={cn("text-sm font-medium label-float", licenseError && "text-destructive")}>
            {isSalon ? "Salon License #*" : "License number*"}
          </Label>
          <div className="relative group input-glow input-ripple rounded-[15px]">
            <Input id="license" type="text" placeholder={isSalon ? "Salon License #" : "Enter your license number"} value={licenseNumber} onChange={e => onLicenseChange(e.target.value)} className={cn("h-[55px] rounded-[15px] bg-muted/50 border-border/50 focus:border-foreground/30 focus:bg-muted transition-all duration-300 text-base focus:shadow-[inset_0_0_20px_rgba(0,0,0,0.03)]", licenseError && "border-destructive/50 bg-destructive/5")} />
          </div>
          {licenseError && <p className="text-xs text-destructive">License number is required</p>}
        </div>

        {/* Salon-specific fields */}
        {isSalon && <>
            {/* Salon Size */}
            <div className="flex items-center justify-between gap-4">
              <Label className={cn("text-sm font-medium whitespace-nowrap", salonSizeError && "text-destructive")}>
                What's the size of your salon?*
              </Label>
              <div className="flex flex-col items-end gap-1">
                <Select value={salonSize} onValueChange={onSalonSizeChange}>
                  <SelectTrigger className={cn("w-[180px] h-[50px] rounded-[15px] border-border/50 bg-muted/50 transition-all duration-300", salonSizeError && "border-destructive/50 bg-destructive/5")}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="rounded-[15px] bg-background border border-border z-50">
                    {salonSizes.map(size => <SelectItem key={size} value={size} className="rounded-[10px] transition-colors duration-200 hover:bg-muted/80">
                        {size}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
                {salonSizeError && <p className="text-xs text-destructive">Required</p>}
              </div>
            </div>

            {/* Salon Structure */}
            <div className="flex items-center justify-between gap-4">
              <Label className={cn("text-sm font-medium whitespace-nowrap", salonStructureError && "text-destructive")}>
                Select your salon structure*
              </Label>
              <div className="flex flex-col items-end gap-1">
                <Select value={salonStructure} onValueChange={onSalonStructureChange}>
                  <SelectTrigger className={cn("w-[180px] h-[50px] rounded-[15px] border-border/50 bg-muted/50 transition-all duration-300", salonStructureError && "border-destructive/50 bg-destructive/5")}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="rounded-[15px] bg-background border border-border z-50">
                    {salonStructures.map(structure => <SelectItem key={structure} value={structure} className="rounded-[10px] transition-colors duration-200 hover:bg-muted/80">
                        {structure}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
                {salonStructureError && <p className="text-xs text-destructive">Required</p>}
              </div>
            </div>

            {/* File Upload */}
            <FileUpload
              file={licenseFile}
              onFileChange={onLicenseFileChange}
              placeholder="Upload your salon license"
            />
          </>}

        {/* Professional-specific file upload (optional) - shows after 3+ characters in license number */}
        {!isSalon && licenseNumber.trim().length >= 3 && (
          <div className="space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
            <Label className="text-sm font-medium">
              Upload license photo <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <MultiFileUpload
              files={licenseProofFiles}
              onFilesChange={onLicenseProofFilesChange}
              placeholder="Upload photos of your license"
              maxFiles={3}
            />
          </div>
        )}
      </div>
    </div>;
};

// Business Operation Form (Step 3 for professionals)
const BusinessOperationForm = ({
  businessOperationType,
  onBusinessOperationTypeChange,
  showValidationErrors = false,
  validationStatus
}: {
  businessOperationType: "commission" | "independent" | null;
  onBusinessOperationTypeChange: (value: "commission" | "independent") => void;
  showValidationErrors?: boolean;
  validationStatus: "complete" | "in-progress" | "error";
}) => {
  const selectionError = showValidationErrors && businessOperationType === null;
  
  return <div className="space-y-5 sm:space-y-[30px]">
    <div className="space-y-[10px] text-center animate-stagger-1">
      <div className="inline-flex items-center gap-2.5 px-[15px] py-[6px] rounded-full bg-muted border border-border/50 mb-[5px] animate-badge-pop">
        <StepValidationIcon status={validationStatus} />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
          Step 3
        </span>
      </div>
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-foreground tracking-[-0.02em] leading-[1.1] font-display">
        How do you operate your business?
      </h1>
      <p className="text-sm sm:text-base text-muted-foreground/70 leading-relaxed">
        Let us know how you handle clientele.
      </p>
    </div>

    <div className="space-y-3 animate-stagger-2">
      <button
        type="button"
        onClick={() => onBusinessOperationTypeChange("commission")}
        className={cn(
          "w-full p-5 rounded-[15px] border-2 text-left transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.99]",
          businessOperationType === "commission"
            ? "border-foreground bg-foreground/5"
            : "border-border/50 hover:border-foreground/30 hover:bg-muted/50",
          selectionError && "border-destructive/50"
        )}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300",
              businessOperationType === "commission"
                ? "border-foreground bg-foreground"
                : "border-muted-foreground/40"
            )}>
              {businessOperationType === "commission" && (
                <div className="w-2 h-2 rounded-full bg-background" />
              )}
            </div>
            <div>
              <p className="font-medium text-foreground">I am a commission stylist</p>
              <p className="text-sm text-muted-foreground/70">I work under a salon and receive commission</p>
            </div>
          </div>
          {/* Illustration */}
          <div className={cn(
            "w-12 h-12 rounded-[12px] flex items-center justify-center transition-all duration-300 flex-shrink-0",
            businessOperationType === "commission"
              ? "bg-foreground/10"
              : "bg-muted/80"
          )}>
            <Building2 className={cn(
              "w-6 h-6 transition-colors duration-300",
              businessOperationType === "commission"
                ? "text-foreground"
                : "text-muted-foreground/60"
            )} />
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onBusinessOperationTypeChange("independent")}
        className={cn(
          "w-full p-5 rounded-[15px] border-2 text-left transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.99]",
          businessOperationType === "independent"
            ? "border-foreground bg-foreground/5"
            : "border-border/50 hover:border-foreground/30 hover:bg-muted/50",
          selectionError && "border-destructive/50"
        )}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300",
              businessOperationType === "independent"
                ? "border-foreground bg-foreground"
                : "border-muted-foreground/40"
            )}>
              {businessOperationType === "independent" && (
                <div className="w-2 h-2 rounded-full bg-background" />
              )}
            </div>
            <div>
              <p className="font-medium text-foreground">I am an independent stylist</p>
              <p className="text-sm text-muted-foreground/70">I operate my own business or rent a chair</p>
            </div>
          </div>
          {/* Illustration */}
          <div className={cn(
            "w-12 h-12 rounded-[12px] flex items-center justify-center transition-all duration-300 flex-shrink-0",
            businessOperationType === "independent"
              ? "bg-foreground/10"
              : "bg-muted/80"
          )}>
            <User className={cn(
              "w-6 h-6 transition-colors duration-300",
              businessOperationType === "independent"
                ? "text-foreground"
                : "text-muted-foreground/60"
            )} />
          </div>
        </div>
      </button>
    </div>

    {selectionError && (
      <p className="text-xs text-destructive text-center">Please select how you operate your business</p>
    )}
  </div>;
};

// Business Location Form (Step 4 for professionals)
const countries = ["United States", "Canada"];
const provinces = ["Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador", "Northwest Territories", "Nova Scotia", "Nunavut", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan", "Yukon"];
const BusinessLocationForm = ({
  accountType,
  businessName,
  businessAddress,
  suiteNumber,
  country,
  city,
  state,
  zipCode,
  onBusinessNameChange,
  onBusinessAddressChange,
  onSuiteNumberChange,
  onCountryChange,
  onCityChange,
  onStateChange,
  onZipCodeChange,
  showValidationErrors = false,
  validationStatus
}: {
  accountType: string | null;
  businessName: string;
  businessAddress: string;
  suiteNumber: string;
  country: string;
  city: string;
  state: string;
  zipCode: string;
  onBusinessNameChange: (value: string) => void;
  onBusinessAddressChange: (value: string) => void;
  onSuiteNumberChange: (value: string) => void;
  onCountryChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onStateChange: (value: string) => void;
  onZipCodeChange: (value: string) => void;
  showValidationErrors?: boolean;
  validationStatus: "complete" | "in-progress" | "error";
}) => {
  const businessNameError = showValidationErrors && businessName.trim() === "";
  const businessAddressError = showValidationErrors && businessAddress.trim() === "";
  const countryError = showValidationErrors && country === "";
  const cityError = showValidationErrors && city.trim() === "";
  const stateError = showValidationErrors && state === "";
  const zipCodeError = showValidationErrors && zipCode.trim() === "";
  const isStudent = accountType === "student";
  const stepNumber = accountType === "professional" ? 4 : 2;
  return <div className="space-y-[25px]">
    <div className="space-y-2.5 text-center animate-stagger-1">
      <div className="inline-flex items-center gap-2.5 px-[15px] py-[6px] rounded-full bg-muted border border-border/50 mb-[5px] animate-badge-pop">
        <StepValidationIcon status={validationStatus} />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
          Step {stepNumber}
        </span>
      </div>
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-foreground tracking-[-0.02em] leading-[1.1] font-display">
        {isStudent ? "Where are you located?" : "Where is your business located?"}
      </h1>
    </div>

    <div className="space-y-4">
      {/* Business Name */}
      <div className="space-y-2.5">
        <Label htmlFor="businessName" className="text-sm font-medium label-float">
          Business or salon name*
        </Label>
        <div className="relative group input-glow input-ripple rounded-[15px]">
          <div className="absolute left-[15px] top-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-[10px] bg-muted flex items-center justify-center transition-all duration-300 group-focus-within:bg-foreground group-focus-within:shadow-lg group-focus-within:shadow-foreground/10">
            <Building2 className="w-[15px] h-[15px] text-muted-foreground group-focus-within:text-background transition-all duration-300 icon-haptic" />
          </div>
          <Input id="businessName" type="text" placeholder="Business or salon name" value={businessName} onChange={e => onBusinessNameChange(e.target.value)} className="h-[50px] pl-[55px] rounded-[15px] bg-muted/50 border-border/50 focus:border-foreground/30 focus:bg-muted transition-all duration-300 text-base focus:shadow-[inset_0_0_20px_rgba(0,0,0,0.03)]" />
        </div>
      </div>

      {/* Address + Suite */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="col-span-2 space-y-2.5">
          <Label htmlFor="businessAddress" className="text-sm font-medium label-float">
            Address*
          </Label>
          <div className="input-glow input-ripple rounded-[15px]">
            <Input id="businessAddress" type="text" placeholder="Address of your business or salon" value={businessAddress} onChange={e => onBusinessAddressChange(e.target.value)} className="h-[50px] rounded-[15px] bg-muted/50 border-border/50 focus:border-foreground/30 focus:bg-muted transition-all duration-300 text-base focus:shadow-[inset_0_0_20px_rgba(0,0,0,0.03)]" />
          </div>
        </div>
        <div className="space-y-2.5">
          <Label htmlFor="suiteNumber" className="text-sm font-medium label-float">
            Suite #
          </Label>
          <div className="input-glow input-ripple rounded-[15px]">
            <Input id="suiteNumber" type="text" placeholder="Suite #" value={suiteNumber} onChange={e => onSuiteNumberChange(e.target.value)} className="h-[50px] rounded-[15px] bg-muted/50 border-border/50 focus:border-foreground/30 focus:bg-muted transition-all duration-300 text-base focus:shadow-[inset_0_0_20px_rgba(0,0,0,0.03)]" />
          </div>
        </div>
      </div>

      {/* Country */}
      <div className="space-y-2.5">
        <Label htmlFor="country" className="text-sm font-medium label-float">
          Country*
        </Label>
        <Select value={country} onValueChange={onCountryChange}>
          <SelectTrigger className="h-[50px] rounded-[15px] border-border/50 bg-muted/50 transition-all duration-300 focus:shadow-[inset_0_0_20px_rgba(0,0,0,0.03)]">
            <SelectValue placeholder="Country" />
          </SelectTrigger>
          <SelectContent className="rounded-[15px] bg-background border border-border z-50">
            {countries.map(c => <SelectItem key={c} value={c} className="rounded-[10px] transition-colors duration-200 hover:bg-muted/80">
                {c}
              </SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* City, State, Zip */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="space-y-2.5">
          <Label htmlFor="city" className="text-sm font-medium label-float">
            City*
          </Label>
          <div className="input-glow input-ripple rounded-[15px]">
            <Input id="city" type="text" placeholder="City" value={city} onChange={e => onCityChange(e.target.value)} className="h-[50px] rounded-[15px] bg-muted/50 border-border/50 focus:border-foreground/30 focus:bg-muted transition-all duration-300 text-base focus:shadow-[inset_0_0_20px_rgba(0,0,0,0.03)]" />
          </div>
        </div>
        <div className="space-y-2.5">
          <Label htmlFor="stateProvince" className="text-sm font-medium label-float">
            State/Province*
          </Label>
          <div className="relative">
            {state && country === "United States" && hasStateIcon(state) && <div className="absolute left-3 top-1/2 -translate-y-1/2 w-[24px] h-[24px] flex items-center justify-center z-10">
                <StateIcon state={state} size={22} className="text-foreground" />
              </div>}
            <Select value={state} onValueChange={onStateChange}>
              <SelectTrigger className={cn("h-[50px] rounded-[15px] border-border/50 bg-muted/50 transition-all duration-300 focus:shadow-[inset_0_0_20px_rgba(0,0,0,0.03)]", state && country === "United States" && hasStateIcon(state) && "pl-[42px]")}>
                <SelectValue placeholder={country === "Canada" ? "Province" : "State"} />
              </SelectTrigger>
              <SelectContent className="rounded-[15px] bg-background border border-border z-50">
                {(country === "Canada" ? provinces : states).map(s => <SelectItem key={s} value={s} className="rounded-[10px] transition-colors duration-200 hover:bg-muted/80">
                    {s}
                  </SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2.5">
          <Label htmlFor="zipCode" className="text-sm font-medium label-float">
            Zip code*
          </Label>
          <div className="input-glow input-ripple rounded-[15px]">
            <Input id="zipCode" type="text" placeholder="Zip code" value={zipCode} onChange={e => onZipCodeChange(e.target.value)} className="h-[50px] rounded-[15px] bg-muted/50 border-border/50 focus:border-foreground/30 focus:bg-muted transition-all duration-300 text-base focus:shadow-[inset_0_0_20px_rgba(0,0,0,0.03)]" />
          </div>
        </div>
      </div>
    </div>
  </div>;
};

// School Info Form (Step 2 for students)
const SchoolInfoForm = ({
  schoolName,
  schoolState,
  enrollmentProofFiles,
  onSchoolNameChange,
  onSchoolStateChange,
  onEnrollmentProofFilesChange,
  showValidationErrors = false,
  validationStatus
}: {
  schoolName: string;
  schoolState: string;
  enrollmentProofFiles: File[];
  onSchoolNameChange: (value: string) => void;
  onSchoolStateChange: (value: string) => void;
  onEnrollmentProofFilesChange: (files: File[]) => void;
  showValidationErrors?: boolean;
  validationStatus: "complete" | "in-progress" | "error";
}) => {
  const schoolNameError = showValidationErrors && schoolName.trim() === "";
  const stateError = showValidationErrors && schoolState === "";
  const fileError = showValidationErrors && enrollmentProofFiles.length === 0;

  return <div className="space-y-[25px]">
    <div className="space-y-2.5 text-center animate-stagger-1">
      <div className="inline-flex items-center gap-2.5 px-[15px] py-[6px] rounded-full bg-muted border border-border/50 mb-[5px] animate-badge-pop">
        <StepValidationIcon status={validationStatus} />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
          Step 2
        </span>
      </div>
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-foreground tracking-[-0.02em] leading-[1.1] font-display">
        What cosmetology school do you attend?
      </h1>
    </div>

    <div className="space-y-4 animate-stagger-2">
      {/* School/Apprenticeship Name */}
      <div className="space-y-2.5">
        <Label htmlFor="schoolName" className="text-sm font-medium label-float">
          School/Apprenticeship Name*
        </Label>
        <div className="relative group input-glow input-ripple rounded-[15px]">
          <div className="absolute left-[15px] top-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-[10px] bg-muted flex items-center justify-center transition-all duration-300 group-focus-within:bg-foreground group-focus-within:shadow-lg group-focus-within:shadow-foreground/10">
            <GraduationCap className="w-[15px] h-[15px] text-muted-foreground group-focus-within:text-background transition-all duration-300 icon-haptic" />
          </div>
          <Input id="schoolName" type="text" placeholder="Enter your school or apprenticeship name" value={schoolName} onChange={e => onSchoolNameChange(e.target.value)} className={cn("h-[50px] pl-[55px] rounded-[15px] bg-muted/50 border-border/50 focus:border-foreground/30 focus:bg-muted transition-all duration-300 text-base focus:shadow-[inset_0_0_20px_rgba(0,0,0,0.03)]", schoolNameError && "border-destructive/50")} />
        </div>
        {schoolNameError && <p className="text-xs text-destructive">School/Apprenticeship name is required</p>}
      </div>

      {/* State/Province */}
      <div className="space-y-2.5">
        <Label htmlFor="schoolState" className="text-sm font-medium label-float">
          State/Province*
        </Label>
        <div className="relative group">
          <Select value={schoolState} onValueChange={onSchoolStateChange}>
            <SelectTrigger className={cn("h-[50px] rounded-[15px] border-border/50 bg-muted/50 transition-all duration-300 focus:shadow-[inset_0_0_20px_rgba(0,0,0,0.03)]", stateError && "border-destructive/50")}>
              <div className="flex items-center gap-3">
                {schoolState && hasStateIcon(schoolState) && (
                  <StateIcon state={schoolState} className="w-5 h-5" />
                )}
                <SelectValue placeholder="Select your state/province" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-[15px] bg-background border border-border z-50 max-h-[280px]">
              {states.map(s => (
                <SelectItem key={s} value={s} className="rounded-[10px] transition-colors duration-200 hover:bg-muted/80">
                  <div className="flex items-center gap-2.5">
                    {hasStateIcon(s) && <StateIcon state={s} className="w-4 h-4" />}
                    <span>{s}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {stateError && <p className="text-xs text-destructive">State/Province is required</p>}
      </div>

      {/* Multi-File Upload */}
      <div className="space-y-2.5">
        <Label className="text-sm font-medium">
          Upload proof of enrollment or apprenticeship*
        </Label>
        <p className="text-xs text-muted-foreground">
          Upload school ID, apprenticeship license, enrollment letter, etc.
        </p>
        <MultiFileUpload
          files={enrollmentProofFiles}
          onFilesChange={onEnrollmentProofFilesChange}
          placeholder="Upload your documents"
          maxFiles={5}
          error={fileError}
          errorMessage="Please upload at least one proof of enrollment or apprenticeship"
        />
      </div>
    </div>
  </div>;
};

// Wholesale Terms Form
const WholesaleTermsForm = ({
  accountType,
  agreed,
  onAgreeChange,
  showValidationErrors = false,
  validationStatus
}: {
  accountType: string | null;
  agreed: boolean;
  onAgreeChange: (value: boolean) => void;
  showValidationErrors?: boolean;
  validationStatus: "complete" | "in-progress" | "error";
}) => {
  const agreementError = showValidationErrors && !agreed;
  const isStudent = accountType === "student";
  // Step number varies by account type: professional=5, salon=4, student=3
  const stepNumber = accountType === "professional" ? 5 : accountType === "student" ? 3 : 4;
  return <div className="space-y-[25px]">
    <div className="space-y-2.5 text-center animate-stagger-1">
      <div className="inline-flex items-center gap-2.5 px-[15px] py-[6px] rounded-full bg-muted border border-border/50 mb-[5px] animate-badge-pop">
        <StepValidationIcon status={validationStatus} />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
          Step {stepNumber}
        </span>
      </div>
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-foreground tracking-[-0.02em] leading-[1.1] font-display">
        Do you agree to wholesale terms?
      </h1>
    </div>

    <div className="flex gap-[15px] p-5 rounded-[15px] bg-muted/50 border border-border/50 animate-stagger-2">
      <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-[2px]" />
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>
          The pricing that you see on the website is the wholesale price for stylists. We recommend that you do not use your client's credit card to purchase hair extensions and that you manage the purchasing of hair for your business.
        </p>
        <p>
          It is policy that you do not use client cards for the purchase of their products and only use your own cards. This helps us avoid fraudulent chargebacks and theft.
        </p>
      </div>
    </div>

    <button onClick={() => onAgreeChange(!agreed)} className={cn("w-full p-5 rounded-[15px] border-2 text-left transition-all duration-300 flex items-center gap-4 animate-stagger-3 hover:-translate-y-0.5 active:scale-[0.99]", agreed ? "border-foreground bg-foreground/5" : agreementError ? "border-destructive/50 bg-destructive/5" : "border-border hover:border-foreground/30 hover:bg-muted/50")}>
      <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 flex-shrink-0", agreed ? "border-foreground bg-foreground" : agreementError ? "border-destructive/50" : "border-muted-foreground/50")}>
        {agreed && <Check className="w-4 h-4 text-background" strokeWidth={3} />}
      </div>
      <span className={cn("text-sm font-medium", agreementError ? "text-destructive" : "text-foreground")}>
        Yes, I agree to not use my client's card to purchase.*
      </span>
    </button>
    {agreementError && <p className="text-xs text-destructive text-center">Please agree to the wholesale terms to continue</p>}
  </div>;
};

// Tax Exemption Form
const TaxExemptionForm = ({
  accountType,
  hasTaxExemption,
  taxExemptFile,
  onTaxExemptionChange,
  onTaxExemptFileChange,
  showValidationErrors = false,
  validationStatus
}: {
  accountType: string | null;
  hasTaxExemption: boolean | null;
  taxExemptFile: File | null;
  onTaxExemptionChange: (value: boolean) => void;
  onTaxExemptFileChange: (file: File | null) => void;
  showValidationErrors?: boolean;
  validationStatus: "complete" | "in-progress" | "error";
}) => {
  const selectionError = showValidationErrors && hasTaxExemption === null;
  const fileError = showValidationErrors && hasTaxExemption === true && taxExemptFile === null;
  // Step number varies by account type: professional=6, salon=5
  const stepNumber = accountType === "professional" ? 6 : 5;
  return <div className="space-y-[25px]">
      <div className="space-y-2.5 text-center animate-stagger-1">
        <div className="inline-flex items-center gap-2.5 px-[15px] py-[6px] rounded-full bg-muted border border-border/50 mb-[5px] animate-badge-pop">
          <StepValidationIcon status={validationStatus} />
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
            Step {stepNumber}
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-foreground tracking-[-0.02em] leading-[1.1] font-display">
          Do you have a tax exemption?
        </h1>
      </div>

      <div className="flex gap-[15px] p-5 rounded-[15px] bg-muted/50 border border-border/50 animate-stagger-2">
        <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-[2px]" />
        <p className="text-sm text-muted-foreground leading-relaxed">
          A resale license for tax exemption is not required to register, but it may be a good idea for you to have one. If you choose to upload a tax exemption license, you will not be charged sales tax on extensions. If you do not want to pay sales tax, and be sales tax exempt, please upload your tax exemption documentation from your state.
        </p>
      </div>

      <div className="space-y-2 animate-stagger-3">
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => onTaxExemptionChange(true)} className={cn("p-5 rounded-[15px] border-2 text-left transition-all duration-300 flex items-center gap-4 hover:-translate-y-0.5 active:scale-[0.99]", hasTaxExemption === true ? "border-foreground bg-foreground/5" : selectionError ? "border-destructive/50 bg-destructive/5" : "border-border hover:border-foreground/30 hover:bg-muted/50")}>
            <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 flex-shrink-0", hasTaxExemption === true ? "border-foreground bg-foreground" : selectionError ? "border-destructive/50" : "border-muted-foreground/50")}>
              {hasTaxExemption === true && <Check className="w-4 h-4 text-background" strokeWidth={3} />}
            </div>
            <span className={cn("text-sm font-medium", selectionError ? "text-destructive" : "text-foreground")}>Yes</span>
          </button>
          <button onClick={() => {
          onTaxExemptionChange(false);
          onTaxExemptFileChange(null);
        }} className={cn("p-5 rounded-[15px] border-2 text-left transition-all duration-300 flex items-center gap-4 hover:-translate-y-0.5 active:scale-[0.99]", hasTaxExemption === false ? "border-foreground bg-foreground/5" : selectionError ? "border-destructive/50 bg-destructive/5" : "border-border hover:border-foreground/30 hover:bg-muted/50")}>
            <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 flex-shrink-0", hasTaxExemption === false ? "border-foreground bg-foreground" : selectionError ? "border-destructive/50" : "border-muted-foreground/50")}>
              {hasTaxExemption === false && <Check className="w-4 h-4 text-background" strokeWidth={3} />}
            </div>
            <span className={cn("text-sm font-medium", selectionError ? "text-destructive" : "text-foreground")}>No</span>
          </button>
        </div>
        {selectionError && <p className="text-xs text-destructive text-center">Please select an option</p>}
      </div>
      
      {/* File upload - shown when Yes is selected */}
      {hasTaxExemption === true && (
        <FileUpload
          file={taxExemptFile}
          onFileChange={onTaxExemptFileChange}
          placeholder="Upload your state tax-exempt license"
          error={fileError}
          errorMessage="Please upload your tax exemption document"
        />
      )}
    </div>;
};

// Contact Info Form
const ContactInfoForm = ({
  accountType,
  firstName,
  lastName,
  preferredName,
  phoneNumber,
  phoneCountryCode,
  onFirstNameChange,
  onLastNameChange,
  onPreferredNameChange,
  onPhoneNumberChange,
  onPhoneCountryCodeChange,
  subscribeOrderUpdates,
  subscribeMarketing,
  subscribePromotions,
  onSubscribeOrderUpdatesChange,
  onSubscribeMarketingChange,
  onSubscribePromotionsChange,
  showValidationErrors = false,
  validationStatus,
  uploadedFiles = []
}: {
  accountType: string | null;
  firstName: string;
  lastName: string;
  preferredName: string;
  phoneNumber: string;
  phoneCountryCode: string;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onPreferredNameChange: (value: string) => void;
  onPhoneNumberChange: (value: string) => void;
  onPhoneCountryCodeChange: (value: string) => void;
  subscribeOrderUpdates: boolean;
  subscribeMarketing: boolean;
  subscribePromotions: boolean;
  onSubscribeOrderUpdatesChange: (value: boolean) => void;
  onSubscribeMarketingChange: (value: boolean) => void;
  onSubscribePromotionsChange: (value: boolean) => void;
  showValidationErrors?: boolean;
  validationStatus: "complete" | "in-progress" | "error";
  uploadedFiles?: { file: File; label: string }[];
}) => {
  const firstNameError = showValidationErrors && firstName.trim() === "";
  const lastNameError = showValidationErrors && lastName.trim() === "";
  const phoneEmpty = phoneNumber.trim() === "";
  const phoneInvalid = !phoneEmpty && !isValidPhoneNumber(phoneNumber);
  const phoneError = showValidationErrors && (phoneEmpty || phoneInvalid);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  // Step number varies by account type: professional=7, salon=6, student=4
  const stepNumber = accountType === "professional" ? 7 : accountType === "student" ? 4 : 6;
  return <div className="space-y-[25px]">
    <div className="space-y-2.5 text-center animate-stagger-1">
      <div className="inline-flex items-center gap-2.5 px-[15px] py-[6px] rounded-full bg-muted border border-border/50 mb-[5px] animate-badge-pop">
        <StepValidationIcon status={validationStatus} />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
          Step {stepNumber}
        </span>
      </div>
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-foreground tracking-[-0.02em] leading-[1.1] font-display">
        Your Contact Information
      </h1>
    </div>

    <div className="space-y-4">
      {/* First and Last Name */}
      <div className="grid grid-cols-2 gap-2.5 animate-stagger-2">
        <div className="space-y-2.5 group">
          <Label htmlFor="legalFirstName" className={cn("text-sm font-medium label-float", firstNameError && "text-destructive")}>
            Legal first name*
          </Label>
          <div className="input-glow input-ripple rounded-[15px]">
            <Input id="legalFirstName" type="text" placeholder="Legal first name" value={firstName} onChange={e => onFirstNameChange(e.target.value)} className={cn("h-[50px] rounded-[15px] bg-muted/50 border-border/50 focus:border-foreground/30 focus:bg-background transition-all duration-300 focus:shadow-[inset_0_0_20px_rgba(0,0,0,0.03)]", firstNameError && "border-destructive/50 bg-destructive/5")} />
          </div>
          {firstNameError && <p className="text-xs text-destructive">First name is required</p>}
        </div>
        <div className="space-y-2.5 group">
          <Label htmlFor="legalLastName" className={cn("text-sm font-medium label-float", lastNameError && "text-destructive")}>
            Legal last name*
          </Label>
          <div className="input-glow input-ripple rounded-[15px]">
            <Input id="legalLastName" type="text" placeholder="Legal last name" value={lastName} onChange={e => onLastNameChange(e.target.value)} className={cn("h-[50px] rounded-[15px] bg-muted/50 border-border/50 focus:border-foreground/30 focus:bg-background transition-all duration-300 focus:shadow-[inset_0_0_20px_rgba(0,0,0,0.03)]", lastNameError && "border-destructive/50 bg-destructive/5")} />
          </div>
          {lastNameError && <p className="text-xs text-destructive">Last name is required</p>}
        </div>
      </div>

      {/* Preferred Name */}
      <div className="space-y-2.5 animate-stagger-3 group">
        <Label htmlFor="preferredName" className="text-sm font-medium label-float">
          Preferred name if different from legal name
        </Label>
        <div className="input-glow input-ripple rounded-[15px]">
          <Input id="preferredName" type="text" placeholder="Preferred name if different from legal name" value={preferredName} onChange={e => onPreferredNameChange(e.target.value)} className="h-[50px] rounded-[15px] bg-muted/50 border-border/50 focus:border-foreground/30 focus:bg-background transition-all duration-300 focus:shadow-[inset_0_0_20px_rgba(0,0,0,0.03)]" />
        </div>
      </div>

      {/* Phone Number with Country Code */}
      <div className="space-y-2.5 animate-stagger-4 group">
        <Label htmlFor="phoneNumber" className={cn("text-sm font-medium label-float", phoneError && "text-destructive")}>
          Phone number*
        </Label>
        <div className="flex gap-2">
          {/* Country Code Selector */}
          <Select value={phoneCountryCode} onValueChange={onPhoneCountryCodeChange}>
            <SelectTrigger className={cn("w-[100px] h-[50px] rounded-[15px] bg-muted/50 border-border/50 focus:border-foreground/30 focus:bg-background transition-all duration-300", phoneError && "border-destructive/50 bg-destructive/5")}>
              <SelectValue>
                {countryCodes.find(c => c.code === phoneCountryCode)?.flag} {phoneCountryCode}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-background border border-border z-50">
              {countryCodes.map((country, index) => <SelectItem key={`${country.code}-${country.country}-${index}`} value={country.code}>
                  <span className="flex items-center gap-2">
                    <span>{country.flag}</span>
                    <span>{country.code}</span>
                    <span className="text-muted-foreground text-xs">({country.country})</span>
                  </span>
                </SelectItem>)}
            </SelectContent>
          </Select>
          
          {/* Phone Number Input */}
          <div className="relative flex-1 input-glow input-ripple rounded-[15px]">
            <div className={cn("absolute left-[15px] top-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-[10px] flex items-center justify-center transition-all duration-300 group-focus-within:bg-foreground group-focus-within:shadow-lg group-focus-within:shadow-foreground/10", phoneError ? "bg-destructive/10" : "bg-muted")}>
              <Phone className={cn("w-[15px] h-[15px] group-focus-within:text-background transition-all duration-300 icon-haptic", phoneError ? "text-destructive" : "text-muted-foreground")} />
            </div>
            <Input id="phoneNumber" type="tel" placeholder="(555) 123-4567" value={phoneNumber} onChange={e => onPhoneNumberChange(e.target.value)} className={cn("h-[50px] pl-[55px] rounded-[15px] bg-muted/50 border-border/50 focus:border-foreground/30 focus:bg-background transition-all duration-300 text-base focus:shadow-[inset_0_0_20px_rgba(0,0,0,0.03)]", phoneError && "border-destructive/50 bg-destructive/5")} />
          </div>
        </div>
        {showValidationErrors && phoneEmpty && <p className="text-xs text-destructive">Phone number is required</p>}
        {phoneInvalid && <p className="text-xs text-destructive">Please enter a valid 10-digit phone number</p>}
      </div>

      {/* Uploaded Files Summary */}
      {uploadedFiles.length > 0 && (
        <div className="animate-stagger-5">
          <FileSummary files={uploadedFiles} title="Your Uploaded Documents" />
        </div>
      )}

      {/* Subscription Preferences */}
      <div className={cn("space-y-3 p-4 rounded-[15px] bg-muted/30 border border-border/50", uploadedFiles.length > 0 ? "animate-stagger-6" : "animate-stagger-5")}>
        <p className="text-sm font-medium text-foreground">Communication Preferences</p>
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer group">
            <Checkbox
              checked={subscribeOrderUpdates}
              onCheckedChange={onSubscribeOrderUpdatesChange}
              className="mt-0.5 data-[state=checked]:bg-foreground data-[state=checked]:border-foreground"
            />
            <div className="space-y-0.5">
              <span className="text-sm font-medium text-foreground group-hover:text-foreground/80 transition-colors">Order updates</span>
              <p className="text-xs text-muted-foreground">Receive shipping notifications and order status updates</p>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer group">
            <Checkbox
              checked={subscribeMarketing}
              onCheckedChange={onSubscribeMarketingChange}
              className="mt-0.5 data-[state=checked]:bg-foreground data-[state=checked]:border-foreground"
            />
            <div className="space-y-0.5">
              <span className="text-sm font-medium text-foreground group-hover:text-foreground/80 transition-colors">Marketing emails</span>
              <p className="text-xs text-muted-foreground">Get tips, tutorials, and industry insights</p>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer group">
            <Checkbox
              checked={subscribePromotions}
              onCheckedChange={onSubscribePromotionsChange}
              className="mt-0.5 data-[state=checked]:bg-foreground data-[state=checked]:border-foreground"
            />
            <div className="space-y-0.5">
              <span className="text-sm font-medium text-foreground group-hover:text-foreground/80 transition-colors">Promotions & deals</span>
              <p className="text-xs text-muted-foreground">Exclusive discounts, sales, and special offers</p>
            </div>
          </label>
        </div>
      </div>

      {/* SMS Consent Notice */}
      <div className={cn("flex gap-[15px] p-4 rounded-[15px] bg-muted/50 border border-border/50", uploadedFiles.length > 0 ? "animate-stagger-7" : "animate-stagger-6")}>
        <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-[2px]" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          You may receive text messages about orders, promos, and updates. Msg & data rates may apply. Reply STOP to cancel. View our{" "}
          <button type="button" onClick={() => setShowTerms(true)} className="underline underline-offset-2 hover:text-foreground transition-colors">Terms</button>
          {" & "}
          <button type="button" onClick={() => setShowPrivacy(true)} className="underline underline-offset-2 hover:text-foreground transition-colors">Privacy Policy</button>.
        </p>
      </div>
    </div>

    {/* Terms of Service Modal */}
    <Dialog open={showTerms} onOpenChange={setShowTerms}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Terms of Service</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-4 text-sm text-muted-foreground">
            <p className="text-foreground font-medium">Last updated: December 2024</p>
            
            <section className="space-y-2">
              <h3 className="text-foreground font-medium">1. Acceptance of Terms</h3>
              <p>By accessing and using Drop Dead Gorgeous ("the Platform"), you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.</p>
            </section>

            <section className="space-y-2">
              <h3 className="text-foreground font-medium">2. Professional Verification</h3>
              <p>Our platform is exclusively for licensed beauty professionals. By registering, you confirm that you hold a valid cosmetology license, are enrolled in an accredited cosmetology program, or hold equivalent professional credentials. We reserve the right to verify your professional status and terminate accounts that do not meet our requirements.</p>
            </section>

            <section className="space-y-2">
              <h3 className="text-foreground font-medium">3. Account Responsibilities</h3>
              <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You agree to notify us immediately of any unauthorized access or security breach.</p>
            </section>

            <section className="space-y-2">
              <h3 className="text-foreground font-medium">4. Wholesale Pricing</h3>
              <p>Wholesale pricing is available exclusively to verified professionals. Resale of products purchased at wholesale prices to non-professionals or general consumers is prohibited and may result in account termination.</p>
            </section>

            <section className="space-y-2">
              <h3 className="text-foreground font-medium">5. Orders and Payment</h3>
              <p>All orders are subject to acceptance and product availability. Prices are subject to change without notice. Payment is due at the time of purchase unless otherwise agreed upon in writing.</p>
            </section>

            <section className="space-y-2">
              <h3 className="text-foreground font-medium">6. Shipping and Returns</h3>
              <p>Shipping times and costs vary by location and order size. Returns are accepted within 30 days of delivery for unopened products in original packaging. Defective products may be returned for full refund or replacement.</p>
            </section>

            <section className="space-y-2">
              <h3 className="text-foreground font-medium">7. Limitation of Liability</h3>
              <p>Drop Dead Gorgeous shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform or products purchased through it.</p>
            </section>

            <section className="space-y-2">
              <h3 className="text-foreground font-medium">8. Changes to Terms</h3>
              <p>We reserve the right to modify these terms at any time. Continued use of the platform after changes constitutes acceptance of the modified terms.</p>
            </section>

            <section className="space-y-2">
              <h3 className="text-foreground font-medium">9. Contact</h3>
              <p>For questions about these Terms of Service, please contact us at legal@dropdeadgorgeous.com</p>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>

    {/* Privacy Policy Modal */}
    <Dialog open={showPrivacy} onOpenChange={setShowPrivacy}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Privacy Policy</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-4 text-sm text-muted-foreground">
            <p className="text-foreground font-medium">Last updated: December 2024</p>
            
            <section className="space-y-2">
              <h3 className="text-foreground font-medium">1. Information We Collect</h3>
              <p>We collect information you provide directly, including: name, email, phone number, business information, professional license details, and payment information. We also collect usage data automatically when you interact with our platform.</p>
            </section>

            <section className="space-y-2">
              <h3 className="text-foreground font-medium">2. How We Use Your Information</h3>
              <p>We use your information to: process orders and payments, verify professional credentials, communicate about orders and promotions, improve our services, and comply with legal obligations.</p>
            </section>

            <section className="space-y-2">
              <h3 className="text-foreground font-medium">3. Information Sharing</h3>
              <p>We do not sell your personal information. We may share information with: service providers who assist our operations, payment processors, shipping carriers, and as required by law.</p>
            </section>

            <section className="space-y-2">
              <h3 className="text-foreground font-medium">4. Data Security</h3>
              <p>We implement industry-standard security measures to protect your information, including encryption, secure servers, and regular security audits. However, no method of transmission over the internet is 100% secure.</p>
            </section>

            <section className="space-y-2">
              <h3 className="text-foreground font-medium">5. Your Rights</h3>
              <p>You have the right to: access your personal information, correct inaccurate data, request deletion of your data, opt out of marketing communications, and request a copy of your data.</p>
            </section>

            <section className="space-y-2">
              <h3 className="text-foreground font-medium">6. Cookies and Tracking</h3>
              <p>We use cookies and similar technologies to enhance your experience, analyze usage, and deliver targeted advertising. You can manage cookie preferences through your browser settings.</p>
            </section>

            <section className="space-y-2">
              <h3 className="text-foreground font-medium">7. SMS Communications</h3>
              <p>By providing your phone number, you consent to receive SMS messages about orders, promotions, and updates. Message and data rates may apply. Reply STOP to unsubscribe at any time.</p>
            </section>

            <section className="space-y-2">
              <h3 className="text-foreground font-medium">8. Children's Privacy</h3>
              <p>Our platform is not intended for individuals under 18 years of age. We do not knowingly collect information from children.</p>
            </section>

            <section className="space-y-2">
              <h3 className="text-foreground font-medium">9. Changes to This Policy</h3>
              <p>We may update this Privacy Policy periodically. We will notify you of significant changes via email or platform notification.</p>
            </section>

            <section className="space-y-2">
              <h3 className="text-foreground font-medium">10. Contact Us</h3>
              <p>For privacy-related inquiries, contact us at privacy@dropdeadgorgeous.com</p>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  </div>;
};

// Password Input with Toggle
const PasswordInputField = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  variant = "signin"
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  variant?: "signin" | "signup";
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isSignin = variant === "signin";
  return <div className="space-y-2.5">
      <Label htmlFor={id} className={cn("font-medium label-float transition-all duration-300 text-left block", isSignin ? "text-xs text-muted-foreground uppercase tracking-[0.1em]" : "text-sm")}>
        {label}
      </Label>
      <div className={cn("relative group rounded-[15px] input-ripple", isSignin ? "input-ultra" : "input-glow")}>
        <div className={cn("absolute left-[15px] top-1/2 -translate-y-1/2 rounded-[12px] flex items-center justify-center transition-all duration-500 group-focus-within:shadow-lg group-focus-within:shadow-foreground/10", isSignin ? "w-[35px] h-[35px] bg-gradient-to-br from-muted to-muted/50 group-focus-within:from-foreground group-focus-within:to-foreground/80" : "w-[30px] h-[30px] rounded-[10px] bg-muted group-focus-within:bg-foreground")}>
          <Lock className="w-[15px] h-[15px] text-muted-foreground group-focus-within:text-background transition-all duration-300 icon-haptic" />
        </div>
        <Input id={id} type={showPassword ? "text" : "password"} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} className={cn("pr-[50px] rounded-[15px] transition-all duration-500 text-base focus:shadow-[inset_0_0_20px_rgba(0,0,0,0.03)]", isSignin ? "h-[60px] pl-[60px] bg-muted/30 border-border/30 focus:border-foreground/20 focus:bg-background placeholder:text-muted-foreground/40" : "h-[55px] pl-[55px] bg-muted/50 border-border/50 focus:border-foreground/30 focus:bg-background")} />
        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-[15px] top-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-[10px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-300 focus:outline-none haptic-press" aria-label={showPassword ? "Hide password" : "Show password"}>
          {showPassword ? <EyeOff className="w-[16px] h-[16px] transition-transform duration-200 hover:scale-110" /> : <Eye className="w-[16px] h-[16px] transition-transform duration-200 hover:scale-110" />}
        </button>
      </div>
    </div>;
};

// Password strength calculator
const getPasswordStrength = (password: string): {
  score: number;
  label: string;
  color: string;
} => {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return {
    score: 1,
    label: "Weak",
    color: "bg-red-500"
  };
  if (score <= 2) return {
    score: 2,
    label: "Fair",
    color: "bg-orange-500"
  };
  if (score <= 3) return {
    score: 3,
    label: "Good",
    color: "bg-yellow-500"
  };
  if (score <= 4) return {
    score: 4,
    label: "Strong",
    color: "bg-green-500"
  };
  return {
    score: 5,
    label: "Excellent",
    color: "bg-green-600"
  };
};
const PasswordStrengthMeter = ({
  password
}: {
  password: string;
}) => {
  const strength = getPasswordStrength(password);
  if (!password) return null;
  return <div className="space-y-2.5 animate-fade-in">
      <div className="flex gap-[5px]">
        {[1, 2, 3, 4, 5].map(level => <div key={level} className={cn("h-[5px] flex-1 rounded-full transition-all duration-300", level <= strength.score ? strength.color : "bg-border")} />)}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Password strength</span>
        <span className={cn("text-xs font-medium", strength.score <= 2 ? "text-red-500" : strength.score <= 3 ? "text-yellow-600" : "text-green-600")}>{strength.label}</span>
      </div>
    </div>;
};
const PersonalInfoForm = ({
  firstName,
  lastName,
  email,
  password,
  onFirstNameChange,
  onLastNameChange,
  onEmailChange,
  onPasswordChange
}: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
}) => <div className="space-y-[25px]">
    <div className="space-y-2.5 text-center animate-stagger-1">
      <div className="inline-flex items-center gap-2.5 px-[15px] py-[5px] rounded-full bg-muted border border-border/50 mb-2.5">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
          Final Step
        </span>
      </div>
      <h1 className="text-3xl md:text-4xl font-semibold text-foreground tracking-tight">
        Create your account
      </h1>
      <p className="text-muted-foreground">
        Enter your details to get started
      </p>
    </div>

    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2.5 sm:gap-[15px] animate-stagger-2">
        <div className="space-y-2.5 group">
          <Label htmlFor="firstName" className="text-sm font-medium label-float">
            First name
          </Label>
          <div className="input-glow input-ripple rounded-[10px] sm:rounded-[15px]">
            <Input id="firstName" type="text" placeholder="Jane" value={firstName} onChange={e => onFirstNameChange(e.target.value)} className="h-[45px] sm:h-[50px] rounded-[10px] sm:rounded-[15px] bg-muted/50 border-border/50 focus:border-foreground/30 focus:bg-background transition-all duration-300 focus:shadow-[inset_0_0_20px_rgba(0,0,0,0.03)]" />
          </div>
        </div>
        <div className="space-y-2.5 group">
          <Label htmlFor="lastName" className="text-sm font-medium label-float">
            Last name
          </Label>
          <div className="input-glow input-ripple rounded-[10px] sm:rounded-[15px]">
            <Input id="lastName" type="text" placeholder="Doe" value={lastName} onChange={e => onLastNameChange(e.target.value)} className="h-[45px] sm:h-[50px] rounded-[10px] sm:rounded-[15px] bg-muted/50 border-border/50 focus:border-foreground/30 focus:bg-background transition-all duration-300 focus:shadow-[inset_0_0_20px_rgba(0,0,0,0.03)]" />
          </div>
        </div>
      </div>

      <div className="space-y-2.5 animate-stagger-3 group">
        <Label htmlFor="email" className="text-sm font-medium label-float">
          Email
        </Label>
        <div className="relative group input-glow input-ripple rounded-[15px]">
          <div className="absolute left-[15px] top-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-[10px] bg-muted flex items-center justify-center transition-all duration-300 group-focus-within:bg-foreground group-focus-within:shadow-lg group-focus-within:shadow-foreground/10">
            <Mail className="w-[15px] h-[15px] text-muted-foreground group-focus-within:text-background transition-all duration-300 icon-haptic" />
          </div>
          <Input id="email" type="email" placeholder="jane@example.com" value={email} onChange={e => onEmailChange(e.target.value)} className="h-[55px] pl-[55px] rounded-[15px] bg-muted/50 border-border/50 focus:border-foreground/30 focus:bg-background transition-all duration-300 text-base focus:shadow-[inset_0_0_20px_rgba(0,0,0,0.03)]" />
        </div>
      </div>

      <div className="space-y-2.5 animate-stagger-4">
        <PasswordInputField id="password" label="Password" value={password} onChange={onPasswordChange} placeholder="Create a password" variant="signup" />
        <PasswordStrengthMeter password={password} />
      </div>
    </div>
  </div>;
const SuccessForm = () => {
  const countdown = useCountdown(48);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const handleAddToCart = () => {
    setIsAddingToCart(true);
  };
  const formatNumber = (num: number) => num.toString().padStart(2, '0');
  return <div className="space-y-[25px] animate-fade-in text-center">
    {/* Success Icon */}
    <div className="relative h-[130px] mb-5">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[100px] h-[100px] rounded-full bg-gradient-to-br from-muted to-accent/20 opacity-60" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[65px] h-[65px] rounded-full bg-foreground flex items-center justify-center">
          <Check className="w-[30px] h-[30px] text-background" strokeWidth={2.5} />
        </div>
      </div>
      
      {/* Floating decorations */}
      <div className="absolute top-2.5 left-1/4 w-[30px] h-[30px] rounded-[10px] bg-muted border border-border flex items-center justify-center animate-fade-in" style={{
        animationDelay: "0.2s"
      }}>
        <ShoppingBag className="w-[15px] h-[15px] text-muted-foreground" />
      </div>
      <div className="absolute top-5 right-1/4 w-[25px] h-[25px] rounded-full bg-muted border border-border flex items-center justify-center animate-fade-in" style={{
        animationDelay: "0.4s"
      }}>
        <Heart className="w-[15px] h-[15px] text-muted-foreground" />
      </div>
      <div className="absolute bottom-2.5 right-1/3 w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center animate-fade-in" style={{
        animationDelay: "0.6s"
      }}>
        <Sparkles className="w-2.5 h-2.5 text-muted-foreground" />
      </div>
    </div>

    <div className="space-y-2.5">
      <h1 className="text-3xl md:text-4xl font-semibold text-foreground tracking-tight">
        You're all set!
      </h1>
      <p className="text-muted-foreground">
        Your account has been successfully submitted. Our team will review and approve or deny your professional account within 24 hours.
      </p>
    </div>

    <div className="p-5 rounded-[20px] bg-muted/50 border border-border/50">
      <div className="flex items-center gap-5">
        <div className="w-[50px] h-[50px] rounded-[15px] bg-foreground flex items-center justify-center">
          <Sparkles className="w-[25px] h-[25px] text-background" />
        </div>
        <div className="text-left">
          <p className="text-sm font-medium text-foreground">Pro Member</p>
          <p className="text-xs text-muted-foreground">
            Confirmation email will be sent to your inbox
          </p>
        </div>
      </div>
    </div>

    {/* First Purchase Upsell */}
    <div className="p-5 rounded-[20px] bg-gradient-to-br from-accent-red/10 via-muted/50 to-accent-red/5 border border-accent-red/20 relative overflow-hidden">
      <div className="absolute top-0 right-0 bg-accent-red text-white text-[10px] font-semibold px-3 py-1 rounded-bl-xl">
        50% OFF
      </div>
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-xl overflow-hidden border border-border shrink-0">
          <img src={colorRingProduct} alt="Color Ring Product" className="w-full h-full object-cover" />
        </div>
        <div className="text-left flex-1 min-w-0">
          <p className="text-[10px] font-medium text-accent-red uppercase tracking-wider mb-0.5">
            Recommended for you
          </p>
          <p className="text-sm font-semibold text-foreground">Color Ring</p>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1">
            Perfect for matching colors with clients
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Clock className="w-3 h-3 text-accent-red animate-pulse" />
            <div className="flex items-center gap-1 text-[10px] text-accent-red font-medium tabular-nums">
              <span className="bg-accent-red/10 px-1.5 py-0.5 rounded">{formatNumber(countdown.hours)}h</span>
              <span>:</span>
              <span className="bg-accent-red/10 px-1.5 py-0.5 rounded">{formatNumber(countdown.minutes)}m</span>
              <span>:</span>
              <span className="bg-accent-red/10 px-1.5 py-0.5 rounded">{formatNumber(countdown.seconds)}s</span>
            </div>
          </div>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={handleAddToCart} disabled={isAddingToCart} className="w-full mt-4 h-9 rounded-xl border-accent-red/30 text-accent-red hover:bg-accent-red/10 hover:text-accent-red group disabled:opacity-100">
        {isAddingToCart ? <div className="w-4 h-4 border-2 border-accent-red/30 border-t-accent-red rounded-full animate-spin" /> : <>
            <ShoppingBag className="w-0 h-4 opacity-0 group-hover:w-4 group-hover:opacity-100 group-hover:mr-2 transition-all duration-200" />
            Add to Cart
          </>}
      </Button>
    </div>
  </div>;
};
export default Auth;