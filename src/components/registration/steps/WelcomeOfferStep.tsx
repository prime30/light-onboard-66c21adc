import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, ArrowRight, Check, Pencil } from "lucide-react";
import { formatPhoneNumber } from "@/lib/validations/form-utils";
import { toE164 } from "@/lib/phone-e164";

import { TextInput } from "@/components/TextInput";
import { SelectInput } from "@/components/SelectInput";
import { dirtyFieldOptions, useForm } from "../context";
import { PrivacyPolicyContent, TermsOfServiceContent } from "../legal-content";
import { CountryFlag } from "./ContactBasicsStep";
import { countryCodes } from "@/data/country-codes";
import { useAutoApproval } from "@/lib/app-settings";

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
      setPhoneError("Add a valid mobile number so we can text you when you're approved.");
      setIsEditingPhone(true);
      return;
    }
    setValue("acceptsSmsMarketing", true, dirtyFieldOptions);
  };

  const toggleEmail = () => {
    setValue("acceptsMarketing", !emailOn, dirtyFieldOptions);
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
    children,
  }: {
    checked: boolean;
    onClick: () => void;
    icon: JSX.Element;
    title: string;
    description: ReactNode;
    badge?: string;
    children?: ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={checked}
      className={`relative w-full flex items-start gap-[15px] text-left p-[15px] rounded-[15px] border transition-colors ${
        checked
          ? "border-foreground/30 bg-foreground/[0.04]"
          : "border-border/50 bg-background/70 hover:border-foreground/25 border-shimmer"
      }`}
    >
      <span
        className={`mt-[2px] w-[24px] h-[24px] rounded-full border-2 flex items-center justify-center shrink-0 transition-colors shadow-sm ${
          checked ? "border-foreground bg-foreground" : "border-foreground/30 bg-background"
        }`}
      >
        {checked && <Check className="w-4 h-4 text-background" strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          {icon}
          <span className="flex items-center gap-2">
            {title}
            {badge && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-foreground text-[10px] font-medium uppercase tracking-[0.1em] text-background">
                {badge}
              </span>
            )}
          </span>
        </span>
        <span className="block text-xs text-muted-foreground mt-[4px] leading-[1.5]">
          {description}
        </span>
        {children}
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
          <h1 className="font-termina font-medium uppercase text-[clamp(1.25rem,4vw,2rem)] leading-[1.1] tracking-[-0.006em] text-foreground max-w-[18ch] mb-[15px]">
            Communication preferences
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground max-w-[38ch] mb-[25px]">
            Choose how we keep you in the loop about your pro account.
          </p>

          <div className="w-full max-w-[26rem] space-y-[10px]">
            <OptInRow
              checked={smsOn}
              onClick={toggleSms}
              icon={<span className="w-4 h-4 rounded-full border border-foreground/40 flex items-center justify-center text-[9px] font-medium text-foreground/70">SMS</span>}
              title="Text me when I'm approved to shop & with pro-only deals"
              badge="Recommended"
              description={
                <>
                  Texts from the Drop Dead team about your pro account, order confirmations, shipping updates, sales, and early releases.
                  <p className="text-[11px] text-foreground/60 leading-relaxed mt-1.5">
                    By checking this box, you agree to receive recurring automated texts (approx. 4 msgs/month) from
                    Drop Dead Extensions at the number provided. Consent is not a condition of purchase.
                    Msg & data rates may apply. Reply STOP to cancel, HELP for help. See our{" "}
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowTerms(true); }}
                      className="underline underline-offset-2 text-foreground/80 hover:text-foreground transition-colors"
                    >
                      Terms
                    </button>
                    {" & "}
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowPrivacy(true); }}
                      className="underline underline-offset-2 text-foreground/80 hover:text-foreground transition-colors"
                    >
                      Privacy Policy
                    </button>
                    .
                  </p>
                  {hasPhone && !isEditingPhone && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <Pencil className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-foreground/70">
                        SMS will be sent to {formatPhoneNumber(phoneNumber)}.
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsEditingPhone(true); }}
                        className="text-xs font-medium text-foreground underline underline-offset-2 hover:text-foreground/80 transition-colors"
                      >
                        Edit number
                      </button>
                    </div>
                  )}
                  {!hasPhone && !isEditingPhone && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-xs text-foreground/70">
                        No phone number on file.
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsEditingPhone(true); }}
                        className="text-xs font-medium text-foreground underline underline-offset-2 hover:text-foreground/80 transition-colors"
                      >
                        Add number
                      </button>
                    </div>
                  )}
                </>
              }
            />
            <OptInRow
              checked={emailOn}
              onClick={toggleEmail}
              icon={<span className="w-4 h-4 rounded-full border border-foreground/40 flex items-center justify-center text-[9px] font-medium text-foreground/70">@</span>}
              title="Email me about promotions, new products & deals"
              description="Marketing emails from Drop Dead Extensions. Unsubscribe anytime."
            />

            {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}

            {isEditingPhone && (
              <div className="space-y-[10px] animate-fade-in text-left pt-[5px]" onClick={(e) => e.stopPropagation()}>
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
          </div>
        </div>
      </div>

      {/* Always visible TCPA disclosure, never collapsed or hidden behind a link */}
      <div className="mx-auto max-w-[32rem] px-5 text-center animate-stagger-3">
        <p className="text-[11px] leading-[1.5] text-muted-foreground">
          By selecting &quot;Text me when I'm approved to shop & with pro-only deals&quot; you agree to receive recurring automated
          marketing texts (approx. 4/month) from Drop Dead Extensions at the number shown. By
          selecting &quot;Email me about promotions, new products & deals&quot; you agree to receive recurring marketing emails.
          Consent is not a condition of purchase. Msg &amp; data rates may apply. Reply STOP to
          cancel, HELP for help. See our{" "}
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
