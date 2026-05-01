import { useCallback, useEffect } from "react";
import { IframeMessageTypes, MessageHandler } from "./use-iframe-comm";
import { useAtom } from "jotai";
import { Customer, customerAtom } from "@/contexts/store";
import { useGlobalApp } from "@/contexts";
import { useNavigate } from "react-router";
import { saveStoredSession } from "@/lib/standalone-session";
import { takePendingLogin } from "@/lib/pending-login";

export function useCloseIframe() {
  const { isInIframe } = useGlobalApp();

  // Fire CLOSE_IFRAME directly with wildcard origin to guarantee delivery
  // to the parent theme listener regardless of origin resolution state.
  // Before closing, flush any pending USER_LOGIN credentials queued by a
  // success flow (registration, reset, activate). This is the safety net
  // for cases where the immediate USER_LOGIN posted at success time was
  // dropped or arrived before the parent handler was ready — the parent
  // gets one last chance to log the user in before the iframe tears down.
  const closeIframe = useCallback(() => {
    try {
      const pending = takePendingLogin();
      if (pending) {
        window.parent.postMessage(
          {
            type: IframeMessageTypes.USER_LOGIN,
            data: pending,
            timestamp: new Date().toISOString(),
          },
          "*"
        );
        console.log("[useCloseIframe] Flushed pending USER_LOGIN before close");
      }
      window.parent.postMessage(
        {
          type: IframeMessageTypes.CLOSE_IFRAME,
          data: {
            reason: "User requested closure",
            url: window.location.href,
          },
          timestamp: new Date().toISOString(),
        },
        "*"
      );
      console.log("[useCloseIframe] Posted CLOSE_IFRAME to parent with '*' origin");
    } catch (error) {
      console.error("[useCloseIframe] Failed to post CLOSE_IFRAME:", error);
    }
  }, []);

  return { closeIframe, isInIframe };
}

type LoginData = {
  email: string;
  password: string;
};

type ForgotPasswordData = {
  email: string;
};

export type FormUpdateData =
  | {
      status: "success" | "submitting";
    }
  | {
      status: "error";
      message: string;
    };

type UseCustomerLoginProps = {
  loginUpdate?: (message: FormUpdateData) => void;
  forgotPasswordUpdate?: (message: FormUpdateData) => void;
};

export function useCustomerLogin({
  loginUpdate,
  forgotPasswordUpdate,
}: UseCustomerLoginProps = {}) {
  const { subscribeToType, isInIframe, sendMessage } = useGlobalApp();
  const [customer, setCustomer] = useAtom(customerAtom);
  const navigate = useNavigate();

  const customerHandler: MessageHandler<Customer> = useCallback(
    (message) => {
      if (message.type !== IframeMessageTypes.CUSTOMER_DATA) {
        return;
      }

      const customer = message.data as Customer;
      setCustomer(message.data as Customer);

      // Redirect to already logged in page if logged in
      if (customer.isLoggedIn) {
        navigate("/already-logged-in");
        return;
      }
    },
    [navigate, setCustomer]
  );

  const loginUpdateHandler: MessageHandler<FormUpdateData> = useCallback(
    (message) => {
      if (message.type !== IframeMessageTypes.LOGIN_STATUS) {
        return;
      }
      if (loginUpdate) {
        loginUpdate(message.data as FormUpdateData);
      }
    },
    [loginUpdate]
  );

  const forgotPasswordHandler: MessageHandler<FormUpdateData> = useCallback(
    (message) => {
      if (message.type !== IframeMessageTypes.FORGOT_PASSWORD_STATUS) {
        return;
      }
      if (forgotPasswordUpdate) {
        forgotPasswordUpdate(message.data as FormUpdateData);
      }
    },
    [forgotPasswordUpdate]
  );

  useEffect(() => {
    if (!isInIframe) return;

    const customerSub = subscribeToType(IframeMessageTypes.CUSTOMER_DATA, customerHandler);
    const loginSub = subscribeToType(IframeMessageTypes.LOGIN_STATUS, loginUpdateHandler);
    const forgotPasswordSub = subscribeToType(
      IframeMessageTypes.FORGOT_PASSWORD_STATUS,
      forgotPasswordHandler
    );

    return () => {
      // Unsubscribe on cleanup
      customerSub();
      loginSub();
      forgotPasswordSub();
    };
  }, [isInIframe, subscribeToType, customerHandler, loginUpdateHandler, forgotPasswordHandler]);

  const login = useCallback(
    async ({ email, password }: LoginData) => {
      // In iframe: delegate to parent Shopify theme (it owns the storefront
      // session cookie). The parent posts back LOGIN_STATUS + CUSTOMER_DATA.
      if (isInIframe) {
        try {
          sessionStorage.setItem("dde_just_signed_in", "1");
        } catch {
          // ignore storage failures
        }
        sendMessage(IframeMessageTypes.USER_LOGIN, { email, password });
        return;
      }

      // Standalone: hit our customer-login edge function directly and persist
      // the Storefront access token in localStorage. We synthesize the same
      // FormUpdateData callbacks so SignInForm UX is identical in both modes.
      loginUpdate?.({ status: "submitting" });
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/customer-login`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ email, password }),
          }
        );
        const json = await res.json().catch(() => ({}));
        if (res.ok && json?.success && json?.data?.accessToken) {
          const { accessToken, expiresAt } = json.data as {
            accessToken: string;
            expiresAt: string;
          };
          saveStoredSession({
            accessToken,
            expiresAt,
            email,
          });
          // Mirror the iframe path: update customer atom, then navigate.
          setCustomer({
            isLoggedIn: true,
            accessToken,
            expiresAt,
            email,
            firstName: null,
          });
          loginUpdate?.({ status: "success" });
          navigate("/already-logged-in");
        } else {
          loginUpdate?.({
            status: "error",
            message:
              json?.error ||
              json?.message ||
              (res.status === 429
                ? "Too many attempts. Please wait a moment."
                : "Incorrect email or password."),
          });
        }
      } catch (_err) {
        loginUpdate?.({
          status: "error",
          message: "Couldn't sign in. Please check your connection and try again.",
        });
      }
    },
    [isInIframe, sendMessage, loginUpdate, setCustomer, navigate]
  );

  const forgotPassword = useCallback(
    async ({ email }: ForgotPasswordData) => {
      // In iframe: delegate to parent Shopify theme (native customer/recover flow).
      if (isInIframe) {
        sendMessage(IframeMessageTypes.USER_FORGOT_PASSWORD, { email });
        return;
      }

      // Standalone: call our recover-password edge function directly and
      // emit the same FormUpdateData callback shape so SignInForm reacts
      // identically in both modes.
      forgotPasswordUpdate?.({ status: "submitting" });
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/recover-password`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ email }),
          }
        );
        const json = await res.json().catch(() => ({}));
        if (res.ok && json?.success) {
          forgotPasswordUpdate?.({ status: "success" });
        } else {
          forgotPasswordUpdate?.({
            status: "error",
            message:
              json?.error ||
              json?.message ||
              (res.status === 429
                ? "Too many requests. Please wait a moment."
                : "Couldn't send reset email. Please try again."),
          });
        }
      } catch (_err) {
        forgotPasswordUpdate?.({
          status: "error",
          message: "Couldn't send reset email. Please check your connection and try again.",
        });
      }
    },
    [isInIframe, sendMessage, forgotPasswordUpdate]
  );

  return { customer, login, forgotPassword };
}
