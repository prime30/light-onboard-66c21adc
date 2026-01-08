import {
  createContext,
  useContext,
  ReactNode,
  MutableRefObject,
  useRef,
  useState,
} from "react";
import { AuthMode } from "@/types/auth";

export type ModeContextType = {
  mode: AuthMode;
  setMode: React.Dispatch<React.SetStateAction<AuthMode>>;
  transitionDirection: "forward" | "backward";
  setTransitionDirection: React.Dispatch<React.SetStateAction<"forward" | "backward">>;
  isTransitioning: boolean;
  setIsTransitioning: React.Dispatch<React.SetStateAction<boolean>>;
  mainScrollRef: MutableRefObject<HTMLElement | null>;
};

// Create the context
const ModeContext = createContext<ModeContextType | null>(null);

type ModeProviderProps = {
  children: ReactNode;
};

// Provider component
export function ModeProvider({ children }: ModeProviderProps) {
  const [mode, setMode] = useState<AuthMode>("signup");
  const [transitionDirection, setTransitionDirection] = useState<"forward" | "backward">("forward");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const mainScrollRef = useRef<HTMLElement | null>(null);

  const value: ModeContextType = {
    mode,
    setMode,
    transitionDirection,
    setTransitionDirection,
    isTransitioning,
    setIsTransitioning,
    mainScrollRef,
  };

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

/**
 * Hook to consume the ModeContext - manages authentication mode and transition states.
 *
 * @example
 * ```tsx
 * const { mode, setMode, isTransitioning, setIsTransitioning, transitionDirection, setTransitionDirection, mainScrollRef } = useModeContext();
 *
 * // Switch between signup and signin modes
 * setMode("signin");
 *
 * // Handle transition states
 * setIsTransitioning(true);
 * setTransitionDirection("forward");
 *
 * // Access scroll reference for smooth scrolling
 * mainScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
 * ```
 */
export function useModeContext(): ModeContextType {
  const context = useContext(ModeContext);

  if (!context) {
    throw new Error("useModeContext must be used within a ModeProvider");
  }

  return context;
}
