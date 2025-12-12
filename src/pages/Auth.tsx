import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, 
  ArrowRight, 
  Sparkles, 
  Star, 
  Truck, 
  Gift, 
  ChevronLeft, 
  ChevronRight,
  Mail,
  Lock,
  User,
  FileCheck,
  MapPin,
  Check,
  ShoppingBag,
  Heart,
  ArrowUpRight,
  Building2,
  GraduationCap,
  X
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useMagnetic } from "@/hooks/use-magnetic";

type AuthMode = "signup" | "signin";
type Step = "onboarding" | "account-type" | "license" | "personal-info" | "success";

const slides = [
  {
    eyebrow: "Welcome",
    title: "Join the",
    highlight: "Pro Network",
    description: "Exclusive wholesale access for beauty professionals",
  },
  {
    eyebrow: "Quality",
    title: "Premium",
    highlight: "Products",
    description: "Curated professional-grade extensions & supplies",
  },
  {
    eyebrow: "Community",
    title: "Grow",
    highlight: "Together",
    description: "Connect, learn, and scale with fellow pros",
  },
];

const stats = [
  { value: 10, suffix: "K+", label: "Stylists" },
  { value: 30, suffix: "%", label: "Savings" },
  { value: 48, suffix: "hr", label: "Delivery" },
];

const features = [
  { icon: Gift, label: "Rewards", desc: "On every order" },
  { icon: Truck, label: "Free Shipping", desc: "2-day delivery on $250+" },
  { icon: Star, label: "Wholesale", desc: "Pro pricing" },
];

const states = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming"
];

const AnimatedNumber = ({ value, suffix }: { value: number; suffix: string }) => {
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
  
  return <span>{count}{suffix}</span>;
};

interface FeatureBoxProps {
  icon: React.ElementType;
  label: string;
  desc: string;
}

