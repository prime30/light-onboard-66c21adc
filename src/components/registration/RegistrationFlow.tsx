import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "./StepIndicator";
import { AccountTypeStep } from "./steps/AccountTypeStep";
import { LicenseStep } from "./steps/LicenseStep";
import { PersonalInfoStep } from "./steps/PersonalInfoStep";
import { SuccessStep } from "./steps/SuccessStep";
import { ArrowLeft, ArrowRight, ArrowUpRight, X } from "lucide-react";
import { toast } from "sonner";

type Step = "account-type" | "license" | "personal-info" | "success";

export const RegistrationFlow = () => {
  const [currentStep, setCurrentStep] = useState<Step>("account-type");
  const [accountType, setAccountType] = useState<string | null>(null);
  const [licenseNumber, setLicenseNumber] = useState("");
  const [state, setState] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const steps: Step[] = ["account-type", "license", "personal-info", "success"];
  const stepIndex = steps.indexOf(currentStep) + 1;

  const canContinue = () => {
    switch (currentStep) {
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

    switch (currentStep) {
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 md:p-6">
        <div className="w-10" />
        <StepIndicator currentStep={getCurrentStepNumber()} totalSteps={getTotalSteps()} />
        <button className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors">
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-4xl">
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
        </div>
      </main>

      {/* Footer */}
      {currentStep !== "success" && (
        <footer className="p-4 md:p-6">
          <div className="max-w-md mx-auto flex flex-col gap-4">
            <div className="flex gap-3">
              {currentStep !== "account-type" && (
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
                {currentStep === "personal-info" ? "Submit Application" : "Continue"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
            
            {currentStep === "account-type" && (
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <button className="inline-flex items-center gap-1 text-foreground font-medium underline underline-offset-2 hover:text-foreground/80 transition-all duration-200 group">
                  Sign in
                  <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
              </p>
            )}
          </div>
        </footer>
      )}
    </div>
  );
};
