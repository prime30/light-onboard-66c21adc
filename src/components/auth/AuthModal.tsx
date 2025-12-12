import { useState } from "react";
import { X, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AccountTypeCard, AccountType } from "./AccountTypeCard";
import { LicenseStep } from "./LicenseStep";
import { PersonalInfoStep } from "./PersonalInfoStep";

type AuthMode = "signin" | "signup";
type SignupStep = "account-type" | "license" | "personal-info";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TOTAL_STEPS = 3;

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>("signup");
  const [signupStep, setSignupStep] = useState<SignupStep>("account-type");
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseState, setLicenseState] = useState("");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  const getCurrentStepNumber = () => {
    switch (signupStep) {
      case "account-type": return 1;
      case "license": return 2;
      case "personal-info": return 3;
      default: return 1;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNext = () => {
    if (signupStep === "account-type" && accountType) {
      if (accountType === "student") {
        setSignupStep("personal-info");
      } else {
        setSignupStep("license");
      }
    } else if (signupStep === "license") {
      setSignupStep("personal-info");
    }
  };

  const handleBack = () => {
    if (signupStep === "license") {
      setSignupStep("account-type");
    } else if (signupStep === "personal-info") {
      if (accountType === "student") {
        setSignupStep("account-type");
      } else {
        setSignupStep("license");
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", { accountType, licenseNumber, licenseState, ...formData });
  };

  const resetForm = () => {
    setSignupStep("account-type");
    setAccountType(null);
    setLicenseNumber("");
    setLicenseState("");
    setFormData({ firstName: "", lastName: "", email: "", password: "" });
  };

  const handleModeSwitch = (newMode: AuthMode) => {
    setMode(newMode);
    if (newMode === "signup") {
      resetForm();
    }
  };

  const getStepTitle = () => {
    if (mode === "signin") return "Welcome back";
    switch (signupStep) {
      case "account-type": return "Choose your account type to shop";
      case "license": return "Let's make sure you're a stylist";
      case "personal-info": return "Create your account";
      default: return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={`p-0 gap-0 rounded-2xl border-border/50 shadow-elevated overflow-hidden transition-all duration-300 ${
          mode === "signup" && signupStep !== "personal-info" 
            ? "sm:max-w-[900px]" 
            : "sm:max-w-[480px]"
        }`}
      >
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            {/* Mode Toggle - only show on first step or signin */}
            {(mode === "signin" || signupStep === "account-type") && (
              <div className="inline-flex bg-secondary rounded-full p-1">
                <button
                  onClick={() => handleModeSwitch("signup")}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                    mode === "signup"
                      ? "bg-primary text-primary-foreground shadow-soft"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sign up
                </button>
                <button
                  onClick={() => handleModeSwitch("signin")}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                    mode === "signin"
                      ? "bg-primary text-primary-foreground shadow-soft"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sign in
                </button>
              </div>
            )}
            {mode === "signup" && signupStep !== "account-type" && <div />}
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 rounded-full hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Title */}
          <div className="text-center">
            {mode === "signup" && (
              <span className="text-sm text-muted-foreground">Getting started</span>
            )}
            <h2 className="text-2xl font-semibold text-foreground mt-1">{getStepTitle()}</h2>
            {mode === "signup" && signupStep === "account-type" && (
              <p className="text-sm text-muted-foreground mt-2">
                Not a stylist?{" "}
                <a href="#" className="text-primary hover:underline">Find a Pro</a>
              </p>
            )}
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 pt-2">
          {mode === "signin" ? (
            <div className="space-y-4">
              <Input
                name="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleInputChange}
                className="h-12 rounded-xl bg-secondary border-0 placeholder:text-muted-foreground/60"
              />
              <Input
                name="password"
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
                className="h-12 rounded-xl bg-secondary border-0 placeholder:text-muted-foreground/60"
              />
              <Button type="submit" className="w-full h-12 rounded-xl text-base font-medium">
                Sign in
              </Button>
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-3 text-muted-foreground">Or continue with</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button type="button" variant="outline" className="h-12 rounded-xl border-border hover:bg-secondary">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                </Button>
                <Button type="button" variant="outline" className="h-12 rounded-xl border-border hover:bg-secondary">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                </Button>
              </div>
            </div>
          ) : (
            <>
              {signupStep === "account-type" && (
                <div className="grid md:grid-cols-3 gap-4">
                  <AccountTypeCard
                    type="stylist"
                    selected={accountType === "stylist"}
                    onSelect={() => setAccountType("stylist")}
                  />
                  <AccountTypeCard
                    type="salon"
                    selected={accountType === "salon"}
                    onSelect={() => setAccountType("salon")}
                  />
                  <AccountTypeCard
                    type="student"
                    selected={accountType === "student"}
                    onSelect={() => setAccountType("student")}
                  />
                </div>
              )}

              {signupStep === "license" && accountType && (
                <LicenseStep
                  accountType={accountType}
                  licenseNumber={licenseNumber}
                  state={licenseState}
                  onLicenseChange={setLicenseNumber}
                  onStateChange={setLicenseState}
                />
              )}

              {signupStep === "personal-info" && (
                <PersonalInfoStep
                  formData={formData}
                  onInputChange={handleInputChange}
                />
              )}
            </>
          )}

          {/* Footer navigation for signup */}
          {mode === "signup" && (
            <div className="mt-6 flex flex-col items-center gap-4">
              <div className="flex items-center gap-3">
                {signupStep !== "account-type" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleBack}
                    className="h-12 w-12 rounded-xl border-border"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                )}
                {signupStep !== "personal-info" ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={!accountType}
                    className="h-12 px-8 rounded-xl text-base font-medium"
                  >
                    Continue Registration
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                ) : (
                  <Button type="submit" className="h-12 px-8 rounded-xl text-base font-medium">
                    Create Account
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                )}
              </div>

              {/* Step indicator */}
              <div className="text-sm text-muted-foreground">
                Step {getCurrentStepNumber().toString().padStart(2, '0')} / {accountType === "student" ? "02" : "03"}
              </div>

              {signupStep === "account-type" && (
                <p className="text-sm text-muted-foreground">
                  Already have a pro account?{" "}
                  <button
                    type="button"
                    onClick={() => handleModeSwitch("signin")}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign In
                  </button>
                </p>
              )}
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
