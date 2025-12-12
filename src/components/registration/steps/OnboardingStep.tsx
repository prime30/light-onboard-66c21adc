import { useState } from "react";
import { Sparkles, Star, Truck, Gift, Palette, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingStepProps {
  onContinue: () => void;
}

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

  const slide = slides[currentSlide];
  const SlideIcon = slide.icon;

  return (
    <div className="animate-fade-in">
      {/* Hero carousel */}
      <div className="relative h-48 md:h-56 rounded-2xl bg-gradient-to-br from-accent/30 via-muted to-accent/20 mb-4 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-300">
          {slide.decorative}
        </div>
        
        {/* Sparkle decorations */}
        <Sparkles className="absolute top-6 right-8 w-6 h-6 text-accent" />
        <Sparkles className="absolute bottom-8 left-10 w-4 h-4 text-accent/60" />
        
        {/* Floating badge */}
        <div className="absolute bottom-4 right-4 bg-background rounded-full px-3 py-1.5 shadow-card flex items-center gap-1.5">
          <SlideIcon className="w-4 h-4 text-accent fill-accent" />
          <span className="text-xs font-medium">{slide.badge}</span>
        </div>
      </div>

      {/* Dot navigation */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              index === currentSlide
                ? "w-6 bg-foreground"
                : "w-2 bg-border hover:bg-muted-foreground/50"
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold text-foreground mb-3 transition-all duration-300">
          {slide.title}
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto transition-all duration-300">
          {slide.description}
        </p>
      </div>

      {/* Feature highlights */}
      <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
        <div className="text-center p-4 rounded-xl bg-muted/50">
          <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center mx-auto mb-2 shadow-soft">
            <Gift className="w-5 h-5 text-accent" />
          </div>
          <p className="text-xs font-medium text-foreground">Rewards</p>
          <p className="text-xs text-muted-foreground">On every order</p>
        </div>
        
        <div className="text-center p-4 rounded-xl bg-muted/50">
          <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center mx-auto mb-2 shadow-soft">
            <Truck className="w-5 h-5 text-accent" />
          </div>
          <p className="text-xs font-medium text-foreground">Free Shipping</p>
          <p className="text-xs text-muted-foreground">2-day delivery</p>
        </div>
        
        <div className="text-center p-4 rounded-xl bg-muted/50">
          <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center mx-auto mb-2 shadow-soft">
            <Star className="w-5 h-5 text-accent" />
          </div>
          <p className="text-xs font-medium text-foreground">Wholesale</p>
          <p className="text-xs text-muted-foreground">Pro pricing</p>
        </div>
      </div>
    </div>
  );
};
