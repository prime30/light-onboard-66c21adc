import { cn } from "@/lib/utils";
import { Check, LucideIcon } from "lucide-react";
import { useMagnetic } from "@/hooks/use-magnetic";

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
  const magnetic = useMagnetic<HTMLButtonElement>({ strength: 0.08 });

  return (
    <button
      ref={magnetic.ref}
      style={magnetic.style}
      onMouseMove={magnetic.onMouseMove}
      onMouseLeave={magnetic.onMouseLeave}
      onClick={onSelect}
      className={cn(
        "relative w-full text-left p-3 md:p-4 rounded-xl border transition-all duration-300",
        "hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        selected
          ? "border-foreground/30 bg-foreground/10 shadow-lg backdrop-blur-sm"
          : "border-border/30 bg-background/40 hover:bg-background/60 hover:border-foreground/15 backdrop-blur-sm"
      )}
    >
      {/* Selection indicator */}
      <div
        className={cn(
          "absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300",
          selected
            ? "border-foreground bg-foreground"
            : "border-foreground/20"
        )}
      >
        {selected && <Check className="w-3 h-3 text-background" strokeWidth={3} />}
      </div>

      {/* Icon */}
      {Icon && (
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-colors duration-300 border",
          selected ? "bg-background border-foreground/20" : "bg-background/80 border-foreground/10"
        )}>
          <Icon className={cn(
            "w-5 h-5 transition-colors duration-300",
            selected ? "text-foreground" : "text-foreground/60"
          )} />
        </div>
      )}

      {/* Badge */}
      {badge && (
        <span className={cn(
          "inline-block px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded mb-2 transition-colors duration-300",
          selected ? "bg-background/20 text-background" : "bg-foreground/10 text-foreground"
        )}>
          {badge}
        </span>
      )}

      {/* Title */}
      <h3 className={cn(
        "text-sm font-semibold mb-1 pr-6 transition-colors duration-300 text-foreground"
      )}>
        {title}
      </h3>

      {/* Description */}
      <p className="text-[11px] mb-2 leading-relaxed transition-colors duration-300 text-muted-foreground">
        {description}
      </p>

      {/* Features */}
      <div className="flex flex-wrap gap-1.5">
        {features.map((feature, index) => (
          <span 
            key={index} 
            className={cn(
              "inline-flex items-center px-2 py-0.5 text-[10px] rounded-full border transition-colors duration-300",
              selected 
                ? "bg-foreground/5 border-foreground/15 text-foreground/80" 
                : "bg-background/60 border-foreground/10 text-foreground/60"
            )}
          >
            {feature}
          </span>
        ))}
      </div>

      {/* Subtle gradient overlay when selected */}
      {selected && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      )}
    </button>
  );
};
