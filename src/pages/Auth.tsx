import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Sparkles, Star, Truck, Gift, ChevronLeft, ChevronRight, Mail, Lock, User, FileCheck, MapPin, Check, ShoppingBag, Heart, ArrowUpRight, Building2, GraduationCap, X, Eye, EyeOff, Phone, Info, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useMagnetic } from "@/hooks/use-magnetic";
import { StateIcon, hasStateIcon } from "@/components/StateIcon";
import { StepValidationIcon, getStepValidationStatus } from "@/components/registration/StepValidationIcon";
type AuthMode = "signup" | "signin";
type Step = "onboarding" | "account-type" | "license" | "business-location" | "wholesale-terms" | "tax-exemption" | "contact-info" | "success";
const slides = [{
  eyebrow: "Welcome",
  title: "Join the",
  highlight: "Pro Network",
  description: "Exclusive wholesale access for beauty professionals"
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
  value: 10,
  suffix: "K+",
  label: "Stylists"
}, {
  value: 30,
  suffix: "%",
  label: "Savings"
}, {
  value: 48,
  suffix: "hr",
  label: "Delivery"
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
  icon: Star,
  label: "Wholesale",
  desc: "Pro pricing"
}];
const states = ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"];
const AnimatedNumber = ({
  value,
  suffix
}: {
  value: number;
  suffix: string;
}) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const duration = 1500;
    const steps = 40;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);
  return <span className="text-4xl">{count}{suffix}</span>;
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
  return <div ref={magnetic.ref} style={magnetic.style} onMouseMove={magnetic.onMouseMove} onMouseLeave={magnetic.onMouseLeave} className="group/pill flex items-center gap-2.5 px-[15px] py-2.5 rounded-[10px] bg-background/5 border border-background/10 hover:border-background/20 hover:bg-background/10 transition-all cursor-default">
      <div className="w-[30px] h-[30px] rounded-[10px] bg-background flex items-center justify-center flex-shrink-0">
        <Icon className="w-[15px] h-[15px] text-foreground" />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-background">{label}</span>
        <span className="text-xs text-background/50">{desc}</span>
      </div>
    </div>;
};

const SignInFeatureBox = ({
  icon: Icon,
  label,
  desc
}: FeatureBoxProps) => {
  const magnetic = useMagnetic({
    strength: 0.12
  });
  return <div ref={magnetic.ref} style={magnetic.style} onMouseMove={magnetic.onMouseMove} onMouseLeave={magnetic.onMouseLeave} className="group/pill flex items-center gap-2.5 px-[15px] py-2.5 rounded-[10px] bg-muted/50 border border-border/30 hover:border-border/50 hover:bg-muted/80 transition-all cursor-default">
      <div className="w-[30px] h-[30px] rounded-[10px] bg-foreground flex items-center justify-center flex-shrink-0">
        <Icon className="w-[15px] h-[15px] text-background" />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground/70">{desc}</span>
      </div>
    </div>;
};

// Circular Progress Indicator Component
const CircularProgress = ({ progress }: { progress: number }) => {
  const size = 40;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  
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
  
  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getProgressColor()}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <span 
        className="absolute text-[10px] font-semibold transition-colors duration-500"
        style={{ color: getTextColor() }}
      >
        {Math.round(progress)}%
      </span>
    </div>
  );
};

