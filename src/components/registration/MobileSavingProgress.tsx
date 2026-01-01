import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

type SavingProgressProps = {
  isSavingProgress: boolean;
  saveProgressText: "saving" | "saved";
  footerVisible?: boolean;
};

export function MobileSavingProgress({
  isSavingProgress,
  saveProgressText,
  footerVisible = true,
}: SavingProgressProps) {
  if (!isSavingProgress) {
    return null;
  }

  return (
    <div
      className={cn(
        "sm:hidden absolute inset-0 z-[90] flex justify-center bg-background/80 backdrop-blur-sm animate-fade-in",
        footerVisible ? "items-end pb-[130px]" : "items-center"
      )}
    >
      <div className="flex flex-col items-center gap-4">
        {/* Rippling circle loader */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          {saveProgressText === "saving" ? (
            <>
              <div
                className="absolute inset-0 rounded-full border-2 border-muted-foreground/40"
                style={{ animation: "ripple 2s ease-out infinite" }}
              />
              <div
                className="absolute inset-0 rounded-full border-2 border-muted-foreground/40"
                style={{ animation: "ripple 2s ease-out infinite 0.6s" }}
              />
              <div
                className="absolute inset-0 rounded-full border-2 border-muted-foreground/40"
                style={{ animation: "ripple 2s ease-out infinite 1.2s" }}
              />
              <div className="w-4 h-4 rounded-full bg-muted-foreground/60 animate-pulse" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-scale-in" />
              <Check className="w-7 h-7 text-emerald-600 animate-scale-in" />
            </>
          )}
        </div>
        {/* Text */}
        <span
          className={cn(
            "text-sm font-medium transition-colors duration-300",
            saveProgressText === "saving" ? "text-muted-foreground" : "text-emerald-600"
          )}
        >
          {saveProgressText === "saving" ? "Saving progress..." : "Saved!"}
        </span>
      </div>
    </div>
  );
}
