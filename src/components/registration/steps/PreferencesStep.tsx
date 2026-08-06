import { useEffect, useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { StepValidationIcon } from "@/components/registration/StepValidationIcon";
import { dirtyFieldOptions, useForm } from "../context";
import { MultiFileUpload } from "../MultiFileUpload";
import { UploadFileItem } from "@/contexts";

export const PreferencesStep = () => {
  const {
    register,
    watch,
    errors,
    currentStep,
    getStepValidationStatus,
    getStepNumber,
    setValue,
  } = useForm();

  const taxFileRef = useRef<HTMLDivElement>(null);

  const [taxExempt, taxExemptFile, countryCode] = watch([
    "taxExempt",
    "taxExemptFile",
    "countryCode",
  ]);

  // Tax exemption is a US-only concept (state sales tax). Other supported
  // countries (AU, UK, IE, NZ, ZA) handle tax at the point of sale or via
  // separate schemes, so we don't collect a certificate here.
  const showTaxExemption = (countryCode ?? "US") === "US";

  // If country changes to non-US, clear any prior tax-exempt state so it
  // doesn't linger in session storage / summary.
  useEffect(() => {
    if (
      !showTaxExemption &&
      (taxExempt !== undefined || (Array.isArray(taxExemptFile) && taxExemptFile.length > 0))
    ) {
      setValue("taxExempt", undefined as unknown as boolean, dirtyFieldOptions);
      setValue("taxExemptFile", [], dirtyFieldOptions);
    }
  }, [showTaxExemption, taxExempt, taxExemptFile, setValue]);

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
        {showTaxExemption && (
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
        )}

        {/* How did you hear about us? */}
        <div className="space-y-2.5 animate-stagger-2">
          <p className="text-sm font-medium text-foreground">How did you hear about us?</p>
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
              submitted values and validates it. */}
          <input type="hidden" {...register("referralSource")} />
          {errors.referralSource && (
            <p className="text-xs text-destructive">{errors.referralSource.message as string}</p>
          )}
        </div>
      </div>
    </div>
  );
};
