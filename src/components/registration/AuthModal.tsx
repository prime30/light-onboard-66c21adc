import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
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

export const AuthModal = ({ open, onOpenChange }: AuthModalProps) => {
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
        return (
          firstName.trim() !== "" &&
          lastName.trim() !== "" &&
          email.trim() !== "" &&
          password.length >= 8
        );
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-2xl lg:max-w-4xl p-0 gap-0 rounded-2xl border-border overflow-hidden max-h-[90vh] overflow-y-auto">
        <VisuallyHidden>
          <DialogTitle>
            {mode === "signup" ? "Create an account" : "Sign in"}
          </DialogTitle>
        </VisuallyHidden>

        {/* Header */}
        <div className="flex flex-col gap-3 p-4 md:px-6 md:pt-6 md:pb-4">
          <div className="flex items-center justify-between">
            <AuthToggle mode={mode} onModeChange={handleModeChange} />
          </div>
          {showStepIndicator && (
            <div className="flex justify-center">
              <StepIndicator currentStep={getCurrentStepNumber()} totalSteps={getTotalSteps()} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 md:p-6">
          {mode === "signin" ? (
            <LoginStep
              email={email}
              password={password}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
            />
          ) : (
            <>
              {currentStep === "onboarding" && (
                <OnboardingStep onContinue={handleNext} />
              )}
              {currentStep === "account-type" && (
                <AccountTypeStep
                  selectedType={accountType}
                  onSelect={setAccountType}
                />
              )}
              {currentStep === "license" && (
                <LicenseStep
                  licenseNumber={licenseNumber}
                  state={state}
                  onLicenseChange={setLicenseNumber}
                  onStateChange={setState}
                />
              )}
              {currentStep === "personal-info" && (
                <PersonalInfoStep
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
              {currentStep === "success" && <SuccessStep />}
            </>
          )}
        </div>

        {/* Footer */}
        {(mode === "signin" || currentStep !== "success") && (
          <div className="p-4 md:p-6 border-t border-border/50">
            <div className="flex gap-3">
              {mode === "signup" && currentStep !== "onboarding" && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleBack}
                  className="h-12 px-6 rounded-xl border-border"
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
