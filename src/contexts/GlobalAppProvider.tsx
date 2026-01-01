import React, { createContext, useContext } from "react";
import { useFontLoaded } from "@/hooks/use-font-loaded";

interface GlobalAppContextType {
  fontsLoaded: boolean;
}

const GlobalAppContext = createContext<GlobalAppContextType | undefined>(undefined);

export const useGlobalApp = () => {
  const context = useContext(GlobalAppContext);
  if (context === undefined) {
    throw new Error("useGlobalApp must be used within a GlobalAppProvider");
  }
  return context;
};

interface GlobalAppProviderProps {
  children: React.ReactNode;
}

export const GlobalAppProvider: React.FC<GlobalAppProviderProps> = ({ children }) => {
  const fontsLoaded = useFontLoaded();

  const value: GlobalAppContextType = {
    fontsLoaded,
  };

  return <GlobalAppContext.Provider value={value}>{children}</GlobalAppContext.Provider>;
};
