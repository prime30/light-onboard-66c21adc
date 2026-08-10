import { useState, useEffect } from "react";
import { Check, Gift, GraduationCap, Tag } from "lucide-react";
import { useGlobalApp } from "@/contexts/GlobalAppProvider";
import { FadeText } from "../FadeText";
import { cn } from "@/lib/utils";

// Animated Number Component
const AnimatedNumber = ({
  value,
  suffix,
  delay = 0,
  totalDuration = 2600,
}: {
  value: number;
  suffix: string;
  delay?: number;
  totalDuration?: number;
}) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const duration = totalDuration - delay;
    const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
    const timeoutId = setTimeout(() => {
      const startTime = performance.now();
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOutCubic(progress);
        setCount(Math.floor(easedProgress * value));
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setCount(value);
        }
      };
      requestAnimationFrame(animate);
    }, delay);
    return () => clearTimeout(timeoutId);
  }, [value, delay, totalDuration]);
  return (
    <span>
      {count}
      {suffix}
    </span>
  );
};

// Animated Product Count Component
const AnimatedProductCount = ({
  delay = 0,
  totalDuration = 2600,
}: {
  delay?: number;
  totalDuration?: number;
}) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const sequence: number[] = [];
    for (let i = 0; i <= 1800; i += 100) sequence.push(i);
    for (let i = 1810; i <= 1980; i += 10) sequence.push(i);
    for (let i = 1981; i <= 2000; i += 1) sequence.push(i);

    const duration = totalDuration - delay;
    const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

    const timeoutId = setTimeout(() => {
      const startTime = performance.now();
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOutCubic(progress);
        const index = Math.max(
          0,
          Math.min(Math.floor(easedProgress * sequence.length), sequence.length - 1)
        );
        setCount(sequence[index] ?? 0);
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setCount(2000);
        }
      };
      requestAnimationFrame(animate);
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [delay, totalDuration]);

  const formatDisplay = (num: number): string => {
    if (num == null) return "0";
    if (num >= 2000) return "2K+";
    if (num >= 1000 && num < 1100) return "1K";
    if (num >= 1000) return num.toLocaleString();
    return num.toString();
  };

  return <span>{formatDisplay(count)}</span>;
};

interface OnboardingFormProps {
  onSignIn: () => void;
  isRestoring?: boolean;
}

const TRUST_BADGES = [
  { icon: Check, label: "Exclusively professional", highlighted: false },
  { icon: GraduationCap, label: "Advanced education", highlighted: true },
  { icon: Tag, label: "Wholesale pricing", highlighted: false },
];

const STEPS = [
  {
    label: "Tell us who you are",
    description: "Select your account type and share your contact details.",
  },
  {
    label: "Provide your license number",
    description: "Upload your license so we can verify you're a professional.",
  },
  {
    label: "Follow post-approval instructions",
    description: "Get approved and unlock wholesale pricing and pro benefits.",
  },
];

export const OnboardingForm = ({
  onSignIn,
  isRestoring = false,
}: OnboardingFormProps) => {
  const { fontsLoaded } = useGlobalApp();

  return (
    <div className="space-y-10 lg:space-y-0 lg:flex lg:flex-col lg:justify-between lg:flex-1 lg:min-h-0 relative">
      {/* Restoring progress indicator */}
      {isRestoring && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] rounded-2xl" />
          <div className="relative flex flex-col items-center gap-4 animate-fade-in">
            {/* Rippling circle loader */}
            <div className="relative w-14 h-14 flex items-center justify-center">
              <div
                className="absolute inset-0 rounded-full border-2 border-primary/40"
                style={{ animation: "ripple 2s ease-out infinite" }}
              />
              <div
                className="absolute inset-0 rounded-full border-2 border-primary/40"
                style={{ animation: "ripple 2s ease-out infinite 0.6s" }}
              />
              <div
                className="absolute inset-0 rounded-full border-2 border-primary/40"
                style={{ animation: "ripple 2s ease-out infinite 1.2s" }}
              />
              <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
            </div>
            <p className="text-sm font-medium text-foreground/80">Restoring your progress...</p>
          </div>
        </div>
      )}

      {/* Hero section - desktop only (mobile shows in hero banner) */}
      <div className="hidden lg:block text-center space-y-5 animate-stagger-1 lg:pb-0 lg:pt-[clamp(16px,4vh,48px)]">
        <FadeText
          as="h1"
          className="font-termina font-medium uppercase text-3xl sm:text-4xl md:text-5xl text-foreground leading-[1.05] text-balance tracking-[-0.006em]"
        >
          Apply for pro pricing
        </FadeText>
        <FadeText
          as="p"
          className="text-base text-muted-foreground/80 leading-relaxed max-w-sm mx-auto"
        >
          Unlock wholesale pricing on the industries best{" "}
          <span className="whitespace-nowrap">hair and tools.</span>
        </FadeText>
      </div>


      {/* Trust badges */}
      <div className="flex flex-wrap justify-center gap-2.5 animate-stagger-2">

        {TRUST_BADGES.map((badge, i) => {
          const Icon = badge.icon;
          return (
            <div
              key={i}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-border/60 bg-muted/50 text-xs font-medium text-muted-foreground"
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
              <span className="whitespace-nowrap">{badge.label}</span>
            </div>

          );
        })}
      </div>

      {/* Steps timeline */}
      <div className="w-full max-w-md mx-auto relative animate-stagger-2">
        <div className="absolute left-4 top-3 bottom-3 w-px bg-border" />
        <div className="space-y-6">
          {STEPS.map((step, i) => (
            <div
              key={i}
              className="relative pl-12 opacity-0 animate-step-card-enter"
              style={{
                animationDelay: `${500 + i * 150}ms`,
                animationFillMode: "forwards",
              }}
            >
              <div className="absolute left-0 top-0.5 w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center z-10 shadow-sm">
                <span className="font-termina font-medium text-sm text-foreground">{i + 1}</span>
              </div>
              <div>
                <h3 className="text-base font-medium text-foreground">{step.label}</h3>
                <p className="text-sm text-muted-foreground/80 mt-1 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Offer highlight — bigger and more noticeable */}
      <div
        className={cn(
          "w-full max-w-md mx-auto animate-stagger-3",
          !fontsLoaded && "opacity-0"
        )}
      >
        <div className="relative overflow-hidden rounded-form border border-border/80 bg-muted/40 px-6 py-6 text-center">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          <div className="relative flex flex-col items-center gap-2">
            <div className="inline-flex items-center gap-2 text-muted-foreground">
              <Gift className="w-5 h-5" strokeWidth={1.5} />
              <span className="text-[11px] uppercase tracking-widest font-semibold">
                Limited offer
              </span>
            </div>
            <div className="text-4xl sm:text-5xl font-termina font-medium uppercase tracking-[-0.006em] text-foreground leading-none">
              15% Off
            </div>
            <p className="text-sm text-muted-foreground max-w-[260px]">
              Use code{" "}
              <span className="inline-flex items-center rounded-md bg-background border border-border/60 px-2 py-1 text-sm font-semibold text-foreground tracking-wide">
                SALONTRIAL15
              </span>{" "}
              on your first order after approval.
            </p>
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground text-center animate-stagger-3">
        Already a member?{" "}
        <button
          onClick={onSignIn}
          className="text-foreground font-semibold underline underline-offset-4 decoration-border hover:decoration-foreground transition-colors duration-200"
        >
          Login
        </button>
      </p>
    </div>
  );
};
