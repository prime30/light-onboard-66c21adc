import { useCloseIframe } from "@/hooks/messages";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router";

export function CloseButton() {
  const navigate = useNavigate();

  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [saveProgressText, setSaveProgressText] = useState<"saving" | "saved">("saving");
  const { closeIframe, isInIframe } = useCloseIframe();

  const handleCloseModal = useCallback(() => {
    const close = () => {
      if (isInIframe) {
        closeIframe();
      } else {
        navigate("/");
      }
    };
    // Check if there's form progress to save (only in signup mode with an account type selected)
    // TODO: Check for progress.
    const hasProgress = true;

    if (hasProgress && !isSavingProgress) {
      // Show saving animation
      setIsSavingProgress(true);
      setSaveProgressText("saving");

      // After 1.2s, show "saved"
      setTimeout(() => {
        setSaveProgressText("saved");

        // After another 0.6s, close the modal
        setTimeout(() => {
          setIsSavingProgress(false);
          setTimeout(() => {
            close();
          }, 300);
        }, 600);
      }, 1200);
    } else if (!isSavingProgress) {
      // No progress or signin mode, close immediately
      setTimeout(() => {
        close();
      }, 300);
    }
  }, [navigate, isSavingProgress, isInIframe, closeIframe]);

  if (!isInIframe) return null;

  return (
    <div className="hidden sm:flex items-center justify-end sm:flex-shrink-0 relative">
      {/* Saving text - positioned absolutely to the left so button doesn't move */}
      <span
        className={cn(
          "absolute right-full mr-2 text-sm font-medium whitespace-nowrap transition-all duration-300",
          isSavingProgress ? "opacity-100" : "opacity-0 pointer-events-none",
          saveProgressText === "saving" ? "text-muted-foreground" : "text-emerald-600"
        )}
      >
        {/* Use invisible text to maintain consistent width */}
        <span className="invisible">Saving...</span>
        <span className="absolute inset-0 flex items-center justify-end">
          {saveProgressText === "saving" ? "Saving..." : "Saved"}
        </span>
      </span>
      <button
        onClick={handleCloseModal}
        disabled={isSavingProgress}
        className="relative p-2.5 rounded-full bg-muted hover:bg-muted/80 transition-colors group disabled:cursor-default"
        aria-label="Close"
      >
        {/* Animated saving circle */}
        {isSavingProgress && (
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 44 44">
            {/* Background circle */}
            <circle
              cx="22"
              cy="22"
              r="20"
              fill="none"
              stroke="hsl(var(--muted-foreground) / 0.2)"
              strokeWidth="2"
            />
            {/* Progress circle */}
            <circle
              cx="22"
              cy="22"
              r="20"
              fill="none"
              stroke={
                saveProgressText === "saved" ? "rgb(16 185 129)" : "hsl(var(--muted-foreground))"
              }
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="125.6"
              strokeDashoffset="125.6"
              className={cn(
                saveProgressText === "saving" && "animate-save-progress",
                saveProgressText === "saved" && "!stroke-dashoffset-0"
              )}
              style={{
                strokeDashoffset: saveProgressText === "saved" ? 0 : undefined,
                transition: saveProgressText === "saved" ? "stroke 0.3s ease-out" : undefined,
              }}
            />
          </svg>
        )}
        {isSavingProgress && saveProgressText === "saved" ? (
          <Check className="w-5 h-5 text-emerald-600 animate-scale-in" />
        ) : (
          <X
            className={cn(
              "w-5 h-5 text-muted-foreground transition-transform duration-200",
              !isSavingProgress && "group-hover:rotate-90 group-active:scale-75"
            )}
          />
        )}
      </button>
    </div>
  );
}
