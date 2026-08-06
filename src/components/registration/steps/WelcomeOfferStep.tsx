import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Info, Pencil, MessageSquare, Mail, Lock, Unlock } from "lucide-react";
import { formatPhoneNumber } from "@/lib/validations/form-utils";
import { cn } from "@/lib/utils";
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
    <div className="space-y-[clamp(14px,2.5vh,28px)]">
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
        <p className="text-sm text-muted-foreground leading-relaxed max-w-[40ch] mx-auto">
          Check both boxes to reveal your code on the next screen.
        </p>
      </div>

      <div className="animate-stagger-2 rounded-form border border-border bg-background shadow-card overflow-hidden">
        {/* Code reveal */}
        <div className="px-5 pt-5 pb-4 border-b border-border/60">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
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
                <span className="sr-only">Salontrial15</span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "text-xs font-medium tracking-[0.14em] uppercase transition-all duration-500",
                    isUnlocked ? "text-foreground" : "text-foreground/50 select-none"
                  )}
                >
                  {isUnlocked ? "Salontrial15" : "••••••••••••"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <span
                  className={cn(
                    "h-[3px] w-5 rounded-full transition-colors duration-300",
                    acceptsSmsMarketing ? "bg-status-green" : "bg-border"
                  )}
                />
                <span
                  className={cn(
                    "h-[3px] w-5 rounded-full transition-colors duration-300",
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
        <label className="block px-5 py-4 border-b border-border/60 cursor-pointer transition-colors hover:bg-muted/30">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={acceptsSmsMarketing || false}
              onCheckedChange={(checked) => {
                const next = !!checked;
                setValue("acceptsSmsMarketing", next, dirtyFieldOptions);
                if (next && !hasPhone) setIsEditingPhone(true);
              }}
              className="rounded-full data-[state=checked]:bg-foreground data-[state=checked]:border-foreground mt-0.5"
            />
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.75} />
                <span className="text-sm font-medium text-foreground">Text me for 15% off</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Approx. 4 msgs/month. Reply STOP to cancel.
              </p>
              {hasPhone && !isEditingPhone && (
                <p className="text-xs text-foreground/70 pt-0.5">
                  {formatPhoneNumber(phoneNumber)}{" "}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsEditingPhone(true);
                    }}
                    className="font-medium text-foreground underline underline-offset-2 hover:text-foreground/80 transition-colors"
                  >
                    Edit
                  </button>
                </p>
              )}
              {!hasPhone && !isEditingPhone && (
                <p className="text-xs text-foreground/70 pt-0.5">
                  No phone number on file.{" "}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsEditingPhone(true);
                    }}
                    className="font-medium text-foreground underline underline-offset-2 hover:text-foreground/80 transition-colors"
                  >
                    Add number
                  </button>
                </p>
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
        <label className="block px-5 py-4 cursor-pointer transition-colors hover:bg-muted/30">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={acceptsMarketing || false}
              onCheckedChange={(checked) => {
                setValue("acceptsMarketing", !!checked, dirtyFieldOptions);
              }}
              className="rounded-full data-[state=checked]:bg-foreground data-[state=checked]:border-foreground mt-0.5"
            />
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.75} />
                <span className="text-sm font-medium text-foreground">Email me for 15% off</span>
              </div>
              <p className="text-xs text-muted-foreground">Promotions, launches, and pro education.</p>
            </div>
          </div>
        </label>
      </div>

      <p className="text-center text-[11px] text-muted-foreground/70 leading-relaxed animate-stagger-3">
        Consent is not a condition of purchase. Msg & data rates may apply. See{" "}
        <button
          type="button"
          onClick={() => setShowTerms(true)}
          className="underline underline-offset-2 text-foreground/80 hover:text-foreground transition-colors"
        >
          Terms
        </button>
        {" & "}
        <button
          type="button"
          onClick={() => setShowPrivacy(true)}
          className="underline underline-offset-2 text-foreground/80 hover:text-foreground transition-colors"
        >
          Privacy Policy
        </button>
        .
      </p>

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
