import React, { createContext, useContext, useEffect, useState } from "react";
import { useFontLoaded } from "@/hooks/use-font-loaded";
import { useIframeComm, UseIframeCommReturn } from "@/hooks/use-iframe-comm";
import { allowedMessageOrigins } from "@/data/allowed-origins";
import {
  applySsoDocumentEffects,
  parseSsoContextPayload,
  readSsoContextFromUrl,
  SSO_PARENT_ORIGIN,
  SsoContext,
} from "@/lib/sso-context";

type GlobalAppContextType = {
  fontsLoaded: boolean;
  email: string;
  setEmail: (email: string) => void;
  ssoContext: SsoContext | null;
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

  // Initialise SSO context from URL params synchronously so first paint is
  // already branded (no flash of generic UI).
  const [ssoContext, setSsoContext] = useState<SsoContext | null>(() => {
    const initial = readSsoContextFromUrl();
    if (initial) applySsoDocumentEffects(initial);
    return initial;
  });

  // Late-binding channel: parent may push (or update) context via postMessage.
  // Origin is enforced here in addition to use-iframe-comm's allowlist —
  // SSO context is ONLY accepted from the canonical theme origin.
  const { subscribeToType, sendMessage } = iframeComm;
  useEffect(() => {
    const unsubscribe = subscribeToType("SSO_CONTEXT", (message, event) => {
      if (event.origin !== SSO_PARENT_ORIGIN) return;
      const ctx = parseSsoContextPayload(message.data);
      if (!ctx) return;
      applySsoDocumentEffects(ctx);
      setSsoContext(ctx);
      sendMessage("SSO_CONTEXT_RECEIVED", { source: ctx.source });
    });
    return unsubscribe;
  }, [subscribeToType, sendMessage]);

  const value: GlobalAppContextType = {
    fontsLoaded,
    ...iframeComm,
    email,
    setEmail,
    ssoContext,
  };

  return <GlobalAppContext.Provider value={value}>{children}</GlobalAppContext.Provider>;
};
