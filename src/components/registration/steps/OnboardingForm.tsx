import { useState, useEffect, lazy, Suspense } from "react";
import { useGlobalApp } from "@/contexts/GlobalAppProvider";
import { FadeText } from "../FadeText";

// Lazy-load below-the-fold heavy children. They're not on the critical path
// for the email/password form interactivity — let them hydrate after first paint.
const MarqueeBadges = lazy(() =>
  import("@/components/registration/helpers/MarqueeBadges").then((m) => ({
    default: m.MarqueeBadges,
  }))
);
const RotatingStylistAvatarsLight = lazy(() =>
  import("@/components/registration/helpers/RotatingStylistAvatarsLight").then((m) => ({
    default: m.RotatingStylistAvatarsLight,
  }))
);

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

export const OnboardingForm = ({
  onSignIn,
  isRestoring = false,
}: OnboardingFormProps) => {
  const { fontsLoaded } = useGlobalApp();
  return (
    <div className="space-y-3 lg:space-y-0 lg:flex lg:flex-col lg:justify-between lg:flex-1 lg:min-h-0 relative">
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
      <div className="hidden lg:block text-center space-y-[clamp(5px,1vh,12px)] animate-stagger-1 lg:pb-0 lg:pt-[clamp(16px,4vh,48px)]">
        <FadeText
          as="h1"
          className="font-termina font-medium uppercase text-2xl sm:text-3xl md:text-4xl text-foreground leading-[1.1] text-balance"
        >
          Apply for pro pricing
        </FadeText>
        <FadeText
          as="p"
          className="text-sm sm:text-base text-muted-foreground/70 leading-relaxed max-w-sm mx-auto"
        >
          Unlock wholesale pricing on the industries best{" "}
          <span className="whitespace-nowrap">hair and tools.</span>
        </FadeText>
      </div>

      {/* Trust badges - Marquee with center highlight effect (lazy) */}
      <div style={{ minHeight: "32px" }}>
        <Suspense fallback={null}>
          <MarqueeBadges />
        </Suspense>
      </div>

      {/* Steps preview */}
      <div className="grid gap-5 lg:gap-[clamp(12px,2vh,24px)]">
        {[
          {
            label: "Tell us who you are",
          },
          {
            label: "Provide your license number",
          },
          {
            label: "Follow post-approval instructions to finalize account",
          },
        ].map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-4 text-left opacity-0 animate-step-card-enter"
            style={{
              animationDelay: `${400 + i * 150}ms`,
              animationFillMode: "forwards",
            }}
          >
            <span className="font-termina font-medium text-3xl lg:text-4xl text-foreground/20 tabular-nums leading-none flex-shrink-0 w-10 text-center">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm sm:text-base font-medium text-foreground/70">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Benefits highlight with animated counters — desktop only */}
      <div
        className="hidden lg:flex justify-center gap-6 text-center animate-stagger-3"
        style={{ minHeight: "52px" }}
      >
        {fontsLoaded && (
          <>
            <div>
              <div className="text-2xl font-semibold text-foreground">
                <AnimatedNumber value={50} suffix="%" delay={200} />
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Avg. Savings
              </div>
            </div>
            <div className="w-px bg-border" />
            <div>
              <div className="text-2xl font-semibold text-foreground">
                <AnimatedNumber value={24} suffix="hr" delay={400} />
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Approval
              </div>
            </div>
            <div className="w-px bg-border" />
            <div>
              <div className="text-2xl font-semibold text-foreground">
                <AnimatedProductCount delay={600} />
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Products
              </div>
            </div>
          </>
        )}
      </div>

      {/* Loved by pros - with avatars (mobile/tablet only) — gated on fontsLoaded, lazy chunk */}
      <div className="lg:hidden pt-3" style={{ minHeight: "28px" }}>
        {fontsLoaded && (
          <Suspense fallback={null}>
            <RotatingStylistAvatarsLight />
          </Suspense>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Already a member?{" "}
        <button
          onClick={onSignIn}
          className="text-foreground font-medium underline underline-offset-2 hover:text-foreground/80 transition-colors duration-200"
        >
          Login
        </button>
      </p>
    </div>
  );
};
