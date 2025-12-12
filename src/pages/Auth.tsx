import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Sparkles, Star, Truck, Gift, ChevronLeft, ChevronRight, Mail, Lock, User, FileCheck, MapPin, Check, ShoppingBag, Heart, ArrowUpRight, Building2, GraduationCap, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useMagnetic } from "@/hooks/use-magnetic";
type AuthMode = "signup" | "signin";
type Step = "onboarding" | "account-type" | "license" | "personal-info" | "success";
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
const Auth = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("signup");
  const [currentStep, setCurrentStep] = useState<Step>("onboarding");
  const [currentSlide, setCurrentSlide] = useState(0);
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
  const resetForm = () => {
    setCurrentStep("onboarding");
    setAccountType(null);
    setLicenseNumber("");
    setState("");
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
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
        return licenseNumber.trim() !== "" && state !== "";
      case "personal-info":
        return firstName.trim() !== "" && lastName.trim() !== "" && email.trim() !== "" && password.length >= 8;
      default:
        return true;
    }
  };
  const handleNext = () => {
    if (!canContinue()) {
      toast.error("Please complete all required fields");
      return;
    }
    if (mode === "signin") {
      toast.success("Signed in successfully!");
      navigate("/");
      return;
    }
    switch (currentStep) {
      case "onboarding":
        setCurrentStep("account-type");
        break;
      case "account-type":
        setCurrentStep(accountType === "student" ? "personal-info" : "license");
        break;
      case "license":
        setCurrentStep("personal-info");
        break;
      case "personal-info":
        setCurrentStep("success");
        toast.success("Account created successfully!");
        break;
    }
  };
  const handleBack = () => {
    switch (currentStep) {
      case "account-type":
        setCurrentStep("onboarding");
        break;
      case "license":
        setCurrentStep("account-type");
        break;
      case "personal-info":
        setCurrentStep(accountType === "student" ? "account-type" : "license");
        break;
    }
  };
  const getTotalSteps = () => {
    return accountType === "student" ? 3 : 4;
  };
  const getCurrentStepNumber = () => {
    if (currentStep === "account-type") return 1;
    if (currentStep === "license") return 2;
    if (currentStep === "personal-info") return accountType === "student" ? 2 : 3;
    return accountType === "student" ? 3 : 4;
  };
  const slide = slides[currentSlide];
  const showStepIndicator = mode === "signup" && currentStep !== "success" && currentStep !== "onboarding";
  return <div className="min-h-screen flex items-center justify-center p-2.5 sm:p-5 lg:p-10">
      {/* Blurred darkened backdrop */}
      <div className="fixed inset-0 bg-foreground/60 backdrop-blur-md cursor-pointer" onClick={() => navigate("/")} />
      
      {/* Modal Container */}
      <div className="relative z-10 w-full sm:w-[95vw] lg:w-[90vw] h-[95vh] sm:h-[90vh] max-w-[1400px] bg-background rounded-[20px] sm:rounded-[25px] lg:rounded-[30px] shadow-2xl overflow-hidden flex flex-col lg:flex-row" style={{
      animation: 'modalEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards'
    }}>
        {/* Close Button */}
        <button onClick={() => navigate("/")} className="absolute top-2.5 sm:top-5 right-2.5 sm:right-5 z-20 p-2.5 rounded-full bg-foreground/5 hover:bg-foreground/10 transition-colors" aria-label="Close">
          <X className="w-5 h-5 text-foreground" />
        </button>
        {/* Left Panel - Hero/Branding */}
        <div className="relative flex flex-col w-full lg:w-1/2 min-h-[280px] sm:min-h-[320px] lg:min-h-0 bg-foreground overflow-hidden m-2.5 sm:m-5 rounded-[15px] sm:rounded-[20px]" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        {/* Sliding Background + Content Container */}
        <div key={currentSlide} className="absolute inset-0" style={{
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

          {/* Sliding Content - Text, Stats, Features */}
          <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-5 lg:p-10 pb-[70px] lg:pb-[80px]">
            {/* Main content */}
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
          </div>
        </div>

        {/* Floating decorations - Fixed */}
        <div className="absolute top-5 md:top-5 lg:top-10 right-5 md:right-5 lg:right-10 flex gap-2.5 z-10">
          <div className="w-2.5 h-2.5 rounded-full bg-background/20 animate-pulse" style={{
            animationDelay: '0s'
          }} />
          <div className="w-2.5 h-2.5 rounded-full bg-background/30 animate-pulse" style={{
            animationDelay: '0.5s'
          }} />
          <div className="w-2.5 h-2.5 rounded-full bg-background/20 animate-pulse" style={{
            animationDelay: '1s'
          }} />
        </div>

        {/* Fixed Logo */}
        <div className="absolute top-5 md:top-5 lg:top-10 left-5 md:left-5 lg:left-10 z-10 flex items-center gap-[5px] md:gap-2.5">
          <div className="w-[25px] md:w-[30px] h-[25px] md:h-[30px] rounded-[10px] bg-background/10 backdrop-blur-sm flex items-center justify-center">
            <Sparkles className="w-[15px] h-[15px] text-background" />
          </div>
          <span className="text-sm md:text-lg font-semibold text-background">ProBeauty</span>
        </div>

        {/* Fixed Bottom Navigation */}
        <div className="absolute bottom-5 md:bottom-5 lg:bottom-10 left-5 md:left-5 lg:left-10 right-5 md:right-5 lg:right-10 z-10 flex items-center justify-between">
          {/* Slide Indicators */}
          <div className="flex gap-2.5">
            {slides.map((_, i) => <button key={i} onClick={() => setCurrentSlide(i)} className={cn("h-[5px] rounded-full transition-all duration-300", i === currentSlide ? "w-10 bg-background/60" : "w-[5px] bg-background/20")} />)}
          </div>

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

          {/* Nav Arrows - Desktop */}
          <div className="hidden lg:flex gap-2.5">
            <button onClick={goToPrevSlide} className="p-2.5 rounded-full bg-background/5 border border-background/10 hover:bg-background/10 transition-all">
              <ChevronLeft className="w-[15px] h-[15px] text-background/70" />
            </button>
            <button onClick={goToNextSlide} className="p-2.5 rounded-full bg-background/5 border border-background/10 hover:bg-background/10 transition-all">
              <ChevronRight className="w-[15px] h-[15px] text-background/70" />
            </button>
          </div>
        </div>

        {/* Progress Bar - Mobile/Tablet only */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-background/10 lg:hidden z-10">
          <div className="h-full bg-background/60 transition-all duration-500" style={{
            width: `${(currentSlide + 1) / slides.length * 100}%`
          }} />
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col bg-background lg:rounded-r-[20px] overflow-auto">
        {/* Header */}
        <header className="flex items-center justify-between p-2.5 sm:p-5 lg:p-[25px]">
          {/* Auth Toggle */}
          <div className="inline-flex bg-muted rounded-full p-[5px]">
            <button onClick={() => handleModeChange("signup")} className={cn("px-[15px] sm:px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200", mode === "signup" ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              Sign up
            </button>
            <button onClick={() => handleModeChange("signin")} className={cn("px-[15px] sm:px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200", mode === "signin" ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              Sign in
            </button>
          </div>

          {/* Step Indicator */}
          {showStepIndicator && <div className="flex items-center gap-2.5">
              {Array.from({
              length: getTotalSteps()
            }, (_, i) => <div key={i} className={cn("h-[5px] rounded-full transition-all duration-300", i + 1 === getCurrentStepNumber() ? "w-10 bg-foreground" : i + 1 < getCurrentStepNumber() ? "w-[5px] bg-foreground" : "w-[5px] bg-border")} />)}
            </div>}
        </header>

        {/* Form Content */}
        <main className="flex-1 flex items-center justify-center px-2.5 sm:px-5 md:px-[25px] lg:px-[30px] py-5 pt-0 pb-0">
          <div className="w-full max-w-lg">
            {mode === "signin" ? <SignInForm email={email} password={password} onEmailChange={setEmail} onPasswordChange={setPassword} /> : <>
                {currentStep === "onboarding" && <OnboardingForm onContinue={handleNext} />}
                {currentStep === "account-type" && <AccountTypeForm selectedType={accountType} onSelect={setAccountType} />}
                {currentStep === "license" && <LicenseForm licenseNumber={licenseNumber} state={state} onLicenseChange={setLicenseNumber} onStateChange={setState} />}
                {currentStep === "personal-info" && <PersonalInfoForm firstName={firstName} lastName={lastName} email={email} password={password} onFirstNameChange={setFirstName} onLastNameChange={setLastName} onEmailChange={setEmail} onPasswordChange={setPassword} />}
                {currentStep === "success" && <SuccessForm onContinue={() => navigate("/")} />}
              </>}
          </div>
        </main>

        {/* Footer */}
        {(mode === "signin" || mode === "signup" && currentStep !== "success") && <footer className="p-2.5 sm:p-5 lg:p-[25px] pt-0 pb-5 sm:pb-[25px] lg:pb-[30px]">
            <div className="max-w-lg mx-auto flex gap-[15px]">
              {mode === "signup" && currentStep !== "onboarding" && <Button variant="outline" size="lg" onClick={handleBack} className="h-[50px] px-5 rounded-[15px] border-border">
                  <ArrowLeft className="w-[15px] h-[15px]" />
                </Button>}
              <Button size="lg" onClick={handleNext} disabled={!canContinue()} className="flex-1 h-[50px] rounded-[15px] bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40">
                {mode === "signin" ? "Sign in" : currentStep === "onboarding" ? "Get Started" : currentStep === "personal-info" ? "Create Account" : "Continue"}
                <ArrowRight className="w-[15px] h-[15px] ml-2.5" />
              </Button>
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
  onPasswordChange
}: {
  email: string;
  password: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
}) => <div className="space-y-[25px] animate-fade-in">
    <div className="space-y-2.5">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-foreground tracking-tight">
        Welcome back
      </h1>
      <p className="text-sm sm:text-base text-muted-foreground">
        Sign in to access your pro account
      </p>
    </div>

    <div className="space-y-5">
      <div className="space-y-2.5">
        <Label htmlFor="login-email" className="text-sm font-medium text-foreground">
          Email
        </Label>
        <div className="relative group">
          <div className="absolute left-[15px] top-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-[10px] bg-muted flex items-center justify-center transition-colors group-focus-within:bg-foreground">
            <Mail className="w-[15px] h-[15px] text-muted-foreground group-focus-within:text-background transition-colors" />
          </div>
          <Input id="login-email" type="email" placeholder="you@example.com" value={email} onChange={e => onEmailChange(e.target.value)} className="h-[50px] sm:h-[55px] pl-[55px] rounded-[15px] bg-muted/50 border-border/50 focus:border-foreground/30 focus:bg-muted transition-all text-base" />
        </div>
      </div>

      <div className="space-y-2.5">
        <Label htmlFor="login-password" className="text-sm font-medium text-foreground">
          Password
        </Label>
        <div className="relative group">
          <div className="absolute left-[15px] top-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-[10px] bg-muted flex items-center justify-center transition-colors group-focus-within:bg-foreground">
            <Lock className="w-[15px] h-[15px] text-muted-foreground group-focus-within:text-background transition-colors" />
          </div>
          <Input id="login-password" type="password" placeholder="••••••••" value={password} onChange={e => onPasswordChange(e.target.value)} className="h-[50px] sm:h-[55px] pl-[55px] rounded-[15px] bg-muted/50 border-border/50 focus:border-foreground/30 focus:bg-muted transition-all text-base" />
        </div>
      </div>

      <button className="group inline-flex items-center gap-[5px] text-sm text-muted-foreground hover:text-foreground transition-colors">
        Forgot password?
        <ArrowUpRight className="w-[15px] h-[15px] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
      </button>
    </div>

    <div className="flex items-center justify-center gap-5 text-xs text-muted-foreground pt-5">
      <div className="flex items-center gap-[5px]">
        <div className="w-[5px] h-[5px] rounded-full bg-green-500" />
        <span>Secure login</span>
      </div>
      <div className="w-[5px] h-[5px] rounded-full bg-border" />
      <div className="flex items-center gap-[5px]">
        <div className="w-[5px] h-[5px] rounded-full bg-green-500" />
        <span>256-bit encryption</span>
      </div>
    </div>
  </div>;
const OnboardingForm = ({
  onContinue
}: {
  onContinue: () => void;
}) => <div className="space-y-[25px] animate-fade-in text-center">
    <div className="inline-flex items-center gap-2.5 px-[15px] py-[5px] rounded-full bg-muted border border-border/50 mb-2.5">
      <Sparkles className="w-[15px] h-[15px] text-muted-foreground" />
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
        Getting Started
      </span>
    </div>

    <div className="space-y-2.5">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-foreground tracking-tight">
        Ready to join?
      </h1>
      <p className="text-sm sm:text-base text-muted-foreground">
        Create your pro account in just a few steps
      </p>
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
    }].map((item, i) => <div key={i} className="flex items-center gap-[15px] sm:gap-5 p-[15px] sm:p-5 rounded-[15px] bg-muted/50 border border-border/50 text-left">
          <div className="w-10 h-10 rounded-[10px] sm:rounded-[15px] bg-foreground flex items-center justify-center flex-shrink-0">
            <item.icon className="w-5 h-5 text-background" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{item.label}</p>
            <p className="text-xs text-muted-foreground">{item.desc}</p>
          </div>
        </div>)}
    </div>

    <p className="text-xs text-muted-foreground pt-5">
      Already have an account? Use the toggle above to sign in
    </p>
  </div>;
const AccountTypeForm = ({
  selectedType,
  onSelect
}: {
  selectedType: string | null;
  onSelect: (type: string) => void;
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
  return <div className="space-y-5 sm:space-y-[25px] animate-fade-in">
      <div className="space-y-2.5 text-center">
        <div className="inline-flex items-center gap-2.5 px-[15px] py-[5px] rounded-full bg-muted border border-border/50 mb-2.5">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
            Step 1
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-foreground tracking-tight">
          Choose your path
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Select the account type that fits you best
        </p>
      </div>

      <div className="space-y-2.5 sm:space-y-[15px]">
        {types.map(type => <button key={type.id} onClick={() => onSelect(type.id)} className={cn("relative w-full p-[15px] sm:p-5 rounded-[15px] sm:rounded-[20px] border-2 transition-all duration-200 text-left group", selectedType === type.id ? "border-foreground bg-foreground/5" : "border-border hover:border-foreground/30 hover:bg-muted/50")}>
            {selectedType === type.id && <div className="absolute top-[15px] sm:top-5 right-[15px] sm:right-5 w-5 h-5 rounded-full bg-foreground flex items-center justify-center">
                <Check className="w-[15px] h-[15px] text-background" />
              </div>}

            <div className="flex items-start gap-[15px] sm:gap-5">
              <div className={cn("w-10 h-10 rounded-[10px] sm:rounded-[15px] flex items-center justify-center flex-shrink-0 transition-colors", selectedType === type.id ? "bg-foreground" : "bg-muted")}>
                <type.icon className={cn("w-5 h-5 transition-colors", selectedType === type.id ? "text-background" : "text-foreground")} />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{type.title}</p>
                <p className="text-xs text-muted-foreground mb-2.5">{type.description}</p>
                <div className="flex flex-wrap gap-[5px]">
                  {type.features.map((feature, i) => <span key={i} className="text-[10px] px-2.5 py-[5px] rounded-full bg-muted text-muted-foreground">
                      {feature}
                    </span>)}
                </div>
              </div>
            </div>
          </button>)}
      </div>
    </div>;
};
const LicenseForm = ({
  licenseNumber,
  state,
  onLicenseChange,
  onStateChange
}: {
  licenseNumber: string;
  state: string;
  onLicenseChange: (value: string) => void;
  onStateChange: (value: string) => void;
}) => <div className="space-y-[25px] animate-fade-in">
    <div className="space-y-2.5 text-center">
      <div className="inline-flex items-center gap-2.5 px-[15px] py-[5px] rounded-full bg-muted border border-border/50 mb-2.5">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
          Step 2
        </span>
      </div>
      <h1 className="text-3xl md:text-4xl font-semibold text-foreground tracking-tight">
        Verify your license
      </h1>
      <p className="text-muted-foreground">
        Enter your cosmetology license details
      </p>
    </div>

    <div className="flex gap-[15px] p-5 rounded-[15px] bg-muted/50 border border-border/50">
      <FileCheck className="w-5 h-5 text-muted-foreground shrink-0 mt-[5px]" />
      <p className="text-sm text-muted-foreground leading-relaxed">
        We display professional wholesale pricing. Please enter your license exactly as it appears from the state.
      </p>
    </div>

    <div className="space-y-5">
      <div className="space-y-2.5">
        <Label htmlFor="license" className="text-sm font-medium">
          License number
        </Label>
        <div className="relative group">
          <div className="absolute left-[15px] top-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-[10px] bg-muted flex items-center justify-center transition-colors group-focus-within:bg-foreground">
            <FileCheck className="w-[15px] h-[15px] text-muted-foreground group-focus-within:text-background transition-colors" />
          </div>
          <Input id="license" type="text" placeholder="Enter your license number" value={licenseNumber} onChange={e => onLicenseChange(e.target.value)} className="h-[55px] pl-[55px] rounded-[15px] bg-muted/50 border-border/50 focus:border-foreground/30 focus:bg-muted transition-all text-base" />
        </div>
      </div>

      <div className="space-y-2.5">
        <Label htmlFor="state" className="text-sm font-medium">
          State / Province
        </Label>
        <div className="relative group">
          <div className="absolute left-[15px] top-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-[10px] bg-muted flex items-center justify-center z-10">
            <MapPin className="w-[15px] h-[15px] text-muted-foreground" />
          </div>
          <Select value={state} onValueChange={onStateChange}>
            <SelectTrigger className="h-[50px] sm:h-[55px] pl-[55px] rounded-[15px] border-border/50 bg-muted/50">
              <SelectValue placeholder="Select your state" />
            </SelectTrigger>
            <SelectContent className="rounded-[15px] bg-background border border-border z-50">
              {states.map(s => <SelectItem key={s} value={s} className="rounded-[10px]">
                  {s}
                </SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  </div>;
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
}) => <div className="space-y-[25px] animate-fade-in">
    <div className="space-y-2.5 text-center">
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
      <div className="grid grid-cols-2 gap-2.5 sm:gap-[15px]">
        <div className="space-y-2.5">
          <Label htmlFor="firstName" className="text-sm font-medium">
            First name
          </Label>
          <Input id="firstName" type="text" placeholder="Jane" value={firstName} onChange={e => onFirstNameChange(e.target.value)} className="h-[45px] sm:h-[50px] rounded-[10px] sm:rounded-[15px] bg-muted/50 border-border/50 focus:border-foreground/30 focus:bg-muted transition-all" />
        </div>
        <div className="space-y-2.5">
          <Label htmlFor="lastName" className="text-sm font-medium">
            Last name
          </Label>
          <Input id="lastName" type="text" placeholder="Doe" value={lastName} onChange={e => onLastNameChange(e.target.value)} className="h-[45px] sm:h-[50px] rounded-[10px] sm:rounded-[15px] bg-muted/50 border-border/50 focus:border-foreground/30 focus:bg-muted transition-all" />
        </div>
      </div>

      <div className="space-y-2.5">
        <Label htmlFor="email" className="text-sm font-medium">
          Email
        </Label>
        <div className="relative group">
          <div className="absolute left-[15px] top-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-[10px] bg-muted flex items-center justify-center transition-colors group-focus-within:bg-foreground">
            <Mail className="w-[15px] h-[15px] text-muted-foreground group-focus-within:text-background transition-colors" />
          </div>
          <Input id="email" type="email" placeholder="jane@example.com" value={email} onChange={e => onEmailChange(e.target.value)} className="h-[55px] pl-[55px] rounded-[15px] bg-muted/50 border-border/50 focus:border-foreground/30 focus:bg-muted transition-all text-base" />
        </div>
      </div>

      <div className="space-y-2.5">
        <Label htmlFor="password" className="text-sm font-medium">
          Password
        </Label>
        <div className="relative group">
          <div className="absolute left-[15px] top-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-[10px] bg-muted flex items-center justify-center transition-colors group-focus-within:bg-foreground">
            <Lock className="w-[15px] h-[15px] text-muted-foreground group-focus-within:text-background transition-colors" />
          </div>
          <Input id="password" type="password" placeholder="Create a password" value={password} onChange={e => onPasswordChange(e.target.value)} className="h-[55px] pl-[55px] rounded-[15px] bg-muted/50 border-border/50 focus:border-foreground/30 focus:bg-muted transition-all text-base" />
        </div>
        <p className="text-xs text-muted-foreground">
          Must be at least 8 characters
        </p>
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