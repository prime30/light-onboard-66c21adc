import { Outlet } from "react-router";
import { ModeProvider } from "./context/ModeContext";
import { lazy, ReactNode, Suspense, useState } from "react";
import { AuthToggle } from "./AuthToggle";
import { CloseButton } from "./CloseButton";
// Drag handle is rendered by the parent Shopify theme overlay (.reg-overlay__drag-handle)
import { useCustomerLogin } from "@/hooks/messages";
import { HoneypotField } from "./HoneypotField";

// LeftPanel is the marketing/social-proof side: hero image, rotating avatars,
// odometer counter, testimonial carousel. None of it blocks the user from
// completing the form, so we lazy-load it so the right-side form paints
// first. The fallback is just the panel's background tone — no spinner —
// so there's no visual flicker when the chunk arrives.
const LeftPanel = lazy(() =>
  import("./LeftPanel").then((m) => ({ default: m.LeftPanel }))
);

function LeftPanelFallback() {
  return (
    <div
      aria-hidden
      className="hidden lg:block lg:w-[clamp(380px,32vw,520px)] bg-muted shrink-0"
    />
  );
}


export type RegistrationLayoutOutletContext = {
  formProgress: number;
  setFormProgress: (value: number) => void;
  middleComponent: ReactNode;
  setMiddleComponent: (component: ReactNode) => void;
};

type RightPanelProps = {
  outletContext: RegistrationLayoutOutletContext;
};

function RightPanel({ outletContext }: RightPanelProps) {
  return (
    <div className="relative flex-1 flex flex-col bg-background overflow-y-auto overflow-x-hidden">
      {/* Header — flex on mobile (so toggle height doesn't drive row height
          via grid stretching), grid on >=sm. */}
      <header className="relative flex sm:grid sm:grid-cols-3 items-center justify-between gap-2 px-3 py-2.5 sm:p-5 lg:px-[25px] lg:py-[clamp(10px,1.8vh,20px)] pt-[max(2.25rem,env(safe-area-inset-top))] sm:pt-[max(1.25rem,env(safe-area-inset-top))] lg:pt-[max(clamp(10px,1.8vh,20px),env(safe-area-inset-top))] pl-[max(0.75rem,env(safe-area-inset-left))] sm:pl-[max(1.25rem,env(safe-area-inset-left))] lg:pl-[max(1.5625rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:pr-[max(1.25rem,env(safe-area-inset-right))] lg:pr-[max(1.5625rem,env(safe-area-inset-right))]">
        {/* Left side - Auth Toggle + Step Indicator */}
        <div className="relative flex items-center justify-start gap-[10px] z-20">
          <AuthToggle />
        </div>
        <div className="relative flex flex-1 sm:flex-none justify-end sm:justify-center overflow-hidden z-10 min-w-0">
          <div id="step-indicator-root" className="relative w-full flex justify-center" />
          {/* Left gradient fade */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none z-10"></div>
          {/* Right gradient fade */}
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none z-10"></div>
        </div>

        <div className="relative hidden sm:flex justify-end z-20">
          <CloseButton />
        </div>
      </header>
      <Outlet context={outletContext} />
      <HoneypotField />
    </div>
  );
}

export function RegistrationLayout() {
  const [formProgress, setFormProgress] = useState(0);
  const [middleComponent, setMiddleComponent] = useState<ReactNode>(null);
  useCustomerLogin();

  const outletContext: RegistrationLayoutOutletContext = {
    formProgress,
    setFormProgress,
    middleComponent,
    setMiddleComponent,
  };

  return (
    <ModeProvider>
      <div className="h-[var(--app-height,100dvh)] bg-background flex flex-col lg:flex-row overflow-hidden">
        <Suspense fallback={<LeftPanelFallback />}>
          <LeftPanel formProgress={formProgress} />
        </Suspense>
        <RightPanel outletContext={outletContext} />
      </div>
    </ModeProvider>
  );
}
