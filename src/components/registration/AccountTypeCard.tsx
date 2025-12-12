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
        "relative w-full text-left p-5 rounded-2xl border transition-all duration-300",
        "hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        selected
          ? "border-foreground bg-foreground text-background shadow-xl"
          : "border-border/50 bg-muted/30 hover:bg-muted/60 hover:border-foreground/20"
      )}
    >
      {/* Selection indicator */}
      <div
        className={cn(
          "absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300",
          selected
            ? "border-background bg-background"
            : "border-foreground/20"
        )}
      >
        {selected && <Check className="w-3 h-3 text-foreground" strokeWidth={3} />}
      </div>

      {/* Icon */}
      {Icon && (
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors duration-300",
          selected ? "bg-background/10" : "bg-foreground"
        )}>
          <Icon className={cn(
            "w-5 h-5 transition-colors duration-300",
            selected ? "text-background" : "text-background"
          )} />
        </div>
      )}

      {/* Badge */}
      {badge && (
        <span className={cn(
          "inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md mb-3 transition-colors duration-300",
          selected ? "bg-background/20 text-background" : "bg-foreground/10 text-foreground"
        )}>
          {badge}
        </span>
      )}

      {/* Title */}
      <h3 className={cn(
        "text-base font-semibold mb-1.5 pr-8 transition-colors duration-300",
        selected ? "text-background" : "text-foreground"
      )}>
        {title}
      </h3>

      {/* Description */}
      <p className={cn(
        "text-xs mb-4 leading-relaxed transition-colors duration-300",
        selected ? "text-background/60" : "text-muted-foreground"
      )}>
        {description}
      </p>

      {/* Features */}
      <ul className="space-y-1.5">
        {features.map((feature, index) => (
          <li 
            key={index} 
            className={cn(
              "flex items-center gap-2 text-xs transition-colors duration-300",
              selected ? "text-background/80" : "text-foreground/70"
            )}
          >
            <div className={cn(
              "w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300",
              selected ? "bg-background/20" : "bg-foreground/10"
            )}>
              <Check className={cn(
                "w-2 h-2 transition-colors duration-300",
                selected ? "text-background" : "text-foreground"
              )} />
            </div>
            {feature}
          </li>
        ))}
      </ul>

      {/* Subtle gradient overlay when selected */}
      {selected && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      )}
    </button>
  );
};
