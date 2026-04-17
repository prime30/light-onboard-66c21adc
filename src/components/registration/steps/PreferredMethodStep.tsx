import { Check, Sparkles } from "lucide-react";
import { StepValidationIcon } from "@/components/registration/StepValidationIcon";
import { cn } from "@/lib/utils";
import {
  PREFERRED_METHOD_OPTIONS,
  PreferredMethod,
  ValidFieldNames,
} from "@/lib/validations/auth-schemas";
import { dirtyFieldOptions, useForm } from "../context";
import { Step } from "@/types/auth";

const STEP: Step = "preferred-method";
const fieldName: ValidFieldNames = "preferredMethods";

const METHOD_DESCRIPTIONS: Record<PreferredMethod, string> = {
  SuperWeft: "Hand-tied wefts for natural, seamless wear.",
  "Keratin Tips": "Pre-bonded strands for fusion installs.",
  SecreTapes: "Tape-in extensions for fast, low-profile applications.",
};

export const PreferredMethodStep = () => {
  const { getStepValidationStatus, setValue, watch, getStepNumber, errors } = useForm();

  const validationStatus = getStepValidationStatus(STEP);
  const selected = (watch(fieldName) as PreferredMethod[] | undefined) ?? [];
  const fieldError = errors.preferredMethods;

  const toggle = (method: PreferredMethod) => {
    const isSelected = selected.includes(method);
    const next = isSelected
      ? selected.filter((m) => m !== method)
      : [...selected, method];
    setValue(fieldName, next, dirtyFieldOptions);
  };

  return (
    <div className="space-y-[clamp(12px,2vh,20px)] sm:space-y-[clamp(15px,2.5vh,30px)]">
      <div className="space-y-[clamp(5px,1vh,10px)] text-center animate-stagger-1">
        <div className="inline-flex items-center gap-2.5 px-[15px] py-[6px] rounded-full bg-muted border border-border/50 mb-[5px] animate-badge-pop">
          <StepValidationIcon status={validationStatus} />
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
            Step {getStepNumber(STEP)}
          </span>
        </div>
        <h1 className="font-termina font-medium uppercase text-xl sm:text-2xl md:text-3xl text-foreground leading-[1.1] text-balance">
          Your preferred method
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground/70 leading-relaxed">
          Choose every install method you offer. Select all that apply.
        </p>
      </div>

      <div
        className="flex flex-wrap justify-center gap-2.5 sm:gap-[15px] animate-stagger-2"
        data-field="preferred-method"
      >
        {PREFERRED_METHOD_OPTIONS.map((method) => {
          const isSelected = selected.includes(method);
          return (
            <button
              key={method}
              type="button"
              onClick={() => toggle(method)}
              className={cn(
                "group relative inline-flex items-center gap-2 pl-4 pr-5 py-2.5 sm:py-3 rounded-full border-2 text-sm sm:text-base font-medium",
                "transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                "hover:-translate-y-0.5 active:scale-[0.97]",
                isSelected
                  ? "border-foreground bg-foreground text-background shadow-sm"
                  : "border-border bg-background text-foreground hover:border-foreground/40 hover:bg-foreground/[0.04]"
              )}
            >
              <span
                className={cn(
                  "inline-flex items-center justify-center w-5 h-5 rounded-full transition-all duration-300",
                  isSelected
                    ? "bg-background text-foreground scale-100"
                    : "bg-muted text-muted-foreground/60 scale-90 group-hover:scale-100"
                )}
              >
                {isSelected ? (
                  <Check className="w-3 h-3" strokeWidth={3} />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
              </span>
              {method}
            </button>
          );
        })}
      </div>

      {/* Descriptions for selected methods */}
      <div className="space-y-2 animate-stagger-3">
        {PREFERRED_METHOD_OPTIONS.map((method) => {
          const isSelected = selected.includes(method);
          if (!isSelected) return null;
          return (
            <div
              key={method}
              className="flex items-start gap-2.5 p-3 rounded-form bg-muted border border-border/50"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-foreground mt-2 flex-shrink-0" />
              <div className="text-xs sm:text-sm">
                <span className="font-medium text-foreground">{method}</span>
                <span className="text-muted-foreground"> — {METHOD_DESCRIPTIONS[method]}</span>
              </div>
            </div>
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
