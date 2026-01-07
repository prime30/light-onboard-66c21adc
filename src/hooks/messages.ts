import { useCallback, useEffect } from "react";
import { IframeMessageTypes, MessageHandler } from "./use-iframe-comm";
import { useAtom } from "jotai";
import { Customer, customerAtom } from "@/contexts/store";
import { useGlobalApp } from "@/contexts";

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

export function useCustomerLogin() {
  const { subscribeToType, isInIframe } = useGlobalApp();
  const { closeIframe } = useCloseIframe();
  const [customer, setCustomer] = useAtom(customerAtom);

  const handler: MessageHandler<Customer> = useCallback(
    (message) => {
      if (message.type !== IframeMessageTypes.CUSTOMER_DATA) {
        return;
      }

      const customer = message.data as Customer;

      // Redirect to accounts page if logged in
      if (customer.isLoggedIn) {
        closeIframe();
      }

      console.log("Customer Data Recieved:", message);
      setCustomer(message.data as Customer);
    },
    [setCustomer]
  );

  useEffect(() => {
    if (!isInIframe) return;
    return subscribeToType(IframeMessageTypes.CUSTOMER_DATA, handler);
  }, [isInIframe, subscribeToType, handler]);

  return { customer };
}
