import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Gift, Mail, MessageSquare } from "lucide-react";
import { formatPhoneNumber } from "@/lib/validations/form-utils";
import { toE164 } from "@/lib/phone-e164";
import { StepValidationIcon } from "@/components/registration/StepValidationIcon";
import { TextInput } from "@/components/TextInput";
import { SelectInput } from "@/components/SelectInput";
import { dirtyFieldOptions, useForm } from "../context";
import { PrivacyPolicyContent, TermsOfServiceContent } from "../legal-content";
import { CountryFlag } from "./ContactBasicsStep";
import { countryCodes } from "@/data/country-codes";

export const WelcomeOfferStep = () => {
  const {
    register,
    control,
    watch,
    errors,
    currentStep,
    getStepValidationStatus,
    getStepNumber,
    setValue,
    goToNextStep,
    goToPrevStep,
  } = useForm();

  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [subStep, setSubStep] = useState<"offer" | "email">("offer");
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const [acceptsMarketing, acceptsSmsMarketing, phoneNumber, phoneCountryCode] = watch([
    "acceptsMarketing",
    "acceptsSmsMarketing",
    "phoneNumber",
    "phoneCountryCode",
  ]);

  const validationStatus = getStepValidationStatus(currentStep);

  const hasPhone = !!(phoneNumber && String(phoneNumber).trim().length >= 7);
  const phoneValid = toE164(phoneNumber, phoneCountryCode).ok;

  const countryCodeOptions = countryCodes.map((country) => ({
    value: country.iso,
    label: (
      <span className="flex items-center gap-2">
        <CountryFlag iso={country.iso} />
        <span>{country.code}</span>
        <span className="text-muted-foreground text-xs">({country.name})</span>
      </span>
    ),
    triggerContent: (
      <span className="flex items-center gap-2">
        <CountryFlag iso={country.iso} />
        <span>{country.code}</span>
      </span>
    ),
  }));

  const handleYes = () => {
    setPhoneError(null);
    if (!phoneValid) {
      setPhoneError("Add a valid phone number so we can text your code.");
      setIsEditingPhone(true);
      return;
    }
    setValue("acceptsSmsMarketing", true, dirtyFieldOptions);
    setIsEditingPhone(false);
    setSubStep("email");
  };

  const handleNo = () => {
    setValue("acceptsSmsMarketing", false, dirtyFieldOptions);
    setValue("acceptsMarketing", false, dirtyFieldOptions);
    goToNextStep();
  };

  const handleEmailContinue = () => {
    setValue("acceptsMarketing", true, dirtyFieldOptions);
    goToNextStep();
  };

  const handleEmailBack = () => {
    setSubStep("offer");
  };

  return (
    <div className="space-y-[clamp(16px,3vh,30px)]">
      <div className="space-y-2 text-center animate-stagger-1">
        <div className="inline-flex items-center gap-2.5 px-[15px] py-[6px] rounded-full bg-muted border border-border/50 mb-1 animate-badge-pop">
          <StepValidationIcon status={validationStatus} />
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
            Step {getStepNumber(currentStep)}
          </span>
        </div>
      </div>

      <div className="rounded-form border border-border bg-background shadow-card animate-stagger-2 overflow-hidden">
        {subStep === "offer" && (
          <div className="p-6 sm:p-8 space-y-6 animate-fade-in">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-muted/70">
                <Gift className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
              </div>
              <h1 className="font-grotesk font-medium text-[clamp(1.75rem,5vw,2.5rem)] leading-[1.05] text-foreground tracking-[-0.02em]">
                Get 15% off your first order
              </h1>
            </div>

            {/* Phone context */}
            <div className="space-y-2">
              {hasPhone && !isEditingPhone && (
                <p className="text-center text-sm text-muted-foreground">
                  We&apos;ll text your code to {formatPhoneNumber(phoneNumber)}.{" "}
                  <button
                    type="button"
                    onClick={() => setIsEditingPhone(true)}
                    className="font-medium text-foreground hover:text-foreground/70 transition-colors"
                  >
                    Edit
                  </button>
                </p>
              )}
              {!hasPhone && !isEditingPhone && (
                <p className="text-center text-sm text-muted-foreground">
                  No phone number on file.{" "}
                  <button
                    type="button"
                    onClick={() => setIsEditingPhone(true)}
                    className="font-medium text-foreground hover:text-foreground/70 transition-colors"
                  >
                    Add number
                  </button>
                </p>
              )}
              {isEditingPhone && (
                <div className="space-y-2 animate-fade-in">
                  <div className="flex gap-2">
                    <div className="w-[110px]">
                      <SelectInput
                        name="phoneCountryCode"
                        control={control}
                        error={errors.phoneCountryCode}
                        options={countryCodeOptions}
                        placeholder="Select"
                        className="w-full"
                      />
                    </div>
                    <TextInput
                      name="phoneNumber"
                      type="tel"
                      register={register}
                      error={errors.phoneNumber}
                      placeholder="(555) 123-4567"
                      autoComplete="tel-national"
                      autoFocus
                      onBlur={(event) => {
                        setValue("phoneNumber", formatPhoneNumber(event.target.value));
                      }}
                    />
                  </div>
                  {phoneError && (
                    <p className="text-xs text-destructive text-center">{phoneError}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsEditingPhone(false)}
                    className="block mx-auto text-xs font-medium text-foreground hover:text-foreground/70 transition-colors"
                  >
                    Done editing
                  </button>
                </div>
              )}
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                size="pill-lg"
                className="w-full h-12 text-sm font-medium tracking-wide"
                onClick={handleYes}
              >
                <MessageSquare className="w-4 h-4" />
                Text my 15% off code
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="pill-lg"
                className="w-full text-muted-foreground hover:text-foreground"
                onClick={handleNo}
              >
                No thanks, I&apos;ll skip the discount
              </Button>
            </div>

            {/* TCPA disclaimer */}
            <p className="text-[10px] leading-relaxed text-center text-muted-foreground/60">
              By tapping "Text my 15% off code" you agree to receive recurring automated texts (approx. 4/month) from Drop Dead Extensions at the number above. Consent is not a condition of purchase. Msg & data rates may apply. Reply STOP to cancel, HELP for help. See our{" "}
              <button
                type="button"
                onClick={() => setShowTerms(true)}
                className="underline underline-offset-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms
              </button>
              {" & "}
              <button
                type="button"
                onClick={() => setShowPrivacy(true)}
                className="underline underline-offset-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy Policy
              </button>
              .
            </p>
          </div>
        )}

        {subStep === "email" && (
          <div className="p-6 sm:p-8 space-y-6 animate-slide-in-right">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-muted/70">
                <Mail className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
              </div>
              <h2 className="font-grotesk font-medium text-[clamp(1.5rem,4.5vw,2.25rem)] leading-[1.05] text-foreground tracking-[-0.02em]">
                Add your email to unlock it
              </h2>
              <p className="text-sm text-muted-foreground max-w-[34ch] mx-auto">
                Your code is ready - just confirm where to send it.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                size="pill-lg"
                className="w-full h-12 text-sm font-medium tracking-wide"
                onClick={handleEmailContinue}
              >
                <Mail className="w-4 h-4" />
                Email me my 15% off code
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="pill-lg"
                className="w-full text-muted-foreground hover:text-foreground"
                onClick={handleEmailBack}
              >
                Back
              </Button>
            </div>

            <p className="text-[10px] leading-relaxed text-center text-muted-foreground/60">
              By tapping "Email me my 15% off code" you agree to receive recurring automated marketing emails from Drop Dead Extensions. Consent is not a condition of purchase. See our{" "}
              <button
                type="button"
                onClick={() => setShowTerms(true)}
                className="underline underline-offset-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms
              </button>
              {" & "}
              <button
                type="button"
                onClick={() => setShowPrivacy(true)}
                className="underline underline-offset-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy Policy
              </button>
              .
            </p>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={goToPrevStep}
        className="flex items-center justify-center gap-1.5 w-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors animate-stagger-3"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back
      </button>

      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Terms of Service</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <TermsOfServiceContent />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={showPrivacy} onOpenChange={setShowPrivacy}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Privacy Policy</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <PrivacyPolicyContent />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};
