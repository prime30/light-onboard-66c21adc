import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Info, Pencil, MessageSquare, Mail, Gift, Lock, Unlock } from "lucide-react";
import { formatPhoneNumber } from "@/lib/validations/form-utils";
import { countryCodes } from "@/data/country-codes";
import { CountryFlag } from "./ContactBasicsStep";
import { cn } from "@/lib/utils";
import { StepValidationIcon } from "@/components/registration/StepValidationIcon";
import { TextInput } from "@/components/TextInput";
import { SelectInput } from "@/components/SelectInput";
import { dirtyFieldOptions, useForm } from "../context";
import { PrivacyPolicyContent, TermsOfServiceContent } from "../legal-content";

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
  } = useForm();

  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);

  const [acceptsMarketing, acceptsSmsMarketing, phoneNumber] = watch([
    "acceptsMarketing",
    "acceptsSmsMarketing",
    "phoneNumber",
  ]);

  const validationStatus = getStepValidationStatus(currentStep);

  const consentCount = (acceptsSmsMarketing ? 1 : 0) + (acceptsMarketing ? 1 : 0);
  const isUnlocked = consentCount === 2;

  const hasPhone = !!(phoneNumber && String(phoneNumber).trim().length >= 7);

  const [showSmsNotice, setShowSmsNotice] = useState(acceptsSmsMarketing);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (acceptsSmsMarketing) {
      setIsExiting(false);
      setShowSmsNotice(true);
    } else if (showSmsNotice) {
      setIsExiting(true);
      const timer = setTimeout(() => {
        setShowSmsNotice(false);
        setIsExiting(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [acceptsSmsMarketing, showSmsNotice]);

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

  return (
    <div className="space-y-[clamp(12px,2vh,25px)]">
      <div className="space-y-[clamp(5px,1vh,10px)] text-center animate-stagger-1">
        <div className="inline-flex items-center gap-2.5 px-[15px] py-[6px] rounded-full bg-muted border border-border/50 mb-[5px] animate-badge-pop">
          <StepValidationIcon status={validationStatus} />
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
            Step {getStepNumber(currentStep)}
          </span>
        </div>
        <h1 className="font-termina font-medium uppercase text-xl sm:text-2xl md:text-3xl text-foreground leading-[1.1] text-balance">
          Unlock 15% off
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-[42ch] mx-auto">
          Subscribe to texts and email below to reveal your 15% off code on the next screen.
        </p>
      </div>

      <div className="space-y-5">
        <div
          className={cn(
            "relative overflow-hidden rounded-form border border-border bg-background shadow-card",
            "animate-stagger-2"
          )}
        >
          {/* Offer header */}
          <div className="relative px-5 pt-5 pb-[25px] bg-gradient-to-b from-muted/70 to-transparent">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Welcome offer
                </p>
                <h2 className="mt-2 font-termina font-medium uppercase text-base sm:text-lg text-foreground leading-[1.15]">
                  15% off your first order
                </h2>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed max-w-[38ch]">
                  Your code is revealed on the next screen once both boxes are checked.
                </p>
              </div>
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-foreground/[0.04] border border-border/70 flex items-center justify-center">
                <Gift className="w-[18px] h-[18px] text-foreground/70" strokeWidth={1.5} />
              </div>
            </div>

            {/* Code chip - blurred until both consents are given */}
            <div className="mt-[15px] flex items-center gap-3 flex-wrap">
              <div
                className={cn(
                  "inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] border border-dashed transition-all duration-500",
                  isUnlocked
                    ? "border-status-green/40 bg-status-green/[0.06]"
                    : "border-border bg-foreground/[0.012]"
                )}
              >
                {isUnlocked ? (
                  <Unlock className="w-3.5 h-3.5 text-status-green" strokeWidth={1.75} />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.75} />
                )}
                <span
                  className={cn(
                    "text-xs font-medium tracking-[0.14em] uppercase transition-all duration-500",
                    isUnlocked ? "text-foreground" : "text-foreground/50 blur-[4px] select-none"
                  )}
                >
                  Salontrial15
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span
                    className={cn(
                      "h-[3px] w-6 rounded-full transition-colors duration-300",
                      acceptsSmsMarketing ? "bg-status-green" : "bg-border"
                    )}
                  />
                  <span
                    className={cn(
                      "h-[3px] w-6 rounded-full transition-colors duration-300",
                      acceptsMarketing ? "bg-status-green" : "bg-border"
                    )}
                  />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium uppercase tracking-[0.12em] transition-colors duration-300",
                    isUnlocked ? "text-status-green" : "text-muted-foreground"
                  )}
                >
                  {isUnlocked ? "Unlocked" : `${consentCount} of 2`}
                </span>
              </div>
            </div>
          </div>

          {/* SMS consent row */}
          <label className="block px-5 py-[15px] border-t border-border/60 cursor-pointer transition-colors hover:bg-muted/30">
            <div className="flex items-start gap-3.5">
              <div
                className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-[10px] flex items-center justify-center transition-colors duration-300",
                  acceptsSmsMarketing
                    ? "bg-foreground text-background"
                    : "bg-muted border border-border/60 text-foreground/60"
                )}
              >
                <MessageSquare className="w-[15px] h-[15px]" strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">Subscribe to texts</span>
                  <Checkbox
                    checked={acceptsSmsMarketing || false}
                    onCheckedChange={(checked) => {
                      const next = !!checked;
                      setValue("acceptsSmsMarketing", next, dirtyFieldOptions);
                      if (next && !hasPhone) setIsEditingPhone(true);
                    }}
                    className="rounded-full ml-auto data-[state=checked]:bg-foreground data-[state=checked]:border-foreground"
                  />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Approval alerts, order updates, sales, and early releases.
                </p>
                <p className="text-[11px] text-foreground/45 leading-relaxed">
                  By checking this box, you agree to receive recurring automated texts (approx. 4
                  msgs/month) from Drop Dead Extensions at the number provided. Consent is not a
                  condition of purchase. Msg & data rates may apply. Reply STOP to cancel, HELP for
                  help. See our{" "}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowTerms(true);
                    }}
                    className="underline underline-offset-2 text-foreground/70 hover:text-foreground transition-colors"
                  >
                    Terms
                  </button>
                  {" & "}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowPrivacy(true);
                    }}
                    className="underline underline-offset-2 text-foreground/70 hover:text-foreground transition-colors"
                  >
                    Privacy Policy
                  </button>
                  .
                </p>
                {hasPhone && !isEditingPhone && (
                  <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                    <Pencil className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-foreground/70">
                      SMS will be sent to {formatPhoneNumber(phoneNumber)}.
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setIsEditingPhone(true);
                      }}
                      className="text-xs font-medium text-foreground underline underline-offset-2 hover:text-foreground/80 transition-colors"
                    >
                      Edit number
                    </button>
                  </div>
                )}
                {!hasPhone && !isEditingPhone && (
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="text-xs text-foreground/70">No phone number on file.</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setIsEditingPhone(true);
                      }}
                      className="text-xs font-medium text-foreground underline underline-offset-2 hover:text-foreground/80 transition-colors"
                    >
                      Add number
                    </button>
                  </div>
                )}
                {isEditingPhone && (
                  <div className="space-y-2 pt-1" onClick={(e) => e.preventDefault()}>
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
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setIsEditingPhone(false);
                      }}
                      className="text-xs font-medium text-foreground underline underline-offset-2 hover:text-foreground/80 transition-colors"
                    >
                      Done editing
                    </button>
                  </div>
                )}
              </div>
            </div>
          </label>

          {/* Email consent row */}
          <label className="block px-5 py-[15px] border-t border-border/60 cursor-pointer transition-colors hover:bg-muted/30">
            <div className="flex items-start gap-3.5">
              <div
                className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-[10px] flex items-center justify-center transition-colors duration-300",
                  acceptsMarketing
                    ? "bg-foreground text-background"
                    : "bg-muted border border-border/60 text-foreground/60"
                )}
              >
                <Mail className="w-[15px] h-[15px]" strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground">Subscribe to emails</span>
                  <Checkbox
                    checked={acceptsMarketing || false}
                    onCheckedChange={(checked) => {
                      setValue("acceptsMarketing", !!checked, dirtyFieldOptions);
                    }}
                    className="rounded-full ml-auto data-[state=checked]:bg-foreground data-[state=checked]:border-foreground"
                  />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Promotions, new products, and pro education. Unsubscribe anytime.
                </p>
              </div>
            </div>
          </label>
        </div>

        {showSmsNotice && (
          <div
            className={cn(
              "flex gap-[15px] transition-all duration-200",
              isExiting
                ? "opacity-0 translate-y-2"
                : "opacity-100 translate-y-0 animate-in fade-in slide-in-from-bottom-2 duration-300"
            )}
          >
            <Info className="w-4 h-4 text-muted-foreground/70 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground/70 leading-relaxed">
              You'll receive a confirmation text shortly after sign-up. Reply STOP at any time to
              opt out.
            </p>
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
