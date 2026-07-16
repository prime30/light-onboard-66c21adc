import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { useNavigate } from "react-router";
import { Check, ShoppingBag, Heart, Sparkles, Clock, Copy, CheckCheck, Tag, Calendar, LockOpen, ArrowRight } from "lucide-react";
import { useCloseIframe } from "@/hooks/messages";
import { Button } from "@/components/ui/button";
import { useCountdown } from "@/hooks/use-countdown";
import {
  AddToCartStatusData,
  createAddToCartRequestId,
  useIframeCartBridge,
} from "@/hooks/use-iframe-cart";
import colorRingProduct from "@/assets/color-ring-product.png";
import kristiAvatar from "@/assets/avatars/kristi.png.asset.json";
import { useFormData } from "@/components/registration/context";
import { useForm } from "@/components/registration/context/FormContext";
import { useStepContext } from "@/components/registration/context/StepContext";
import { useGlobalApp } from "@/contexts";
import { IframeMessageTypes } from "@/hooks/use-iframe-comm";
import { useAutoApproval, useWelcomeOffer, useFounderCallHighVolumeOnly, useFounderCallEnabled } from "@/lib/app-settings";
import { cn } from "@/lib/utils";
import { prefetchStep } from "@/lib/step-prefetch";
import { prefetchSlots, defaultScheduleWindow } from "@/lib/calendly-proxy";
import { computeFounderCallEligible } from "@/lib/founder-call-eligibility";
import { resolveParentOrigin } from "@/lib/parent-origin";




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
  const { enabled: autoApproved } = useAutoApproval();
  const { enabled: welcomeOfferEnabled } = useWelcomeOffer();
  const { enabled: founderHighVolumeOnly } = useFounderCallHighVolumeOnly();
  const { enabled: founderCallEnabled } = useFounderCallEnabled();
  const { watch } = useForm();
  const { isInIframe: isInIframeApp } = useGlobalApp();
  const navigate = useNavigate();
  const { setCurrentStep } = useStepContext();
  const { closeIframe, isInIframe: isInIframeClose } = useCloseIframe();

  // Founder call eligibility: when admin gates it to ordering customers,
  // Stylists / Salon owners / Licensed stylists with at least 1 order/mo
  // (1-5, 6-10, 10+) see the nudge.
  const accountType = watch("accountType") as string | undefined;
  const monthlyOrderVolume = watch("monthlyOrderVolume") as string | undefined;
  // (high-volume status is encoded inside computeFounderCallEligible)
  const showFounderCallNudge = founderCallEnabled && computeFounderCallEligible({
    accountType,
    monthlyOrderVolume,
    founderHighVolumeOnly: founderHighVolumeOnly,
    welcomeOfferEnabled: welcomeOfferEnabled,
  });

  // Fallback nudge when founder call is globally disabled and the welcome
  // offer flow is off: promote SALONTRIAL20 for their first order.
  const showSalonTrial20Nudge = !founderCallEnabled && !welcomeOfferEnabled;


  // Use real server expiry if available, otherwise count down 48h from mount
  const countdown = useCountdown(discountExpiry ?? 48);

  // Fire REGISTRATION_SUCCESS once on mount so the parent theme can flag the
  // session as a brand-new approved registration. The CLOSE_IFRAME message
  // sent later carries reason: "registration_complete" - together the theme
  // can route the user to its own welcome/success page after the modal closes.
  useEffect(() => {
    if (!isInIframeApp) return;
    try {
      const targetOrigin = resolveParentOrigin();
      if (!targetOrigin) {
        console.warn("[SuccessForm] Parent origin not allowlisted; skipping REGISTRATION_SUCCESS");
        return;
      }
      const values = watch() as { email?: string; accountType?: string };
      window.parent.postMessage(
        {
          type: IframeMessageTypes.REGISTRATION_SUCCESS,
          data: {
            email: values?.email,
            accountType: values?.accountType,
            autoApproved: !!autoApproved,
            monthlyOrderVolume: monthlyOrderVolume ?? null,
            founderCallEligible: showFounderCallNudge,
          },
          timestamp: new Date().toISOString(),
        },
        targetOrigin
      );
    } catch (err) {
      console.error("[SuccessForm] Failed to post REGISTRATION_SUCCESS:", err);
    }
    // Intentionally fire once on mount - re-renders should not re-emit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prefetch the schedule step chunk + first week of Calendly slots so that
  // tapping "Accept the invitation" navigates to a fully-ready calendar with
  // no network wait.
  useEffect(() => {
    prefetchStep("schedule");
    prefetchStep("schedule-confirmed");
    const { start, end } = defaultScheduleWindow();
    prefetchSlots(start, end);
    // Also warm the following week - ScheduleStep eagerly fetches it too.
    const nextStart = new Date(start);
    nextStart.setUTCDate(nextStart.getUTCDate() + 7);
    const nextEnd = new Date(nextStart);
    nextEnd.setUTCDate(nextEnd.getUTCDate() + 6);
    const ymd = (d: Date) => d.toISOString().slice(0, 10);
    prefetchSlots(ymd(nextStart), ymd(nextEnd));
  }, []);

  const [copied, setCopied] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [atcState, dispatch] = useReducer(atcReducer, initialAtcState);

  // Mark that the user is on the welcome-offer/success screen so that any
  // late-arriving CUSTOMER_DATA (isLoggedIn=true) from the parent - which
  // happens a few seconds after auto-approval activates the Shopify customer
  // - does NOT navigate the user away to the "already logged in" page. They
  // should be free to stay on this screen as long as they want.
  useEffect(() => {
    try {
      sessionStorage.setItem("dde_on_success_screen", "1");
    } catch {
      // ignore storage failures
    }
    return () => {
      try {
        sessionStorage.removeItem("dde_on_success_screen");
      } catch {
        // ignore
      }
    };
  }, []);

  const colorRingVariantId = useMemo(() => {
    // Default variant ID for the Color Ring product (Shopify production store).
    // Can be overridden via VITE_COLOR_RING_VARIANT_ID build env var.
    const DEFAULT_COLOR_RING_VARIANT_ID = 47854762524989;
    const fromEnv = Number(import.meta.env.VITE_COLOR_RING_VARIANT_ID ?? "");
    const parsed = Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_COLOR_RING_VARIANT_ID;
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
          {autoApproved ? "Welcome to Drop Dead" : "You're all set!"}
        </h1>
        <p className="text-muted-foreground">
          {autoApproved
            ? "You're approved. Your pro account is active and ready to shop wholesale pricing."
            : "Your account has been successfully submitted. Our team will review and approve or deny your professional account within 24 hours."}
        </p>
      </div>

      {showFounderCallNudge && (
        /* Founder Call - personal invitation */
        <div id="success-offer-section" className="space-y-3">

          <div className="relative rounded-form border border-border/60 bg-muted/30 overflow-hidden text-left">
            {/* soft prestige ring */}
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-px rounded-form opacity-60"
              style={{
                background:
                  "radial-gradient(120% 60% at 50% 0%, hsl(var(--foreground)/0.05), transparent 60%)",
              }}
            />

            <div className="relative px-5 pt-6 pb-5">
              <p className="font-mono-eyebrow text-[10px] text-muted-foreground">
                <span className="line-through decoration-foreground/30">
                  $299
                </span>{" "}
                <span className="inline-flex items-center rounded-full bg-foreground px-2 py-0.5 text-[9px] font-medium text-background uppercase tracking-wide">
                  Free
                </span>
              </p>

              <h3 className="mt-2 text-[22px] leading-[1.15] font-medium text-foreground tracking-[-0.01em]">
                You're invited: Strategy Session with the Founder
              </h3>

              <p className="mt-3 text-[15px] font-medium text-foreground leading-relaxed">
                Make extensions a winning business model{" "}
                {accountType === "salon" ? "in your salon." : "behind the chair."}
              </p>

              <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">
                Book a free 30-minute call with Kristi to map out how extensions
                can become a real revenue driver{" "}
                {accountType === "salon"
                  ? "inside your salon."
                  : "behind your chair."}
              </p>

              {/* Kristi - signature row */}
              <div className="mt-5 flex items-center gap-4 pb-5 border-b border-dashed border-border/70">
                <a
                  href="https://www.instagram.com/dropdeadkristi/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Kristi on Instagram"
                  className="block relative w-14 h-14 rounded-full overflow-hidden shrink-0 shadow-[0_10px_24px_-10px_hsl(var(--foreground)/0.5)]"
                >
                  <img
                    src={kristiAvatar.url}
                    alt="Kristi, founder"
                    className="w-full h-full object-cover"
                  />
                </a>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground leading-tight">
                    Kristi, Founder
                  </p>
                  <a
                    href="https://www.instagram.com/dropdeadkristi/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-[12px] text-foreground/80 hover:text-foreground underline decoration-foreground/30 underline-offset-2 leading-tight mt-0.5"
                  >
                    @dropdeadkristi
                  </a>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                    30 min · video call · complimentary
                  </p>
                </div>
              </div>

              <p className="mt-5 text-[13px] text-muted-foreground leading-relaxed">
                Plus get your questions answered about:
              </p>

              {/* what's covered - refined inline list */}
              <ul className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-foreground/80">
                {[
                  "Pro benefits",
                  "Product walkthrough",
                  "Ethical standards",
                  "Pricing",
                  "Shipping & fulfillment times",
                  "Education & classes",
                  "Replacement & troubleshooting",
                ].map((item) => (
                  <li
                    key={item}
                    className="px-2.5 py-1 rounded-full bg-muted/50 border border-border/60"
                  >
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (isInIframeClose) {
                      closeIframe("registration_complete", {
                        founderCallEligible: showFounderCallNudge,
                        accountType: accountType ?? null,
                        monthlyOrderVolume: monthlyOrderVolume ?? null,
                        declinedFounderCall: true,
                      });
                    } else {
                      navigate("/");
                    }
                  }}
                  className="h-12 min-h-12 touch-manipulation rounded-form bg-background border-foreground"
                >
                  No thanks
                </Button>

                <Button
                  type="button"
                  onClick={() => setCurrentStep("schedule")}
                  className="h-12 min-h-12 touch-manipulation rounded-form group relative overflow-hidden"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    Accept the invitation
                  </span>
                  <span
                    aria-hidden
                    className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-background/15 to-transparent"
                  />
                </Button>
              </div>

              <p className="mt-3 text-center font-mono-eyebrow text-[10px] text-muted-foreground/80">
                Reserved for new pros · limited weekly slots
              </p>


            </div>
          </div>
        </div>
      )}

      {/* Pro Member */}
      <div
        className={cn(
          "p-5 rounded-[20px] border",
          autoApproved
            ? "bg-success/10 border-success/30"
            : "bg-muted border-border/50",
        )}
      >
        <div className="flex items-center gap-5">
          <div
            className={cn(
              "w-[50px] h-[50px] rounded-form flex items-center justify-center",
              autoApproved ? "bg-success" : "bg-foreground",
            )}
          >
            {autoApproved ? (
              <Check className="w-[25px] h-[25px] text-success-foreground" strokeWidth={2.5} />
            ) : (
              <Sparkles className="w-[25px] h-[25px] text-background" />
            )}
          </div>
          <div className="text-left">
            <p
              className={cn(
                "text-sm font-medium",
                autoApproved ? "text-success" : "text-foreground",
              )}
            >
              {autoApproved ? "Pro account active" : "Pro Member"}
            </p>
            <p className="text-xs text-muted-foreground">
              {autoApproved
                ? "A confirmation has been sent to your inbox"
                : "Confirmation email will be sent to your inbox"}
            </p>
          </div>
        </div>
      </div>

      {welcomeOfferEnabled && (
        /* First Purchase Upsell - Color Ring discount */
        <div id="success-offer-section" className="space-y-3">
          {/* Title and Timer */}
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">
              {autoApproved ? "Your welcome offer" : "Offer while you wait"}
            </p>
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
      )}

      {!showFounderCallNudge && !welcomeOfferEnabled && (
        <div className="space-y-3 pt-1">
          {showSalonTrial20Nudge && (
            <div className="p-5 rounded-[20px] border border-promo-green/10 bg-promo-mint text-left">
              {/* Perk tag */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-mint-tag border border-promo-green/10">
                <Tag className="w-3.5 h-3.5 text-promo-green-soft" />
                <span className="text-[10px] font-medium text-promo-green uppercase tracking-wider">
                  First-order perk
                </span>
              </div>

              <p className="mt-3 text-[22px] leading-[1.15] font-medium text-foreground tracking-[-0.01em]">
                20% off your first order
              </p>

              <p className="mt-1.5 text-[15px] font-medium text-promo-green leading-relaxed">
                That's about $47.20 back on this product alone.
              </p>

              <p className="mt-3 text-[13px] text-muted-foreground leading-relaxed">
                We do not do samples. Your first order is 20% off instead, so you can test real product in real hands: feel the hair, install it, and see how it holds up behind the chair.
              </p>

              {/* CTA row */}
              <div className="mt-5 flex items-stretch gap-3">
                <Button
                  type="button"
                  onClick={() => {
                    if (isInIframeClose) {
                      closeIframe("registration_complete", {
                        founderCallEligible: showFounderCallNudge,
                        accountType: accountType ?? null,
                        monthlyOrderVolume: monthlyOrderVolume ?? null,
                      });
                    } else {
                      navigate("/");
                    }
                  }}
                  className="flex-1 h-12 min-h-12 touch-manipulation rounded-full bg-foreground text-background hover:bg-foreground/90 group"
                >
                  <span className="flex items-center justify-center gap-2">
                    Apply my 20% off
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText("SALONTRIAL20").then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    });
                  }}
                  style={{ touchAction: "manipulation" }}
                  className="shrink-0 flex items-center gap-3 px-4 h-12 rounded-full border border-dashed border-promo-green/30 bg-background hover:bg-background/80 transition-colors"
                  aria-label="Copy SALONTRIAL20 code"
                >
                  <span className="text-sm font-mono font-semibold text-foreground tracking-wider">
                    SALONTRIAL20
                  </span>
                  <span className="w-px h-4 bg-border" />
                  <div className="flex items-center gap-1 text-[11px] text-promo-green-soft shrink-0">
                    {copied ? (
                      <>
                        <CheckCheck className="w-3.5 h-3.5 text-status-green" />
                        <span className="text-status-green">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </div>
                </button>
              </div>

              {/* Risk-free guarantee */}
              <div className="mt-4 p-4 rounded-[14px] border border-promo-green/10 bg-background flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-status-green flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground leading-tight">
                    <span className="inline-flex items-center rounded-full bg-accent-mint-tag px-2 py-0.5 text-[9px] font-medium text-promo-green uppercase tracking-wide mr-2">
                      Risk-free
                    </span>
                    Full refund guarantee
                  </p>
                  <p className="mt-1 text-[12px] text-muted-foreground leading-relaxed">
                    Not the right fit? Get a full refund when the bundle, cord, and product are returned intact and unaltered.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      )}


    </div>

  );
};