const MagneticFeatureBox = ({ icon: Icon, label, desc }: FeatureBoxProps) => {
  const magnetic = useMagnetic({ strength: 0.12 });

  return (
    <div
      ref={magnetic.ref}
      style={magnetic.style}
      onMouseMove={magnetic.onMouseMove}
      onMouseLeave={magnetic.onMouseLeave}
      className="group/pill flex items-center gap-3 px-4 py-3 rounded-xl bg-background/5 border border-background/10 hover:border-background/20 hover:bg-background/10 transition-all cursor-default"
    >
      <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-foreground" />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-background">{label}</span>
        <span className="text-xs text-background/50">{desc}</span>
      </div>
    </div>
  );
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
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, []);

  const goToPrevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 lg:p-8">
      {/* Blurred darkened backdrop */}
      <div 
        className="fixed inset-0 bg-foreground/60 backdrop-blur-md cursor-pointer" 
        onClick={() => navigate("/")}
      />
      
      {/* Modal Container */}
      <div 
        className="relative z-10 w-[90vw] h-[90vh] bg-background rounded-[32px] shadow-2xl overflow-hidden flex flex-col lg:flex-row"
        style={{
          animation: 'modalEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}
      >
        {/* Close Button */}
        <button
          onClick={() => navigate("/")}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-foreground/5 hover:bg-foreground/10 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-foreground" />
        </button>
        {/* Left Panel - Hero/Branding */}
        <div 
          className="relative lg:w-1/2 min-h-[300px] lg:min-h-0 bg-foreground overflow-hidden flex flex-col m-[20px] lg:rounded-[20px]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Sliding Background + Content Container */}
        <div 
          key={currentSlide}
          className="absolute inset-0"
          style={{
            animation: 'slideIn 0.5s ease-out forwards'
          }}
        >
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-foreground via-foreground/95 to-foreground" />
          
          <div 
            className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-[120px] animate-pulse"
            style={{ 
              background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
              animationDuration: '4s'
            }}
          />
          <div 
            className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full blur-[100px] animate-pulse"
            style={{ 
              background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)',
              animationDuration: '5s',
              animationDelay: '1s'
            }}
          />
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[150px] animate-pulse"
            style={{ 
              background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 60%)',
              animationDuration: '6s',
              animationDelay: '2s'
            }}
          />
          
          {/* Noise texture */}
          <div 
            className="absolute inset-0 opacity-[0.15]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />

          {/* Sliding Text Content */}
          <div className="absolute inset-0 flex items-center p-6 md:p-8 lg:p-10 pt-16 pb-32">
            <div>
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/10 backdrop-blur-sm border border-background/10 mb-6">
                <Sparkles className="w-3 h-3 text-background/80" />
                <span className="text-xs font-medium text-background/80 uppercase tracking-widest">
                  {slide.eyebrow}
                </span>
              </div>

              {/* Large Typography */}
              <div className="space-y-1 mb-4">
                <h2 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-light text-background/60 tracking-tight leading-none">
                  {slide.title}
                </h2>
                <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-semibold text-background tracking-tight leading-none">
                  {slide.highlight}
                </h1>
              </div>

              <p className="text-sm md:text-base text-background/50 md:whitespace-nowrap">
                {slide.description}
              </p>
            </div>
          </div>
        </div>

        {/* Floating decorations - Fixed */}
        <div className="absolute top-8 right-8 flex gap-2 z-10">
          <div className="w-2 h-2 rounded-full bg-background/20 animate-pulse" style={{ animationDelay: '0s' }} />
          <div className="w-2 h-2 rounded-full bg-background/30 animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="w-2 h-2 rounded-full bg-background/20 animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        {/* Fixed Content Overlay */}
        <div className="relative z-10 flex-1 flex flex-col justify-between p-6 md:p-8 lg:p-10 pointer-events-none">
          {/* Logo - Fixed */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="w-8 h-8 rounded-lg bg-background/10 backdrop-blur-sm flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-background" />
            </div>
            <span className="text-lg font-semibold text-background">ProBeauty</span>
          </div>

          {/* Spacer for middle content */}
          <div className="flex-1" />

          {/* Stats Row - Fixed */}
          <div className="flex gap-8 mb-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl md:text-3xl lg:text-4xl font-semibold text-background tracking-tight">
                  <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-[10px] text-background/40 uppercase tracking-wider mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Feature Pills - Fixed */}
          <div className="hidden lg:flex flex-wrap gap-3 mb-8 pointer-events-auto">
            {features.map((feature, i) => (
              <MagneticFeatureBox
                key={i}
                icon={feature.icon}
                label={feature.label}
                desc={feature.desc}
              />
            ))}
          </div>

          {/* Bottom Navigation - Fixed */}
          <div className="flex items-center justify-between pointer-events-auto">
            {/* Slide Indicators */}
            <div className="flex gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === currentSlide ? "w-8 bg-background/60" : "w-1.5 bg-background/20"
                  )}
                />
              ))}
            </div>

            {/* Nav Arrows - Desktop */}
            <div className="hidden lg:flex gap-2">
              <button
                onClick={goToPrevSlide}
                className="p-2.5 rounded-full bg-background/5 border border-background/10 hover:bg-background/10 transition-all"
              >
                <ChevronLeft className="w-4 h-4 text-background/70" />
              </button>
              <button
                onClick={goToNextSlide}
                className="p-2.5 rounded-full bg-background/5 border border-background/10 hover:bg-background/10 transition-all"
              >
                <ChevronRight className="w-4 h-4 text-background/70" />
              </button>
            </div>

            {/* Trust Badge */}
            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex -space-x-1.5">
                {[...Array(3)].map((_, i) => (
                  <div 
                    key={i} 
                    className="w-5 h-5 rounded-full border-2 border-foreground"
                    style={{ 
                      background: `linear-gradient(135deg, hsl(0 0% ${85 - i * 5}%) 0%, hsl(0 0% ${75 - i * 5}%) 100%)`
                    }}
                  />
                ))}
              </div>
              <span className="text-xs text-background/50">10K+ pros</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-background/10 lg:hidden">
          <div 
            className="h-full bg-background/60 transition-all duration-500"
            style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col bg-background lg:rounded-r-[20px] overflow-auto">
        {/* Header */}
        <header className="flex items-center justify-between p-4 md:p-6 lg:p-8">
          {/* Auth Toggle */}
          <div className="inline-flex bg-muted rounded-full p-1">
            <button
              onClick={() => handleModeChange("signup")}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                mode === "signup"
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Sign up
            </button>
            <button
              onClick={() => handleModeChange("signin")}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                mode === "signin"
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Sign in
            </button>
          </div>

          {/* Step Indicator */}
          {showStepIndicator && (
            <div className="flex items-center gap-2">
              {Array.from({ length: getTotalSteps() }, (_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i + 1 === getCurrentStepNumber()
                      ? "w-8 bg-foreground"
                      : i + 1 < getCurrentStepNumber()
                      ? "w-1.5 bg-foreground"
                      : "w-1.5 bg-border"
                  )}
                />
              ))}
            </div>
          )}
        </header>

        {/* Form Content */}
        <main className="flex-1 flex items-center justify-center px-4 md:px-8 lg:px-12 py-8">
          <div className="w-full max-w-md">
            {mode === "signin" ? (
              <SignInForm 
                email={email}
                password={password}
                onEmailChange={setEmail}
                onPasswordChange={setPassword}
              />
            ) : (
              <>
                {currentStep === "onboarding" && (
                  <OnboardingForm onContinue={handleNext} />
                )}
                {currentStep === "account-type" && (
                  <AccountTypeForm 
                    selectedType={accountType}
                    onSelect={setAccountType}
                  />
                )}
                {currentStep === "license" && (
                  <LicenseForm
                    licenseNumber={licenseNumber}
                    state={state}
                    onLicenseChange={setLicenseNumber}
                    onStateChange={setState}
                  />
                )}
                {currentStep === "personal-info" && (
                  <PersonalInfoForm
                    firstName={firstName}
                    lastName={lastName}
                    email={email}
                    password={password}
                    onFirstNameChange={setFirstName}
                    onLastNameChange={setLastName}
                    onEmailChange={setEmail}
                    onPasswordChange={setPassword}
                  />
                )}
                {currentStep === "success" && (
                  <SuccessForm onContinue={() => navigate("/")} />
                )}
              </>
            )}
          </div>
        </main>

        {/* Footer */}
        {(mode === "signin" || (mode === "signup" && currentStep !== "success")) && (
          <footer className="p-4 md:p-6 lg:p-8 pt-0">
            <div className="max-w-md mx-auto flex gap-3">
              {mode === "signup" && currentStep !== "onboarding" && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleBack}
                  className="h-12 px-5 rounded-xl border-border"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <Button
                size="lg"
                onClick={handleNext}
                disabled={!canContinue()}
                className="flex-1 h-12 rounded-xl bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40"
              >
                {mode === "signin" 
                  ? "Sign in" 
                  : currentStep === "onboarding" 
                  ? "Get Started" 
                  : currentStep === "personal-info" 
                  ? "Create Account" 
                  : "Continue"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </footer>
        )}
      </div>
      </div>
    </div>
  );
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
}) => (
  <div className="space-y-6 animate-fade-in">
    <div className="space-y-2">
      <h1 className="text-3xl md:text-4xl font-semibold text-foreground tracking-tight">
        Welcome back
      </h1>
      <p className="text-muted-foreground">
        Sign in to access your pro account
      </p>
    </div>

    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="login-email" className="text-sm font-medium text-foreground">
          Email
        </Label>
        <div className="relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-muted flex items-center justify-center transition-colors group-focus-within:bg-foreground">
            <Mail className="w-4 h-4 text-muted-foreground group-focus-within:text-background transition-colors" />
          </div>
          <Input
            id="login-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            className="h-14 pl-14 rounded-xl bg-muted/50 border-border/50 focus:border-foreground/30 focus:bg-muted transition-all text-base"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="login-password" className="text-sm font-medium text-foreground">
          Password
        </Label>
        <div className="relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-muted flex items-center justify-center transition-colors group-focus-within:bg-foreground">
            <Lock className="w-4 h-4 text-muted-foreground group-focus-within:text-background transition-colors" />
          </div>
          <Input
            id="login-password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            className="h-14 pl-14 rounded-xl bg-muted/50 border-border/50 focus:border-foreground/30 focus:bg-muted transition-all text-base"
          />
        </div>
      </div>

      <button className="group inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        Forgot password?
        <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
      </button>
    </div>

    <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-4">
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
        <span>Secure login</span>
      </div>
      <div className="w-1 h-1 rounded-full bg-border" />
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
        <span>256-bit encryption</span>
      </div>
    </div>
  </div>
);

