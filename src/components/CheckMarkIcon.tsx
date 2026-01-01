import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

type CheckMarkIconProps = {
  show: boolean;
  className?: string;
};

export function CheckMarkIcon({ show, className }: CheckMarkIconProps) {
  if (!show) return null;
  return (
    <div className={cn("absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none z-10", className)}>
      <div className="w-5 h-5 rounded-full bg-success/15 flex items-center justify-center animate-scale-in">
        <Check className="w-3.5 h-3.5 text-success" strokeWidth={2.5} />
      </div>
    </div>
  );
}
