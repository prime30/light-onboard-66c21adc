import { useState, useRef, useEffect } from "react";
import { Users, Check, GraduationCap, Tag, Truck, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const badges = [
  { icon: Users, label: "Community app" },
  { icon: Check, label: "Exclusively professional" },
  { icon: GraduationCap, label: "Advanced education" },
  { icon: Tag, label: "Wholesale pricing" },
  { icon: Truck, label: "Fast shipping" },
  { icon: ShieldCheck, label: "Highest standard of ethics" },
  { icon: Sparkles, label: "Made to create" },
];

interface BadgeItemProps {
  badge: (typeof badges)[0];
  badgeKey: string;
  intensity: number;
}

const BadgeItem = ({ badge, badgeKey, intensity }: BadgeItemProps) => {
  const Icon = badge.icon;
  const grayscaleAmount = 1 - intensity;

  return (
    <div
      data-badge={badgeKey}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-green-500/10 border-green-500/30"
      style={{
        filter: `grayscale(${grayscaleAmount})`,
        opacity: 0.5 + intensity * 0.5,
        transition: "filter 0.2s ease-out, opacity 0.2s ease-out",
      }}
    >
      <Icon className="w-3 h-3 flex-shrink-0 text-green-600" />
      <span className="text-[11px] whitespace-nowrap text-green-700 font-medium">
        {badge.label}
      </span>
    </div>
  );
};

export const MarqueeBadges = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [badgeIntensities, setBadgeIntensities] = useState<Record<string, number>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [isCoasting, setIsCoasting] = useState(false);
  const dragState = useRef({
    startX: 0,
    scrollLeft: 0,
    lastX: 0,
    lastTime: 0,
    velocity: 0,
  });
  const momentumRef = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animationId: number;
    const checkPositions = () => {
      const containerRect = container.getBoundingClientRect();
      const centerX = containerRect.left + containerRect.width / 2;
      const maxDistance = 120;

      const badgeElements = container.querySelectorAll("[data-badge]");
      const newIntensities: Record<string, number> = {};

      badgeElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const badgeCenterX = rect.left + rect.width / 2;
        const distance = Math.abs(badgeCenterX - centerX);
        const key = el.getAttribute("data-badge") || "";
        newIntensities[key] = Math.max(0, 1 - distance / maxDistance);
      });

      setBadgeIntensities(newIntensities);
      animationId = requestAnimationFrame(checkPositions);
    };

    checkPositions();
    return () => cancelAnimationFrame(animationId);
  }, []);

  const getCurrentTranslateX = () => {
    if (!trackRef.current) return 0;
    const transform = window.getComputedStyle(trackRef.current).transform;
    if (transform === "none") return 0;
    const matrix = new DOMMatrix(transform);
    return matrix.m41;
  };

  const startMomentum = () => {
    const friction = 0.95;
    const minVelocity = 0.5;
    const lastDirection = Math.sign(dragState.current.velocity);

    const animate = () => {
      if (!trackRef.current) return;

      dragState.current.velocity *= friction;

      if (Math.abs(dragState.current.velocity) < minVelocity) {
        const bounceDistance = lastDirection * -3;
        const currentX = getCurrentTranslateX();
        trackRef.current.style.transition = "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)";
        trackRef.current.style.transform = `translateX(${currentX + bounceDistance}px)`;

        setTimeout(() => {
          if (trackRef.current) {
            trackRef.current.style.transition = "";
          }
          setIsCoasting(false);
          momentumRef.current = null;
        }, 300);
        return;
      }

      const currentX = getCurrentTranslateX();
      trackRef.current.style.transform = `translateX(${currentX + dragState.current.velocity}px)`;

      momentumRef.current = requestAnimationFrame(animate);
    };

    setIsCoasting(true);
    animate();
  };

  const handleDragStart = (pageX: number) => {
    if (!trackRef.current) return;
    if (momentumRef.current) {
      cancelAnimationFrame(momentumRef.current);
      momentumRef.current = null;
    }
    setIsDragging(true);
    setIsCoasting(false);
    dragState.current = {
      startX: pageX,
      scrollLeft: getCurrentTranslateX(),
      lastX: pageX,
      lastTime: Date.now(),
      velocity: 0,
    };
  };

  const handleDragMove = (pageX: number) => {
    if (!isDragging || !trackRef.current) return;

    const now = Date.now();
    const dt = now - dragState.current.lastTime;

    if (dt > 0) {
      const dx = pageX - dragState.current.lastX;
      dragState.current.velocity = (dx / dt) * 16;
    }

    dragState.current.lastX = pageX;
    dragState.current.lastTime = now;

    const walk = pageX - dragState.current.startX;
    trackRef.current.style.transform = `translateX(${dragState.current.scrollLeft + walk}px)`;
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (Math.abs(dragState.current.velocity) > 1) {
      startMomentum();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.pageX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    handleDragMove(e.pageX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].pageX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleDragMove(e.touches[0].pageX);
  };

  const isAnimating = !isDragging && !isCoasting;

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden select-none mt-[3px] lg:mt-0"
      style={{
        maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
        cursor: isDragging ? "grabbing" : "grab",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleDragEnd}
      onMouseLeave={handleDragEnd}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleDragEnd}
    >
      <div ref={trackRef} className={cn("flex", isAnimating && "animate-marquee-seamless-long")}>
        {[0, 1, 2, 3].map((setIndex) => (
          <div key={setIndex} className="flex items-center gap-3 shrink-0 pr-3">
            {badges.map((badge, i) => (
              <BadgeItem
                key={`${setIndex}-${i}`}
                badge={badge}
                badgeKey={`${setIndex}-${i}`}
                intensity={badgeIntensities[`${setIndex}-${i}`] || 0}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
