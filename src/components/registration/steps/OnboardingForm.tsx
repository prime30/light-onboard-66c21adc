import { useState, useCallback, useRef, useEffect } from "react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { useMagnetic } from "@/hooks/use-magnetic";
import { MarqueeBadges } from "@/components/registration/helpers/MarqueeBadges";
import { useGlobalApp } from "@/contexts/GlobalAppProvider";

// Stylist avatars
import stylistPink1 from "@/assets/avatars/stylist-pink-1.jpg";
import stylistPurple1 from "@/assets/avatars/stylist-purple-1.jpg";
import stylistBlue1 from "@/assets/avatars/stylist-blue-1.jpg";
import stylistOmbre1 from "@/assets/avatars/stylist-ombre-1.jpg";
import stylistTeal1 from "@/assets/avatars/stylist-teal-1.jpg";
import stylistLavender1 from "@/assets/avatars/stylist-lavender-1.jpg";
import stylistMagenta1 from "@/assets/avatars/stylist-magenta-1.jpg";
import stylistElectric1 from "@/assets/avatars/stylist-electric-1.jpg";
import { FadeText } from "../FadeText";

const stylistAvatars = [
  stylistPink1,
  stylistPurple1,
  stylistBlue1,
  stylistOmbre1,
  stylistTeal1,
  stylistLavender1,
  stylistMagenta1,
  stylistElectric1,
];
const reactionEmojis = ["💇", "✨", "💕", "🔥", "⭐", "💖", "👏", "🙌", "💯", "🤩", "😍"];

// Calculate dynamic starting number based on months elapsed
const getOdometerBaseNumber = () => {
  const baseDate = new Date(2025, 11, 1);
  const baseNumber = 8340;
  const now = new Date();
  const monthsDiff =
    (now.getFullYear() - baseDate.getFullYear()) * 12 + (now.getMonth() - baseDate.getMonth());

  if (monthsDiff <= 0) return baseNumber;

  let total = baseNumber;
  for (let i = 1; i <= monthsDiff; i++) {
    total += i % 2 === 1 ? 122 : 123;
  }
  return total;
};

// Odometer Counter Component - matches desktop hero style
const OdometerCounter = ({
  variant = "light",
  onIncrement,
}: {
  variant?: "dark" | "light";
  onIncrement?: () => void;
}) => {
  const baseNumber = getOdometerBaseNumber();
  const basePrefix = Math.floor(baseNumber / 100);
  const formattedPrefix =
    basePrefix >= 100
      ? `${Math.floor(basePrefix / 10)},${basePrefix % 10}`
      : `${Math.floor(basePrefix / 10)},${basePrefix % 10}`;
  const initialTens = Math.floor((baseNumber % 100) / 10);
  const initialOnes = baseNumber % 10;

  const [tens, setTens] = useState(initialTens);
  const [ones, setOnes] = useState(initialOnes);
  const [prevOnes, setPrevOnes] = useState(initialOnes);
  const [prevTens, setPrevTens] = useState(initialTens);
  const [isRolling, setIsRolling] = useState(false);
  const [isTensRolling, setIsTensRolling] = useState(false);
  const [isBurst, setIsBurst] = useState(false);
  const textColor = variant === "light" ? "text-muted-foreground" : "text-background/50";

  const onesRef = useRef(ones);
  const tensRef = useRef(tens);
  const onIncrementRef = useRef(onIncrement);
  onesRef.current = ones;
  tensRef.current = tens;
  onIncrementRef.current = onIncrement;

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const scheduleNext = () => {
      const delay = 3000 + Math.random() * 4000;
      timeoutId = setTimeout(() => {
        const isBurstIncrement = Math.random() < 0.2;
        const increment = isBurstIncrement ? (Math.random() < 0.5 ? 2 : 3) : 1;

        if (isBurstIncrement) {
          setIsBurst(true);
          setTimeout(() => setIsBurst(false), 600);
        }

        const currentOnes = onesRef.current;
        const currentTens = tensRef.current;

        setPrevOnes(currentOnes);
        setPrevTens(currentTens);

        const newOnes = (currentOnes + increment) % 10;
        const tensIncrement = Math.floor((currentOnes + increment) / 10);

        if (tensIncrement > 0) {
          setIsTensRolling(true);
          setTens((prev) => (prev + tensIncrement) % 10);
        }

        setOnes(newOnes);
        setIsRolling(true);

        onIncrementRef.current?.();

        setTimeout(() => {
          setIsRolling(false);
          setIsTensRolling(false);
          scheduleNext();
        }, 300);
      }, delay);
    };

    scheduleNext();
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <span
      className={cn(
        "text-xs tabular-nums transition-all duration-300",
        textColor,
        isBurst && "!text-[hsl(142,71%,45%)]"
      )}
    >
      {formattedPrefix}
      <span
        className="inline-block overflow-hidden"
        style={{
          height: "1em",
          width: "0.6em",
          verticalAlign: "text-bottom",
          position: "relative",
          top: "0.02em",
        }}
      >
        <span
          className={
            isTensRolling
              ? "block transition-transform duration-300 ease-out"
              : "block transition-none"
          }
          style={{ transform: isTensRolling ? "translateY(-50%)" : "translateY(0)" }}
        >
          <span className="block" style={{ height: "1em", lineHeight: "1em" }}>
            {isTensRolling ? prevTens : tens}
          </span>
          <span className="block" style={{ height: "1em", lineHeight: "1em" }}>
            {tens}
          </span>
        </span>
      </span>
      <span
        className={cn(
          "inline-block overflow-hidden transition-all duration-300",
          isBurst && "drop-shadow-[0_0_6px_hsl(142,71%,45%)]"
        )}
        style={{
          height: "1em",
          width: "0.6em",
          verticalAlign: "text-bottom",
          position: "relative",
          top: "0.02em",
        }}
      >
        <span
          className={
            isRolling ? "block transition-transform duration-300 ease-out" : "block transition-none"
          }
          style={{ transform: isRolling ? "translateY(-50%)" : "translateY(0)" }}
        >
          <span className="block" style={{ height: "1em", lineHeight: "1em" }}>
            {isRolling ? prevOnes : ones}
          </span>
          <span className="block" style={{ height: "1em", lineHeight: "1em" }}>
            {ones}
          </span>
        </span>
      </span>{" "}
      pros
    </span>
  );
};

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

