import { Sparkles, Star, Truck, Gift } from "lucide-react";

interface OnboardingStepProps {
  onContinue: () => void;
}

export const OnboardingStep = ({ onContinue }: OnboardingStepProps) => {
  return (
    <div className="animate-fade-in">
      {/* Hero image placeholder */}
      <div className="relative h-48 md:h-56 rounded-2xl bg-gradient-to-br from-accent/30 via-muted to-accent/20 mb-8 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="grid grid-cols-3 gap-4 opacity-60">
            <div className="w-16 h-20 rounded-lg bg-background/60 shadow-soft" />
            <div className="w-16 h-24 rounded-lg bg-background/80 shadow-soft -mt-4" />
            <div className="w-16 h-20 rounded-lg bg-background/60 shadow-soft" />
          </div>
        </div>
        
        {/* Sparkle decorations */}
        <Sparkles className="absolute top-6 right-8 w-6 h-6 text-accent" />
        <Sparkles className="absolute bottom-8 left-10 w-4 h-4 text-accent/60" />
        
        {/* Floating badge */}
        <div className="absolute bottom-4 right-4 bg-background rounded-full px-3 py-1.5 shadow-card flex items-center gap-1.5">
          <Star className="w-4 h-4 text-accent fill-accent" />
          <span className="text-xs font-medium">Pro Benefits</span>
        </div>
      </div>

      {/* Content */}
      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold text-foreground mb-3">
          Welcome to the Pro Network
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Join thousands of beauty professionals who save on premium hair extensions and supplies.
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
