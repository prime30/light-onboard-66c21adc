import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { Check, ShoppingBag, Heart, Sparkles, Clock, Copy, CheckCheck, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCountdown } from "@/hooks/use-countdown";
import {
  AddToCartStatusData,
  createAddToCartRequestId,
  useIframeCartBridge,
} from "@/hooks/use-iframe-cart";
import colorRingProduct from "@/assets/color-ring-product.png";
import { useFormData } from "@/components/registration/context";

type AtcStatus = "idle" | "submitting" | "success" | "error";
type AtcState = {
  byRequestId: Record<
    string,
    {
      status: AtcStatus;
      message?: string;
      id?: number;
      quantity?: number;
      updatedAt: number;
    }
  >;
};
type AtcAction =
  | {
      type: "ATC_STATUS";
      payload: {
        requestId: string;
        status: "submitting" | "success" | "error";
        message?: string;
        id?: number;
        quantity?: number;
      };
    }
  | { type: "ATC_CLEANUP_OLDER_THAN"; payload: { maxAgeMs: number; now: number } };

const initialAtcState: AtcState = { byRequestId: {} };

function atcReducer(state: AtcState, action: AtcAction): AtcState {
  switch (action.type) {
    case "ATC_STATUS": {
      const { requestId, status, message, id, quantity } = action.payload;
      return {
        ...state,
        byRequestId: {
          ...state.byRequestId,
          [requestId]: {
            status,
            message,
            id,
            quantity,
            updatedAt: Date.now(),
          },
        },
      };
    }
    case "ATC_CLEANUP_OLDER_THAN": {
      const next: AtcState["byRequestId"] = {};
      const cutoff = action.payload.now - action.payload.maxAgeMs;
      for (const [requestId, value] of Object.entries(state.byRequestId)) {
        if (value.updatedAt >= cutoff) {
          next[requestId] = value;
        }
      }
      return { ...state, byRequestId: next };
    }
    default:
      return state;
  }
}

