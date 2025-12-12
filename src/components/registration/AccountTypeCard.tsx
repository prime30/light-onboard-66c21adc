import { cn } from "@/lib/utils";
import { Check, LucideIcon } from "lucide-react";

interface AccountTypeCardProps {
  title: string;
  description: string;
  badge?: string;
  features: string[];
  icon?: LucideIcon;
  selected: boolean;
  onSelect: () => void;
}

export const AccountTypeCard = ({
  title,
  description,
  badge,
  features,
  icon: Icon,
  selected,
  onSelect,
}: AccountTypeCardProps) => {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "relative w-full text-left p-6 rounded-2xl border-2 transition-all duration-200",
        "hover:shadow-soft focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        selected
          ? "border-foreground bg-card shadow-card"
          : "border-border bg-card hover:border-muted-foreground/30"
      )}
    >
      {/* Selection indicator */}
      <div
        className={cn(
          "absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
          selected
            ? "border-foreground bg-foreground"
            : "border-muted-foreground/40"
        )}
      >
        {selected && <Check className="w-3 h-3 text-card" strokeWidth={3} />}
      </div>

      {/* Icon */}
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
          <Icon className="w-6 h-6 text-accent" />
        </div>
      )}

      {/* Badge */}
      {badge && (
        <span className="inline-block px-2.5 py-0.5 text-xs font-medium rounded-md bg-accent/10 text-accent mb-3">
          {badge}
        </span>
      )}

      {/* Title */}
      <h3 className="text-lg font-semibold text-foreground mb-2 pr-8">{title}</h3>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        {description}
      </p>

      {/* Features */}
      <ul className="space-y-2">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2 text-sm text-secondary-foreground">
            <div className="w-4 h-4 rounded-full bg-accent/10 flex items-center justify-center mt-0.5 shrink-0">
              <Check className="w-2.5 h-2.5 text-accent" />
            </div>
            {feature}
          </li>
        ))}
      </ul>
    </button>
  );
};
