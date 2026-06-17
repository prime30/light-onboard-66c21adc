import { Check } from "lucide-react";
import { StepValidationIcon } from "@/components/registration/StepValidationIcon";
import { cn } from "@/lib/utils";
import {
  MONTHLY_ORDER_VOLUME_OPTIONS,
  MonthlyOrderVolume,
  ValidFieldNames,
} from "@/lib/validations/auth-schemas";
import { dirtyFieldOptions, useForm } from "../context";
import { Step } from "@/types/auth";

const STEP: Step = "monthly-order-volume";
const fieldName: ValidFieldNames = "monthlyOrderVolume";

const OPTION_DETAILS: Record<
  MonthlyOrderVolume,
  { label: string; tier: string; description: string; fill: number }
> = {
  "1": {
    label: "1",
    tier: "Starter",
    description: "Just getting started or occasional installs.",
    fill: 1,
  },
  "2-5": {
    label: "2–5",
    tier: "Growing",
    description: "Building a steady client base.",
    fill: 2,
  },
  "6-10": {
    label: "6–10",
    tier: "Established",
    description: "Consistent monthly volume.",
    fill: 3,
  },
  "10+": {
    label: "10+",
    tier: "High volume",
    description: "Power stylist or salon.",
    fill: 4,
  },
};

export const MonthlyOrderVolumeStep = () => {
  const { getStepValidationStatus, setValue, watch, getStepNumber, errors } = useForm();

  const validationStatus = getStepValidationStatus(STEP);
  const selected = watch(fieldName) as MonthlyOrderVolume | undefined;
  const fieldError = errors.monthlyOrderVolume;

  const select = (value: MonthlyOrderVolume) => {
    setValue(fieldName, value, dirtyFieldOptions);
  };

  return (
    <div className="space-y-[clamp(12px,2vh,20px)] sm:space-y-[clamp(15px,2.5vh,25px)]">
      <div className="space-y-[clamp(5px,1vh,10px)] text-center animate-stagger-1">
        <div className="inline-flex items-center gap-2.5 px-[15px] py-[6px] rounded-full bg-muted border border-border/50 mb-[5px] animate-badge-pop">
          <StepValidationIcon status={validationStatus} />
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
            Step {getStepNumber(STEP)}
          </span>
        </div>
        <h1 className="font-termina font-medium uppercase text-xl sm:text-2xl md:text-3xl text-foreground leading-[1.1] text-balance">
          How many extensions do you order per month currently?
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground/70 leading-relaxed">
          Choose the range that best reflects your current monthly volume.
        </p>
      </div>

      <div
        className="flex flex-col gap-[10px] animate-stagger-2"
        data-field="monthly-order-volume"
      >
        {MONTHLY_ORDER_VOLUME_OPTIONS.map((option) => {
          const isSelected = selected === option;
          const details = OPTION_DETAILS[option];
          return (
            <button
              key={option}
              type="button"
              onClick={() => select(option)}
              aria-pressed={isSelected}
              className={cn(
                "group relative flex items-center gap-4 w-full p-5 rounded-form border-2 text-left",
                "transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                "hover:-translate-y-0.5 active:scale-[0.99]",
                isSelected
                  ? "border-foreground bg-foreground/[0.012] shadow-sm"
                  : "border-border/60 bg-background hover:border-foreground/30"
              )}
            >
              {/* Left visual — stacked wefts representing extension bundles */}
              <div
                className={cn(
                  "flex-shrink-0 relative w-12 h-12 rounded-[12px] flex items-center justify-center overflow-hidden transition-all duration-500 ease-out",
                  isSelected
                    ? "bg-foreground shadow-[0_8px_24px_-12px_hsl(var(--foreground)/0.45)]"
                    : "bg-muted/60 group-hover:bg-muted"
                )}
              >
                {/* subtle inner ring */}
                <div
                  aria-hidden
                  className={cn(
                    "absolute inset-0 rounded-[12px] ring-1 ring-inset transition-colors duration-300",
                    isSelected ? "ring-background/15" : "ring-border/60"
                  )}
                />
                <div className="relative flex flex-col items-start gap-[3px] w-7">
                  {[0, 1, 2, 3].map((i) => {
                    // Stack from bottom up — fewer bars = lower tier
                    const idxFromBottom = 3 - i;
                    const active = idxFromBottom < details.fill;
                    // Each weft grows wider toward the bottom for left-weighted hierarchy
                    const widths = ["w-3", "w-4", "w-5", "w-7"];
                    return (
                      <div
                        key={i}
                        className={cn(
                          "h-[3px] rounded-full transition-all duration-500 ease-out",
                          widths[idxFromBottom],
                          active
                            ? isSelected
                              ? "bg-background"
                              : "bg-foreground"
                            : isSelected
                              ? "bg-background/20"
                              : "bg-foreground/15"
                        )}
                        style={{
                          transitionDelay: active ? `${idxFromBottom * 40}ms` : "0ms",
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <div className="font-termina font-medium text-lg sm:text-xl text-foreground leading-tight uppercase tracking-[-0.006em]">
                    {details.label}
                  </div>
                  <span className="font-mono-eyebrow text-[10px] text-muted-foreground uppercase tracking-[0.12em]">
                    {details.tier}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground/80 leading-snug mt-1">
                  {details.description}
                </p>
              </div>

              <div
                className={cn(
                  "flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                  isSelected
                    ? "border-foreground bg-foreground scale-100"
                    : "border-border bg-background scale-90 group-hover:border-foreground/40 group-hover:scale-100"
                )}
              >
                <Check
                  className={cn(
                    "w-3.5 h-3.5 text-background transition-opacity duration-200",
                    isSelected ? "opacity-100" : "opacity-0"
                  )}
                  strokeWidth={3}
                />
              </div>
            </button>
          );
        })}
      </div>

      {fieldError && (
        <p className="text-xs text-destructive text-center animate-stagger-3">
          {fieldError.message as string}
        </p>
      )}
    </div>
  );
};
