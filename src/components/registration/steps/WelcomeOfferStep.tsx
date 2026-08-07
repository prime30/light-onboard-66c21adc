import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, ArrowRight, CheckCircle, Copy, Gift, Mail, MessageSquare } from "lucide-react";
import { formatPhoneNumber } from "@/lib/validations/form-utils";
import { toE164 } from "@/lib/phone-e164";
import { StepValidationIcon } from "@/components/registration/StepValidationIcon";
import { TextInput } from "@/components/TextInput";
import { SelectInput } from "@/components/SelectInput";
import { dirtyFieldOptions, useForm } from "../context";
import { PrivacyPolicyContent, TermsOfServiceContent } from "../legal-content";
import { CountryFlag } from "./ContactBasicsStep";
import { countryCodes } from "@/data/country-codes";

const DISCOUNT_CODE = "SALONTRIAL15";

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
  const [subStep, setSubStep] = useState<"offer" | "reveal">("offer");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [codeRevealed, setCodeRevealed] = useState(false);

  const [acceptsMarketing, phoneNumber, phoneCountryCode] = watch([
    "acceptsMarketing",
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

  const handleSmsSubscribe = () => {
    setPhoneError(null);
    if (!phoneValid) {
      setPhoneError("Add a valid phone number so we can confirm your account.");
      setIsEditingPhone(true);
      return;
    }
    setValue("acceptsSmsMarketing", true, dirtyFieldOptions);
    setIsEditingPhone(false);
    setSubStep("reveal");
  };

  const handleSkip = () => {
    setValue("acceptsSmsMarketing", false, dirtyFieldOptions);
    setValue("acceptsMarketing", false, dirtyFieldOptions);
    goToNextStep();
  };

  const handleEmailSubscribe = () => {
    setValue("acceptsMarketing", true, dirtyFieldOptions);
    setCodeRevealed(true);
  };

  const handleEmailSkip = () => {
    setValue("acceptsMarketing", false, dirtyFieldOptions);
    goToNextStep();
  };

  const handleContinue = () => {
    goToNextStep();
  };

  const copyCode = () => {
    navigator.clipboard.writeText(DISCOUNT_CODE).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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

      <div className="rounded-form bg-background shadow-card animate-stagger-2 overflow-hidden">
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
                  You will be opting into text messages with number{" "}
                  <span className="font-medium text-foreground">
                    {formatPhoneNumber(phoneNumber)}
                  </span>
                  .{" "}
                  <button
                    type="button"
                    onClick={() => setIsEditingPhone(true)}
                    className="font-medium text-foreground hover:text-foreground/70 transition-colors"
                  >
                    Edit number
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

            {/* TCPA disclaimer */}
            <div className="rounded-form bg-muted/50 p-3.5">
              <p className="text-[10px] leading-relaxed text-center text-muted-foreground/60">
                By tapping &quot;Yes, subscribe to SMS for my discount&quot; you agree to receive recurring automated texts (approx. 4/month) from Drop Dead Extensions at the number above. Consent is not a condition of purchase. Msg & data rates may apply. Reply STOP to cancel, HELP for help. See our{" "}
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

            {/* Bottom action bar */}
            <div className="flex gap-[10px] pt-2">
              <Button
                type="button"
                variant="outline"
                size="pill-lg"
                onClick={goToPrevStep}
                aria-label="Go back"
                className="w-[55px] p-0 border-border hover:bg-muted/60 hover:border-foreground/30 group active:bg-muted/80 active:scale-95 transition-transform"
              >
                <ArrowLeft
                  className="w-[18px] h-[18px] transition-transform duration-150 group-active:-translate-x-1"
                  aria-hidden="true"
                />
              </Button>
              <Button
                type="button"
                size="pill-lg"
                onClick={handleSmsSubscribe}
                className="flex-1 h-11 bg-foreground text-background hover:bg-foreground font-medium text-base tracking-wide group active:scale-[0.98] transition-transform"
              >
                <MessageSquare className="w-4 h-4" />
                Yes, subscribe to SMS for my discount
                <ArrowRight className="w-[18px] h-[18px] transition-all duration-150 group-hover:w-[24px] group-hover:translate-x-0.5 group-active:translate-x-1" />
              </Button>
            </div>

            <button
              type="button"
              onClick={handleSkip}
              className="block w-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              No thanks, skip the discount
            </button>
          </div>
        )}

        {subStep === "reveal" && (
          <div className="p-6 sm:p-8 space-y-6 animate-slide-in-right">
            {codeRevealed ? (
              <>
                <div className="text-center space-y-3">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-status-green/10">
                    <CheckCircle className="w-4 h-4 text-status-green" strokeWidth={1.75} />
                  </div>
                  <h2 className="font-grotesk font-medium text-[clamp(1.5rem,4.5vw,2.25rem)] leading-[1.05] text-foreground tracking-[-0.02em]">
                    Your code is ready
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-[34ch] mx-auto">
                    Use it at checkout on your first order.
                  </p>
                </div>

                {/* Code reveal */}
                <button
                  type="button"
                  onClick={copyCode}
                  style={{ touchAction: "manipulation" }}
                  className="w-full flex items-center justify-between gap-2 px-4 py-3.5 rounded-xl border border-dashed border-accent-red/40 bg-accent-red/5 hover:bg-accent-red/10 transition-colors"
                  aria-label="Copy SALONTRIAL15 code"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Gift className="w-3.5 h-3.5 text-accent-red shrink-0" />
                    <span className="text-sm font-mono font-semibold text-accent-red tracking-wider">
                      {DISCOUNT_CODE}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
                    {copied ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-status-green" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </div>
                </button>

                {/* Bottom action bar */}
                <div className="flex gap-[10px] pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="pill-lg"
                    onClick={goToPrevStep}
                    aria-label="Go back"
                    className="w-[55px] p-0 border-border hover:bg-muted/60 hover:border-foreground/30 group active:bg-muted/80 active:scale-95 transition-transform"
                  >
                    <ArrowLeft
                      className="w-[18px] h-[18px] transition-transform duration-150 group-active:-translate-x-1"
                      aria-hidden="true"
                    />
                  </Button>
                  <Button
                    type="button"
                    size="pill-lg"
                    onClick={handleContinue}
                    className="flex-1 h-11 bg-foreground text-background hover:bg-foreground font-medium text-base tracking-wide group active:scale-[0.98] transition-transform"
                  >
                    Continue
                    <ArrowRight className="w-[18px] h-[18px] transition-all duration-150 group-hover:w-[24px] group-hover:translate-x-0.5 group-active:translate-x-1" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center space-y-3">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-muted/70">
                    <Mail className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
                  </div>
                  <h2 className="font-grotesk font-medium text-[clamp(1.5rem,4.5vw,2.25rem)] leading-[1.05] text-foreground tracking-[-0.02em]">
                    Almost there
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-[34ch] mx-auto">
                    Subscribe to email to reveal your 15% off code.
                  </p>
                </div>

                {/* TCPA disclaimer */}
                <div className="rounded-form bg-muted/50 p-3.5">
                  <p className="text-[10px] leading-relaxed text-center text-muted-foreground/60">
                    By tapping &quot;Yes, subscribe to email for my discount&quot; you agree to receive recurring automated marketing emails from Drop Dead Extensions. Consent is not a condition of purchase. See our{" "}
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

                {/* Bottom action bar */}
                <div className="flex gap-[10px] pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="pill-lg"
                    onClick={goToPrevStep}
                    aria-label="Go back"
                    className="w-[55px] p-0 border-border hover:bg-muted/60 hover:border-foreground/30 group active:bg-muted/80 active:scale-95 transition-transform"
                  >
                    <ArrowLeft
                      className="w-[18px] h-[18px] transition-transform duration-150 group-active:-translate-x-1"
                      aria-hidden="true"
                    />
                  </Button>
                  <Button
                    type="button"
                    size="pill-lg"
                    onClick={handleEmailSubscribe}
                    className="flex-1 h-11 bg-foreground text-background hover:bg-foreground font-medium text-base tracking-wide group active:scale-[0.98] transition-transform"
                  >
                    <Mail className="w-4 h-4" />
                    Yes, subscribe to email for my discount
                    <ArrowRight className="w-[18px] h-[18px] transition-all duration-150 group-hover:w-[24px] group-hover:translate-x-0.5 group-active:translate-x-1" />
                  </Button>
                </div>

                <button
                  type="button"
                  onClick={handleEmailSkip}
                  className="block w-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  No thanks, continue to finish
                </button>
              </>
            )}
          </div>
        )}
      </div>

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
