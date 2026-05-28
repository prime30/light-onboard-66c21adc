import { Zap } from "lucide-react";
import { useState } from "react";
import { useStepContext } from "@/components/registration/context";
import { useAdminMode } from "@/lib/admin-mode";
import { STEP_DISPLAY_NAMES } from "@/data/step-order";
import type { Step } from "@/types/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Floating shortcut visible only when the current session has been authenticated
 * via /admin/settings. Lets an admin jump straight to any step in the current
 * flow without filling the form, for QA of step UI.
 *
 * Also exposes terminal/non-flow screens (summary, assessing, success) so admins
 * can preview them without completing the form.
 */
export function AdminJumpButton() {
  const isAdmin = useAdminMode();
  const { steps, currentStep, setCurrentStep } = useStepContext();
  const [open, setOpen] = useState(false);

  if (!isAdmin) return null;

  const terminalSteps: Step[] = (["summary", "assessing", "success"] as Step[]).filter(
    (s) => !steps.includes(s)
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full bg-foreground text-background text-xs font-medium shadow-lg hover:opacity-90 transition-opacity"
          aria-label="Admin: jump to step"
        >
          <Zap className="w-3.5 h-3.5" />
          Jump to step
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="max-h-[70vh] overflow-y-auto">
        <DropdownMenuLabel>Jump to step</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {steps.map((step, i) => (
          <DropdownMenuItem
            key={step}
            onSelect={() => setCurrentStep(step)}
            className={step === currentStep ? "bg-accent font-medium" : ""}
          >
            <span className="text-muted-foreground w-5 tabular-nums">{i + 1}.</span>
            {STEP_DISPLAY_NAMES[step] || step}
          </DropdownMenuItem>
        ))}
        {terminalSteps.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Preview screens
            </DropdownMenuLabel>
            {terminalSteps.map((step) => (
              <DropdownMenuItem
                key={step}
                onSelect={() => setCurrentStep(step)}
                className={step === currentStep ? "bg-accent font-medium" : ""}
              >
                <span className="text-muted-foreground w-5">→</span>
                {STEP_DISPLAY_NAMES[step] || step}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
