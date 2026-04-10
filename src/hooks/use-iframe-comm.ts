import { useEffect, useCallback, useRef } from "react";

// Predefined message types for consistency
export const IframeMessageTypes = {
  // Child to Parent
  CLOSE_IFRAME: "CLOSE_IFRAME",
  ADD_TO_CART: "ADD_TO_CART",
  REDIRECT_TO_CHECKOUT: "REDIRECT_TO_CHECKOUT",
  REQUEST_DATA: "REQUEST_DATA",
  IFRAME_READY: "IFRAME_READY",
  STATUS_RESPONSE: "STATUS_RESPONSE",
  USER_LOGIN: "USER_LOGIN",
  USER_FORGOT_PASSWORD: "USER_FORGOT_PASSWORD",
  PASSWORD_RESET_SUCCESS: "PASSWORD_RESET_SUCCESS",
  ACCOUNT_ACTIVATED: "ACCOUNT_ACTIVATED",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  PONG: "PONG",

  // Parent to Child
  CUSTOMER_DATA: "CUSTOMER_DATA",
  ADD_TO_CART_STATUS: "ADD_TO_CART_STATUS",
  LOGIN_STATUS: "LOGIN_STATUS",
  FORGOT_PASSWORD_STATUS: "FORGOT_PASSWORD_STATUS",
  GET_STATUS: "GET_STATUS",
  PING: "PING",

  // Custom events
  CUSTOM_EVENT: "CUSTOM_EVENT",
  ERROR: "ERROR",
  SUCCESS: "SUCCESS",
} as const;

export type IframeMessageType = (typeof IframeMessageTypes)[keyof typeof IframeMessageTypes];

type MessageType = (typeof IframeMessageTypes)[keyof typeof IframeMessageTypes];

export type MessageHandler<TData = Record<string, unknown>> = (
  message: IframeMessage<TData>,
  event: MessageEvent
) => void;

type MessageData<TData = Record<string, unknown>> = {
  message?: string;
} & TData;

export interface IframeMessage<TData = Record<string, unknown>> {
  type: IframeMessageType;
  data?: MessageData<TData>;
  timestamp?: string;
}

type Subscription =
  | { id: number; type: string; listener: MessageHandler }
  | { id: number; predicate: (message: IframeMessage) => boolean; listener: MessageHandler };

function createMessageBus() {
  let nextId = 1;
  const subs = new Map<number, Subscription>();

  function subscribeToType(type: string, listener: MessageHandler) {
    const id = nextId++;
    subs.set(id, { id, type, listener });
    return () => subs.delete(id);
  }

  function subscribe(predicate: (message: IframeMessage) => boolean, listener: MessageHandler) {
    const id = nextId++;
    subs.set(id, { id, predicate, listener });
    return () => subs.delete(id);
  }

  function publish(message: IframeMessage, event: MessageEvent) {
    // fan-out, but only to matching subs
    for (const sub of subs.values()) {
      if ("type" in sub) {
        if (sub.type === message.type) sub.listener(message, event);
      } else {
        if (sub.predicate(message)) sub.listener(message, event);
      }
    }
  }

  return { subscribeToType, subscribe, publish };
}

export interface UseIframeCommOptions {
  targetOrigin?: string;
  allowedOrigins?: string[];
}

export interface UseIframeCommReturn {
  sendMessage: (type: string, data?: MessageData) => void;
  requestData: (dataType: string) => void;
  isInIframe: boolean;
  subscribeToType: (
    type: string,
    listener: (message: IframeMessage, event: MessageEvent) => void
  ) => () => void;
  subscribe: (
    predicate: (message: IframeMessage) => boolean,
    listener: (message: IframeMessage, event: MessageEvent) => void
  ) => () => void;
}

function getReferrerOrigin(): string | null {
  if (!document.referrer) return null;

  try {
    return new URL(document.referrer).origin;
  } catch {
    return null;
  }
}

function matchesOriginPattern(origin: string, pattern: string): boolean {
  if (pattern === origin || pattern === "*") return true;

  const wildcardPattern = pattern.match(/^(https?:\/\/)\*\.(.+)$/i);
  if (!wildcardPattern) return false;

  try {
    const originUrl = new URL(origin);
    const wildcardHost = wildcardPattern[2]?.toLowerCase();
    const wildcardProtocol = wildcardPattern[1]?.toLowerCase();

    if (!wildcardHost || !wildcardProtocol) return false;
    if (originUrl.protocol.toLowerCase() !== wildcardProtocol.replace("://", ":")) return false;

    const originHost = originUrl.hostname.toLowerCase();
    return originHost === wildcardHost || originHost.endsWith(`.${wildcardHost}`);
  } catch {
    return false;
  }
}

