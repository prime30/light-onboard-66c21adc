import { useEffect, useState } from "react";
import { useGlobalApp } from "@/contexts";
import { IframeMessageTypes } from "./use-iframe-comm";

// After the app posts USER_LOGIN to the parent theme, wait for the theme to
// report the outcome (LOGIN_STATUS or CUSTOMER_DATA with isLoggedIn) before
// telling the customer they're signed in. No report within the timeout means
// "unconfirmed": we never claim a sign-in we didn't see.
export type ThemeLoginResult = "idle" | "pending" | "confirmed" | "failed" | "unconfirmed";

export function useThemeLoginResult(active: boolean, timeoutMs = 10000) {
  const { subscribeToType, isInIframe } = useGlobalApp();
  const [result, setResult] = useState<ThemeLoginResult>("idle");

  useEffect(() => {
    if (!active || !isInIframe) return;
    setResult("pending");
    let settled = false;
    const settle = (r: ThemeLoginResult) => {
      if (settled) return;
      settled = true;
      setResult(r);
    };
    const unsubStatus = subscribeToType(IframeMessageTypes.LOGIN_STATUS, (msg) => {
      const d = msg.data as { status?: string } | undefined;
      if (d?.status === "success" || d?.status === "confirmed") settle("confirmed");
      else if (d?.status === "error") settle("failed");
    });
    const unsubCustomer = subscribeToType(IframeMessageTypes.CUSTOMER_DATA, (msg) => {
      const d = msg.data as { isLoggedIn?: boolean } | undefined;
      if (d?.isLoggedIn) settle("confirmed");
    });
    const t = setTimeout(() => settle("unconfirmed"), timeoutMs);
    return () => {
      clearTimeout(t);
      unsubStatus();
      unsubCustomer();
    };
  }, [active, isInIframe, subscribeToType, timeoutMs]);

  return result;
}
