import { useCallback, useEffect } from "react";
import { IframeMessageTypes, MessageHandler } from "./use-iframe-comm";
import { useAtom } from "jotai";
import { Customer, customerAtom } from "@/contexts/store";
import { useGlobalApp } from "@/contexts";
import { useNavigate } from "react-router";

export function useCloseIframe() {
  const { sendMessage, isInIframe } = useGlobalApp();

  // Specific function to request iframe closure
  const closeIframe = useCallback(() => {
    sendMessage(IframeMessageTypes.CLOSE_IFRAME, {
      reason: "User requested closure",
      url: window.location.href,
    });
  }, [sendMessage]);

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
    (customer: LoginData) => {
      sendMessage(IframeMessageTypes.USER_LOGIN, customer);
    },
    [sendMessage]
  );

  const forgotPassword = useCallback(
    ({ email }: ForgotPasswordData) => {
      sendMessage(IframeMessageTypes.USER_FORGOT_PASSWORD, { email });
    },
    [sendMessage]
  );

  return { customer, login, forgotPassword };
}
