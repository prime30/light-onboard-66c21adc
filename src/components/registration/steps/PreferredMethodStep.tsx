import { Check } from "lucide-react";
import { StepValidationIcon } from "@/components/registration/StepValidationIcon";
import { cn } from "@/lib/utils";
import {
  PREFERRED_METHOD_OPTIONS,
  PreferredMethod,
  ValidFieldNames,
} from "@/lib/validations/auth-schemas";
import { dirtyFieldOptions, useForm } from "../context";
import { Step } from "@/types/auth";
import superWeftImg from "@/assets/method-superweft.jpg";
import keratinTipsImg from "@/assets/method-keratin-tips.jpg";
import secreTapesImg from "@/assets/method-secretapes.jpg";
import volumeWeftImg from "@/assets/method-volume-weft.jpg";

const STEP: Step = "preferred-method";
const fieldName: ValidFieldNames = "preferredMethods";

const METHOD_DETAILS: Record<
  PreferredMethod,
  {
    description: string;
    image: string;
    tagline: string;
    displayName: React.ReactNode;
    comingSoon?: boolean;
  }
> = {
  SuperWeft: {
    tagline: "New Genius Weft",
    description: "Seamless wefts for a natural, lightweight finish.",
    image: superWeftImg,
    displayName: (
      <>
        SUPERWEFT<sup className="text-[0.5em] ml-0.5 align-super">®</sup>
      </>
    ),
  },
  "Keratin Tips": {
    tagline: "Pre-bonded",
    description: "Individual strands for fusion installs with maximum versatility.",
    image: keratinTipsImg,
    displayName: <>KERATIN TIPS</>,
  },
  SecreTapes: {
    tagline: "Tape-in",
    description: "Fast, low-profile applications that lay flat against the scalp.",
    image: secreTapesImg,
    displayName: (
      <>
        SECRETAPES<sup className="text-[0.5em] ml-0.5 align-super">®</sup>
      </>
    ),
  },
  "Volume Weft": {
    tagline: "Hand-tied",
    description: "Ultra-thick wefts for maximum density and fullness.",
    image: volumeWeftImg,
    displayName: <>VOLUME WEFT</>,
    comingSoon: true,
  },
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
    <div className="space-y-[clamp(12px,2vh,20px)] sm:space-y-[clamp(15px,2.5vh,25px)]">
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
        className="flex flex-col gap-[10px] animate-stagger-2"
        data-field="preferred-method"
      >
        {PREFERRED_METHOD_OPTIONS.map((method) => {
          const isSelected = selected.includes(method);
          const details = METHOD_DETAILS[method];
          return (
            <button
              key={method}
              type="button"
              onClick={() => toggle(method)}
              aria-pressed={isSelected}
              className={cn(
                "group relative flex items-center gap-4 w-full p-2.5 pr-5 rounded-form border-2 text-left",
                "transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                "hover:-translate-y-0.5 active:scale-[0.99]",
                isSelected
                  ? "border-foreground bg-foreground/[0.012] shadow-sm"
                  : details.comingSoon
                    ? "border-border/60 bg-muted/40 hover:border-foreground/30"
                    : "border-border/60 bg-background hover:border-foreground/30"
              )}
            >
              {/* Image */}
              <div
                className={cn(
                  "relative flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-form-sm overflow-hidden bg-muted",
                  "transition-all duration-300"
                )}
              >
                <img
                  src={details.image}
                  alt={method}
                  className={cn(
                    "w-full h-full object-cover transition-transform duration-500",
                    "group-hover:scale-105",
                    isSelected ? "scale-105" : "scale-100"
                  )}
                  loading="lazy"
                />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.12em]">
                    {details.tagline}
                  </span>
                  {details.comingSoon && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-foreground/[0.04] border border-border/60 text-[9px] font-medium text-foreground/70 uppercase tracking-[0.12em]">
                      Coming soon
                    </span>
                  )}
                </div>
                <div className="font-termina font-medium text-base sm:text-lg text-foreground leading-tight uppercase tracking-[-0.006em]">
                  {details.displayName}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground/80 leading-snug mt-1 line-clamp-2">
                  {details.description}
                </p>
              </div>

              {/* Check indicator */}
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
