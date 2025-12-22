import { Check, Sparkles, ShoppingBag, Heart, Percent, Truck, Gift } from "lucide-react";

const benefits = [
  {
    icon: Percent,
    title: "Wholesale Pricing",
    description: "Up to 50% off retail prices",
  },
  {
    icon: Gift,
    title: "Rewards on Every Order",
    description: "Earn points toward free products",
  },
  {
    icon: Truck,
    title: "Free 2-Day Shipping",
    description: "On orders over $250",
  },
];

export const SuccessStep = () => {
  return (
    <div className="animate-fade-in text-center max-w-md mx-auto py-8">
      {/* Visual celebration area */}
      <div className="relative h-40 mb-8">
        {/* Background decoration */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-accent/20 to-muted opacity-60" />
        </div>

        {/* Success icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-foreground flex items-center justify-center shadow-elevated">
            <Check className="w-10 h-10 text-card" strokeWidth={2.5} />
          </div>
        </div>

        {/* Floating decorations */}
        <div
          className="absolute top-4 left-1/4 w-10 h-10 rounded-lg bg-background shadow-soft flex items-center justify-center animate-fade-in"
          style={{ animationDelay: "0.2s" }}
        >
          <ShoppingBag className="w-5 h-5 text-accent" />
        </div>
        <div
          className="absolute top-8 right-1/4 w-8 h-8 rounded-full bg-background shadow-soft flex items-center justify-center animate-fade-in"
          style={{ animationDelay: "0.4s" }}
        >
          <Heart className="w-4 h-4 text-accent" />
        </div>
        <div
          className="absolute bottom-4 right-1/3 w-6 h-6 rounded-full bg-background shadow-soft flex items-center justify-center animate-fade-in"
          style={{ animationDelay: "0.6s" }}
        >
          <Sparkles className="w-3 h-3 text-accent" />
        </div>
      </div>

      <h1 className="text-2xl md:text-3xl font-semibold text-foreground mb-3">You're all set!</h1>

      <p className="text-muted-foreground leading-relaxed mb-8">
        Your account has been created successfully. You can now start shopping with your
        professional perks.
      </p>

      {/* Benefits Summary Card */}
      <div className="p-5 rounded-lg bg-gradient-to-br from-muted to-accent/10 border border-border mb-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
          Your Pro Benefits
        </p>
        <div className="space-y-3">
          {benefits.map((benefit, index) => (
            <div
              key={benefit.title}
              className="flex items-center gap-3 text-left animate-fade-in"
              style={{ animationDelay: `${0.3 + index * 0.1}s` }}
            >
              <div className="w-9 h-9 rounded-lg bg-background shadow-soft flex items-center justify-center shrink-0">
                <benefit.icon className="w-4 h-4 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{benefit.title}</p>
                <p className="text-xs text-muted-foreground">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Visual card preview */}
      <div className="p-5 rounded-lg bg-gradient-to-br from-muted to-accent/10 border border-border">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-background shadow-soft flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-accent" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">Pro Member</p>
            <p className="text-xs text-muted-foreground">Confirmation email sent to your inbox</p>
          </div>
        </div>
      </div>
    </div>
  );
};
