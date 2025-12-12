import { Check, Gift, Truck, DollarSign, Clock, Award, GraduationCap, Percent } from "lucide-react";

export type AccountType = "stylist" | "salon" | "student";

interface AccountTypeCardProps {
  type: AccountType;
  selected: boolean;
  onSelect: () => void;
}

const accountData: Record<AccountType, {
  title: string;
  titleAccent?: string;
  badge?: string;
  description: string;
  features: { icon: typeof Gift; text: string }[];
}> = {
  stylist: {
    title: "Stylist Account",
    badge: "Pro",
    description: "Shopping for your clients? This is for licensed cosmetologists who purchase hair for their clientele. Create a stylist account to get pro perks.",
    features: [
      { icon: Gift, text: "Earn 1x rewards points on every dollar" },
      { icon: Truck, text: "Free 2-Day shipping on qualifying orders" },
      { icon: DollarSign, text: "Professional-only wholesale pricing not available to the general public" },
      { icon: Clock, text: "Track orders, purchase history, and tax exemption available" },
      { icon: Award, text: "More perks available dependent on order volume" },
    ],
  },
  salon: {
    title: "Salon Manager",
    titleAccent: "Account",
    badge: "Pro",
    description: "Shopping for your stylists? This is for salon owners and managers who purchase hair for multiple stylists. Create a salon account to get MVP pro perks.",
    features: [
      { icon: Gift, text: "1.25x rewards points multiplier" },
      { icon: Truck, text: "Free 2-Day shipping on qualifying orders" },
      { icon: Clock, text: "Track orders, purchase history, and tax exemption available" },
      { icon: Percent, text: "Discounts on Tools, Education, and Displays" },
    ],
  },
  student: {
    title: "Student Access",
    description: "Are you currently in school or in an apprenticeship program working towards your cosmetology license? Register here to create a student account and access your perks.",
    features: [
      { icon: GraduationCap, text: "Education and training discounts" },
      { icon: Truck, text: "Free ground shipping on qualifying orders" },
      { icon: Clock, text: "Track orders, purchase history, and tax exemption available" },
      { icon: DollarSign, text: "Student discounts" },
    ],
  },
};

export function AccountTypeCard({ type, selected, onSelect }: AccountTypeCardProps) {
  const data = accountData[type];

  return (
    <button
      onClick={onSelect}
      className={`relative w-full text-left p-6 rounded-2xl border-2 transition-all duration-200 ${
        selected
          ? "border-primary bg-card shadow-card"
          : "border-border bg-card/50 hover:border-primary/30 hover:bg-card"
      }`}
    >
      {/* Selection indicator */}
      <div className="absolute top-4 right-4">
        <div
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
            selected ? "border-primary bg-primary" : "border-border"
          }`}
        >
          {selected && <Check className="w-4 h-4 text-primary-foreground" />}
        </div>
      </div>

      {/* Title with badge */}
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-lg font-semibold text-foreground">
          {data.title}
          {data.titleAccent && (
            <span className="font-normal text-muted-foreground ml-1">{data.titleAccent}</span>
          )}
        </h3>
        {data.badge && (
          <span className="px-2 py-0.5 text-xs font-medium border border-border rounded-md text-muted-foreground">
            {data.badge}
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-4 pr-6">{data.description}</p>

      {/* Divider */}
      <div className="border-t border-border my-4" />

      {/* Features */}
      <ul className="space-y-3">
        {data.features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <feature.icon className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <span className="text-sm text-foreground">{feature.text}</span>
          </li>
        ))}
      </ul>
    </button>
  );
}
