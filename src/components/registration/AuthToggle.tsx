import { cn } from "@/lib/utils";
import { AuthMode } from "@/types/auth";

type AuthToggleProps = {
  mode: AuthMode;
  handleModeChange: (mode: AuthMode) => void;
};

export function AuthToggle({ mode, handleModeChange }: AuthToggleProps) {
  return (
    <div className="inline-flex bg-muted backdrop-blur-sm rounded-full p-[5px] border border-border/50 relative flex-shrink-0">
      {/* Sliding pill indicator */}
      <div
        className="absolute top-[5px] bottom-[5px] rounded-full bg-foreground shadow-lg shadow-foreground/10 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        style={{
          left: mode === "signup" ? "5px" : "50%",
          width: "calc(50% - 5px)",
        }}
      />
      <button
        onClick={() => handleModeChange("signup")}
        className={cn(
          "relative z-10 px-[15px] sm:px-[20px] py-2 sm:py-[10px] rounded-full text-sm font-medium transition-colors duration-300",
          mode === "signup" ? "text-background" : "text-muted-foreground hover:text-foreground"
        )}
      >
        Apply
      </button>
      <button
        onClick={() => handleModeChange("signin")}
        className={cn(
          "relative z-10 px-[15px] sm:px-[20px] py-2 sm:py-[10px] rounded-full text-sm font-medium transition-colors duration-300",
          mode === "signin" ? "text-background" : "text-muted-foreground hover:text-foreground"
        )}
      >
        Login
      </button>
    </div>
  );
}