const OnboardingForm = ({ onContinue }: { onContinue: () => void }) => (
  <div className="space-y-6 animate-fade-in text-center">
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border/50 mb-2">
      <Sparkles className="w-3 h-3 text-muted-foreground" />
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
        Getting Started
      </span>
    </div>

    <div className="space-y-2">
      <h1 className="text-3xl md:text-4xl font-semibold text-foreground tracking-tight">
        Ready to join?
      </h1>
      <p className="text-muted-foreground">
        Create your pro account in just a few steps
      </p>
    </div>

    <div className="grid gap-3 pt-4">
      {[
        { icon: User, label: "Choose your account type", desc: "Pro, Salon, or Student" },
        { icon: FileCheck, label: "Verify your license", desc: "Quick verification process" },
        { icon: Gift, label: "Start saving", desc: "Unlock wholesale pricing" },
      ].map((item, i) => (
        <div 
          key={i}
          className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border/50 text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center flex-shrink-0">
            <item.icon className="w-5 h-5 text-background" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{item.label}</p>
            <p className="text-xs text-muted-foreground">{item.desc}</p>
          </div>
        </div>
      ))}
    </div>

    <p className="text-xs text-muted-foreground pt-4">
      Already have an account? Use the toggle above to sign in
    </p>
  </div>
);

