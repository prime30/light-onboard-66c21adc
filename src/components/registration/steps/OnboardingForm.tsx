import { useState, useCallback, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { User, FileCheck, Mail, ArrowUpRight, Users, Check, GraduationCap, Tag, Truck, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMagnetic } from "@/hooks/use-magnetic";
import { useFontLoaded, TextSkeleton } from "@/hooks/use-font-loaded";

// Stylist avatars
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

// Calculate dynamic starting number based on months elapsed
const getOdometerBaseNumber = () => {
  const baseDate = new Date(2025, 11, 1);
  const baseNumber = 8340;
  const now = new Date();
  const monthsDiff = (now.getFullYear() - baseDate.getFullYear()) * 12 + (now.getMonth() - baseDate.getMonth());
  
  if (monthsDiff <= 0) return baseNumber;
  
  let total = baseNumber;
  for (let i = 1; i <= monthsDiff; i++) {
    total += (i % 2 === 1) ? 122 : 123;
  }
  return total;
};

// Odometer Counter Component - matches desktop hero style
const OdometerCounter = ({ 
  variant = "light",
  onIncrement
}: { 
  variant?: "dark" | "light";
  onIncrement?: () => void;
}) => {
  const baseNumber = getOdometerBaseNumber();
  const basePrefix = Math.floor(baseNumber / 100);
  const formattedPrefix = basePrefix >= 100 
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
          setTens(prev => (prev + tensIncrement) % 10);
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
    <span className={cn(
      "text-xs tabular-nums transition-all duration-300",
      textColor,
      isBurst && "!text-[hsl(142,71%,45%)]"
    )}>
      {formattedPrefix}<span 
        className="inline-block overflow-hidden"
        style={{ 
          height: '1em', 
          width: '0.6em',
          verticalAlign: 'text-bottom',
          position: 'relative',
          top: '-0.08em'
        }}
      >
        <span 
          className={isTensRolling ? "block transition-transform duration-300 ease-out" : "block transition-none"}
          style={{ transform: isTensRolling ? 'translateY(-50%)' : 'translateY(0)' }}
        >
          <span className="block" style={{ height: '1em', lineHeight: '1em' }}>{isTensRolling ? prevTens : tens}</span>
          <span className="block" style={{ height: '1em', lineHeight: '1em' }}>{tens}</span>
        </span>
      </span><span 
        className={cn(
          "inline-block overflow-hidden transition-all duration-300",
          isBurst && "drop-shadow-[0_0_6px_hsl(142,71%,45%)]"
        )}
        style={{ 
          height: '1em', 
          width: '0.6em',
          verticalAlign: 'text-bottom',
          position: 'relative',
          top: '-0.08em'
        }}
      >
        <span 
          className={isRolling ? "block transition-transform duration-300 ease-out" : "block transition-none"}
          style={{ transform: isRolling ? 'translateY(-50%)' : 'translateY(0)' }}
        >
          <span className="block" style={{ height: '1em', lineHeight: '1em' }}>{isRolling ? prevOnes : ones}</span>
          <span className="block" style={{ height: '1em', lineHeight: '1em' }}>{ones}</span>
        </span>
      </span> pros
    </span>
  );
};

