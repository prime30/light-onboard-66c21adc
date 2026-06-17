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
  { label: string; tier: string; description: string; count: number }
> = {
  "1": {
    label: "1",
    tier: "Starter",
    description: "Occasional install",
    count: 1,
  },
  "2-5": {
    label: "2–5",
    tier: "Growing",
    description: "Building a steady client base",
    count: 5,
  },
  "6-10": {
    label: "6–10",
    tier: "Established",
    description: "Consistent monthly volume",
    count: 10,
  },
  "10+": {
    label: "10+",
    tier: "High volume",
    description: "Power stylist or salon",
    count: 20,
  },
};

// Pictogram: a 5×4 grid (20 cells) — fills 1 / 5 / 10 / 20 from bottom-left
// so the visual itself reads as "how much" at a glance.
const BoxGrid = ({
  count,
  selected,
}: {
  count: number;
  selected: boolean;
}) => {
  const cols = 5;
  const rows = 5;
  const total = cols * rows;
  const tile = 48;
  const pad = 5;
  const gap = 1.5;
  const cell = (tile - pad * 2 - gap * (cols - 1)) / cols;
  const onFill = "hsl(var(--foreground))";
  const offFill = "hsl(var(--foreground) / 0.12)";

  return (
    <svg
      width={tile}
      height={tile}
      viewBox={`0 0 ${tile} ${tile}`}
      aria-hidden
      className="relative"
    >
      {Array.from({ length: total }).map((_, i) => {
        // Iterate bottom-left → top-right so fills accumulate upward.
        const col = i % cols;
        const rowFromBottom = Math.floor(i / cols);
        const row = rows - 1 - rowFromBottom;
        const active = i < count;
        const x = pad + col * (cell + gap);
        const y = pad + row * (cell + gap);
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={cell}
            height={cell}
            rx={1.5}
            fill={active ? onFill : offFill}
            style={{
              opacity: 0,
              animation: `pack-rise 320ms cubic-bezier(0.34,1.56,0.64,1) forwards`,
              animationDelay: `${active ? i * 18 : 0}ms`,
            }}
          />
        );
      })}
    </svg>
  );
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
              {/* Left visual — bare grid, no tile background */}
              <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
                <BoxGrid count={details.count} selected={isSelected} />
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
