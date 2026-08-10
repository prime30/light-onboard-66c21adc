import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, ArrowRight, Check, CheckCircle, Copy, Gift, Mail, MessageSquare, Pencil, Tag } from "lucide-react";
import { formatPhoneNumber } from "@/lib/validations/form-utils";
import { toE164 } from "@/lib/phone-e164";

import { TextInput } from "@/components/TextInput";
import { SelectInput } from "@/components/SelectInput";
import { dirtyFieldOptions, useForm } from "../context";
import { PrivacyPolicyContent, TermsOfServiceContent } from "../legal-content";
import { CountryFlag } from "./ContactBasicsStep";
import { countryCodes } from "@/data/country-codes";
import { useAutoApproval } from "@/lib/app-settings";

const DISCOUNT_CODE = "SALONTRIAL15";

export const WelcomeOfferStep = () => {
  const {
    register,
    control,
    watch,
    errors,
    currentStep,
    setValue,
    goToNextStep,
    goToPrevStep,
    submitForm,
    isSubmitting,
  } = useForm();
  // In auto-approval mode this step lands AFTER the password step and is the
  // last gate before the account is actually created, so Continue submits.
  const { enabled: autoApprove } = useAutoApproval();
  const isFinalSubmitStep = autoApprove;

  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [acceptsMarketing, acceptsSmsMarketing, phoneNumber, phoneCountryCode] = watch([
    "acceptsMarketing",
    "acceptsSmsMarketing",
    "phoneNumber",
    "phoneCountryCode",
  ]);

  

  const hasPhone = !!(phoneNumber && String(phoneNumber).trim().length >= 7);
  const phoneValid = toE164(phoneNumber, phoneCountryCode).ok;

  const smsOn = !!acceptsSmsMarketing;
  const emailOn = !!acceptsMarketing;
  const unlocked = smsOn && emailOn;

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

  const toggleSms = () => {
    if (smsOn) {
      setValue("acceptsSmsMarketing", false, dirtyFieldOptions);
      return;
    }
    setPhoneError(null);
    if (!phoneValid) {
      setPhoneError("Add a valid mobile number so we can text your code details.");
      setIsEditingPhone(true);
      return;
    }
    setValue("acceptsSmsMarketing", true, dirtyFieldOptions);
  };

  const toggleEmail = () => {
    setValue("acceptsMarketing", !emailOn, dirtyFieldOptions);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(DISCOUNT_CODE).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Render the step's actions into the shared sticky footer slot at the bottom of the viewport
  const [footerSlot, setFooterSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setFooterSlot(document.getElementById("step-footer-slot"));
  }, []);

  const OptInRow = ({
    checked,
    onClick,
    icon,
    title,
    description,
    badge,
  }: {
    checked: boolean;
    onClick: () => void;
    icon: JSX.Element;
    title: string;
    description: ReactNode;
    badge?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={checked}
      className={`relative w-full flex items-start gap-[15px] text-left p-[15px] rounded-[15px] border transition-colors ${
        checked
          ? "border-status-green/40 bg-status-green/[0.06]"
          : "border-border/50 bg-background/70 hover:border-foreground/25 border-shimmer"
      }`}
    >
      <span
        className={`mt-[2px] w-[24px] h-[24px] rounded-full border-2 flex items-center justify-center shrink-0 transition-colors shadow-sm ${
          checked ? "border-status-green bg-status-green" : "border-foreground/30 bg-background"
        }`}
      >
        {checked && <Check className="w-4 h-4 text-background" strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          {icon}
          <span className="flex items-center gap-2">
            {title}
            {badge && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent-red/10 border border-accent-red/20 text-accent-red text-[10px] font-semibold tracking-wide uppercase">
                <Tag className="w-3 h-3" />
                {badge}
              </span>
            )}
          </span>
        </span>
        <span className="block text-xs text-muted-foreground mt-[4px] leading-[1.5]">
          {description}
        </span>
      </span>
    </button>
  );

  return (
    <div className="space-y-[clamp(16px,3vh,30px)]">
      <div className="space-y-2 text-center animate-stagger-1">
        <div className="animate-stagger-1" />
      </div>

      <div className="rounded-form bg-muted/70 backdrop-blur-xl border border-border/40 shadow-card animate-stagger-2 overflow-hidden">
        <div className="p-[25px] sm:p-10 flex flex-col items-center text-center animate-fade-in">
          <div className="hidden sm:flex w-[70px] h-[70px] rounded-[15px] bg-background border border-border/40 shadow-sm items-center justify-center mb-[25px]">
            <Tag className="w-7 h-7 text-foreground/80" strokeWidth={1.25} />
          </div>

          <h1 className="font-termina font-medium uppercase text-[clamp(1.25rem,4vw,2rem)] leading-[1.1] tracking-[-0.006em] text-foreground max-w-[18ch] mb-[15px]">
            Claim 15% off your first order
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground max-w-[38ch] mb-[25px]">
            Get your SALONTRIAL15 code by confirming where to send it below.
          </p>

          <div className="w-full max-w-[26rem] space-y-[10px]">
            <OptInRow
              checked={smsOn}
              onClick={toggleSms}
              icon={<MessageSquare className="w-4 h-4 text-foreground/70" />}
              title="Text me offers"
              badge="Save 15%"
              description={
                hasPhone ? (
                  <>
                    Approx. 4 texts/month to{" "}
                    <span className="inline-flex items-center gap-1">
                      <span>{formatPhoneNumber(phoneNumber)}</span>
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label="Edit phone number"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsEditingPhone(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.stopPropagation();
                            setIsEditingPhone(true);
                          }
                        }}
                        className="inline-flex items-center justify-center text-foreground/40 hover:text-foreground/70 transition-colors"
                      >
                        <Pencil className="w-3 h-3" />
                      </span>
                    </span>
                    . Reply STOP to cancel.
                  </>
                ) : (
                  "Add a mobile number to opt in. Approx. 4 texts/month."
                )
              }
            />
            <OptInRow
              checked={emailOn}
              onClick={toggleEmail}
              icon={<Mail className="w-4 h-4 text-foreground/70" />}
              title="Email me offers"
              badge="Save 15%"
              description="Restocks, pro education, and promos. Unsubscribe anytime."
            />

            {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}

            {isEditingPhone && (
              <div className="space-y-[10px] animate-fade-in text-left pt-[5px]">
                <div className="flex gap-[10px]">
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
                <button
                  type="button"
                  onClick={() => setIsEditingPhone(false)}
                  className="block mx-auto text-xs font-medium text-foreground hover:text-foreground/70 transition-colors"
                >
                  Done editing
                </button>
              </div>
            )}

            {unlocked && (
              <div className="pt-[15px] space-y-[10px] animate-fade-in">
                <div className="flex items-center justify-center gap-2 text-xs font-medium text-status-green">
                  <CheckCircle className="w-4 h-4" />
                  <span>Your code is unlocked</span>
                </div>
                <button
                  type="button"
                  onClick={copyCode}
                  style={{ touchAction: "manipulation" }}
                  className="w-full flex items-center justify-between gap-2 px-4 py-3.5 rounded-xl border border-dashed border-accent-red/40 bg-accent-red/5 hover:bg-accent-red/10 transition-colors"
                  aria-label={`Copy ${DISCOUNT_CODE} code`}
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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Always visible TCPA disclosure, never collapsed or hidden behind a link */}
      <div className="mx-auto max-w-[32rem] px-5 text-center animate-stagger-3">
        <p className="text-[11px] leading-[1.5] text-muted-foreground">

          By selecting &quot;Text me offers&quot; you agree to receive recurring automated marketing
          texts (approx. 4/month) from Drop Dead Extensions at the number shown. By selecting
          &quot;Email me offers&quot; you agree to receive recurring marketing emails. Consent is not
          a condition of purchase. Msg &amp; data rates may apply. Reply STOP to cancel, HELP for
          help. See our{" "}
          <button
            type="button"
            onClick={() => setShowTerms(true)}
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Terms
          </button>
          {" & "}
          <button
            type="button"
            onClick={() => setShowPrivacy(true)}
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Privacy Policy
          </button>
          .
        </p>
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

      {footerSlot &&
        createPortal(
          <div className="lg:max-w-[38rem] mx-auto flex flex-col gap-[10px]">
            <div className="flex gap-[10px]">
              <Button
                type="button"
                variant="outline"
                size="pill-lg"
                onClick={goToPrevStep}
                aria-label="Go back"
                className="w-[55px] p-0 border-border hover:bg-muted/60 hover:border-foreground/30 group active:bg-muted/80 active:scale-95 transition-transform shrink-0"
              >
                <ArrowLeft
                  className="w-[18px] h-[18px] transition-transform duration-150 group-active:-translate-x-1"
                  aria-hidden="true"
                />
              </Button>
              <Button
                type="button"
                size="pill-lg"
                disabled={isSubmitting}
                onClick={() => (isFinalSubmitStep ? void submitForm() : goToNextStep())}
                className="flex-1 bg-foreground text-background hover:bg-foreground font-medium text-sm sm:text-base tracking-wide whitespace-normal leading-tight group active:scale-[0.98] transition-transform"
              >
                <span className="text-center">
                  {isSubmitting
                    ? "Creating account..."
                    : isFinalSubmitStep
                      ? "Create account & continue"
                      : "Continue"}
                </span>
                <ArrowRight className="w-[18px] h-[18px] transition-all duration-150 group-hover:w-[24px] group-hover:translate-x-0.5 group-active:translate-x-1 shrink-0" />
              </Button>
            </div>
          </div>,
          footerSlot
        )}
    </div>
  );
};
