import { Zap } from "lucide-react";
import { useStepContext } from "@/components/registration/context";
import { useAdminMode } from "@/lib/admin-mode";

/**
 * Floating shortcut visible only when the current session has been authenticated
 * via /admin/settings. Lets an admin jump straight to the success step without
 * filling the form, for QA of the "approved" vs "manual review" UI.
 */
export function AdminJumpButton() {
  const isAdmin = useAdminMode();
  const { setCurrentStep, currentStep } = useStepContext();

  if (!isAdmin) return null;
  if (currentStep === "success") return null;

  return (
    <button
      type="button"
      onClick={() => setCurrentStep("success")}
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full bg-foreground text-background text-xs font-medium shadow-lg hover:opacity-90 transition-opacity"
      aria-label="Admin: jump to success step"
    >
      <Zap className="w-3.5 h-3.5" />
      Jump to success
    </button>
  );
}
