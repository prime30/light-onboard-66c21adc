import { Outlet } from "react-router";
import { LeftPanel } from "./LeftPanel";
import { ModeProvider } from "./context/ModeContext";
import { ReactNode, useState } from "react";
import { useGlobalApp } from "@/contexts";
import { AuthToggle } from "./AuthToggle";
import { CloseButton } from "./CloseButton";

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
  const { isInIframe } = useGlobalApp();

  return (
    <div className="flex-1 flex flex-col bg-background overflow-y-auto overflow-x-hidden">
      {/* Header - fixed height to keep toggle position consistent */}
      <header className="relative grid grid-cols-2 sm:grid-cols-3 items-center px-3 py-2.5 sm:p-5 lg:p-[25px] pt-[max(1.25rem,env(safe-area-inset-top))] sm:pt-[max(1.25rem,env(safe-area-inset-top))] lg:pt-[max(1.5625rem,env(safe-area-inset-top))] pl-[max(0.75rem,env(safe-area-inset-left))] sm:pl-[max(1.25rem,env(safe-area-inset-left))] lg:pl-[max(1.5625rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:pr-[max(1.25rem,env(safe-area-inset-right))] lg:pr-[max(1.5625rem,env(safe-area-inset-right))] min-h-[60px] sm:min-h-[70px] lg:min-h-[80px]">
        {/* Left side - Auth Toggle + Step Indicator */}
        <div className="relative flex items-center justify-start gap-[10px] min-h-[50px] z-20">
          <AuthToggle />
        </div>
        <div className="relative flex justify-end sm:justify-center overflow-hidden z-10">
          <div id="step-indicator-root" className="relative w-full flex justify-center" />
          {/* Left gradient fade */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none z-10"></div>
          {/* Right gradient fade */}
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none z-10"></div>
        </div>

        {/*<div className="relative hidden sm:flex justify-end z-20">
          {isInIframe && (
            <CloseButton
              isSavingProgress={isSavingProgress}
              saveProgressText={saveProgressText}
              handleCloseModal={handleCloseModal}
            />
          )}
        </div>*/}
      </header>
      <Outlet context={outletContext} />
    </div>
  );
}

export function RegistrationLayout() {
  const [formProgress, setFormProgress] = useState(0);
  const [middleComponent, setMiddleComponent] = useState<ReactNode>(null);

  const outletContext: RegistrationLayoutOutletContext = {
    formProgress,
    setFormProgress,
    middleComponent,
    setMiddleComponent,
  };

  console.log("layout");
  return (
    <ModeProvider>
      <div className="h-screen bg-background flex flex-col lg:flex-row overflow-hidden">
        {/* Left Panel - Hero/Branding */}
        <LeftPanel formProgress={formProgress} />
        <RightPanel outletContext={outletContext} />
      </div>
    </ModeProvider>
  );
}
