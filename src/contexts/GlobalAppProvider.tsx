import React, { createContext, useContext, useState } from "react";
import { useFontLoaded } from "@/hooks/use-font-loaded";
import { useIframeComm, UseIframeCommReturn } from "@/hooks/use-iframe-comm";
import { allowedMessageOrigins } from "@/data/allowed-origins";

type GlobalAppContextType = {
  fontsLoaded: boolean;
  email: string;
  setEmail: (email: string) => void;
} & UseIframeCommReturn;

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

export const GlobalAppProvider = ({ children }: GlobalAppProviderProps) => {
  const [email, setEmail] = useState("");
  const fontsLoaded = useFontLoaded();
  const iframeComm = useIframeComm({
    targetOrigin: import.meta.env.VITE_IFRAME_PARENT_ORIGIN,
    allowedOrigins: allowedMessageOrigins,
  });

  const value: GlobalAppContextType = {
    fontsLoaded,
    ...iframeComm,
    email,
    setEmail,
  };

  return <GlobalAppContext.Provider value={value}>{children}</GlobalAppContext.Provider>;
};
