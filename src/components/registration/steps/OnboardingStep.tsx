import { useState, useCallback, useRef, useEffect } from "react";
import { Sparkles, Star, Truck, Gift, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMagnetic } from "@/hooks/use-magnetic";

interface FeatureBoxProps {
  icon: React.ElementType;
  label: string;
  desc: string;
}

const MagneticFeatureBox = ({ icon: Icon, label, desc }: FeatureBoxProps) => {
  const magnetic = useMagnetic({ strength: 0.12 });

  return (
    <div
      ref={magnetic.ref}
      style={magnetic.style}
      onMouseMove={magnetic.onMouseMove}
      onMouseLeave={magnetic.onMouseLeave}
      className="group/pill relative flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/40 border border-border/40 hover:border-border/60 hover:bg-muted/60 transition-all duration-300 cursor-default w-full sm:w-auto overflow-hidden hover:-translate-y-0.5 hover:shadow-md hover:shadow-foreground/[0.03]"
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/[0.01] to-transparent opacity-0 group-hover/pill:opacity-100 transition-opacity duration-500" />
      
      <div className="relative w-8 h-8 rounded-lg bg-muted border border-border/60 flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover/pill:scale-105">
        <Icon className="w-4 h-4 text-foreground/60 transition-transform duration-300 group-hover/pill:scale-110" />
      </div>
      <div className="relative flex flex-col">
        <span className="text-sm font-medium text-foreground transition-colors duration-300 group-hover/pill:text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground transition-colors duration-300 group-hover/pill:text-muted-foreground/80">{desc}</span>
      </div>
      
      {/* Shine effect on hover */}
      <div className="absolute inset-0 -translate-x-full group-hover/pill:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-foreground/5 to-transparent skew-x-12" />
    </div>
  );
};

interface OnboardingStepProps {
  onContinue: () => void;
}

const slides = [
  {
    eyebrow: "Welcome",
    title: "Join the",
    highlight: "Pro Network",
    description: "Exclusive wholesale access for beauty professionals",
    gradient: "from-neutral-900 via-neutral-800 to-neutral-900",
  },
  {
    eyebrow: "Quality",
    title: "Premium",
    highlight: "Products",
    description: "Curated professional-grade extensions & supplies",
    gradient: "from-neutral-800 via-neutral-900 to-neutral-800",
  },
  {
    eyebrow: "Community",
    title: "Grow",
    highlight: "Together",
    description: "Connect, learn, and scale with fellow pros",
    gradient: "from-neutral-900 via-neutral-800 to-neutral-900",
  },
];

const stats = [
  { value: 10, suffix: "K+", label: "Stylists" },
  { value: 30, suffix: "%", label: "Savings" },
  { value: 48, suffix: "hr", label: "Delivery" },
];

const features = [
  { icon: Gift, label: "Rewards", desc: "On every order" },
  { icon: Truck, label: "Free Shipping", desc: "2-day delivery on $250+" },
  { icon: Star, label: "Wholesale", desc: "Pro pricing" },
];

const AnimatedNumber = ({ value, suffix }: { value: number; suffix: string }) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const duration = 1500;
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Linear interpolation - no easing
      const currentValue = Math.floor(progress * value);
      setCount(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(value);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value]);
  
  return <span>{count}{suffix}</span>;
};

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
    <div className="animate-fade-in space-y-4">
      {/* Hero Section */}
      <div
        className="group relative overflow-hidden rounded-3xl bg-foreground h-[320px] md:h-[360px] touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Animated mesh gradient background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-foreground via-foreground/95 to-foreground" />
          
          {/* Animated gradient orbs */}
          <div 
            className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full blur-[100px] animate-pulse"
            style={{ 
              background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
              animationDuration: '4s'
            }}
          />
          <div 
            className="absolute bottom-0 left-0 w-[250px] h-[250px] rounded-full blur-[80px] animate-pulse"
            style={{ 
              background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)',
              animationDuration: '5s',
              animationDelay: '1s'
            }}
          />
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[120px] animate-pulse"
            style={{ 
              background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 60%)',
              animationDuration: '6s',
              animationDelay: '2s'
            }}
          />
          
          {/* Noise texture overlay */}
          <div 
            className="absolute inset-0 opacity-[0.15]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />
        </div>

        {/* Floating decorative elements */}
        <div className="absolute top-8 right-8 flex gap-2">
          <div className="w-2 h-2 rounded-full bg-background/20 animate-pulse" style={{ animationDelay: '0s' }} />
          <div className="w-2 h-2 rounded-full bg-background/30 animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="w-2 h-2 rounded-full bg-background/20 animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-between p-6 md:p-8">
          <div key={currentSlide} className="animate-fade-in">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/10 backdrop-blur-sm border border-background/10 mb-6">
              <Sparkles className="w-3 h-3 text-background/80" />
              <span className="text-xs font-medium text-background/80 uppercase tracking-widest">
                {slide.eyebrow}
              </span>
            </div>

            {/* Large Typography */}
            <div className="space-y-1 mb-4">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-light text-background/60 tracking-tight leading-none">
                {slide.title}
              </h2>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-background tracking-tight leading-none">
                {slide.highlight}
              </h1>
            </div>

            <p className="text-sm md:text-base text-background/50 md:whitespace-nowrap">
              {slide.description}
            </p>
          </div>

          {/* Stats Row */}
          <div className="flex items-end justify-between mt-8">
            <div className="flex gap-6">
              {stats.map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl md:text-3xl font-semibold text-background tracking-tight">
                    <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-[10px] text-background/40 uppercase tracking-wider mt-1">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Arrow */}
            <button 
              onClick={onContinue}
              className="group/btn flex items-center justify-center w-12 h-12 rounded-full bg-background text-foreground hover:scale-105 transition-transform"
            >
              <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <button
          onClick={goToPrevSlide}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-background/5 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-background/10 border border-background/10"
          aria-label="Previous"
        >
          <ChevronLeft className="w-4 h-4 text-background/70" />
        </button>
        <button
          onClick={goToNextSlide}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-background/5 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-background/10 border border-background/10"
          aria-label="Next"
        >
          <ChevronRight className="w-4 h-4 text-background/70" />
        </button>

        {/* Progress Line */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-background/10">
          <div 
            className="h-full bg-background/60 transition-all duration-500"
            style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Feature Pills */}
      <div className="flex flex-col sm:flex-row items-stretch justify-center gap-2 w-full">
        {features.map((feature, i) => (
          <MagneticFeatureBox
            key={i}
            icon={feature.icon}
            label={feature.label}
            desc={feature.desc}
          />
        ))}
      </div>

      {/* Trust Badge */}
      <div className="flex items-center justify-center gap-3 pt-2">
        <div className="flex -space-x-2">
          {[...Array(4)].map((_, i) => (
            <div 
              key={i} 
              className="w-6 h-6 rounded-full bg-muted border-2 border-background"
              style={{ 
                background: `linear-gradient(135deg, hsl(0 0% ${85 - i * 5}%) 0%, hsl(0 0% ${75 - i * 5}%) 100%)`
              }}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          Trusted by <span className="text-foreground font-medium">10,000+</span> professionals
        </span>
      </div>
    </div>
  );
};
