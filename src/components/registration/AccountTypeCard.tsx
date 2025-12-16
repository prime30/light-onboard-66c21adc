import { cn } from "@/lib/utils";
import { Check, LucideIcon } from "lucide-react";

interface Feature {
  label: string;
  icon?: LucideIcon;
}

interface AccountTypeCardProps {
  title: string;
  description: string;
  badge?: string;
  features: Feature[];
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
        "group relative w-full text-left p-3 md:p-4 rounded-xl border transition-all duration-200 overflow-hidden",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        "hover:-translate-y-0.5 hover:shadow-md hover:bg-muted/20",
        selected
          ? "border-foreground/15 bg-muted/20 -translate-y-0.5 shadow-sm"
          : "border-border/30 bg-background/40 hover:border-foreground/15"
      )}
    >
      {/* Click shine sweep */}
      <span className="pointer-events-none absolute inset-0 -translate-x-full group-active:animate-shine-sweep bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      {/* Selection indicator */}
      <div
        className={cn(
          "absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300",
          selected
            ? "border-foreground/30 bg-foreground/10"
            : "border-foreground/20"
        )}
      >
        {selected && <Check className="w-3 h-3 text-foreground" strokeWidth={3} />}
      </div>

      {/* Mobile: Horizontal layout with icon + content */}
      <div className="flex gap-3 sm:block">
        {/* Icon */}
        {Icon && (
          <div className={cn(
            "w-10 h-10 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 sm:mb-2 transition-colors duration-300 border",
            selected ? "bg-background border-foreground/20" : "bg-background/80 border-foreground/10"
          )}>
            <Icon className={cn(
              "w-5 h-5 transition-colors duration-300",
              selected ? "text-foreground" : "text-foreground/60"
            )} />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Badge */}
          {badge && (
            <span className={cn(
              "inline-block px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded mb-1 sm:mb-2 transition-colors duration-300",
              selected ? "bg-foreground/[0.08] text-foreground" : "bg-foreground/10 text-foreground"
            )}>
              {badge}
            </span>
          )}

          {/* Title */}
          <h3 className={cn(
            "text-sm font-semibold mb-0.5 sm:mb-1 pr-6 transition-colors duration-300 text-foreground"
          )}>
            {title}
          </h3>

          {/* Description */}
          <p className="text-[11px] leading-relaxed transition-colors duration-300 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>

      {/* Features - Full width row on mobile */}
      <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/30 sm:border-0 sm:pt-0 sm:mt-2">
        {features.map((feature, index) => {
          const FeatureIcon = feature.icon;
          return (
            <span 
              key={index} 
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full border transition-colors duration-300",
                selected 
                  ? "bg-foreground/5 border-foreground/15 text-foreground/80" 
                  : "bg-background/60 border-foreground/10 text-foreground/60"
              )}
            >
              {FeatureIcon && <FeatureIcon className="w-3 h-3" />}
              {feature.label}
            </span>
          );
        })}
      </div>
    </button>
  );
};
