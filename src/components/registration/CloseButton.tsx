import { useCloseIframe } from "@/hooks/messages";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import { useAtom } from "jotai";
import { customerAtom } from "@/contexts/store";
import { useContext } from "react";
import { useModeContext } from "./context/ModeContext";
import { StepContext } from "./context/StepContext";
import { useAutoApproval } from "@/lib/app-settings";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function CloseButton() {
  const navigate = useNavigate();
  const { mode } = useModeContext();
  // StepContext may be unavailable (CloseButton renders in RegistrationLayout,
  // outside the FormProvider/StepProvider tree). Read it optionally so we can
  // still render and just skip the saving animation when there's no progress.
  const stepCtx = useContext(StepContext);
  const currentStep = stepCtx?.currentStep;
  const getStepNumber = stepCtx?.getStepNumber;

  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [saveProgressText, setSaveProgressText] = useState<"saving" | "saved">("saving");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { closeIframe, isInIframe } = useCloseIframe();
  const [customer] = useAtom(customerAtom);
  const { enabled: autoApprove } = useAutoApproval();

  // On the late create-password step (auto-approval flow), the user has
  // already "approved" their application. Closing here would discard a
  // ready-to-shop account, so we soft-confirm before letting them out.
  const needsCloseConfirm =
    autoApprove && currentStep === "create-password" && !customer?.isLoggedIn;

  const handleCloseModal = useCallback(() => {
    const close = () => {
      if (isInIframe) {
        closeIframe();
      } else {
        navigate("/");
      }
    };

    // Only show the saving animation once the user has progressed past the
    // entry screens. Onboarding, account-type, and the first step after
    // account-type should all dismiss instantly — there is nothing
    // meaningful to "save" yet. If StepContext isn't available (e.g. on
    // /login or /reset-password), treat as no progress.
    const ENTRY_STEPS = new Set(["onboarding", "account-type"]);
    const stepIndex = currentStep && getStepNumber ? getStepNumber(currentStep) : -1;
    const isEntryStep = !currentStep || ENTRY_STEPS.has(currentStep);
    // steps array is ["onboarding", "account-type", <flow steps...>, "summary"]
    // so index >= 3 means the user has filled at least one real flow step.
    const hasProgress = !isEntryStep && stepIndex >= 3;

    // If user is already logged in, close immediately without saving animation
    if (customer?.isLoggedIn) {
      close();
      return;
    }

    if (hasProgress && !isSavingProgress && mode === "signup") {
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
      close();
    }
  }, [navigate, isSavingProgress, isInIframe, closeIframe, customer?.isLoggedIn, mode, currentStep, getStepNumber]);

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
        className="relative flex h-11 w-11 touch-manipulation items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80 group disabled:cursor-default"
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
