import { useEffect, useCallback, useRef } from "react";

type MessageData = {
  message?: string;
} & Record<string, unknown>;

export interface IframeMessage {
  type: string;
  data?: MessageData;
  timestamp?: string;
}

export interface UseIframeCommOptions {
  targetOrigin?: string;
  allowedOrigins?: string[];
  onMessage?: (message: IframeMessage, event: MessageEvent) => void;
  debug?: boolean;
}

export interface UseIframeCommReturn {
  sendMessage: (type: string, data?: MessageData) => void;
  closeIframe: () => void;
  requestData: (dataType: string) => void;
  notifyReady: () => void;
  isInIframe: boolean;
}

const defaultOptions: UseIframeCommOptions = {
  targetOrigin: "*",
  allowedOrigins: [],
  debug: false,
};

export const useIframeComm = (options: UseIframeCommOptions = {}): UseIframeCommReturn => {
  const { targetOrigin, allowedOrigins, onMessage, debug } = { ...defaultOptions, ...options };
  const messageHandlerRef = useRef<((event: MessageEvent) => void) | null>(null);

  // Check if we're running inside an iframe
  const isInIframe = window.self !== window.top;

  // Debug logging function
  const log = useCallback(
    (message: string, data?: IframeMessage) => {
      if (debug) {
        console.log(`[useIframeComm] ${message}`, data || "");
      }
    },
    [debug]
  );

  // Generic message sender
  const sendMessage = useCallback(
    (type: string, data?: MessageData) => {
      if (!isInIframe) {
        log("Not in iframe, cannot send message to parent");
        return;
      }

      const message: IframeMessage = {
        type,
        data,
        timestamp: new Date().toISOString(),
      };

      try {
        window.parent.postMessage(message, targetOrigin);
        log(`Sent message to parent: ${type}`, message);
      } catch (error) {
        console.error("[useIframeComm] Error sending message to parent:", error);
      }
    },
    [isInIframe, targetOrigin, log]
  );

  // Specific function to request iframe closure
  const closeIframe = useCallback(() => {
    sendMessage("CLOSE_IFRAME", {
      reason: "User requested closure",
      url: window.location.href,
    });
  }, [sendMessage]);

  // Request data from parent
  const requestData = useCallback(
    (dataType: string) => {
      sendMessage("REQUEST_DATA", {
        dataType,
        requester: "child-iframe",
      });
    },
    [sendMessage]
  );

  // Notify parent that iframe is ready
  const notifyReady = useCallback(() => {
    sendMessage("IFRAME_READY", {
      url: window.location.href,
      userAgent: navigator.userAgent,
      dimensions: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    });
  }, [sendMessage]);

  // Handle incoming messages from parent
  useEffect(() => {
    if (!isInIframe) {
      log("Not in iframe, skipping message listener setup");
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      // Validate origin if allowedOrigins is specified
      if (allowedOrigins.length > 0 && !allowedOrigins.includes(event.origin)) {
        log(`Rejected message from unauthorized origin: ${event.origin}`);
        return;
      }

      try {
        const message = event.data as IframeMessage;

        if (!message.type) {
          log("Received message without type, ignoring", message);
          return;
        }

        log(`Received message from parent: ${message.type}`, message);

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

          case "PARENT_DATA":
            log("Received data from parent", message);
            break;

          default:
            // Let custom handler deal with other message types
            if (onMessage) {
              onMessage(message, event);
            }
            break;
        }
      } catch (error) {
        console.error("[useIframeComm] Error processing message from parent:", error);
      }
    };

    // Store reference for cleanup
    messageHandlerRef.current = handleMessage;
    window.addEventListener("message", handleMessage);

    log("Message listener registered");

    // Cleanup
    return () => {
      if (messageHandlerRef.current) {
        window.removeEventListener("message", messageHandlerRef.current);
        messageHandlerRef.current = null;
        log("Message listener removed");
      }
    };
  }, [isInIframe, allowedOrigins, onMessage, sendMessage, log]);

  // Auto-notify ready on mount if in iframe
  useEffect(() => {
    if (isInIframe) {
      // Small delay to ensure parent is ready to receive messages
      const timer = setTimeout(() => {
        notifyReady();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isInIframe, notifyReady]);

  return {
    sendMessage,
    closeIframe,
    requestData,
    notifyReady,
    isInIframe,
  };
};

// Predefined message types for consistency
export const IframeMessageTypes = {
  // Child to Parent
  CLOSE_IFRAME: "CLOSE_IFRAME",
  REQUEST_DATA: "REQUEST_DATA",
  IFRAME_READY: "IFRAME_READY",
  STATUS_RESPONSE: "STATUS_RESPONSE",
  PONG: "PONG",

  // Parent to Child
  PARENT_DATA: "PARENT_DATA",
  GET_STATUS: "GET_STATUS",
  PING: "PING",

  // Custom events
  CUSTOM_EVENT: "CUSTOM_EVENT",
  ERROR: "ERROR",
  SUCCESS: "SUCCESS",
} as const;

export type IframeMessageType = (typeof IframeMessageTypes)[keyof typeof IframeMessageTypes];
