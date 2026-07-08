import { useState, useEffect, useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Info, Pencil } from "lucide-react";
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
  ]);

  const [
    acceptsMarketing,
    acceptsSmsMarketing,
    phoneNumber,
    phoneCountryCode,
    taxExempt,
    taxExemptFile,
  ] = watchedValues;

  const validationStatus = getStepValidationStatus(currentStep);

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
  // to *disable* the SMS checkbox — the checkbox is always selectable so the
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

  // Create month options
  const monthOptions = [
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  // Create day options
  const dayOptions = Array.from({ length: 31 }, (_, i) => {
    const day = i + 1;
    return {
      value: day.toString().padStart(2, "0"),
      label: day.toString(),
    };
  });

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
        {/* Tax exemption — optional, collapsed by default. */}
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

        <div className="h-px bg-border/50 animate-stagger-2" />

        {/* Communication preferences — promoted above birthday because the
            approval-notification SMS is the single highest-value action a
            new applicant can take here. SMS is intentionally the top
            option in the stack. */}
        <div
          className={cn(
            "space-y-[15px] p-5 rounded-form bg-muted border border-border/50",
            "animate-stagger-2"
          )}
        >
          <p className="text-sm font-medium text-foreground">Communication preferences</p>
          <div className="space-y-[15px]">

            {/* SMS marketing — Shopify sms_marketing_consent (TCPA). Top of
                the stack: framed around the approval moment, which is what
                the applicant actually cares about right now. */}
            <label
              className={cn(
                "relative flex items-start gap-[15px] group p-4 -mx-1 rounded-form bg-background border transition-colors cursor-pointer border-border hover:border-foreground/30"
              )}
            >
              <Checkbox
                checked={acceptsSmsMarketing || false}
                onCheckedChange={(checked) => {
                  const next = !!checked;
                  setValue("acceptsSmsMarketing", next, dirtyFieldOptions);
                  // If opting in without a valid number on file, open the
                  // inline editor immediately so they can supply it here.
                  if (next && !hasPhone) {
                    setIsEditingPhone(true);
                  }
                }}
                className="rounded-full mt-1.5 data-[state=checked]:bg-foreground data-[state=checked]:border-foreground"
              />
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground">
                    Text me when I'm approved to shop & with pro-only deals
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-foreground text-[10px] font-medium uppercase tracking-[0.1em] text-background">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-foreground/70 leading-relaxed">
                  Texts from the Drop Dead team about your pro account, order confirmations, shipping updates, sales, and early releases.
                </p>
                <p className="text-[11px] text-foreground/60 leading-relaxed">
                  By checking this box, you agree to receive recurring automated texts (approx. 4 msgs/month) from
                  Drop Dead Extensions at the number provided. Consent is not a condition of purchase.
                  Msg & data rates may apply. Reply STOP to cancel, HELP for help. See our{" "}
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setShowTerms(true); }}
                    className="underline underline-offset-2 text-foreground/80 hover:text-foreground transition-colors"
                  >
                    Terms
                  </button>
                  {" & "}
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setShowPrivacy(true); }}
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
                      onClick={(e) => { e.preventDefault(); setIsEditingPhone(true); }}
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
                      onClick={(e) => { e.preventDefault(); setIsEditingPhone(true); }}
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
                      onClick={(e) => { e.preventDefault(); setIsEditingPhone(false); }}
                      className="text-xs font-medium text-foreground underline underline-offset-2 hover:text-foreground/80 transition-colors"
                    >
                      Done editing
                    </button>
                  </div>
                )}
              </div>
            </label>

            {/* Email marketing — Shopify email_marketing_consent */}
            <label className="flex items-start gap-[15px] cursor-pointer group">
              <Checkbox
                checked={acceptsMarketing || false}
                onCheckedChange={(checked) => {
                  setValue("acceptsMarketing", !!checked, dirtyFieldOptions);
                }}
                className="rounded-full mt-2 data-[state=checked]:bg-foreground data-[state=checked]:border-foreground"
              />
              <div className="space-y-0.5">
                <span className="text-sm font-medium text-foreground group-hover:text-foreground/80 transition-colors">
                  Email me about promotions, new products & deals
                </span>
                <p className="text-xs text-muted-foreground">
                  Marketing emails from Drop Dead Extensions. Unsubscribe anytime.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* SMS opt-in confirmation strip — only after SMS is selected */}
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
          {errors.referralSource && (
            <p className="text-xs text-destructive">
              {errors.referralSource.message as string}
            </p>
          )}
        </div>

        {/* Birthday (Optional) */}
        <div className="space-y-2.5 animate-stagger-3 group">
          <div className="grid grid-cols-2 gap-2.5">
            <SelectInput
              name="birthdayMonth"
              control={control}
              error={errors.birthdayMonth}
              options={monthOptions}
              label={
                <>
                  Birthday <span className="text-muted-foreground font-normal">(optional)</span>
                </>
              }
              placeholder="Month"
            />
            <SelectInput
              name="birthdayDay"
              control={control}
              error={errors.birthdayDay}
              options={dayOptions}
              label=" " // Space to align with month label
              placeholder="Day"
              className="mt-6"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            We'll send you a special treat on your birthday!
          </p>
        </div>

        {/* Social Media Handle (Optional) */}
        <div className="animate-stagger-6">
          <TextInput
            name="socialMediaHandle"
            type="text"
            register={register}
            error={errors.socialMediaHandle}
            placeholder="yourusername"
            label={
              <>
                Social media handle{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </>
            }
            prefixIcon={
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-base">
                @
              </span>
            }
            className="[&_input]:pl-9"
          />
          <p className="text-xs text-muted-foreground mt-2.5">
            Instagram, TikTok, or your primary platform
          </p>
        </div>
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
