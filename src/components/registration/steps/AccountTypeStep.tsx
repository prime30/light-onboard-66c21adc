import { AccountTypeCard } from "../AccountTypeCard";
import { Scissors, Building2, GraduationCap, Sparkles } from "lucide-react";

interface AccountTypeStepProps {
  selectedType: string | null;
  onSelect: (type: string) => void;
}

const accountTypes = [
  {
    id: "stylist",
    title: "Stylist",
    badge: "Pro",
    description: "For licensed cosmetologists who purchase hair for their clientele.",
    features: ["Rewards on every order", "Free 2-day shipping", "Wholesale pricing"],
    icon: Scissors,
  },
  {
    id: "salon",
    title: "Salon Manager",
    badge: "Pro",
    description: "For salon owners who purchase hair for multiple stylists.",
    features: ["1.25x rewards multiplier", "Free 2-day shipping", "Volume discounts"],
    icon: Building2,
  },
  {
    id: "student",
    title: "Student",
    description: "For cosmetology students working towards their license.",
    features: ["Training discounts", "Free ground shipping", "Student perks"],
    icon: GraduationCap,
  },
];

export const AccountTypeStep = ({ selectedType, onSelect }: AccountTypeStepProps) => {
  return (
    <div className="animate-fade-in space-y-3">
      {/* Modern header - compact */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-foreground/5 to-foreground/10 border border-foreground/10 p-4">
        {/* Subtle gradient accent */}
        <div 
          className="absolute top-0 right-0 w-[120px] h-[120px] rounded-full blur-[60px] opacity-30"
          style={{ 
            background: 'radial-gradient(circle, hsl(var(--foreground) / 0.15) 0%, transparent 70%)'
          }}
        />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-foreground/10 border border-foreground/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-foreground/60" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground tracking-tight">
              Choose your account type
            </h1>
            <p className="text-xs text-muted-foreground">
              Select the option that best describes you
            </p>
          </div>
        </div>
      </div>

      {/* Account type cards - stacked on mobile */}
      <div className="grid gap-2 md:grid-cols-3">
        {accountTypes.map((type) => (
          <AccountTypeCard
            key={type.id}
            title={type.title}
            description={type.description}
            badge={type.badge}
            features={type.features}
            icon={type.icon}
            selected={selectedType === type.id}
            onSelect={() => onSelect(type.id)}
          />
        ))}
      </div>

      {/* Trust indicator */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <div className="w-1 h-1 rounded-full bg-green-500" />
        <span>You can change this later</span>
      </div>
    </div>
  );
};
