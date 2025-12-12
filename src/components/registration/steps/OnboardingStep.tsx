import { useState, useCallback, useRef } from "react";
import { Sparkles, Star, Truck, Gift, Palette, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMagnetic } from "@/hooks/use-magnetic";

interface OnboardingStepProps {
  onContinue: () => void;
}

interface MagneticIconBoxProps {
  icon: React.ElementType;
  title: string;
  subtitle: string;
}

const MagneticIconBox = ({ icon: Icon, title, subtitle }: MagneticIconBoxProps) => {
  const magnetic = useMagnetic({ strength: 0.15 });

  return (
    <div
      ref={magnetic.ref}
      style={magnetic.style}
      onMouseMove={magnetic.onMouseMove}
      onMouseLeave={magnetic.onMouseLeave}
      className="text-center p-4 rounded-xl bg-muted/50"
    >
      <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center mx-auto mb-2 shadow-soft">
        <Icon className="w-5 h-5 text-accent" />
      </div>
      <p className="text-xs font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
};

const slides = [
  {
    title: "Welcome to the Pro Network",
    description: "Join thousands of beauty professionals who save on premium hair extensions and supplies.",
    badge: "Pro Benefits",
    decorative: (
      <div className="grid grid-cols-3 gap-4 opacity-60">
        <div className="w-16 h-20 rounded-lg bg-background/60 shadow-soft" />
        <div className="w-16 h-24 rounded-lg bg-background/80 shadow-soft -mt-4" />
        <div className="w-16 h-20 rounded-lg bg-background/60 shadow-soft" />
      </div>
    ),
    icon: Star,
  },
  {
    title: "Premium Quality Products",
    description: "Access exclusive collections of professional-grade hair extensions and beauty supplies.",
    badge: "Top Quality",
    decorative: (
      <div className="flex gap-3 opacity-60">
        <div className="w-20 h-24 rounded-lg bg-background/70 shadow-soft" />
        <div className="w-20 h-24 rounded-lg bg-background/80 shadow-soft" />
        <div className="w-20 h-24 rounded-lg bg-background/70 shadow-soft" />
      </div>
    ),
    icon: Palette,
  },
  {
    title: "Join Our Community",
    description: "Connect with fellow stylists, share tips, and grow your business with our network.",
    badge: "Community",
    decorative: (
      <div className="flex items-center justify-center gap-2 opacity-60">
        <div className="w-12 h-12 rounded-full bg-background/60 shadow-soft" />
        <div className="w-16 h-16 rounded-full bg-background/80 shadow-soft" />
        <div className="w-12 h-12 rounded-full bg-background/60 shadow-soft" />
      </div>
    ),
    icon: Users,
  },
];

export const OnboardingStep = ({ onContinue }: OnboardingStepProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const goToNextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, []);

  const goToPrevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  }, []);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  // Swipe gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) {
      return;
    }

    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (Math.abs(diff) > minSwipeDistance) {
      if (diff > 0) {
        goToNextSlide();
      } else {
        goToPrevSlide();
      }
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  const slide = slides[currentSlide];
  const SlideIcon = slide.icon;

  return (
    <div className="animate-fade-in">
      {/* Hero carousel */}
      <div 
        className="group relative h-48 md:h-56 rounded-2xl bg-gradient-to-br from-accent/30 via-muted to-accent/20 mb-8 overflow-hidden touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Decorative elements with slide transition */}
        <div 
          key={currentSlide}
          className="absolute inset-0 flex items-center justify-center animate-slide-in-right"
        >
          {slide.decorative}
          
          {/* Sparkle decorations */}
          <Sparkles className="absolute top-6 right-8 w-6 h-6 text-accent" />
          <Sparkles className="absolute bottom-8 left-10 w-4 h-4 text-accent/60" />
          
          {/* Floating badge */}
          <div className="absolute bottom-12 right-4 bg-background rounded-full px-3 py-1.5 shadow-card flex items-center gap-1.5">
            <SlideIcon className="w-4 h-4 text-accent fill-accent" />
            <span className="text-xs font-medium">{slide.badge}</span>
          </div>
        </div>

        {/* Chevron navigation - visible on hover */}
        <button
          onClick={goToPrevSlide}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-5 h-5 text-foreground/60" />
        </button>
        <button
          onClick={goToNextSlide}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          aria-label="Next slide"
        >
          <ChevronRight className="w-5 h-5 text-foreground/60" />
        </button>

        {/* Dot indicators - stays fixed */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 z-10">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                "flex-1 h-1 rounded-full transition-all duration-300",
                index <= currentSlide
                  ? "bg-foreground"
                  : "bg-background/40"
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Content with rising fade transition */}
      <div key={`content-${currentSlide}`} className="text-center mb-8 animate-rise-fade-in">
        <h1 className="text-2xl md:text-3xl font-semibold text-foreground mb-3">
          {slide.title}
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          {slide.description}
        </p>
      </div>

      {/* Feature highlights */}
      <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
        <MagneticIconBox icon={Gift} title="Rewards" subtitle="On every order" />
        <MagneticIconBox icon={Truck} title="Free Shipping" subtitle="2-day delivery" />
        <MagneticIconBox icon={Star} title="Wholesale" subtitle="Pro pricing" />
      </div>
    </div>
  );
};