const AccountTypeForm = ({ 
  selectedType, 
  onSelect 
}: { 
  selectedType: string | null; 
  onSelect: (type: string) => void;
}) => {
  const types = [
    {
      id: "professional",
      icon: User,
      title: "Professional",
      description: "Licensed cosmetologists",
      features: ["Wholesale pricing", "Priority support", "Early access"],
    },
    {
      id: "salon",
      icon: Building2,
      title: "Salon Owner",
      description: "Business accounts",
      features: ["Team accounts", "Bulk discounts", "Net 30 terms"],
    },
    {
      id: "student",
      icon: GraduationCap,
      title: "Student",
      description: "Currently enrolled",
      features: ["Student pricing", "Learning resources", "Community access"],
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border/50 mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
            Step 1
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold text-foreground tracking-tight">
          Choose your path
        </h1>
        <p className="text-muted-foreground">
          Select the account type that fits you best
        </p>
      </div>

      <div className="space-y-3">
        {types.map((type) => (
          <button
            key={type.id}
            onClick={() => onSelect(type.id)}
            className={cn(
              "relative w-full p-4 rounded-2xl border-2 transition-all duration-200 text-left group",
              selectedType === type.id
                ? "border-foreground bg-foreground/5"
                : "border-border hover:border-foreground/30 hover:bg-muted/50"
            )}
          >
            {selectedType === type.id && (
              <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-foreground flex items-center justify-center">
                <Check className="w-3 h-3 text-background" />
              </div>
            )}

            <div className="flex items-start gap-4">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
                selectedType === type.id ? "bg-foreground" : "bg-muted"
              )}>
                <type.icon className={cn(
                  "w-5 h-5 transition-colors",
                  selectedType === type.id ? "text-background" : "text-foreground"
                )} />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{type.title}</p>
                <p className="text-xs text-muted-foreground mb-2">{type.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {type.features.map((feature, i) => (
                    <span 
                      key={i}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
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
    </div>
  );
};

const LicenseForm = ({
  licenseNumber,
  state,
  onLicenseChange,
  onStateChange,
}: {
  licenseNumber: string;
  state: string;
  onLicenseChange: (value: string) => void;
  onStateChange: (value: string) => void;
}) => (
  <div className="space-y-6 animate-fade-in">
    <div className="space-y-2 text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border/50 mb-2">
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

    <div className="flex gap-3 p-4 rounded-xl bg-muted/50 border border-border/50">
      <FileCheck className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
      <p className="text-sm text-muted-foreground leading-relaxed">
        We display professional wholesale pricing. Please enter your license exactly as it appears from the state.
      </p>
    </div>

    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="license" className="text-sm font-medium">
          License number
        </Label>
        <div className="relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-muted flex items-center justify-center transition-colors group-focus-within:bg-foreground">
            <FileCheck className="w-4 h-4 text-muted-foreground group-focus-within:text-background transition-colors" />
          </div>
          <Input
            id="license"
            type="text"
            placeholder="Enter your license number"
            value={licenseNumber}
            onChange={(e) => onLicenseChange(e.target.value)}
            className="h-14 pl-14 rounded-xl bg-muted/50 border-border/50 focus:border-foreground/30 focus:bg-muted transition-all text-base"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="state" className="text-sm font-medium">
          State / Province
        </Label>
        <div className="relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-muted flex items-center justify-center z-10">
            <MapPin className="w-4 h-4 text-muted-foreground" />
          </div>
          <Select value={state} onValueChange={onStateChange}>
            <SelectTrigger className="h-14 pl-14 rounded-xl border-border/50 bg-muted/50">
              <SelectValue placeholder="Select your state" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {states.map((s) => (
                <SelectItem key={s} value={s} className="rounded-lg">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  </div>
);

const PersonalInfoForm = ({
  firstName,
  lastName,
  email,
  password,
  onFirstNameChange,
  onLastNameChange,
  onEmailChange,
  onPasswordChange,
}: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
}) => (
  <div className="space-y-6 animate-fade-in">
    <div className="space-y-2 text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border/50 mb-2">
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

    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="firstName" className="text-sm font-medium">
            First name
          </Label>
          <Input
            id="firstName"
            type="text"
            placeholder="Jane"
            value={firstName}
            onChange={(e) => onFirstNameChange(e.target.value)}
            className="h-12 rounded-xl bg-muted/50 border-border/50 focus:border-foreground/30 focus:bg-muted transition-all"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName" className="text-sm font-medium">
            Last name
          </Label>
          <Input
            id="lastName"
            type="text"
            placeholder="Doe"
            value={lastName}
            onChange={(e) => onLastNameChange(e.target.value)}
            className="h-12 rounded-xl bg-muted/50 border-border/50 focus:border-foreground/30 focus:bg-muted transition-all"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium">
          Email
        </Label>
        <div className="relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-muted flex items-center justify-center transition-colors group-focus-within:bg-foreground">
            <Mail className="w-4 h-4 text-muted-foreground group-focus-within:text-background transition-colors" />
          </div>
          <Input
            id="email"
            type="email"
            placeholder="jane@example.com"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            className="h-14 pl-14 rounded-xl bg-muted/50 border-border/50 focus:border-foreground/30 focus:bg-muted transition-all text-base"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium">
          Password
        </Label>
        <div className="relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-muted flex items-center justify-center transition-colors group-focus-within:bg-foreground">
            <Lock className="w-4 h-4 text-muted-foreground group-focus-within:text-background transition-colors" />
          </div>
          <Input
            id="password"
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            className="h-14 pl-14 rounded-xl bg-muted/50 border-border/50 focus:border-foreground/30 focus:bg-muted transition-all text-base"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Must be at least 8 characters
        </p>
      </div>
    </div>
  </div>
);

const SuccessForm = ({ onContinue }: { onContinue: () => void }) => (
  <div className="space-y-6 animate-fade-in text-center">
    {/* Success Icon */}
    <div className="relative h-32 mb-4">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-muted to-accent/20 opacity-60" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-foreground flex items-center justify-center">
          <Check className="w-8 h-8 text-background" strokeWidth={2.5} />
        </div>
      </div>
      
      {/* Floating decorations */}
      <div className="absolute top-2 left-1/4 w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center animate-fade-in" style={{ animationDelay: "0.2s" }}>
        <ShoppingBag className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="absolute top-4 right-1/4 w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center animate-fade-in" style={{ animationDelay: "0.4s" }}>
        <Heart className="w-3 h-3 text-muted-foreground" />
      </div>
      <div className="absolute bottom-2 right-1/3 w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center animate-fade-in" style={{ animationDelay: "0.6s" }}>
        <Sparkles className="w-2.5 h-2.5 text-muted-foreground" />
      </div>
    </div>

    <div className="space-y-2">
      <h1 className="text-3xl md:text-4xl font-semibold text-foreground tracking-tight">
        You're all set!
      </h1>
      <p className="text-muted-foreground">
        Your account has been created successfully
      </p>
    </div>

    <div className="p-4 rounded-2xl bg-muted/50 border border-border/50">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-foreground flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-background" />
        </div>
        <div className="text-left">
          <p className="text-sm font-medium text-foreground">Pro Member</p>
          <p className="text-xs text-muted-foreground">
            Confirmation email sent to your inbox
          </p>
        </div>
      </div>
    </div>

    <Button
      size="lg"
      onClick={onContinue}
      className="w-full h-12 rounded-xl bg-foreground text-background hover:bg-foreground/90"
    >
      Start Shopping
      <ArrowRight className="w-4 h-4 ml-2" />
    </Button>
  </div>
);

export default Auth;