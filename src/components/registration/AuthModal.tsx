import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AuthToggle } from "./AuthToggle";
import { StepIndicator } from "./StepIndicator";
import { OnboardingStep } from "./steps/OnboardingStep";
import { AccountTypeStep } from "./steps/AccountTypeStep";
import { LicenseStep } from "./steps/LicenseStep";
import { PersonalInfoStep } from "./steps/PersonalInfoStep";
import { SuccessStep } from "./steps/SuccessStep";
import { LoginStep } from "./steps/LoginStep";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
type Step = "onboarding" | "account-type" | "license" | "personal-info" | "success";
interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
export const AuthModal = ({
  open,
  onOpenChange
}: AuthModalProps) => {
  // Prevent iOS Safari pull-to-refresh while the modal is open (it conflicts with swipe-to-dismiss)
  const touchStartYRef = useRef<number | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const originalBodyOverscroll = document.body.style.overscrollBehavior;
    const originalHtmlOverscroll = document.documentElement.style.overscrollBehavior;

    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overscrollBehavior = "none";

    const onTouchStart = (e: TouchEvent) => {
      touchStartYRef.current = e.touches?.[0]?.clientY ?? null;
    };

    const onTouchMove = (e: TouchEvent) => {
      // Only block the browser's pull-to-refresh gesture (downward swipe when the modal is already scrolled to the top).
      const startY = touchStartYRef.current;
      const currentY = e.touches?.[0]?.clientY;
      if (startY == null || currentY == null) return;

      const scroller = contentRef.current;
      const isAtTop = !scroller || scroller.scrollTop <= 0;
      if (!isAtTop) return;

      const deltaY = currentY - startY;
      if (deltaY > 0) e.preventDefault();
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      document.body.style.overscrollBehavior = originalBodyOverscroll;
      document.documentElement.style.overscrollBehavior = originalHtmlOverscroll;
      document.removeEventListener("touchstart", onTouchStart as any);
      document.removeEventListener("touchmove", onTouchMove as any);
      touchStartYRef.current = null;
    };
  }, [open]);

  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [currentStep, setCurrentStep] = useState<Step>("onboarding");
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
  const handleModeChange = (newMode: "signup" | "signin") => {
    setMode(newMode);
    resetForm();
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
      toast.success("Welcome back! Pro pricing is now unlocked.", {
        description: "You're seeing exclusive professional pricing on all products.",
        action: {
          label: "View Dashboard",
          onClick: () => window.location.href = "/account"
        },
        duration: 5000
      });
      onOpenChange(false);
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
  const showStepIndicator = mode === "signup" && currentStep !== "success" && currentStep !== "onboarding";
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={contentRef} className="sm:max-w-lg md:max-w-2xl lg:max-w-4xl p-0 gap-0 rounded-2xl border-border overflow-hidden max-h-[90vh] overflow-y-auto">
        <VisuallyHidden>
          <DialogTitle>
            {mode === "signup" ? "Create an account" : "Sign in"}
          </DialogTitle>
        </VisuallyHidden>

        {/* Header */}
        <div className="flex flex-col gap-2 p-3 md:px-6 md:pt-5 md:pb-0">
          <div className="flex items-center justify-between">
            <AuthToggle mode={mode} onModeChange={handleModeChange} />
          </div>
          {showStepIndicator && <div className="flex justify-center">
              <StepIndicator currentStep={getCurrentStepNumber()} totalSteps={getTotalSteps()} />
            </div>}
        </div>

        {/* Content */}
        <div className="p-3 md:p-5">
          {mode === "signin" ? <LoginStep email={email} password={password} onEmailChange={setEmail} onPasswordChange={setPassword} /> : <>
              {currentStep === "onboarding" && <OnboardingStep onContinue={handleNext} />}
              {currentStep === "account-type" && <AccountTypeStep selectedType={accountType} onSelect={setAccountType} />}
              {currentStep === "license" && <LicenseStep accountType={accountType} licenseNumber={licenseNumber} salonSize="" salonStructure="" licenseFile={null} licenseProofFiles={[]} onLicenseChange={setLicenseNumber} onSalonSizeChange={() => {}} onSalonStructureChange={() => {}} onLicenseFileChange={() => {}} onLicenseProofFilesChange={() => {}} validationStatus="in-progress" />}
              {currentStep === "personal-info" && <PersonalInfoStep firstName={firstName} lastName={lastName} email={email} password={password} onFirstNameChange={setFirstName} onLastNameChange={setLastName} onEmailChange={setEmail} onPasswordChange={setPassword} />}
              {currentStep === "success" && <SuccessStep />}
            </>}
        </div>

        {/* Footer */}
        {(mode === "signin" || currentStep !== "success") && <div className="p-3 md:p-5 border-t border-border/50">
            <div className="flex gap-2">
              {mode === "signup" && currentStep !== "onboarding" && <Button variant="outline" size="lg" onClick={handleBack} className="h-11 px-5 rounded-xl border-border">
                  <ArrowLeft className="w-4 h-4" />
                </Button>}
              <Button size="lg" onClick={handleNext} disabled={!canContinue()} className="flex-1 h-11 rounded-xl bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40">
                {mode === "signin" ? "Sign in" : currentStep === "onboarding" ? "Get Started" : currentStep === "personal-info" ? "Submit Application" : "Continue"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>}
      </DialogContent>
    </Dialog>;
};