// Animated Number Component
const AnimatedNumber = ({
  value,
  suffix,
  delay = 0,
  totalDuration = 2600
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
  return <span>{count}{suffix}</span>;
};

// Animated Product Count Component
const AnimatedProductCount = ({
  delay = 0,
  totalDuration = 2600
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
        const index = Math.max(0, Math.min(Math.floor(easedProgress * sequence.length), sequence.length - 1));
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

// Marquee Badges Component
const MarqueeBadges = () => {
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

  const badges = [
    { icon: Users, label: "Community app" },
    { icon: Check, label: "Exclusively professional" },
    { icon: GraduationCap, label: "Advanced education" },
    { icon: Tag, label: "Wholesale pricing" },
    { icon: Truck, label: "Fast shipping" },
    { icon: ShieldCheck, label: "Highest standard of ethics" },
    { icon: Sparkles, label: "Made to create" },
  ];

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animationId: number;
    const checkPositions = () => {
      const containerRect = container.getBoundingClientRect();
      const centerX = containerRect.left + containerRect.width / 2;
      const maxDistance = 120;

      const badgeElements = container.querySelectorAll('[data-badge]');
      const newIntensities: Record<string, number> = {};

      badgeElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const badgeCenterX = rect.left + rect.width / 2;
        const distance = Math.abs(badgeCenterX - centerX);
        const key = el.getAttribute('data-badge') || '';
        newIntensities[key] = Math.max(0, 1 - (distance / maxDistance));
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
    if (transform === 'none') return 0;
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
        trackRef.current.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
        trackRef.current.style.transform = `translateX(${currentX + bounceDistance}px)`;
        
        setTimeout(() => {
          if (trackRef.current) {
            trackRef.current.style.transition = '';
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
      dragState.current.velocity = dx / dt * 16;
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

  const BadgeItem = ({ badge, badgeKey }: { badge: typeof badges[0], badgeKey: string }) => {
    const intensity = badgeIntensities[badgeKey] || 0;
    const Icon = badge.icon;
    const grayscaleAmount = 1 - intensity;
    
    return (
      <div 
        data-badge={badgeKey}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-green-500/10 border-green-500/30"
        style={{
          filter: `grayscale(${grayscaleAmount})`,
          opacity: 0.5 + intensity * 0.5,
          transition: 'filter 0.2s ease-out, opacity 0.2s ease-out',
        }}
      >
        <Icon className="w-3 h-3 flex-shrink-0 text-green-600" />
        <span className="text-[11px] whitespace-nowrap text-green-700 font-medium">
          {badge.label}
        </span>
      </div>
    );
  };

  const isAnimating = !isDragging && !isCoasting;

  return (
    <div 
      ref={containerRef}
      className="relative w-full overflow-hidden select-none mt-[3px] lg:mt-0"
      style={{ 
        maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)', 
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleDragEnd}
      onMouseLeave={handleDragEnd}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleDragEnd}
    >
      <div 
        ref={trackRef}
        className={cn("flex", isAnimating && "animate-marquee-seamless-long")}
      >
        {[0, 1, 2, 3].map((setIndex) => (
          <div key={setIndex} className="flex items-center gap-3 shrink-0 pr-3">
            {badges.map((badge, i) => (
              <BadgeItem key={`${setIndex}-${i}`} badge={badge} badgeKey={`${setIndex}-${i}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
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
      id: emojiIdRef.current
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
      <span className="text-xs text-muted-foreground transition-opacity duration-200 group-hover:opacity-70">Loved by</span>
      <div className="flex -space-x-[5px]">
        {visibleIndices.map((avatarIndex, i) => (
          <div key={`${i}-${avatarIndex}`} className="relative hover:z-10 transition-transform duration-200 hover:scale-125">
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
  onContinue: () => void;
  onSignIn: () => void;
  onStepClick?: () => void;
  fontsLoaded?: boolean;
}

export const OnboardingForm = ({
  onContinue,
  onSignIn,
  onStepClick,
  fontsLoaded = true
}: OnboardingFormProps) => {
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setHasScrolled(true);
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="space-y-3 lg:space-y-8">

      {/* Hero section - desktop only (mobile shows in hero banner) */}
      <div className="hidden lg:block text-center space-y-3 animate-stagger-1">
        <h1 className="font-termina font-medium uppercase text-2xl sm:text-3xl md:text-4xl text-foreground leading-[1.1] text-balance">
          {fontsLoaded ? <span className="animate-fade-in-text">Let's get started</span> : <TextSkeleton width="75%" height="1.1em" className="mx-auto" />}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground/70 leading-relaxed max-w-sm mx-auto">
          {fontsLoaded ? (
            <span className="animate-fade-in-text">Unlock wholesale pricing on the industries best{" "}<span className="whitespace-nowrap">hair and tools.</span></span>
          ) : (
            <TextSkeleton width="85%" height="1em" className="mx-auto" />
          )}
        </p>
      </div>

      {/* Trust badges - Marquee with center highlight effect */}
      <MarqueeBadges />

      {/* Steps preview */}
      <div className="grid gap-3">
        {[{
        icon: User,
        label: "Tell us who you are"
      }, {
        icon: FileCheck,
        label: "Provide your license number"
      }, {
        icon: Mail,
        label: "Follow post-approval instructions to finalize account"
      }].map((item, i) => <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-muted border border-border/50 text-left opacity-0 animate-step-card-enter" style={{
        animationDelay: `${400 + i * 150}ms`,
        animationFillMode: 'forwards'
      }}>
              <div className="relative w-12 h-12 rounded-xl bg-muted border border-border/60 flex items-center justify-center flex-shrink-0">
                <item.icon className="w-5 h-5 text-foreground/70" />
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-foreground flex items-center justify-center">
                  <span className="text-[9px] font-semibold text-background">{i + 1}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground/80">{item.label}</p>
              </div>
            </div>)}
      </div>

      {/* Benefits highlight with animated counters */}
      <div className="flex justify-center gap-6 pt-4 text-center animate-stagger-3">
        <div>
          <div className="text-2xl font-semibold text-foreground">
            <AnimatedNumber value={50} suffix="%" delay={200} />
          </div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg. Savings</div>
        </div>
        <div className="w-px bg-border" />
        <div>
          <div className="text-2xl font-semibold text-foreground">
            <AnimatedNumber value={24} suffix="hr" delay={400} />
          </div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Approval</div>
        </div>
        <div className="w-px bg-border" />
        <div>
          <div className="text-2xl font-semibold text-foreground">
            <AnimatedProductCount delay={600} />
          </div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Products</div>
        </div>
      </div>

      {/* Loved by pros - with avatars (mobile/tablet only) */}
      <div className="lg:hidden pt-3">
        <RotatingStylistAvatarsLight />
      </div>

      <p className="text-xs text-muted-foreground text-center pt-2">
        Already have an account?{" "}
      <button onClick={onSignIn} className="inline-flex items-center gap-1 text-foreground font-medium underline underline-offset-2 hover:text-foreground/80 transition-all duration-200 group">
          Login
          <ArrowUpRight className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
      </p>
    </div>
  );
};
