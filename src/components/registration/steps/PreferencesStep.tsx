import { cn } from "@/lib/utils";

import { dirtyFieldOptions, useForm } from "../context";

const REFERRAL_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "facebook", label: "Facebook" },
  { value: "google", label: "Google Search" },
  { value: "friend", label: "Friend or Colleague" },
  { value: "salon", label: "My Salon" },
  { value: "event", label: "Industry Event" },
  { value: "reddit", label: "Reddit" },
  { value: "other", label: "Other" },
];

export const PreferencesStep = () => {
  const {
    register,
    watch,
    errors,
    currentStep,
    setValue,
  } = useForm();

  
  const referralSource = watch("referralSource");

  return (
    <div className="space-y-[clamp(12px,2vh,25px)]">
      <div className="space-y-[clamp(5px,1vh,10px)] text-center animate-stagger-1">
        <h1 className="font-termina font-medium uppercase text-xl sm:text-2xl md:text-3xl text-foreground leading-[1.1] text-balance">
          How did you hear about us?
        </h1>
        <p className="text-sm text-muted-foreground">
          It helps us know where stylists are finding us.
        </p>
      </div>

      <div className="space-y-2.5 animate-stagger-2">
        <div className="grid grid-cols-2 gap-2">
          {REFERRAL_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              data-field-wrapper="referralSource"
              style={{ touchAction: "manipulation" }}
              onClick={() =>
                setValue(
                  "referralSource",
                  referralSource === option.value ? "" : option.value,
                  dirtyFieldOptions
                )
              }
              className={cn(
                "p-3 rounded-xl border text-left text-sm transition-all duration-200",
                referralSource === option.value
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
  );
};
