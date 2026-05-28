import { Zap } from "lucide-react";
import { useState } from "react";
import { useStepContext } from "@/components/registration/context";
import { useAdminMode } from "@/lib/admin-mode";
import { STEP_DISPLAY_NAMES } from "@/data/step-order";
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
 */
export function AdminJumpButton() {
  const isAdmin = useAdminMode();
  const { steps, currentStep, setCurrentStep } = useStepContext();
  const [open, setOpen] = useState(false);

  if (!isAdmin) return null;

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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
