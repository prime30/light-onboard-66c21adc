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
          ? "border-foreground bg-foreground text-background shadow-xl"
          : "border-border/50 bg-muted/30 hover:bg-muted/60 hover:border-foreground/20"
      )}
    >
      {/* Selection indicator */}
      <div
        className={cn(
          "absolute top-3 right-3 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-300",
          selected
            ? "border-background bg-background"
            : "border-foreground/20"
        )}
      >
        {selected && <Check className="w-2.5 h-2.5 text-foreground" strokeWidth={3} />}
      </div>

      {/* Icon */}
      {Icon && (
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center mb-2 transition-colors duration-300",
          selected ? "bg-background/10" : "bg-foreground"
        )}>
          <Icon className={cn(
            "w-4 h-4 transition-colors duration-300",
            selected ? "text-background" : "text-background"
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
        "text-sm font-semibold mb-1 pr-6 transition-colors duration-300",
        selected ? "text-background" : "text-foreground"
      )}>
        {title}
      </h3>

      {/* Description */}
      <p className={cn(
        "text-[11px] mb-2 leading-relaxed transition-colors duration-300",
        selected ? "text-background/60" : "text-muted-foreground"
      )}>
        {description}
      </p>

      {/* Features */}
      <ul className="space-y-1">
        {features.map((feature, index) => (
          <li 
            key={index} 
            className={cn(
              "flex items-center gap-1.5 text-[11px] transition-colors duration-300",
              selected ? "text-background/80" : "text-foreground/70"
            )}
          >
            <div className={cn(
              "w-3 h-3 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300",
              selected ? "bg-background/20" : "bg-foreground/10"
            )}>
              <Check className={cn(
                "w-1.5 h-1.5 transition-colors duration-300",
                selected ? "text-background" : "text-foreground"
              )} />
            </div>
            {feature}
          </li>
        ))}
      </ul>

      {/* Subtle gradient overlay when selected */}
      {selected && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      )}
    </button>
  );
};
