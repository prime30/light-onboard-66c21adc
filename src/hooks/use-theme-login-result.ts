import { useEffect, useState } from "react";
import { useGlobalApp } from "@/contexts";
import { IframeMessageTypes } from "./use-iframe-comm";

// After the app posts USER_LOGIN to the parent theme, wait for the theme to
// report the outcome (LOGIN_STATUS or CUSTOMER_DATA with isLoggedIn) before
// telling the customer they're signed in. No report within the timeout means
// "unconfirmed": we never claim a sign-in we didn't see.
export type ThemeLoginResult = "idle" | "pending" | "confirmed" | "failed" | "unconfirmed";

// `reason` is the theme's LOGIN_STATUS reason ("rejected", "rate_limited",
// "challenge", "store_error", "network"), set only when result is "failed".
// Older theme builds send none.
export type ThemeLoginState = { result: ThemeLoginResult; reason?: string };

export function useThemeLoginResult(active: boolean, timeoutMs = 10000): ThemeLoginState {
  const { subscribeToType, isInIframe } = useGlobalApp();
  const [state, setState] = useState<ThemeLoginState>({ result: "idle" });

  useEffect(() => {
    if (!active || !isInIframe) return;
    setState({ result: "pending" });
    let settled = false;
    const settle = (next: ThemeLoginState) => {
      if (settled) return;
      settled = true;
      setState(next);
    };
    const unsubStatus = subscribeToType(IframeMessageTypes.LOGIN_STATUS, (msg) => {
      const d = msg.data as { status?: string; reason?: string } | undefined;
      if (d?.status === "success" || d?.status === "confirmed") settle({ result: "confirmed" });
      else if (d?.status === "error") {
        settle({ result: "failed", reason: typeof d.reason === "string" ? d.reason : undefined });
      }
    });
    const unsubCustomer = subscribeToType(IframeMessageTypes.CUSTOMER_DATA, (msg) => {
      const d = msg.data as { isLoggedIn?: boolean } | undefined;
      if (d?.isLoggedIn) settle({ result: "confirmed" });
    });
    const t = setTimeout(() => settle({ result: "unconfirmed" }), timeoutMs);
    return () => {
      clearTimeout(t);
      unsubStatus();
      unsubCustomer();
    };
  }, [active, isInIframe, subscribeToType, timeoutMs]);

  return state;
}

// Sentence shown after "Your password has been changed" (or the activation
// equivalent) when the theme's background sign-in failed. The password was
// just accepted by Shopify, so none of these offer another reset.
export function themeLoginFailureCopy(reason: string | undefined): string {
  if (reason === "rejected") return "Your password is saved. Close this window and sign in with it.";
  if (reason === "rate_limited") {
    return "Too many sign-in attempts. Wait a few minutes, then sign in with your new password.";
  }
  return "Your password is saved, but the store couldn't sign you in just now. Close this window and sign in.";
}