// Rotating Stylist Avatars Light Component
const RotatingStylistAvatarsLight = () => {
  const [visibleIndices, setVisibleIndices] = useState([0, 1, 2]);
  const [fadingIndex, setFadingIndex] = useState<number | null>(null);
  const [floatingEmoji, setFloatingEmoji] = useState<{
    position: number;
    emoji: string;
    id: number;
  } | null>(null);
  const emojiIdRef = useRef(0);
  const visibleIndicesRef = useRef(visibleIndices);
  visibleIndicesRef.current = visibleIndices;
  const nextAvatarRef = useRef(3);

  const handleOdometerIncrement = useCallback(() => {
    const prev = visibleIndicesRef.current;
    const positionToReplace = Math.floor(Math.random() * 3);

    let nextIndex = nextAvatarRef.current;
    nextAvatarRef.current = (nextAvatarRef.current + 1) % stylistAvatars.length;

    while (prev.includes(nextIndex)) {
      nextIndex = nextAvatarRef.current;
      nextAvatarRef.current = (nextAvatarRef.current + 1) % stylistAvatars.length;
    }

    setFadingIndex(positionToReplace);

    const randomEmoji = reactionEmojis[Math.floor(Math.random() * reactionEmojis.length)];
    emojiIdRef.current += 1;
    setFloatingEmoji({
      position: positionToReplace,
      emoji: randomEmoji,
      id: emojiIdRef.current,
    });

    setTimeout(() => {
      setFadingIndex(null);
    }, 300);

    setTimeout(() => {
      setFloatingEmoji(null);
    }, 1000);

    const newIndices = [...prev];
    newIndices[positionToReplace] = nextIndex;
    setVisibleIndices(newIndices);
  }, []);

  const magnetic = useMagnetic<HTMLAnchorElement>({ strength: 0.15 });

  return (
    <Link
      to="/reviews"
      ref={magnetic.ref}
      onMouseMove={magnetic.onMouseMove}
      onMouseLeave={magnetic.onMouseLeave}
      style={magnetic.style}
      className="flex items-center justify-center gap-2.5 pt-2 animate-stagger-4 transition-all duration-200 cursor-pointer group"
    >
      <span className="text-xs text-muted-foreground transition-opacity duration-200 group-hover:opacity-70">
        Loved by
      </span>
      <div className="flex -space-x-[5px]">
        {visibleIndices.map((avatarIndex, i) => (
          <div
            key={`${i}-${avatarIndex}`}
            className="relative hover:z-10 transition-transform duration-200 hover:scale-125"
          >
            <img
              src={stylistAvatars[avatarIndex]}
              alt={`Stylist ${avatarIndex + 1}`}
              className={cn(
                "w-6 h-6 rounded-full border-2 border-background object-cover transition-all duration-300",
                fadingIndex === i ? "opacity-0 scale-75" : "opacity-100 scale-100"
              )}
            />
            {floatingEmoji && floatingEmoji.position === i && (
              <span
                key={floatingEmoji.id}
                className="absolute -top-1 left-1/2 -translate-x-1/2 text-sm animate-float-up pointer-events-none"
              >
                {floatingEmoji.emoji}
              </span>
            )}
          </div>
        ))}
      </div>
      <OdometerCounter variant="light" onIncrement={handleOdometerIncrement} />
    </Link>
  );
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
          Let's get started
        </FadeText>
        <FadeText
          as="p"
          className="text-sm sm:text-base text-muted-foreground/70 leading-relaxed max-w-sm mx-auto"
        >
          Unlock wholesale pricing on the industries best{" "}
          <span className="whitespace-nowrap">hair and tools.</span>
        </FadeText>
      </div>

      {/* Trust badges - Marquee with center highlight effect */}
      <MarqueeBadges />

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

      {/* Benefits highlight with animated counters — gated on fontsLoaded to prevent FOUC */}
      <div
        className="flex justify-center gap-6 text-center animate-stagger-3"
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

      {/* Loved by pros - with avatars (mobile/tablet only) — gated on fontsLoaded */}
      <div className="lg:hidden pt-3" style={{ minHeight: "28px" }}>
        {fontsLoaded && <RotatingStylistAvatarsLight />}
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
