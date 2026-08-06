import { useState, useEffect, useRef } from "react";
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
import { MultiFileUpload } from "../MultiFileUpload";
import { UploadFileItem } from "@/contexts";

export const PreferencesStep = () => {
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
  const taxFileRef = useRef<HTMLDivElement>(null);

  // Watch form values
  const watchedValues = watch([
    "acceptsMarketing",
    "acceptsSmsMarketing",
    "phoneNumber",
    "phoneCountryCode",
    "taxExempt",
    "taxExemptFile",
    "countryCode",
  ]);

  const [
    acceptsMarketing,
    acceptsSmsMarketing,
    phoneNumber,
    phoneCountryCode,
    taxExempt,
    taxExemptFile,
    countryCode,
  ] = watchedValues;

  // Tax exemption is a US-only concept (state sales tax). Other supported
  // countries (AU, UK, IE, NZ, ZA) handle tax at the point of sale or via
  // separate schemes, so we don't collect a certificate here.
  const showTaxExemption = (countryCode ?? "US") === "US";

  // (Instagram handle moved to Contact Information and required for all
  // registrations - no longer surfaced here.)


  // If country changes to non-US, clear any prior tax-exempt state so it
  // doesn't linger in session storage / summary.
  useEffect(() => {
    if (!showTaxExemption && (taxExempt !== undefined || (Array.isArray(taxExemptFile) && taxExemptFile.length > 0))) {
      setValue("taxExempt", undefined as unknown as boolean, dirtyFieldOptions);
      setValue("taxExemptFile", [], dirtyFieldOptions);
    }
  }, [showTaxExemption, taxExempt, taxExemptFile, setValue]);

  const validationStatus = getStepValidationStatus(currentStep);

  const consentCount = (acceptsSmsMarketing ? 1 : 0) + (acceptsMarketing ? 1 : 0);
  const isUnlocked = consentCount === 2;

  const handleTaxToggle = (checked: boolean) => {
    setValue("taxExempt", checked, dirtyFieldOptions);
    if (!checked) {
      setValue("taxExemptFile", [], dirtyFieldOptions);
    } else {
      setTimeout(() => {
        taxFileRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
    }
  };

  // Whether a usable phone number is already on file. We no longer use this
  // to *disable* the SMS checkbox - the checkbox is always selectable so the
  // user can never get stuck. Instead, if they opt in without a valid number
  // we auto-open the inline phone editor so they can add/fix it right here.
  const hasPhone = !!(phoneNumber && String(phoneNumber).trim().length >= 7);

  // Footer notice visibility (only relevant when SMS is opted-in)
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

  // (Birthday collection removed - no month/day options needed.)


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
          Preferences & Details
        </h1>
      </div>

      <div className="space-y-5">

        {/* Communication preferences - promoted above birthday because the
            approval-notification SMS is the single highest-value action a
            new applicant can take here. SMS is intentionally the top
            option in the stack. */}
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
                  Subscribe to texts and email to reveal your code on the next screen.
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
                    isUnlocked
                      ? "text-foreground"
                      : "text-foreground/50 blur-[4px] select-none"
                  )}
                >
                  Salontrial15
                </span>
              </div>

              {/* Two-segment progress */}
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

          {/* Consent rows */}
          <div className="border-t border-border/70 divide-y divide-border/70">
            {/* SMS */}
            <label
              className={cn(
                "block px-5 py-[20px] cursor-pointer transition-colors duration-300",
                acceptsSmsMarketing ? "bg-foreground/[0.012]" : "hover:bg-muted/40"
              )}
            >
              <div className="flex items-start gap-3.5">
                <MessageSquare
                  className={cn(
                    "w-[18px] h-[18px] mt-0.5 flex-shrink-0 transition-colors duration-300",
                    acceptsSmsMarketing ? "text-foreground" : "text-foreground/40"
                  )}
                  strokeWidth={1.5}
                />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-foreground">
                        Subscribe to texts
                      </span>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                        Approval alerts, order updates, sales, and early releases.
                      </p>
                    </div>
                    <Checkbox
                      checked={acceptsSmsMarketing || false}
                      onCheckedChange={(checked) => {
                        const next = !!checked;
                        setValue("acceptsSmsMarketing", next, dirtyFieldOptions);
                        if (next && !hasPhone) {
                          setIsEditingPhone(true);
                        }
                      }}
                      className="rounded-full mt-0.5 data-[state=checked]:bg-foreground data-[state=checked]:border-foreground"
                    />
                  </div>
                  {hasPhone && !isEditingPhone && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Pencil className="w-3 h-3 text-muted-foreground" strokeWidth={1.75} />
                      <span className="text-xs text-muted-foreground">
                        Sending to {formatPhoneNumber(phoneNumber)}.
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setIsEditingPhone(true); }}
                        className="text-xs font-medium text-foreground underline underline-offset-2 hover:text-foreground/70 transition-colors"
                      >
                        Edit number
                      </button>
                    </div>
                  )}
                  {!hasPhone && !isEditingPhone && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-muted-foreground">No phone number on file.</span>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setIsEditingPhone(true); }}
                        className="text-xs font-medium text-foreground underline underline-offset-2 hover:text-foreground/70 transition-colors"
                      >
                        Add number
                      </button>
                    </div>
                  )}
                  {isEditingPhone && (
                    <div className="space-y-2" onClick={(e) => e.preventDefault()}>
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
                        onClick={(e) => { e.preventDefault(); setIsEditingPhone(false); }}
                        className="text-xs font-medium text-foreground underline underline-offset-2 hover:text-foreground/70 transition-colors"
                      >
                        Done editing
                      </button>
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
                    By checking this box, you agree to receive recurring automated texts (approx. 4 msgs/month) from
                    Drop Dead Extensions at the number provided. Consent is not a condition of purchase.
                    Msg & data rates may apply. Reply STOP to cancel, HELP for help. See our{" "}
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setShowTerms(true); }}
                      className="underline underline-offset-2 hover:text-foreground transition-colors"
                    >
                      Terms
                    </button>
                    {" & "}
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setShowPrivacy(true); }}
                      className="underline underline-offset-2 hover:text-foreground transition-colors"
                    >
                      Privacy Policy
                    </button>
                    .
                  </p>
                </div>
              </div>
            </label>

            {/* Email */}
            <label
              className={cn(
                "block px-5 py-[20px] cursor-pointer transition-colors duration-300",
                acceptsMarketing ? "bg-foreground/[0.012]" : "hover:bg-muted/40"
              )}
            >
              <div className="flex items-start gap-3.5">
                <Mail
                  className={cn(
                    "w-[18px] h-[18px] mt-0.5 flex-shrink-0 transition-colors duration-300",
                    acceptsMarketing ? "text-foreground" : "text-foreground/40"
                  )}
                  strokeWidth={1.5}
                />
                <div className="flex-1 min-w-0 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-foreground">
                      Subscribe to emails
                    </span>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                      Promotions, new products, and pro-only deals. Unsubscribe anytime.
                    </p>
                  </div>
                  <Checkbox
                    checked={acceptsMarketing || false}
                    onCheckedChange={(checked) => {
                      setValue("acceptsMarketing", !!checked, dirtyFieldOptions);
                    }}
                    className="rounded-full mt-0.5 data-[state=checked]:bg-foreground data-[state=checked]:border-foreground"
                  />
                </div>
              </div>
            </label>
          </div>
        </div>


        {/* SMS opt-in confirmation strip - only after SMS is selected */}
        {showSmsNotice && (
          <div
            className={cn(
              "flex gap-[15px] transition-all duration-200",
              isExiting
                ? "opacity-0 translate-y-2"
                : "opacity-100 translate-y-0 animate-in fade-in slide-in-from-bottom-2 duration-300",
              "animate-stagger-3"
            )}
          >
            <Info className="w-4 h-4 text-muted-foreground/70 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground/70 leading-relaxed">
              You'll receive a confirmation text shortly after sign-up. Reply STOP at any time to
              opt out.
            </p>
          </div>
        )}

        {showTaxExemption && (
          <>
            <div className="h-px bg-border/50 animate-stagger-2" />

            {/* Tax exemption - optional, collapsed by default. US only. */}
            <div className="space-y-[15px] animate-stagger-2">
              <label
                className={cn(
                  "relative flex items-start gap-[15px] group p-4 -mx-1 rounded-form bg-background border transition-colors cursor-pointer",
                  taxExempt === true
                    ? "border-foreground/40 hover:border-foreground/60"
                    : "border-border hover:border-foreground/30"
                )}
              >
                <Checkbox
                  checked={taxExempt === true}
                  onCheckedChange={(checked) => handleTaxToggle(!!checked)}
                  className="rounded-full mt-0.5 data-[state=checked]:bg-foreground data-[state=checked]:border-foreground"
                />
                <div className="space-y-0.5 flex-1">
                  <span className="text-sm font-medium text-foreground">
                    I have a tax exemption certificate
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Upload it to avoid sales tax on your orders. Not required to register.
                  </p>
                </div>
              </label>

              {/* File upload when checked */}
              <div
                ref={taxFileRef}
                className={cn(
                  "grid transition-all duration-400",
                  taxExempt === true ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                )}
                style={{
                  transitionTimingFunction:
                    taxExempt === true ? "cubic-bezier(0.34, 1.56, 0.64, 1)" : "ease-out",
                }}
              >
                <div className="overflow-hidden">
                  <div
                    className={cn(taxExempt === true && "animate-haptic-pop")}
                    data-field="tax-document"
                  >
                    <MultiFileUpload
                      files={
                        Array.isArray(taxExemptFile) &&
                        taxExemptFile.every((item) => typeof item === "object")
                          ? (taxExemptFile as UploadFileItem[])
                          : []
                      }
                      onFilesChange={(files: UploadFileItem[]) =>
                        setValue("taxExemptFile", files, dirtyFieldOptions)
                      }
                      placeholder="Upload your state tax-exempt license"
                      error={!!errors.taxExemptFile}
                      errorMessage="Please upload your tax exemption document"
                      maxFiles={1}
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* How did you hear about us? */}
        <div className="space-y-2.5 animate-stagger-2">
          <p className="text-sm font-medium text-foreground">
            How did you hear about us?
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "instagram", label: "Instagram" },
              { value: "tiktok", label: "TikTok" },
              { value: "facebook", label: "Facebook" },
              { value: "google", label: "Google Search" },
              { value: "friend", label: "Friend or Colleague" },
              { value: "salon", label: "My Salon" },
              { value: "event", label: "Industry Event" },
              { value: "reddit", label: "Reddit" },
              { value: "other", label: "Other" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                data-field-wrapper="referralSource"
                style={{ touchAction: "manipulation" }}
                onClick={() =>
                  setValue(
                    "referralSource",
                    watch("referralSource") === option.value ? "" : option.value,
                    dirtyFieldOptions
                  )
                }
                className={cn(
                  "p-3 rounded-xl border text-left text-sm transition-all duration-200",
                  watch("referralSource") === option.value
                    ? "border-foreground bg-foreground/5 font-medium"
                    : errors.referralSource
                    ? "border-destructive/50 hover:border-destructive/70"
                    : "border-border/50 hover:border-foreground/30 hover:bg-muted/60"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          {/* Hidden registered field so RHF always includes referralSource in
              submitted values and validates it (buttons only setValue, which
              doesn't guarantee registration/inclusion in submit payloads). */}
          <input type="hidden" {...register("referralSource")} />
          {errors.referralSource && (
            <p className="text-xs text-destructive">
              {errors.referralSource.message as string}
            </p>
          )}
        </div>

        {/* Birthday field removed. */}



        {/* Social handle moved to Contact Information step. */}

      </div>



      {/* Terms of Service Modal */}
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

      {/* Privacy Policy Modal */}
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
