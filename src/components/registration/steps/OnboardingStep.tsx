import { useState, useCallback, useRef } from "react";
import { Sparkles, Star, Truck, Gift, Zap, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingStepProps {
  onContinue: () => void;
}

const slides = [
  {
    title: "Welcome to Pro",
    subtitle: "Join the network",
    description: "Exclusive access to premium hair extensions and professional supplies at wholesale prices.",
    stats: [
      { value: "10K+", label: "Stylists" },
      { value: "48hr", label: "Delivery" },
      { value: "30%", label: "Savings" },
    ],
  },
  {
    title: "Premium Quality",
    subtitle: "Curated selection",
    description: "Professional-grade products sourced from top manufacturers worldwide.",
    stats: [
      { value: "500+", label: "Products" },
      { value: "100%", label: "Authentic" },
      { value: "5★", label: "Rated" },
    ],
  },
  {
    title: "Grow Together",
    subtitle: "Community first",
    description: "Connect with fellow professionals, share tips, and scale your business.",
    stats: [
      { value: "24/7", label: "Support" },
      { value: "Free", label: "Training" },
      { value: "VIP", label: "Events" },
    ],
  },
];

const features = [
  { icon: Gift, label: "Rewards", desc: "Every order" },
  { icon: Truck, label: "Free Ship", desc: "2-day express" },
  { icon: Star, label: "Pro Pricing", desc: "Wholesale rates" },
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

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      diff > 0 ? goToNextSlide() : goToPrevSlide();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const slide = slides[currentSlide];

  return (
    <div className="animate-fade-in space-y-6">
      {/* Hero Section - Bento Style */}
      <div
        className="group relative overflow-hidden rounded-2xl bg-foreground p-6 md:p-8 touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="h-full w-full" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }} />
        </div>

        {/* Content */}
        <div key={currentSlide} className="relative z-10 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/10 text-background text-xs font-medium tracking-wide">
              <Zap className="w-3 h-3" />
              {slide.subtitle}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-semibold text-background tracking-tight mb-3">
            {slide.title}
          </h1>

          <p className="text-background/70 text-sm md:text-base max-w-sm leading-relaxed mb-8">
            {slide.description}
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            {slide.stats.map((stat, i) => (
              <div
                key={i}
                className="bg-background/5 backdrop-blur-sm rounded-xl p-3 text-center border border-background/10"
              >
                <div className="text-xl md:text-2xl font-semibold text-background tracking-tight">
                  {stat.value}
                </div>
                <div className="text-xs text-background/50 uppercase tracking-wider mt-0.5">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={goToPrevSlide}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-background/10 opacity-0 group-hover:opacity-100 transition-all hover:bg-background/20"
          aria-label="Previous"
        >
          <ChevronLeft className="w-4 h-4 text-background" />
        </button>
        <button
          onClick={goToNextSlide}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-background/10 opacity-0 group-hover:opacity-100 transition-all hover:bg-background/20"
          aria-label="Next"
        >
          <ChevronRight className="w-4 h-4 text-background" />
        </button>

        {/* Progress Dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === currentSlide ? "w-6 bg-background" : "w-1.5 bg-background/30"
              )}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>

        {/* Decorative blur */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-background/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-background/5 rounded-full blur-2xl" />
      </div>

      {/* Features - Minimal Bento Grid */}
      <div className="grid grid-cols-3 gap-2">
        {features.map((feature, i) => (
          <div
            key={i}
            className="group/card relative p-4 rounded-xl bg-muted/50 border border-border/50 hover:border-border hover:bg-muted transition-all duration-200"
          >
            <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center mb-3">
              <feature.icon className="w-4 h-4 text-background" />
            </div>
            <div className="text-sm font-medium text-foreground">{feature.label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{feature.desc}</div>
          </div>
        ))}
      </div>

      {/* Sparkle accent */}
      <div className="flex items-center justify-center gap-2 text-muted-foreground">
        <Sparkles className="w-3.5 h-3.5" />
        <span className="text-xs tracking-wide">Trusted by professionals worldwide</span>
      </div>
    </div>
  );
};
