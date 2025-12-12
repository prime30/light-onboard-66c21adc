import { AccountTypeCard } from "../AccountTypeCard";
import { Scissors, Building2, GraduationCap } from "lucide-react";

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
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <p className="text-sm text-muted-foreground mb-2">Getting started</p>
        <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
          Choose your account type
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3 max-w-4xl mx-auto">
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
    </div>
  );
};