export const SuccessForm = () => {
  const { discountCode, discountExpiry } = useFormData();

  // Use real server expiry if available, otherwise count down 48h from mount
  const countdown = useCountdown(discountExpiry ?? 48);

  const [copied, setCopied] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [atcState, dispatch] = useReducer(atcReducer, initialAtcState);

  const colorRingVariantId = useMemo(() => {
    const parsed = Number(import.meta.env.VITE_COLOR_RING_VARIANT_ID ?? "");
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return Math.floor(parsed);
  }, []);

  const handleCopyCode = useCallback(() => {
    if (!discountCode) return;
    navigator.clipboard.writeText(discountCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [discountCode]);

  const handleAddToCartStatus = useCallback((status: AddToCartStatusData) => {
    if (!status.requestId) return;

    dispatch({
      type: "ATC_STATUS",
      payload: {
        requestId: status.requestId,
        status: status.status,
        message: status.status === "error" ? status.message : undefined,
        id: status.status === "success" ? status.id : undefined,
        quantity: status.status === "success" ? status.quantity : undefined,
      },
    });
  }, []);

  const { isInIframe, requestAddToCart, requestRedirectToCheckout } = useIframeCartBridge(handleAddToCartStatus);

  useEffect(() => {
    const cleanupInterval = window.setInterval(() => {
      dispatch({
        type: "ATC_CLEANUP_OLDER_THAN",
        payload: { maxAgeMs: 5 * 60 * 1000, now: Date.now() },
      });
    }, 60_000);

    return () => window.clearInterval(cleanupInterval);
  }, []);

  const activeStatus = activeRequestId ? atcState.byRequestId[activeRequestId] : undefined;
  const isAddingToCart = activeStatus?.status === "submitting";
  const atcSuccess = activeStatus?.status === "success";

  // After ATC success, redirect parent to checkout with discount pre-applied
  useEffect(() => {
    if (activeStatus?.status !== "success") return;
    const timer = setTimeout(() => {
      requestRedirectToCheckout(discountCode ?? undefined);
    }, 1000);
    return () => clearTimeout(timer);
  }, [activeStatus?.status, discountCode, requestRedirectToCheckout]);

  const handleAddToCart = useCallback(() => {
    const requestId = createAddToCartRequestId("ring-offer");
    setActiveRequestId(requestId);

    if (!isInIframe) {
      dispatch({
        type: "ATC_STATUS",
        payload: {
          requestId,
          status: "error",
          message: "Add to cart is only available in the embedded store modal.",
        },
      });
      return;
    }

    if (!colorRingVariantId) {
      dispatch({
        type: "ATC_STATUS",
        payload: {
          requestId,
          status: "error",
          message: "Color Ring variant ID is not configured.",
        },
      });
      return;
    }

    dispatch({
      type: "ATC_STATUS",
      payload: {
        requestId,
        status: "submitting",
      },
    });

    try {
      requestAddToCart(colorRingVariantId, 1, requestId);
    } catch (error) {
      dispatch({
        type: "ATC_STATUS",
        payload: {
          requestId,
          status: "error",
          message: error instanceof Error ? error.message : "Unable to add item.",
        },
      });
    }
  }, [colorRingVariantId, isInIframe, requestAddToCart]);

  const statusMessage =
    activeStatus?.status === "success"
      ? "Added to cart! Apply your code at checkout."
      : activeStatus?.status === "error"
        ? activeStatus.message
        : activeStatus?.status === "submitting"
          ? "Adding..."
          : null;
  const formatNumber = (num: number) => num.toString().padStart(2, "0");

  return (
    <div className="space-y-[clamp(12px,2vh,25px)] animate-fade-in text-center">
      {/* Success Icon */}
      <div className="relative h-[130px] mb-5">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[100px] h-[100px] rounded-full bg-gradient-to-br from-muted to-accent/20 opacity-60" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[65px] h-[65px] rounded-full bg-foreground flex items-center justify-center">
            <Check className="w-[30px] h-[30px] text-background" strokeWidth={2.5} />
          </div>
        </div>

        {/* Floating decorations */}
        <div
          className="absolute top-2.5 left-1/4 w-[30px] h-[30px] rounded-[10px] bg-muted border border-border flex items-center justify-center animate-fade-in"
          style={{ animationDelay: "0.2s" }}
        >
          <ShoppingBag className="w-[15px] h-[15px] text-muted-foreground" />
        </div>
        <div
          className="absolute top-5 right-1/4 w-[25px] h-[25px] rounded-full bg-muted border border-border flex items-center justify-center animate-fade-in"
          style={{ animationDelay: "0.4s" }}
        >
          <Heart className="w-[15px] h-[15px] text-muted-foreground" />
        </div>
        <div
          className="absolute bottom-2.5 right-1/3 w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center animate-fade-in"
          style={{ animationDelay: "0.6s" }}
        >
          <Sparkles className="w-2.5 h-2.5 text-muted-foreground" />
        </div>
      </div>

      <div className="space-y-2.5">
        <h1 className="text-3xl md:text-4xl font-semibold text-foreground tracking-tight">
          You're all set!
        </h1>
        <p className="text-muted-foreground">
          Your account has been successfully submitted. Our team will review and approve or deny
          your professional account within 24 hours.
        </p>
      </div>

      {/* Pro Member */}
      <div className="p-5 rounded-[20px] bg-muted border border-border/50">
        <div className="flex items-center gap-5">
          <div className="w-[50px] h-[50px] rounded-form bg-foreground flex items-center justify-center">
            <Sparkles className="w-[25px] h-[25px] text-background" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">Pro Member</p>
            <p className="text-xs text-muted-foreground">
              Confirmation email will be sent to your inbox
            </p>
          </div>
        </div>
      </div>

      {/* First Purchase Upsell */}
      <div id="success-offer-section" className="space-y-3">
        {/* Title and Timer */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">Offer while you wait</p>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-accent-red animate-pulse" />
            <div className="flex items-center gap-1 text-[11px] text-accent-red font-semibold tabular-nums">
              <span className="bg-accent-red/10 px-1.5 py-0.5 rounded">
                {formatNumber(countdown.hours)}h
              </span>
              <span>:</span>
              <span className="bg-accent-red/10 px-1.5 py-0.5 rounded">
                {formatNumber(countdown.minutes)}m
              </span>
              <span>:</span>
              <span className="bg-accent-red/10 px-1.5 py-0.5 rounded">
                {formatNumber(countdown.seconds)}s
              </span>
            </div>
          </div>
        </div>

        {/* Product Card */}
        <div className="p-5 rounded-lg bg-gradient-to-br from-accent-red/10 via-muted/50 to-accent-red/5 border border-accent-red/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-accent-red text-background text-[10px] font-semibold px-3 py-1 rounded-bl-xl">
            30% OFF
          </div>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl overflow-hidden border border-border shrink-0">
              <img
                src={colorRingProduct}
                alt="Color Ring Product"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="text-[10px] font-medium text-accent-red uppercase tracking-wider mb-0.5">
                Recommended for you
              </p>
              <p className="text-sm font-semibold text-foreground">Color Ring</p>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                Perfect for matching colors with clients
              </p>
            </div>
          </div>

          {/* Discount Code */}
          {discountCode ? (
            <button
              type="button"
              onClick={handleCopyCode}
              style={{ touchAction: "manipulation" }}
              className="w-full mt-4 flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-dashed border-accent-red/40 bg-accent-red/5 hover:bg-accent-red/10 transition-colors group"
              aria-label="Copy discount code"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Tag className="w-3.5 h-3.5 text-accent-red shrink-0" />
                <span className="text-sm font-mono font-semibold text-accent-red tracking-wider truncate">
                  {discountCode}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
                {copied ? (
                  <>
                    <CheckCheck className="w-3.5 h-3.5 text-status-green" />
                    <span className="text-status-green">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </div>
            </button>
          ) : (
            <div className="w-full mt-4 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-border/50 bg-muted/50">
              <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div className="h-3 w-32 bg-muted-foreground/20 rounded animate-pulse" />
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleAddToCart}
            disabled={isAddingToCart || atcSuccess}
            className="w-full mt-3 h-11 min-h-11 touch-manipulation rounded-xl border-accent-red/30 text-accent-red hover:bg-accent-red/10 hover:text-accent-red group disabled:opacity-100"
          >
            {isAddingToCart ? (
              <div className="w-4 h-4 border-2 border-accent-red/30 border-t-accent-red rounded-full animate-spin" />
            ) : atcSuccess ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Added to Cart
              </>
            ) : (
              <>
                <ShoppingBag className="w-0 h-4 opacity-0 group-hover:w-4 group-hover:opacity-100 group-hover:mr-2 transition-all duration-200" />
                Add to Cart
              </>
            )}
          </Button>
          {statusMessage && (
            <p
              className={
                activeStatus?.status === "error"
                  ? "mt-2 text-xs text-destructive"
                  : "mt-2 text-xs text-status-green"
              }
            >
              {statusMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
