import { useState, useRef } from "react";
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

export const RotatingStylistAvatarsLight = () => {
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
      <span className="text-xs text-muted-foreground whitespace-nowrap">1,500+ pros</span>
    </Link>
  );
};

export default RotatingStylistAvatarsLight;