const Auth = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("signup");
  const [currentStep, setCurrentStep] = useState<Step>("onboarding");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [transitionDirection, setTransitionDirection] = useState<"forward" | "backward">("forward");
  const [isTransitioning, setIsTransitioning] = useState(false);
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
  
  // Salon-specific fields
  const [salonSize, setSalonSize] = useState("");
  const [salonStructure, setSalonStructure] = useState("");
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [taxExemptFile, setTaxExemptFile] = useState<File | null>(null);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  
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
    setSalonSize("");
    setSalonStructure("");
    setLicenseFile(null);
    setTaxExemptFile(null);
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
      case "business-location":
        return businessName.trim() !== "" && businessAddress.trim() !== "" && country !== "" && city.trim() !== "" && state !== "" && zipCode.trim() !== "";
      case "wholesale-terms":
        return wholesaleAgreed;
      case "tax-exemption":
        if (hasTaxExemption === true) {
          return taxExemptFile !== null;
        }
        return hasTaxExemption !== null;
      case "contact-info":
        return firstName.trim() !== "" && lastName.trim() !== "" && phoneNumber.trim() !== "";
      default:
        return true;
    }
  };
  
  // Calculate overall form progress as percentage
  const getFormProgress = () => {
    if (mode === "signin") {
      let filled = 0;
      if (email.trim() !== "") filled++;
      if (password.length >= 8) filled++;
      return (filled / 2) * 100;
    }
    
    // For signup, calculate based on account type
    if (accountType === "student") {
      // Student: account-type + contact-info (firstName, lastName, phone)
      let filled = 0;
      const total = 4;
      if (accountType) filled++;
      if (firstName.trim() !== "") filled++;
      if (lastName.trim() !== "") filled++;
      if (phoneNumber.trim() !== "") filled++;
      return (filled / total) * 100;
    }
    
    if (accountType === "salon") {
      // Salon: account-type, license fields (4), business location (6), wholesale, tax, contact (3)
      let filled = 0;
      const total = 17;
      if (accountType) filled++;
      if (licenseNumber.trim() !== "") filled++;
      if (state !== "") filled++;
      if (salonSize !== "") filled++;
      if (salonStructure !== "") filled++;
      if (businessName.trim() !== "") filled++;
      if (businessAddress.trim() !== "") filled++;
      if (country !== "") filled++;
      if (city.trim() !== "") filled++;
      if (zipCode.trim() !== "") filled++;
      if (wholesaleAgreed) filled++;
      if (hasTaxExemption !== null) filled++;
      if (hasTaxExemption === true && taxExemptFile) filled++;
      if (firstName.trim() !== "") filled++;
      if (lastName.trim() !== "") filled++;
      if (phoneNumber.trim() !== "") filled++;
      return (filled / total) * 100;
    }
    
    // Professional: account-type, license (2), business location (6), wholesale, tax, contact (3)
    let filled = 0;
    const total = 14;
    if (accountType) filled++;
    if (licenseNumber.trim() !== "") filled++;
    if (state !== "") filled++;
    if (businessName.trim() !== "") filled++;
    if (businessAddress.trim() !== "") filled++;
    if (country !== "") filled++;
    if (city.trim() !== "") filled++;
    if (zipCode.trim() !== "") filled++;
    if (wholesaleAgreed) filled++;
    if (hasTaxExemption !== null) filled++;
    if (hasTaxExemption === true && taxExemptFile) filled++;
    if (firstName.trim() !== "") filled++;
    if (lastName.trim() !== "") filled++;
    if (phoneNumber.trim() !== "") filled++;
    return (filled / total) * 100;
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
    
    setTransitionDirection("forward");
    setIsTransitioning(true);
    
    setTimeout(() => {
      switch (currentStep) {
        case "onboarding":
          setCurrentStep("account-type");
          break;
        case "account-type":
          // Student goes directly to contact-info, professionals go through full flow
          setCurrentStep(accountType === "student" ? "contact-info" : "business-location");
          break;
        case "business-location":
          setCurrentStep("license");
          break;
        case "license":
          setCurrentStep("wholesale-terms");
          break;
        case "wholesale-terms":
          setCurrentStep("tax-exemption");
          break;
        case "tax-exemption":
          setCurrentStep("contact-info");
          break;
        case "contact-info":
          setCurrentStep("success");
          toast.success("Account created successfully!");
          break;
      }
      setIsTransitioning(false);
    }, 150);
  };
  
  const handleBack = () => {
    setTransitionDirection("backward");
    setIsTransitioning(true);
    
    setTimeout(() => {
      switch (currentStep) {
        case "account-type":
          setCurrentStep("onboarding");
          break;
        case "business-location":
          setCurrentStep("account-type");
          break;
        case "license":
          setCurrentStep("business-location");
          break;
        case "wholesale-terms":
          setCurrentStep("license");
          break;
        case "tax-exemption":
          setCurrentStep("wholesale-terms");
          break;
        case "contact-info":
          setCurrentStep(accountType === "student" ? "account-type" : "tax-exemption");
          break;
      }
      setIsTransitioning(false);
    }, 150);
  };
  const getTotalSteps = () => {
    // Student: account-type, contact-info = 2 steps
    // Professional: account-type, license, business-location, wholesale-terms, tax-exemption, contact-info = 6 steps
    return accountType === "student" ? 2 : 6;
  };
  const getCurrentStepNumber = () => {
    if (currentStep === "account-type") return 1;
    if (accountType === "student") {
      if (currentStep === "contact-info") return 2;
      return 2;
    }
    // Professional flow
    if (currentStep === "business-location") return 2;
    if (currentStep === "license") return 3;
    if (currentStep === "wholesale-terms") return 4;
    if (currentStep === "tax-exemption") return 5;
    if (currentStep === "contact-info") return 6;
    return 6;
  };
  
  const getStepFromNumber = (stepNum: number): Step => {
    if (accountType === "student") {
      if (stepNum === 1) return "account-type";
      return "contact-info";
    }
    // Professional flow
    switch (stepNum) {
      case 1: return "account-type";
      case 2: return "business-location";
      case 3: return "license";
      case 4: return "wholesale-terms";
      case 5: return "tax-exemption";
      case 6: return "contact-info";
      default: return "account-type";
    }
  };
  
  const goToStep = (stepNum: number) => {
    const currentNum = getCurrentStepNumber();
    if (stepNum === currentNum) return;
    
    setTransitionDirection(stepNum > currentNum ? "forward" : "backward");
    setIsTransitioning(true);
    
    setTimeout(() => {
      setCurrentStep(getStepFromNumber(stepNum));
      setIsTransitioning(false);
    }, 150);
  };
  const slide = slides[currentSlide];
  const showStepIndicator = mode === "signup" && currentStep !== "success" && currentStep !== "onboarding";
  return <div className="min-h-screen flex items-center justify-center p-2.5 sm:p-5 lg:p-10">
      {/* Blurred darkened backdrop */}
      <div className="fixed inset-0 bg-foreground/60 backdrop-blur-md cursor-pointer" onClick={() => navigate("/")} />
      
      {/* Modal Container */}
      <div className={cn(
        "relative z-10 bg-background rounded-[20px] sm:rounded-[25px] lg:rounded-[30px] shadow-2xl overflow-hidden flex flex-col lg:flex-row transition-all duration-300",
        "w-full sm:w-[95vw] lg:w-[90vw] h-[95vh] sm:h-[90vh] max-w-[1400px]"
      )} style={{
      animation: 'modalEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards'
    }}>
        {/* Close Button */}
        <button onClick={() => navigate("/")} className="absolute top-2.5 sm:top-5 right-2.5 sm:right-5 z-20 p-2.5 rounded-full bg-foreground/5 hover:bg-foreground/10 transition-colors" aria-label="Close">
          <X className="w-5 h-5 text-foreground" />
        </button>

        {/* Mobile/Tablet Auth Toggle - Moved to right panel header for consistency */}

        {/* Left Panel - Hero/Branding */}
        <div className="relative hidden lg:flex flex-col w-full lg:w-1/2 h-[200px] sm:h-[250px] lg:h-auto lg:min-h-0 flex-shrink-0 bg-foreground overflow-hidden m-2.5 sm:m-5 mt-0 sm:mt-0 lg:mt-5 rounded-[15px] sm:rounded-[20px]" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        {/* Sliding Background + Content Container */}
        <div key={mode === "signin" ? "signin-panel" : currentSlide} className="absolute inset-0" style={{
          animation: 'slideIn 0.5s ease-out forwards'
        }}>
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-foreground via-foreground/95 to-foreground" />
          
          <div className="absolute top-0 right-0 w-[200px] md:w-[300px] lg:w-[400px] h-[200px] md:h-[300px] lg:h-[400px] rounded-full blur-[80px] md:blur-[100px] lg:blur-[120px] animate-pulse" style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
            animationDuration: '4s'
          }} />
          <div className="absolute bottom-0 left-0 w-[150px] md:w-[200px] lg:w-[300px] h-[150px] md:h-[200px] lg:h-[300px] rounded-full blur-[60px] md:blur-[80px] lg:blur-[100px] animate-pulse" style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)',
            animationDuration: '5s',
            animationDelay: '1s'
          }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] md:w-[350px] lg:w-[500px] h-[250px] md:h-[350px] lg:h-[500px] rounded-full blur-[100px] md:blur-[120px] lg:blur-[150px] animate-pulse" style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 60%)',
            animationDuration: '6s',
            animationDelay: '2s'
          }} />
          
          {/* Noise texture */}
          <div className="absolute inset-0 opacity-[0.15]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
          }} />

          {/* Content - Different for sign-in vs sign-up */}
          <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-5 lg:p-10 pb-[70px] lg:pb-[80px]">
            {mode === "signin" ? (
              /* Sign-in content - Static, welcoming for returning users */
              <div className="flex flex-col gap-0 pb-[20px]">
                <div className="inline-flex items-center gap-[5px] md:gap-2.5 px-2.5 md:px-[15px] py-[5px] rounded-full bg-background/10 backdrop-blur-sm border border-background/10 mb-[15px] md:mb-5 lg:mb-[25px] w-fit">
                  <Sparkles className="w-2.5 md:w-[15px] h-2.5 md:h-[15px] text-background/80" />
                  <span className="text-[10px] md:text-xs font-medium text-background/80 uppercase tracking-widest">
                    Welcome Back
                  </span>
                </div>

                <div className="space-y-[5px] mb-2.5 md:mb-[15px] lg:mb-5">
                  <h2 className="text-xl md:text-3xl lg:text-4xl font-light text-background/60 tracking-tight leading-none xl:text-7xl">
                    Great to
                  </h2>
                  <h1 className="text-xl md:text-3xl lg:text-4xl font-semibold text-background tracking-tight leading-none xl:text-7xl">
                    See You Again
                  </h1>
                </div>

                <p className="text-xs md:text-sm lg:text-base text-background/50 md:whitespace-nowrap mb-10 lg:mb-[60px]">
                  Your pro account is waiting for you
                </p>

                {/* Stats Row */}
                <div className="flex gap-[15px] md:gap-5 lg:gap-[25px] mb-5 lg:mb-[25px]">
                  {stats.map((stat, i) => <div key={i} className="text-center">
                      <div className="text-base md:text-xl lg:text-2xl font-semibold text-background tracking-tight">
                        <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                      </div>
                      <div className="text-[8px] md:text-[10px] text-background/40 uppercase tracking-wider mt-[5px]">
                        {stat.label}
                      </div>
                    </div>)}
                </div>

                {/* Feature Pills */}
                <div className="hidden xl:flex flex-wrap gap-2.5">
                  {features.map((feature, i) => <MagneticFeatureBox key={i} icon={feature.icon} label={feature.label} desc={feature.desc} />)}
                </div>
              </div>
            ) : (
              /* Sign-up content - Carousel slides */
              <div className="flex flex-col gap-0 pb-[20px]">
                {/* Eyebrow */}
                <div className="inline-flex items-center gap-[5px] md:gap-2.5 px-2.5 md:px-[15px] py-[5px] rounded-full bg-background/10 backdrop-blur-sm border border-background/10 mb-[15px] md:mb-5 lg:mb-[25px] w-fit">
                  <Sparkles className="w-2.5 md:w-[15px] h-2.5 md:h-[15px] text-background/80" />
                  <span className="text-[10px] md:text-xs font-medium text-background/80 uppercase tracking-widest">
                    {slide.eyebrow}
                  </span>
                </div>

                {/* Large Typography */}
                <div className="space-y-[5px] mb-2.5 md:mb-[15px] lg:mb-5">
                  <h2 className="text-xl md:text-3xl lg:text-4xl font-light text-background/60 tracking-tight leading-none xl:text-7xl">
                    {slide.title}
                  </h2>
                  <h1 className="text-xl md:text-3xl lg:text-4xl font-semibold text-background tracking-tight leading-none xl:text-7xl">
                    {slide.highlight}
                  </h1>
                </div>

                <p className="text-xs md:text-sm lg:text-base text-background/50 md:whitespace-nowrap mb-10 lg:mb-[60px]">
                  {slide.description}
                </p>

                {/* Stats Row - Slides with content */}
                <div className="flex gap-[15px] md:gap-5 lg:gap-[25px] mb-5 lg:mb-[25px]">
                  {stats.map((stat, i) => <div key={i} className="text-center">
                      <div className="text-base md:text-xl lg:text-2xl font-semibold text-background tracking-tight">
                        <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                      </div>
                      <div className="text-[8px] md:text-[10px] text-background/40 uppercase tracking-wider mt-[5px]">
                        {stat.label}
                      </div>
                    </div>)}
                </div>

                {/* Feature Pills - Slides with content */}
                <div className="hidden xl:flex flex-wrap gap-2.5">
                  {features.map((feature, i) => <MagneticFeatureBox key={i} icon={feature.icon} label={feature.label} desc={feature.desc} />)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Circular Progress Indicator - Fixed - Only show on sign-up */}
        {mode === "signup" && (
          <div className="absolute top-5 md:top-5 lg:top-10 right-5 md:right-5 lg:right-10 z-10">
            <CircularProgress progress={getFormProgress()} />
          </div>
        )}

        {/* Fixed Logo */}
        <div className="absolute top-5 md:top-5 lg:top-10 left-5 md:left-5 lg:left-10 z-10 flex items-center gap-[5px] md:gap-2.5">
          <div className="w-[25px] md:w-[30px] h-[25px] md:h-[30px] rounded-[10px] bg-background/10 backdrop-blur-sm flex items-center justify-center">
            <Sparkles className="w-[15px] h-[15px] text-background" />
          </div>
          <span className="text-sm md:text-lg font-semibold text-background">ProBeauty</span>
        </div>

        {/* Fixed Bottom Navigation - Only show slide controls on sign-up */}
        <div className="absolute bottom-5 md:bottom-5 lg:bottom-10 left-5 md:left-5 lg:left-10 right-5 md:right-5 lg:right-10 z-10 flex items-center justify-between">
          {/* Slide Indicators - Only on sign-up */}
          {mode === "signup" ? (
            <div className="flex gap-2.5">
              {slides.map((_, i) => <button key={i} onClick={() => setCurrentSlide(i)} className={cn("h-[5px] rounded-full transition-all duration-300", i === currentSlide ? "w-10 bg-background/60" : "w-[5px] bg-background/20")} />)}
            </div>
          ) : (
            <div />
          )}

          {/* Trust Badge - visible on all sizes */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-background/40 hidden lg:inline">Loved by</span>
            <div className="flex -space-x-[5px]">
              {[...Array(3)].map((_, i) => <div key={i} className="w-5 h-5 rounded-full border-2 border-foreground" style={{
                background: `linear-gradient(135deg, hsl(0 0% ${85 - i * 5}%) 0%, hsl(0 0% ${75 - i * 5}%) 100%)`
              }} />)}
            </div>
            <span className="text-xs text-background/50">10K+ pros</span>
          </div>

          {/* Nav Arrows - Desktop - Only on sign-up */}
          {mode === "signup" ? (
            <div className="hidden lg:flex gap-2.5">
              <button onClick={goToPrevSlide} className="p-2.5 rounded-full bg-background/5 border border-background/10 hover:bg-background/10 transition-all">
                <ChevronLeft className="w-[15px] h-[15px] text-background/70" />
              </button>
              <button onClick={goToNextSlide} className="p-2.5 rounded-full bg-background/5 border border-background/10 hover:bg-background/10 transition-all">
                <ChevronRight className="w-[15px] h-[15px] text-background/70" />
              </button>
            </div>
          ) : (
            <div />
          )}
        </div>

        {/* Progress Bar - Mobile/Tablet only - Only on sign-up */}
        {mode === "signup" && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-background/10 lg:hidden z-10">
            <div className="h-full bg-background/60 transition-all duration-500" style={{
              width: `${(currentSlide + 1) / slides.length * 100}%`
            }} />
          </div>
        )}
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col bg-background lg:rounded-r-[20px] overflow-auto">
        {/* Header - fixed height to keep toggle position consistent */}
        <header className="relative flex items-center p-2.5 sm:p-5 lg:p-[25px] min-h-[60px] sm:min-h-[70px] lg:min-h-[80px]">
          {/* Auth Toggle - Left aligned */}
          <div className="inline-flex bg-muted/60 backdrop-blur-sm rounded-full p-[5px] border border-border/30 relative">
            {/* Sliding pill indicator */}
            <div 
              className="absolute top-[5px] bottom-[5px] rounded-full bg-foreground shadow-lg shadow-foreground/10 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
              style={{
                left: mode === "signup" ? "5px" : "50%",
                width: "calc(50% - 5px)"
              }}
            />
            <button onClick={() => handleModeChange("signup")} className={cn("relative z-10 px-[15px] sm:px-[20px] py-2 sm:py-[10px] rounded-full text-sm font-medium transition-colors duration-300", mode === "signup" ? "text-background" : "text-muted-foreground hover:text-foreground")}>
              Sign up
            </button>
            <button onClick={() => handleModeChange("signin")} className={cn("relative z-10 px-[15px] sm:px-[20px] py-2 sm:py-[10px] rounded-full text-sm font-medium transition-colors duration-300", mode === "signin" ? "text-background" : "text-muted-foreground hover:text-foreground")}>
              Sign in
            </button>
          </div>
          
          {/* Step Indicator - Centered absolutely */}
          {showStepIndicator && (
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
              {/* Dial container with mask for fade effect */}
              <div 
                className="relative flex items-center justify-center overflow-hidden"
                style={{
                  width: '160px',
                  maskImage: 'linear-gradient(to right, transparent 0%, white 25%, white 75%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to right, transparent 0%, white 25%, white 75%, transparent 100%)'
                }}
              >
                {/* Sliding track that moves based on current step */}
                <div 
                  className="flex items-center gap-[12px] transition-transform duration-500 ease-out"
                  style={{
                    transform: `translateX(${(getTotalSteps() / 2 - getCurrentStepNumber() + 0.5) * 32}px)`
                  }}
                >
                  {Array.from({ length: getTotalSteps() }, (_, i) => {
                    const stepNum = i + 1;
                    const currentStepNum = getCurrentStepNumber();
                    const distance = Math.abs(stepNum - currentStepNum);
                    const isActive = stepNum === currentStepNum;
                    const isCompleted = stepNum < currentStepNum;
                    
                    // Calculate opacity based on distance from center
                    const opacity = isActive ? 1 : distance === 1 ? 0.6 : distance === 2 ? 0.3 : 0.15;
                    // Calculate scale based on distance
                    const scale = isActive ? 1 : distance === 1 ? 0.85 : 0.7;
                    
                    return (
                      <button 
                        key={i} 
                        onClick={() => goToStep(stepNum)}
                        className="flex items-center gap-[12px] cursor-pointer hover:opacity-100 transition-opacity"
                        style={{ opacity, transform: `scale(${scale})`, transition: 'all 0.5s ease-out' }}
                      >
                        <div className={cn(
                          "relative flex items-center justify-center transition-all duration-500",
                          isActive ? "w-[32px] h-[32px]" : "w-[20px] h-[20px]"
                        )}>
                          {/* Active step glow ring */}
                          {isActive && (
                            <div 
                              className="absolute inset-0 rounded-full border border-accent-red/40 animate-pulse" 
                              style={{ boxShadow: '0 0 16px hsl(var(--accent-red) / 0.2)' }} 
                            />
                          )}
                          <div className={cn(
                            "rounded-full transition-all duration-500 flex items-center justify-center font-semibold",
                            isActive 
                              ? "w-[24px] h-[24px] bg-foreground text-background text-[10px]" 
                              : completedSteps.has(stepNum)
                                ? "w-[20px] h-[20px] bg-foreground text-background" 
                                : "w-[20px] h-[20px] bg-border/60 text-muted-foreground text-[9px]"
                          )}>
                            {completedSteps.has(stepNum) && !isActive ? (
                              <Check className="w-[10px] h-[10px]" strokeWidth={3} />
                            ) : (
                              <span>{stepNum}</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Form Content */}
        <main className="flex-1 flex items-start justify-center px-2.5 sm:px-5 md:px-[25px] lg:px-[30px] py-5 overflow-y-auto">
          <div 
            key={currentStep}
            className={cn(
              "w-full max-w-lg",
              isTransitioning 
                ? transitionDirection === "forward" 
                  ? "animate-step-exit-left" 
                  : "animate-step-exit-right"
                : transitionDirection === "forward"
                  ? "animate-step-enter-right"
                  : "animate-step-enter-left"
            )}
          >
            {mode === "signin" ? <SignInForm email={email} password={password} onEmailChange={setEmail} onPasswordChange={setPassword} onSignUp={() => setMode("signup")} /> : <>
                {currentStep === "onboarding" && <OnboardingForm onContinue={handleNext} onSignIn={() => setMode("signin")} />}
                {currentStep === "account-type" && <AccountTypeForm selectedType={accountType} onSelect={setAccountType} validationStatus={getStepValidationStatus(accountType !== null, true, showValidationErrors)} />}
                {currentStep === "license" && <LicenseForm accountType={accountType} licenseNumber={licenseNumber} salonSize={salonSize} salonStructure={salonStructure} licenseFile={licenseFile} onLicenseChange={setLicenseNumber} onSalonSizeChange={setSalonSize} onSalonStructureChange={setSalonStructure} onLicenseFileChange={setLicenseFile} showValidationErrors={showValidationErrors} validationStatus={getStepValidationStatus(accountType === "salon" ? (licenseNumber.trim() !== "" && salonSize !== "" && salonStructure !== "") : licenseNumber.trim() !== "", licenseNumber.trim() !== "" || salonSize !== "" || salonStructure !== "", showValidationErrors)} />}
                {currentStep === "business-location" && <BusinessLocationForm businessName={businessName} businessAddress={businessAddress} suiteNumber={suiteNumber} country={country} city={city} state={state} zipCode={zipCode} onBusinessNameChange={setBusinessName} onBusinessAddressChange={setBusinessAddress} onSuiteNumberChange={setSuiteNumber} onCountryChange={setCountry} onCityChange={setCity} onStateChange={setState} onZipCodeChange={setZipCode} showValidationErrors={showValidationErrors} validationStatus={getStepValidationStatus(businessName.trim() !== "" && businessAddress.trim() !== "" && country !== "" && city.trim() !== "" && state !== "" && zipCode.trim() !== "", businessName.trim() !== "" || businessAddress.trim() !== "" || city.trim() !== "" || zipCode.trim() !== "", showValidationErrors)} />}
                {currentStep === "wholesale-terms" && <WholesaleTermsForm agreed={wholesaleAgreed} onAgreeChange={setWholesaleAgreed} showValidationErrors={showValidationErrors} validationStatus={getStepValidationStatus(wholesaleAgreed, false, showValidationErrors)} />}
                {currentStep === "tax-exemption" && <TaxExemptionForm hasTaxExemption={hasTaxExemption} taxExemptFile={taxExemptFile} onTaxExemptionChange={setHasTaxExemption} onTaxExemptFileChange={setTaxExemptFile} showValidationErrors={showValidationErrors} validationStatus={getStepValidationStatus(hasTaxExemption !== null && (hasTaxExemption === false || taxExemptFile !== null), hasTaxExemption !== null, showValidationErrors)} />}
                {currentStep === "contact-info" && <ContactInfoForm firstName={firstName} lastName={lastName} preferredName={preferredName} phoneNumber={phoneNumber} onFirstNameChange={setFirstName} onLastNameChange={setLastName} onPreferredNameChange={setPreferredName} onPhoneNumberChange={setPhoneNumber} showValidationErrors={showValidationErrors} validationStatus={getStepValidationStatus(firstName.trim() !== "" && lastName.trim() !== "" && phoneNumber.trim() !== "", firstName.trim() !== "" || lastName.trim() !== "" || phoneNumber.trim() !== "", showValidationErrors)} />}
                {currentStep === "success" && <SuccessForm onContinue={() => navigate("/")} />}
              </>}
          </div>
        </main>

        {/* Footer */}
        {(mode === "signin" || mode === "signup" && currentStep !== "success") && <footer className="p-2.5 sm:p-5 lg:p-[25px] pt-0 pb-5 sm:pb-[25px] lg:pb-[30px]">
            <div className="max-w-lg mx-auto flex flex-col gap-[10px]">
              {/* Step label above buttons */}
              {showStepIndicator && (
                <div className="text-center">
                  <span className="text-[11px] text-muted-foreground/60 tracking-wider">
                    Step {getCurrentStepNumber().toString().padStart(2, '0')} / {getTotalSteps().toString().padStart(2, '0')}
                  </span>
                </div>
              )}
              <div className="flex gap-[15px]">
                {mode === "signup" && currentStep !== "onboarding" && <Button variant="outline" size="lg" onClick={handleBack} className="h-[55px] w-[55px] p-0 rounded-[15px] border-border/40 hover:bg-muted/50 hover:border-foreground/20 transition-all duration-300 group">
                    <ArrowLeft className="w-[18px] h-[18px] transition-transform duration-300 group-hover:-translate-x-0.5" />
                  </Button>}
                <Button size="lg" onClick={handleNext} disabled={!canContinue()} className="btn-premium flex-1 h-[55px] rounded-[15px] bg-foreground text-background hover:bg-foreground disabled:opacity-40 font-medium text-base tracking-wide">
                  <span className="relative z-10 flex items-center justify-center gap-[10px]">
                    {mode === "signin" ? "Sign in" : currentStep === "onboarding" ? "Get Started" : currentStep === "contact-info" ? "Create Account" : "Continue"}
                    <ArrowRight className="w-[18px] h-[18px] transition-transform duration-300 group-hover:translate-x-0.5" />
                  </span>
                </Button>
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
      <div className="inline-flex items-center gap-2.5 px-[15px] py-[6px] rounded-full bg-accent-red/5 border border-accent-red/10 mb-[5px]">
        <div className="w-[6px] h-[6px] rounded-full bg-accent-red animate-pulse" />
        <span className="text-[10px] font-medium text-accent-red/80 uppercase tracking-[0.15em]">
          Secure Login
        </span>
      </div>
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-foreground tracking-[-0.02em] leading-[1.1] font-display whitespace-nowrap">
        Welcome back
      </h1>
      <p className="text-sm sm:text-base text-muted-foreground/70 leading-relaxed">
        Sign in to access your pro account
      </p>
    </div>


    <div className="space-y-[clamp(12px,2.5vh,20px)] animate-stagger-3">
      <div className="space-y-2.5">
        <Label htmlFor="login-email" className="text-xs font-medium text-muted-foreground uppercase tracking-[0.1em] label-float transition-all duration-300 group-focus-within:text-foreground">
          Email address
        </Label>
        <div className="relative group input-ultra input-ripple rounded-[15px]">
          <div className="absolute left-[15px] top-1/2 -translate-y-1/2 w-[35px] h-[35px] rounded-[12px] bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center transition-all duration-500 group-focus-within:from-foreground group-focus-within:to-foreground/80 group-focus-within:shadow-lg group-focus-within:shadow-foreground/10">
            <Mail className="w-[15px] h-[15px] text-muted-foreground group-focus-within:text-background transition-all duration-300 icon-haptic" />
          </div>
          <Input id="login-email" type="email" placeholder="you@example.com" value={email} onChange={e => onEmailChange(e.target.value)} className="h-[60px] pl-[60px] rounded-[15px] bg-muted/30 border-border/30 focus:border-foreground/20 focus:bg-background transition-all duration-500 text-base placeholder:text-muted-foreground/40 focus:shadow-[inset_0_0_20px_rgba(0,0,0,0.03)]" />
        </div>
      </div>

      <PasswordInputField 
        id="login-password"
        label="Password"
        value={password}
        onChange={onPasswordChange}
        placeholder="••••••••"
      />

      <button className="group inline-flex items-center gap-[5px] text-sm text-muted-foreground hover:text-foreground transition-all duration-300">
        <span className="relative">
          Forgot password?
          <span className="absolute left-0 bottom-0 w-0 h-px bg-foreground transition-all duration-300 group-hover:w-full" />
        </span>
        <ArrowUpRight className="w-[15px] h-[15px] opacity-0 -translate-x-1 -translate-y-0.5 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-300" />
      </button>
    </div>

    <div className="flex items-center justify-center gap-[clamp(8px,2vh,15px)] text-xs text-muted-foreground/60 pt-[clamp(5px,1.5vh,10px)] animate-stagger-4">
      <div className="flex items-center gap-[8px] px-[12px] py-[6px] rounded-full bg-muted/30 border border-border/20">
        <div className="w-[6px] h-[6px] rounded-full bg-accent-red/60 animate-pulse" />
        <span className="text-[10px] uppercase tracking-wider">Encrypted</span>
      </div>
      <div className="flex items-center gap-[8px] px-[12px] py-[6px] rounded-full bg-muted/30 border border-border/20">
        <div className="w-[6px] h-[6px] rounded-full bg-accent-red/60 animate-pulse" style={{ animationDelay: '0.5s' }} />
        <span className="text-[10px] uppercase tracking-wider">256-bit SSL</span>
      </div>
    </div>

    <div className="flex flex-wrap justify-center gap-[clamp(6px,1.5vh,10px)] pt-[clamp(8px,2vh,15px)] animate-stagger-5 lg:hidden">
      {features.map((feature, index) => (
        <SignInFeatureBox key={index} icon={feature.icon} label={feature.label} desc={feature.desc} />
      ))}
    </div>

    <p className="text-xs text-muted-foreground text-center pt-2">
      Don't have an account?{" "}
      <button 
        onClick={onSignUp}
        className="text-foreground underline underline-offset-2 hover:no-underline"
      >
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
}) => <div className="space-y-[30px] text-center">
    <div className="inline-flex items-center gap-2.5 px-[15px] py-[6px] rounded-full bg-accent-red/5 border border-accent-red/10 mb-2.5 animate-stagger-1">
      <Sparkles className="w-[14px] h-[14px] text-accent-red/70" />
      <span className="text-[10px] font-medium text-accent-red/70 uppercase tracking-[0.15em]">
        Getting Started
      </span>
    </div>

    <div className="space-y-[10px] animate-stagger-1">
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-foreground tracking-[-0.02em] leading-[1.1] font-display">
        Ready to join?
      </h1>
      <p className="text-sm sm:text-base text-muted-foreground/70 leading-relaxed">
        Create your pro account in just a few steps
      </p>
    </div>

    <div className="flex flex-wrap justify-center gap-2.5 animate-stagger-2">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">24 hour approval</span>
      </div>
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
        <FileCheck className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Valid license required</span>
      </div>
    </div>

    <div className="grid gap-2.5 sm:gap-[15px] pt-5">
      {[{
      icon: User,
      label: "Choose your account type",
      desc: "Pro, Salon, or Student"
    }, {
      icon: FileCheck,
      label: "Verify your license",
      desc: "Quick verification process"
    }, {
      icon: Gift,
      label: "Start saving",
      desc: "Unlock wholesale pricing"
    }].map((item, i) => <div 
          key={i} 
          className="flex items-center gap-[15px] sm:gap-5 p-[15px] sm:p-5 rounded-[15px] bg-muted/50 border border-border/50 text-left opacity-0 animate-fade-in"
          style={{ animationDelay: `${300 + i * 150}ms`, animationFillMode: 'forwards' }}
        >
          <div className="w-10 h-10 rounded-[10px] sm:rounded-[15px] bg-foreground flex items-center justify-center flex-shrink-0">
            <item.icon className="w-5 h-5 text-background" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{i + 1}. {item.label}</p>
            <p className="text-xs text-muted-foreground">{item.desc}</p>
          </div>
        </div>)}
    </div>

    <p className="text-xs text-muted-foreground pt-5">
      Already have an account?{" "}
      <button 
        onClick={onSignIn}
        className="text-foreground underline underline-offset-2 hover:no-underline"
      >
        Sign in
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
    title: "Professional",
    description: "Licensed cosmetologists",
    features: ["Wholesale pricing", "Priority support", "Early access"]
  }, {
    id: "salon",
    icon: Building2,
    title: "Salon Owner",
    description: "Business accounts",
    features: ["Team accounts", "Bulk discounts", "Net 30 terms"]
  }, {
    id: "student",
    icon: GraduationCap,
    title: "Student",
    description: "Currently enrolled",
    features: ["Student pricing", "Learning resources", "Community access"]
  }];
  return <div className="space-y-5 sm:space-y-[30px]">
      <div className="space-y-[10px] text-center animate-stagger-1">
        <div className="inline-flex items-center gap-2.5 px-[15px] py-[6px] rounded-full bg-muted border border-border/50 mb-[5px]">
          <StepValidationIcon status={validationStatus} />
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
            Step 1
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-foreground tracking-[-0.02em] leading-[1.1] font-display">
          Choose your path
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground/70 leading-relaxed">
          Select the account type that fits you best
        </p>
      </div>

      <div className="space-y-2.5 sm:space-y-[15px]">
        {types.map((type, index) => (
          <button 
            key={type.id} 
            onClick={() => onSelect(type.id)} 
            className={cn(
              "relative w-full p-[15px] sm:p-5 rounded-[15px] sm:rounded-[20px] border-2 text-left group overflow-hidden",
              "transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
              "hover:-translate-y-0.5 active:scale-[0.98]",
              selectedType === type.id 
                ? "border-foreground bg-foreground/5 shadow-lg shadow-foreground/5" 
                : "border-border hover:border-foreground/30 hover:bg-muted/50 hover:shadow-md hover:shadow-foreground/5"
            )}
            style={{ 
              animationDelay: `${index * 0.05}s`,
              transform: selectedType === type.id ? 'translateY(-2px)' : undefined
            }}
          >
            {/* Selection ripple effect */}
            <div className={cn(
              "absolute inset-0 bg-gradient-to-r from-foreground/5 via-foreground/10 to-foreground/5 opacity-0 transition-opacity duration-500",
              selectedType === type.id && "opacity-100"
            )} />
            
            {/* Shine sweep on selection */}
            <div className={cn(
              "absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-foreground/10 to-transparent skew-x-12 transition-transform duration-700",
              selectedType === type.id && "translate-x-full"
            )} />

            {/* Check mark with bounce animation */}
            <div className={cn(
              "absolute top-[15px] sm:top-5 right-[15px] sm:right-5 w-6 h-6 rounded-full bg-foreground flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
              selectedType === type.id 
                ? "scale-100 opacity-100" 
                : "scale-0 opacity-0"
            )}>
              <Check className={cn(
                "w-[14px] h-[14px] text-background transition-transform duration-300 delay-100",
                selectedType === type.id ? "scale-100" : "scale-0"
              )} strokeWidth={3} />
            </div>

            <div className="relative flex items-start gap-[15px] sm:gap-5">
              {/* Icon with haptic bounce */}
              <div className={cn(
                "w-10 h-10 sm:w-12 sm:h-12 rounded-[10px] sm:rounded-[15px] flex items-center justify-center flex-shrink-0 transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                selectedType === type.id 
                  ? "bg-foreground scale-110 shadow-lg shadow-foreground/20" 
                  : "bg-muted group-hover:scale-105 group-hover:bg-muted/80"
              )}>
                <type.icon className={cn(
                  "w-5 h-5 sm:w-6 sm:h-6 transition-all duration-300",
                  selectedType === type.id 
                    ? "text-background scale-110" 
                    : "text-foreground group-hover:scale-105"
                )} />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm sm:text-base font-medium text-foreground transition-all duration-300",
                  selectedType === type.id && "translate-x-0.5"
                )}>{type.title}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mb-2.5">{type.description}</p>
                <div className="flex flex-wrap gap-[5px]">
                  {type.features.map((feature, i) => (
                    <span 
                      key={i} 
                      className={cn(
                        "text-[10px] px-2.5 py-[5px] rounded-full transition-all duration-300",
                        selectedType === type.id 
                          ? "bg-foreground/10 text-foreground" 
                          : "bg-muted text-muted-foreground"
                      )}
                      style={{ transitionDelay: `${i * 50}ms` }}
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
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
  onLicenseChange,
  onSalonSizeChange,
  onSalonStructureChange,
  onLicenseFileChange,
  showValidationErrors = false,
  validationStatus
}: {
  accountType: string | null;
  licenseNumber: string;
  salonSize: string;
  salonStructure: string;
  licenseFile: File | null;
  onLicenseChange: (value: string) => void;
  onSalonSizeChange: (value: string) => void;
  onSalonStructureChange: (value: string) => void;
  onLicenseFileChange: (file: File | null) => void;
  showValidationErrors?: boolean;
  validationStatus: "complete" | "in-progress" | "error";
}) => {
  const isSalon = accountType === "salon";
  const licenseError = showValidationErrors && licenseNumber.trim() === "";
  const salonSizeError = showValidationErrors && isSalon && salonSize === "";
  const salonStructureError = showValidationErrors && isSalon && salonStructure === "";
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    onLicenseFileChange(file);
  };
  
  return (
    <div className="space-y-5 sm:space-y-[30px]">
      <div className="space-y-[10px] text-center animate-stagger-1">
        <div className="inline-flex items-center gap-2.5 px-[15px] py-[6px] rounded-full bg-muted border border-border/50 mb-[5px]">
          <StepValidationIcon status={validationStatus} />
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
            Step 3
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-foreground tracking-[-0.02em] leading-[1.1] font-display">
          {isSalon ? "What is your license number?" : "Verify your license"}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground/70 leading-relaxed">
          {isSalon ? "Let us make sure you are a salon manager" : "Enter your cosmetology license details"}
        </p>
      </div>

      <div className="flex gap-[15px] p-5 rounded-[15px] bg-muted/50 border border-border/50">
        <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-[2px]" />
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isSalon 
            ? "We are a manufacturer and supplier of professional products. The prices displayed reflect professional wholesale pricing, not available to the general public."
            : "We display professional wholesale pricing. Please enter your license exactly as it appears from the state."}
        </p>
      </div>

      <div className="space-y-5">
        {/* License Number */}
        <div className="space-y-2.5">
          <Label htmlFor="license" className={cn(
            "text-sm font-medium label-float",
            licenseError && "text-destructive"
          )}>
            {isSalon ? "Salon License #*" : "License number*"}
          </Label>
          <div className="relative group input-glow input-ripple rounded-[15px]">
            <Input id="license" type="text" placeholder={isSalon ? "Salon License #" : "Enter your license number"} value={licenseNumber} onChange={e => onLicenseChange(e.target.value)} className={cn(
              "h-[55px] rounded-[15px] bg-muted/50 border-border/50 focus:border-foreground/30 focus:bg-muted transition-all duration-300 text-base focus:shadow-[inset_0_0_20px_rgba(0,0,0,0.03)]",
              licenseError && "border-destructive/50 bg-destructive/5"
            )} />
          </div>
          {licenseError && <p className="text-xs text-destructive">License number is required</p>}
        </div>

        {/* Salon-specific fields */}
        {isSalon && (
          <>
            {/* Salon Size */}
            <div className="flex items-center justify-between gap-4">
              <Label className={cn(
                "text-sm font-medium whitespace-nowrap",
                salonSizeError && "text-destructive"
              )}>
                What's the size of your salon?*
              </Label>
              <div className="flex flex-col items-end gap-1">
                <Select value={salonSize} onValueChange={onSalonSizeChange}>
                  <SelectTrigger className={cn(
                    "w-[180px] h-[50px] rounded-[15px] border-border/50 bg-muted/50 transition-all duration-300",
                    salonSizeError && "border-destructive/50 bg-destructive/5"
                  )}>
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
              <Label className={cn(
                "text-sm font-medium whitespace-nowrap",
                salonStructureError && "text-destructive"
              )}>
                Select your salon structure*
              </Label>
              <div className="flex flex-col items-end gap-1">
                <Select value={salonStructure} onValueChange={onSalonStructureChange}>
                  <SelectTrigger className={cn(
                    "w-[180px] h-[50px] rounded-[15px] border-border/50 bg-muted/50 transition-all duration-300",
                    salonStructureError && "border-destructive/50 bg-destructive/5"
                  )}>
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
            <div className="flex items-center gap-4 pt-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="h-[45px] px-6 rounded-[12px] border-border/50 hover:bg-muted/50"
              >
                Choose File
              </Button>
              <span className="text-sm text-muted-foreground">
                {licenseFile ? licenseFile.name : "Upload your salon license"}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Business Location Form (Step 2 for professionals)
const countries = ["United States", "Canada"];
const provinces = ["Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador", "Northwest Territories", "Nova Scotia", "Nunavut", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan", "Yukon"];
const BusinessLocationForm = ({
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
  
  return <div className="space-y-[25px]">
    <div className="space-y-2.5 text-center animate-stagger-1">
      <div className="inline-flex items-center gap-2.5 px-[15px] py-[6px] rounded-full bg-muted border border-border/50 mb-[5px]">
        <StepValidationIcon status={validationStatus} />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
          Step 2
        </span>
      </div>
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-foreground tracking-[-0.02em] leading-[1.1] font-display">
        Where is your business located?
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
            {state && country === "United States" && hasStateIcon(state) && (
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-[24px] h-[24px] flex items-center justify-center z-10">
                <StateIcon state={state} size={22} className="text-foreground" />
              </div>
            )}
            <Select value={state} onValueChange={onStateChange}>
              <SelectTrigger className={cn(
                "h-[50px] rounded-[15px] border-border/50 bg-muted/50 transition-all duration-300 focus:shadow-[inset_0_0_20px_rgba(0,0,0,0.03)]",
                state && country === "United States" && hasStateIcon(state) && "pl-[42px]"
              )}>
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

// Wholesale Terms Form (Step 3 for professionals)
const WholesaleTermsForm = ({
  agreed,
  onAgreeChange,
  showValidationErrors = false,
  validationStatus
}: {
  agreed: boolean;
  onAgreeChange: (value: boolean) => void;
  showValidationErrors?: boolean;
  validationStatus: "complete" | "in-progress" | "error";
}) => {
  const agreementError = showValidationErrors && !agreed;
  
  return <div className="space-y-[25px]">
    <div className="space-y-2.5 text-center animate-stagger-1">
      <div className="inline-flex items-center gap-2.5 px-[15px] py-[6px] rounded-full bg-muted border border-border/50 mb-[5px]">
        <StepValidationIcon status={validationStatus} />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
          Step 4
        </span>
      </div>
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-foreground tracking-[-0.02em] leading-[1.1] font-display">
        Do you agree to wholesale terms?
      </h1>
    </div>

    <div className="flex gap-[15px] p-5 rounded-[15px] bg-muted/50 border border-border/50">
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

    <button
      onClick={() => onAgreeChange(!agreed)}
      className={cn(
        "w-full p-5 rounded-[15px] border-2 text-left transition-all duration-300 flex items-center gap-4",
        agreed 
          ? "border-foreground bg-foreground/5" 
          : agreementError 
            ? "border-destructive/50 bg-destructive/5"
            : "border-border hover:border-foreground/30 hover:bg-muted/50"
      )}
    >
      <div className={cn(
        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 flex-shrink-0",
        agreed ? "border-foreground bg-foreground" : agreementError ? "border-destructive/50" : "border-muted-foreground/50"
      )}>
        {agreed && <Check className="w-4 h-4 text-background" strokeWidth={3} />}
      </div>
      <span className={cn(
        "text-sm font-medium",
        agreementError ? "text-destructive" : "text-foreground"
      )}>
        Yes, I agree to not use my client's card to purchase.*
      </span>
    </button>
    {agreementError && <p className="text-xs text-destructive text-center">Please agree to the wholesale terms to continue</p>}
  </div>;
};

// Tax Exemption Form (Step 4 for professionals)
const TaxExemptionForm = ({
  hasTaxExemption,
  taxExemptFile,
  onTaxExemptionChange,
  onTaxExemptFileChange,
  showValidationErrors = false,
  validationStatus
}: {
  hasTaxExemption: boolean | null;
  taxExemptFile: File | null;
  onTaxExemptionChange: (value: boolean) => void;
  onTaxExemptFileChange: (file: File | null) => void;
  showValidationErrors?: boolean;
  validationStatus: "complete" | "in-progress" | "error";
}) => {
  const selectionError = showValidationErrors && hasTaxExemption === null;
  const fileError = showValidationErrors && hasTaxExemption === true && taxExemptFile === null;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    onTaxExemptFileChange(file);
  };
  
  return (
    <div className="space-y-[25px]">
      <div className="space-y-2.5 text-center animate-stagger-1">
        <div className="inline-flex items-center gap-2.5 px-[15px] py-[6px] rounded-full bg-muted border border-border/50 mb-[5px]">
          <StepValidationIcon status={validationStatus} />
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
            Step 5
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-foreground tracking-[-0.02em] leading-[1.1] font-display">
          Do you have a tax exemption?
        </h1>
      </div>

      <div className="flex gap-[15px] p-5 rounded-[15px] bg-muted/50 border border-border/50">
        <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-[2px]" />
        <p className="text-sm text-muted-foreground leading-relaxed">
          A resale license for tax exemption is not required to register, but it may be a good idea for you to have one. If you choose to upload a tax exemption license, you will not be charged sales tax on extensions. If you do not want to pay sales tax, and be sales tax exempt, please upload your tax exemption documentation from your state.
        </p>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onTaxExemptionChange(true)}
            className={cn(
              "p-5 rounded-[15px] border-2 text-left transition-all duration-300 flex items-center gap-4",
              hasTaxExemption === true 
                ? "border-foreground bg-foreground/5" 
                : selectionError
                  ? "border-destructive/50 bg-destructive/5"
                  : "border-border hover:border-foreground/30 hover:bg-muted/50"
            )}
          >
            <div className={cn(
              "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 flex-shrink-0",
              hasTaxExemption === true ? "border-foreground bg-foreground" : selectionError ? "border-destructive/50" : "border-muted-foreground/50"
            )}>
              {hasTaxExemption === true && <Check className="w-4 h-4 text-background" strokeWidth={3} />}
            </div>
            <span className={cn("text-sm font-medium", selectionError ? "text-destructive" : "text-foreground")}>Yes</span>
          </button>
          <button
            onClick={() => {
              onTaxExemptionChange(false);
              onTaxExemptFileChange(null);
            }}
            className={cn(
              "p-5 rounded-[15px] border-2 text-left transition-all duration-300 flex items-center gap-4",
              hasTaxExemption === false 
                ? "border-foreground bg-foreground/5" 
                : selectionError
                  ? "border-destructive/50 bg-destructive/5"
                  : "border-border hover:border-foreground/30 hover:bg-muted/50"
            )}
          >
            <div className={cn(
              "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 flex-shrink-0",
              hasTaxExemption === false ? "border-foreground bg-foreground" : selectionError ? "border-destructive/50" : "border-muted-foreground/50"
            )}>
              {hasTaxExemption === false && <Check className="w-4 h-4 text-background" strokeWidth={3} />}
            </div>
            <span className={cn("text-sm font-medium", selectionError ? "text-destructive" : "text-foreground")}>No</span>
          </button>
        </div>
        {selectionError && <p className="text-xs text-destructive text-center">Please select an option</p>}
      </div>
      
      {/* File upload - shown when Yes is selected */}
      {hasTaxExemption === true && (
        <div className="space-y-2">
          <div className="flex items-center gap-4 pt-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "h-[45px] px-6 rounded-[12px] border-border/50 hover:bg-muted/50",
                fileError && "border-destructive/50"
              )}
            >
              Choose File
            </Button>
            <span className={cn(
              "text-sm",
              fileError ? "text-destructive" : "text-muted-foreground"
            )}>
              {taxExemptFile ? taxExemptFile.name : "Upload your state tax-exempt license"}
            </span>
          </div>
          {fileError && <p className="text-xs text-destructive">Please upload your tax exemption document</p>}
        </div>
      )}
    </div>
  );
};

// Contact Info Form (Step 5 for professionals, Step 2 for students)
const ContactInfoForm = ({
  firstName,
  lastName,
  preferredName,
  phoneNumber,
  onFirstNameChange,
  onLastNameChange,
  onPreferredNameChange,
  onPhoneNumberChange,
  showValidationErrors = false,
  validationStatus
}: {
  firstName: string;
  lastName: string;
  preferredName: string;
  phoneNumber: string;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onPreferredNameChange: (value: string) => void;
  onPhoneNumberChange: (value: string) => void;
  showValidationErrors?: boolean;
  validationStatus: "complete" | "in-progress" | "error";
}) => {
  const firstNameError = showValidationErrors && firstName.trim() === "";
  const lastNameError = showValidationErrors && lastName.trim() === "";
  const phoneError = showValidationErrors && phoneNumber.trim() === "";
  
  return <div className="space-y-[25px]">
    <div className="space-y-2.5 text-center animate-stagger-1">
      <div className="inline-flex items-center gap-2.5 px-[15px] py-[6px] rounded-full bg-muted border border-border/50 mb-[5px]">
        <StepValidationIcon status={validationStatus} />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
          Step 6
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
          <Label htmlFor="legalFirstName" className={cn(
            "text-sm font-medium label-float",
            firstNameError && "text-destructive"
          )}>
            Legal first name*
          </Label>
          <div className="input-glow input-ripple rounded-[15px]">
            <Input id="legalFirstName" type="text" placeholder="Legal first name" value={firstName} onChange={e => onFirstNameChange(e.target.value)} className={cn(
              "h-[50px] rounded-[15px] bg-muted/50 border-border/50 focus:border-foreground/30 focus:bg-background transition-all duration-300 focus:shadow-[inset_0_0_20px_rgba(0,0,0,0.03)]",
              firstNameError && "border-destructive/50 bg-destructive/5"
            )} />
          </div>
          {firstNameError && <p className="text-xs text-destructive">First name is required</p>}
        </div>
        <div className="space-y-2.5 group">
          <Label htmlFor="legalLastName" className={cn(
            "text-sm font-medium label-float",
            lastNameError && "text-destructive"
          )}>
            Legal last name*
          </Label>
          <div className="input-glow input-ripple rounded-[15px]">
            <Input id="legalLastName" type="text" placeholder="Legal last name" value={lastName} onChange={e => onLastNameChange(e.target.value)} className={cn(
              "h-[50px] rounded-[15px] bg-muted/50 border-border/50 focus:border-foreground/30 focus:bg-background transition-all duration-300 focus:shadow-[inset_0_0_20px_rgba(0,0,0,0.03)]",
              lastNameError && "border-destructive/50 bg-destructive/5"
            )} />
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

      {/* Phone Number */}
      <div className="space-y-2.5 animate-stagger-4 group">
        <Label htmlFor="phoneNumber" className={cn(
          "text-sm font-medium label-float",
          phoneError && "text-destructive"
        )}>
          Phone number*
        </Label>
        <div className="relative group input-glow input-ripple rounded-[15px]">
          <div className={cn(
            "absolute left-[15px] top-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-[10px] flex items-center justify-center transition-all duration-300 group-focus-within:bg-foreground group-focus-within:shadow-lg group-focus-within:shadow-foreground/10",
            phoneError ? "bg-destructive/10" : "bg-muted"
          )}>
            <Phone className={cn(
              "w-[15px] h-[15px] group-focus-within:text-background transition-all duration-300 icon-haptic",
              phoneError ? "text-destructive" : "text-muted-foreground"
            )} />
          </div>
          <Input id="phoneNumber" type="tel" placeholder="Phone number" value={phoneNumber} onChange={e => onPhoneNumberChange(e.target.value)} className={cn(
            "h-[50px] pl-[55px] rounded-[15px] bg-muted/50 border-border/50 focus:border-foreground/30 focus:bg-background transition-all duration-300 text-base focus:shadow-[inset_0_0_20px_rgba(0,0,0,0.03)]",
            phoneError && "border-destructive/50 bg-destructive/5"
          )} />
        </div>
        {phoneError && <p className="text-xs text-destructive">Phone number is required</p>}
      </div>

      {/* SMS Consent Notice */}
      <div className="flex gap-[15px] p-4 rounded-[15px] bg-muted/50 border border-border/50 animate-stagger-5">
        <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-[2px]" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          By registering I agree to receive recurring automated marketing text messages (e.g. discounts, promos, and stock updates) at the phone number provided. Consent is not a condition to purchase. Msg & data rates may apply. Msg frequency varies. Reply HELP for help and STOP to cancel. View our{" "}
          <button className="underline underline-offset-2 hover:text-foreground transition-colors">Terms of Service</button>
          {" "}and{" "}
          <button className="underline underline-offset-2 hover:text-foreground transition-colors">Privacy Policy</button>.
        </p>
      </div>
    </div>
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
  
  return (
    <div className="space-y-2.5">
      <Label htmlFor={id} className={cn(
        "font-medium label-float transition-all duration-300",
        isSignin ? "text-xs text-muted-foreground uppercase tracking-[0.1em]" : "text-sm"
      )}>
        {label}
      </Label>
      <div className={cn(
        "relative group rounded-[15px] input-ripple",
        isSignin ? "input-ultra" : "input-glow"
      )}>
        <div className={cn(
          "absolute left-[15px] top-1/2 -translate-y-1/2 rounded-[12px] flex items-center justify-center transition-all duration-500 group-focus-within:shadow-lg group-focus-within:shadow-foreground/10",
          isSignin 
            ? "w-[35px] h-[35px] bg-gradient-to-br from-muted to-muted/50 group-focus-within:from-foreground group-focus-within:to-foreground/80"
            : "w-[30px] h-[30px] rounded-[10px] bg-muted group-focus-within:bg-foreground"
        )}>
          <Lock className="w-[15px] h-[15px] text-muted-foreground group-focus-within:text-background transition-all duration-300 icon-haptic" />
        </div>
        <Input 
          id={id} 
          type={showPassword ? "text" : "password"} 
          placeholder={placeholder} 
          value={value} 
          onChange={e => onChange(e.target.value)} 
          className={cn(
            "pr-[50px] rounded-[15px] transition-all duration-500 text-base focus:shadow-[inset_0_0_20px_rgba(0,0,0,0.03)]",
            isSignin 
              ? "h-[60px] pl-[60px] bg-muted/30 border-border/30 focus:border-foreground/20 focus:bg-background placeholder:text-muted-foreground/40"
              : "h-[55px] pl-[55px] bg-muted/50 border-border/50 focus:border-foreground/30 focus:bg-background"
          )} 
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-[15px] top-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-[10px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-300 focus:outline-none haptic-press"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <EyeOff className="w-[16px] h-[16px] transition-transform duration-200 hover:scale-110" />
          ) : (
            <Eye className="w-[16px] h-[16px] transition-transform duration-200 hover:scale-110" />
          )}
        </button>
      </div>
    </div>
  );
};

// Password strength calculator
const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  
  if (score <= 1) return { score: 1, label: "Weak", color: "bg-red-500" };
  if (score <= 2) return { score: 2, label: "Fair", color: "bg-orange-500" };
  if (score <= 3) return { score: 3, label: "Good", color: "bg-yellow-500" };
  if (score <= 4) return { score: 4, label: "Strong", color: "bg-green-500" };
  return { score: 5, label: "Excellent", color: "bg-green-600" };
};

const PasswordStrengthMeter = ({ password }: { password: string }) => {
  const strength = getPasswordStrength(password);
  
  if (!password) return null;
  
  return (
    <div className="space-y-2.5 animate-fade-in">
      <div className="flex gap-[5px]">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={cn(
              "h-[5px] flex-1 rounded-full transition-all duration-300",
              level <= strength.score ? strength.color : "bg-border"
            )}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Password strength</span>
        <span className={cn("text-xs font-medium", 
          strength.score <= 2 ? "text-red-500" : 
          strength.score <= 3 ? "text-yellow-600" : "text-green-600"
        )}>{strength.label}</span>
      </div>
    </div>
  );
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
        <PasswordInputField 
          id="password"
          label="Password"
          value={password}
          onChange={onPasswordChange}
          placeholder="Create a password"
          variant="signup"
        />
        <PasswordStrengthMeter password={password} />
      </div>
    </div>
  </div>;
const SuccessForm = ({
  onContinue
}: {
  onContinue: () => void;
}) => <div className="space-y-[25px] animate-fade-in text-center">
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
        Your account has been created successfully
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
            Confirmation email sent to your inbox
          </p>
        </div>
      </div>
    </div>

    <Button size="lg" onClick={onContinue} className="w-full h-[50px] rounded-[15px] bg-foreground text-background hover:bg-foreground/90">
      Start Shopping
      <ArrowRight className="w-[15px] h-[15px] ml-2.5" />
    </Button>
  </div>;

export default Auth;