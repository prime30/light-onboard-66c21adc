import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { useMagnetic } from "@/hooks/use-magnetic";
import stylistPink1 from "@/assets/avatars/stylist-pink-1.jpg";
import stylistPurple1 from "@/assets/avatars/stylist-purple-1.jpg";
import stylistBlue1 from "@/assets/avatars/stylist-blue-1.jpg";
import stylistOmbre1 from "@/assets/avatars/stylist-ombre-1.jpg";
import stylistTeal1 from "@/assets/avatars/stylist-teal-1.jpg";
import stylistLavender1 from "@/assets/avatars/stylist-lavender-1.jpg";
import stylistMagenta1 from "@/assets/avatars/stylist-magenta-1.jpg";
import stylistElectric1 from "@/assets/avatars/stylist-electric-1.jpg";

// Calculate dynamic starting number based on months elapsed
const getOdometerBaseNumber = () => {
  const baseDate = new Date(2025, 11, 1);
  const baseNumber = 8340;
  const now = new Date();

  const monthsElapsed =
    (now.getFullYear() - baseDate.getFullYear()) * 12 + (now.getMonth() - baseDate.getMonth());

  if (monthsElapsed <= 0) return baseNumber;

  let total = baseNumber;
  for (let i = 1; i <= monthsElapsed; i++) {
    const monthIndex = (baseDate.getMonth() + i) % 12;
    const monthNumber = monthIndex + 1;
    total += monthNumber % 2 === 1 ? 122 : 123;
  }

  return total;
};

export const OdometerCounter = ({
  variant = "light",
  onIncrement,
}: {
  variant?: "light" | "dark";
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
  const textColor = variant === "dark" ? "text-background/50" : "text-muted-foreground";

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
          top: "-0.08em",
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
          top: "-0.08em",
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

// Stylist avatars for rotating components
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

export const RotatingStylistAvatars = () => {
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
  const reactionEmojis = ["💇", "✨", "💕", "🔥", "⭐", "💖", "👏", "🙌", "💯", "🤩", "😍"];

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
      className="flex items-center gap-2.5 transition-all duration-200 cursor-pointer group"
    >
      <span className="text-xs text-background/40 hidden lg:inline transition-opacity duration-200 group-hover:opacity-70">
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
                "w-5 h-5 rounded-full border-2 border-foreground object-cover transition-all duration-300",
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
      <OdometerCounter variant="dark" onIncrement={handleOdometerIncrement} />
    </Link>
  );
};
