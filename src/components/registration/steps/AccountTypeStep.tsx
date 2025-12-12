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
    <div className="animate-fade-in space-y-6">
      {/* Modern header */}
      <div className="relative overflow-hidden rounded-2xl bg-foreground p-6">
        {/* Animated gradient orbs */}
        <div 
          className="absolute top-0 right-0 w-[180px] h-[180px] rounded-full blur-[70px] animate-pulse"
          style={{ 
            background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
            animationDuration: '4s'
          }}
        />
        <div 
          className="absolute bottom-0 left-0 w-[120px] h-[120px] rounded-full blur-[50px] animate-pulse"
          style={{ 
            background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)',
            animationDuration: '5s',
            animationDelay: '1s'
          }}
        />
        
        {/* Noise texture */}
        <div 
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/10 backdrop-blur-sm border border-background/10 mb-4">
            <Sparkles className="w-3 h-3 text-background/80" />
            <span className="text-xs font-medium text-background/80 uppercase tracking-widest">
              Getting started
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold text-background tracking-tight">
            Choose your account type
          </h1>
          <p className="text-sm text-background/50 mt-2">
            Select the option that best describes you
          </p>
        </div>
      </div>

      {/* Account type cards */}
      <div className="grid gap-3 md:grid-cols-3">
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
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
        <span>You can change this later in settings</span>
      </div>
    </div>
  );
};
