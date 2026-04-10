import { useCallback, useEffect } from "react";
import { useGlobalApp } from "@/contexts";
import { IframeMessageTypes } from "./use-iframe-comm";

export type AddToCartRequestData = {
  id: number;
  quantity?: number;
  requestId?: string;
};

type AddToCartStatusBase = {
  requestId?: string;
};

export type AddToCartStatusData =
  | ({ status: "submitting" } & AddToCartStatusBase)
  | ({ status: "success"; id: number; quantity: number } & AddToCartStatusBase)
  | ({ status: "error"; message: string } & AddToCartStatusBase);

export function createAddToCartRequestId(prefix = "ring"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 1;
  const rounded = Math.floor(quantity);
  return rounded > 0 ? rounded : 1;
}

function normalizeStatusPayload(
  payload: Partial<AddToCartStatusData> | undefined
): AddToCartStatusData | null {
  if (!payload || !payload.status) return null;

  if (payload.status === "submitting") {
    return {
      status: "submitting",
      requestId: payload.requestId,
    };
  }

  if (payload.status === "success") {
    if (!Number.isFinite(payload.id)) return null;

    return {
      status: "success",
      requestId: payload.requestId,
      id: Number(payload.id),
      quantity: sanitizeQuantity(Number(payload.quantity ?? 1)),
    };
  }

  if (payload.status === "error") {
    return {
      status: "error",
      requestId: payload.requestId,
      message:
        typeof payload.message === "string" && payload.message.length > 0
          ? payload.message
          : "Unable to add item.",
    };
  }

  return null;
}

export function useIframeCartBridge(onStatus?: (status: AddToCartStatusData) => void) {
  const { isInIframe, sendMessage, subscribeToType } = useGlobalApp();

  const requestAddToCart = useCallback(
    (variantId: number, quantity = 1, requestId = createAddToCartRequestId()) => {
      if (!Number.isFinite(variantId) || variantId <= 0) {
        throw new Error("A valid Shopify variant ID is required.");
      }

      sendMessage(IframeMessageTypes.ADD_TO_CART, {
        id: Math.floor(variantId),
        quantity: sanitizeQuantity(quantity),
        requestId,
      } satisfies AddToCartRequestData);

      return requestId;
    },
    [sendMessage]
  );

  useEffect(() => {
    if (!onStatus) return;

    const unsubscribe = subscribeToType(IframeMessageTypes.ADD_TO_CART_STATUS, (message) => {
      const normalized = normalizeStatusPayload(message.data as Partial<AddToCartStatusData>);
      if (!normalized) return;
      onStatus(normalized);
    });

    return unsubscribe;
  }, [onStatus, subscribeToType]);

  return {
    isInIframe,
    requestAddToCart,
  };
}
