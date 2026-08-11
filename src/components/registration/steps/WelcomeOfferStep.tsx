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
    title,
    description,
    badge,
    meta,
    legal,
    children,
  }: {
    checked: boolean;
    onClick: () => void;
    title: string;
    description?: ReactNode;
    badge?: string;
    meta?: ReactNode;
    legal?: ReactNode;
    children?: ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={checked}
      className={`relative w-full text-left px-[20px] py-[20px] rounded-[15px] border transition-all duration-300 ${
        checked
          ? "border-foreground/20 bg-background/80 backdrop-blur-xl shadow-card"
          : "border-border/50 bg-background/45 backdrop-blur-md hover:border-foreground/25 border-shimmer"
      }`}
    >
      <span className="flex gap-[15px]">
        <span
          className={`mt-[1px] w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
            checked ? "border-foreground bg-foreground" : "border-foreground/25 bg-background"
          }`}
        >
          {checked && <Check className="w-[13px] h-[13px] text-background" strokeWidth={3} />}
        </span>

        <span className="min-w-0 flex-1 block text-left">
          <span className="flex items-start justify-between gap-[10px] mb-[8px]">
            <span className="block text-[15px] font-medium leading-[1.35] text-foreground">
              {title}
            </span>
            {badge && (
              <span className="font-termina text-[9px] font-medium uppercase tracking-[0.14em] text-foreground/70 shrink-0">
                {badge}
              </span>
            )}
          </span>

          {description && (
            <span className="block mt-[8px] text-[13px] text-muted-foreground leading-[1.55]">
              {description}
            </span>
          )}

          {meta && <span className="block mt-[12px]">{meta}</span>}

          {legal && (
            <span className="block mt-[12px] pt-[12px] border-t border-border/50 text-[10.5px] leading-[1.55] text-muted-foreground/70">
              {legal}
            </span>
          )}

          {children}
        </span>
      </span>
    </button>
  );



  return (
    <div className="space-y-[clamp(16px,3vh,30px)]">
      <div className="space-y-[clamp(5px,1vh,10px)] text-center animate-stagger-1">
        <h1 className="font-termina font-medium uppercase text-xl sm:text-2xl md:text-3xl text-foreground leading-[1.1] text-balance">
          Subscribe and Save
        </h1>
      </div>

      <div className="w-full max-w-[30rem] mx-auto space-y-[20px] animate-stagger-2">
        <OptInRow
          checked={smsOn}
          onClick={toggleSms}
          badge="Save 15%"
          title="Text me when I'm approved to shop & with pro-only deals"
          meta={
            !isEditingPhone && (
              <span className="flex flex-wrap items-center gap-[5px] text-[13px] text-muted-foreground">
                <Pencil className="w-3 h-3 shrink-0" />
                <span>
                  {hasPhone
                    ? `Sending to ${formatPhoneNumber(phoneNumber)}`
                    : "No phone number on file"}
                </span>
                <span className="text-border">&bull;</span>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsEditingPhone(true); }}
                  className="font-medium text-foreground underline underline-offset-2 hover:text-foreground/70 transition-colors"
                >
                  {hasPhone ? "Edit number" : "Add number"}
                </button>
              </span>
            )
          }
          legal={
            <>
              By checking this box, you agree to receive recurring automated texts (approx. 4 msgs/month) from
              Drop Dead Extensions at the number provided. Consent is not a condition of purchase.
              Msg &amp; data rates may apply. Reply STOP to cancel, HELP for help. See our{" "}
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
            </>
          }
        />
        <OptInRow
          checked={emailOn}
          onClick={toggleEmail}
          title="Email me about promotions, new products & deals"
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
