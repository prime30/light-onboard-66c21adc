import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pencil, MessageSquare, Mail, Lock, Unlock } from "lucide-react";
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
    <div className="space-y-[clamp(16px,3vh,30px)]">
      <div className="space-y-2 text-center animate-stagger-1">
        <div className="inline-flex items-center gap-2.5 px-[15px] py-[6px] rounded-full bg-muted border border-border/50 mb-1 animate-badge-pop">
          <StepValidationIcon status={validationStatus} />
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
            Step {getStepNumber(currentStep)}
          </span>
        </div>
        <h1 className="font-termina font-medium uppercase text-[clamp(2.25rem,6vw,3.5rem)] leading-[0.95] text-foreground tracking-tight">
          15% off
        </h1>
        <p className="text-sm text-muted-foreground max-w-[36ch] mx-auto">
          Your first order. Code unlocks on the next screen.
        </p>
      </div>

      {/* Locked code hero */}
      <div className="animate-stagger-2 flex flex-col items-center gap-3">
        <div
          className={cn(
            "relative flex items-center justify-center gap-2 px-6 py-4 rounded-form border border-dashed transition-all duration-500",
            isUnlocked
              ? "border-status-green/40 bg-status-green/[0.06]"
              : "border-border bg-foreground/[0.012]"
          )}
        >
          {isUnlocked ? (
            <Unlock className="w-4 h-4 text-status-green" strokeWidth={1.75} />
          ) : (
            <Lock className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
          )}
          <span className="sr-only">Salontrial15</span>
          <span
            aria-hidden="true"
            className={cn(
              "font-termina font-medium text-lg tracking-[0.12em] uppercase transition-all duration-500",
              isUnlocked ? "text-foreground" : "text-foreground/50 select-none"
            )}
          >
            {isUnlocked ? "SALONTRIAL15" : "••••••••••••"}
          </span>
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

      {/* Consent card */}
      <div className="animate-stagger-3 rounded-form border border-border bg-background shadow-card overflow-hidden">
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
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.75} />
                <span className="text-sm font-medium text-foreground">Text me the code</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed pt-0.5">
                By checking this box, you agree to receive recurring automated texts (approx. 4 msgs/month) from Drop Dead Extensions at the number provided. Consent is not a condition of purchase. Msg & data rates may apply. Reply STOP to cancel, HELP for help. See our{" "}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowTerms(true);
                  }}
                  className="underline underline-offset-2 text-foreground/80 hover:text-foreground transition-colors"
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
                  className="underline underline-offset-2 text-foreground/80 hover:text-foreground transition-colors"
                >
                  Privacy Policy
                </button>
                .
              </p>
              {hasPhone && !isEditingPhone && (
                <p className="text-xs text-foreground/70 pt-1">
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
                <p className="text-xs text-foreground/70 pt-1">
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
                <div className="space-y-2 pt-2" onClick={(e) => e.preventDefault()}>
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
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.75} />
              <span className="text-sm font-medium text-foreground">Email me the code</span>
            </div>
          </div>
        </label>
      </div>

      <p className="text-center text-[11px] text-muted-foreground/70 leading-relaxed animate-stagger-4">
        Consent is not a condition of purchase. Msg & data rates may apply. Reply STOP to cancel. See{" "}
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
