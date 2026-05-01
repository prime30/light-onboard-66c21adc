import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useForm } from "../context";

type Milestone = {
  label: string;
  /** Cumulative progress percentage at which this milestone completes. */
  at: number;
};

const MILESTONES: Milestone[] = [
  { label: "Reviewing your application", at: 35 },
  { label: "Checking license number", at: 70 },
  { label: "Setting up account", at: 100 },
];

const TOTAL_DURATION_MS = 3600;
const TICK_MS = 40;

export const AssessingStep = () => {
  const { goToStep } = useForm();
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() - start;
      const ratio = Math.min(elapsed / TOTAL_DURATION_MS, 1);
      // ease-out cubic so it slows down near 100%
      const eased = 1 - Math.pow(1 - ratio, 3);
      setProgress(Math.round(eased * 100));
      if (ratio >= 1) {
        setDone(true);
        return;
      }
      raf = window.setTimeout(tick, TICK_MS) as unknown as number;
    };
    tick();
    return () => {
      window.clearTimeout(raf);
    };
  }, []);

  // After 100%, hold for a beat, then advance to create-password.
  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(() => {
      goToStep("create-password");
    }, 1300);
    return () => window.clearTimeout(t);
  }, [done, goToStep]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] py-10 animate-fade-in text-center">
      <div className="w-full max-w-[420px] space-y-[30px]">
        {/* Big circular progress */}
        <div className="relative w-[140px] h-[140px] mx-auto">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="4"
            />
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="hsl(var(--foreground))"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 46}
              strokeDashoffset={(2 * Math.PI * 46) * (1 - progress / 100)}
              style={{ transition: "stroke-dashoffset 80ms linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            {done ? (
              <div className="w-[60px] h-[60px] rounded-full bg-foreground flex items-center justify-center animate-scale-in">
                <Check className="w-7 h-7 text-background" strokeWidth={2.5} />
              </div>
            ) : (
              <span className="font-termina font-medium text-2xl tabular-nums text-foreground">
                {progress}%
              </span>
            )}
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-2.5">
          <h1 className="font-termina font-medium uppercase text-xl sm:text-2xl text-foreground leading-[1.1] text-balance">
            {done ? "You're approved!" : "Reviewing your application"}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {done
              ? "Just set a password to continue."
              : "Your application is being assessed. This will only take a moment."}
          </p>
        </div>

        {/* Milestones */}
        <ol className="space-y-2.5 text-left">
          {MILESTONES.map((m, i) => {
            const isComplete = progress >= m.at;
            const isActive =
              !isComplete && (i === 0 || progress >= MILESTONES[i - 1].at);
            return (
              <li
                key={m.label}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-form border transition-colors duration-300",
                  isComplete
                    ? "bg-muted/60 border-border/50"
                    : isActive
                      ? "bg-muted border-border/50"
                      : "bg-background border-border/30 opacity-50"
                )}
              >
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300",
                    isComplete
                      ? "bg-foreground"
                      : isActive
                        ? "bg-foreground/10"
                        : "bg-muted"
                  )}
                >
                  {isComplete ? (
                    <Check className="w-3.5 h-3.5 text-background" strokeWidth={3} />
                  ) : isActive ? (
                    <Loader2 className="w-3.5 h-3.5 text-foreground animate-spin" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-sm transition-colors duration-300",
                    isComplete
                      ? "text-foreground"
                      : isActive
                        ? "text-foreground"
                        : "text-muted-foreground"
                  )}
                >
                  {m.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
};