function isAllowedOrigin(origin: string, allowedOrigins: string[]): boolean {
  if (allowedOrigins.length === 0) return true;
  return allowedOrigins.some((allowedOrigin) => matchesOriginPattern(origin, allowedOrigin));
}

function resolveTargetOrigin(
  targetOrigin: string | undefined,
  allowedOrigins: string[]
): string | null {
  if (targetOrigin && targetOrigin !== "*") {
    return targetOrigin;
  }

  const referrerOrigin = getReferrerOrigin();
  if (referrerOrigin && isAllowedOrigin(referrerOrigin, allowedOrigins)) {
    return referrerOrigin;
  }

  return allowedOrigins[0] ?? null;
}

const defaultOptions: UseIframeCommOptions = {
  allowedOrigins: [],
};

export const useIframeComm = (options: UseIframeCommOptions = {}): UseIframeCommReturn => {
  const { targetOrigin, allowedOrigins } = { ...defaultOptions, ...options };
  const messageHandlerRef = useRef<((event: MessageEvent) => void) | null>(null);
  const resolvedTargetOriginRef = useRef<string | null>(
    resolveTargetOrigin(targetOrigin, allowedOrigins)
  );

  const busRef = useRef<ReturnType<typeof createMessageBus> | null>(null);
  if (!busRef.current) {
    busRef.current = createMessageBus();
  }

  // Check if we're running inside an iframe
  const isInIframe = window.self !== window.top;

  const sendMessage = useCallback(
    (type: MessageType, data?: MessageData) => {
      const message: IframeMessage = {
        type,
        data,
        timestamp: new Date().toISOString(),
      };

      if (!isInIframe) {
        console.log("Not in iframe, cannot send message to parent", message);
        return;
      }

      const outboundTargetOrigin =
        targetOrigin === "*"
          ? "*"
          : resolvedTargetOriginRef.current ?? resolveTargetOrigin(targetOrigin, allowedOrigins);

      if (!outboundTargetOrigin) {
        console.warn("[useIframeComm] Unable to resolve parent origin, skipping postMessage", type);
        return;
      }

      try {
        window.parent.postMessage(message, outboundTargetOrigin);
        console.log(`Sent message to parent: ${type}`, message);
      } catch (error) {
        console.error("[useIframeComm] Error sending message to parent:", error);
      }
    },
    [allowedOrigins, isInIframe, targetOrigin]
  );

  const requestData = useCallback(
    (dataType: string) => {
      sendMessage("REQUEST_DATA", {
        dataType,
        requester: "child-iframe",
      });
    },
    [sendMessage]
  );

  useEffect(() => {
    resolvedTargetOriginRef.current = resolveTargetOrigin(targetOrigin, allowedOrigins);
  }, [targetOrigin, allowedOrigins]);

  useEffect(() => {
    if (!isInIframe) {
      console.log("Not in iframe, skipping message listener setup");
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      // Validate origin if allowedOrigins is specified
      if (!isAllowedOrigin(event.origin, allowedOrigins)) {
        console.log(`Rejected message from unauthorized origin: ${event.origin}`);
        return;
      }

      if (targetOrigin !== "*") {
        resolvedTargetOriginRef.current = event.origin;
      }

      try {
        const message = event.data as IframeMessage;

        if (!message.type) {
          console.log("Received message without type, ignoring", message);
          return;
        }

        console.log(`Received message from parent: ${message.type}`, message);

        // Handle built-in message types
        switch (message.type) {
          case "PING":
            sendMessage("PONG", { originalTimestamp: message.timestamp });
            break;

          case "GET_STATUS":
            sendMessage("STATUS_RESPONSE", {
              ready: true,
              url: window.location.href,
              timestamp: new Date().toISOString(),
            });
            break;

          default:
            // Let custom handler deal with other message types
            busRef.current?.publish(message, event);
            break;
        }
      } catch (error) {
        console.error("[useIframeComm] Error processing message from parent:", error);
      }
    };

    // Store reference for cleanup
    messageHandlerRef.current = handleMessage;
    window.addEventListener("message", handleMessage);

    console.log("Message listener registered");

    // Cleanup
    return () => {
      if (messageHandlerRef.current) {
        window.removeEventListener("message", messageHandlerRef.current);
        messageHandlerRef.current = null;
        console.log("Message listener removed");
      }
    };
  }, [isInIframe, allowedOrigins, sendMessage, targetOrigin]);

  // Auto-notify ready on mount if in iframe
  useEffect(() => {
    if (isInIframe) {
      // Small delay to ensure parent is ready to receive messages
      const timer = setTimeout(() => {
        sendMessage("IFRAME_READY", {
          url: window.location.href,
          userAgent: navigator.userAgent,
          dimensions: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
        });
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isInIframe, sendMessage]);

  return {
    sendMessage,
    requestData,
    isInIframe,
    subscribeToType: busRef.current.subscribeToType,
    subscribe: busRef.current.subscribe,
  };
};
