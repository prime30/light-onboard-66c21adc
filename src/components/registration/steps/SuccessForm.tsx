import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Check, ShoppingBag, Heart, Sparkles, Copy, CheckCheck, Tag, LockOpen, Lock, ArrowRight } from "lucide-react";
import { useCloseIframe } from "@/hooks/messages";
import { Button } from "@/components/ui/button";
import kristiAvatar from "@/assets/avatars/kristi.png";
import { ProWelcomeCard } from "@/components/registration/ProWelcomeCard";
import { useFormData } from "@/components/registration/context";
import { useForm } from "@/components/registration/context/FormContext";
import { useStepContext } from "@/components/registration/context/StepContext";
import { useGlobalApp } from "@/contexts";
import { IframeMessageTypes } from "@/hooks/use-iframe-comm";
import { useAutoApproval, useWelcomeOffer, useFounderCallHighVolumeOnly, useFounderCallEnabled, useGatedOfferEnabled } from "@/lib/app-settings";
import { cn } from "@/lib/utils";
import { formatPhoneNumber } from "@/lib/validations/form-utils";
import { prefetchStep } from "@/lib/step-prefetch";
import { prefetchSlots, defaultScheduleWindow } from "@/lib/calendly-proxy";
import { computeFounderCallEligible } from "@/lib/founder-call-eligibility";
import { resolveParentOrigin } from "@/lib/parent-origin";

export const SuccessForm = () => {
  const { discountCode, discountExpiry, welcomeOfferSettled } = useFormData();
  const { enabled: autoApproved } = useAutoApproval();
  const { enabled: welcomeOfferEnabled } = useWelcomeOffer();
  const { enabled: founderHighVolumeOnly } = useFounderCallHighVolumeOnly();
  const { enabled: founderCallEnabled } = useFounderCallEnabled();
  const { watch, setValue } = useForm();
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
  // offer flow is off: promote SALONTRIAL15 for their first order.
  const { enabled: gatedOfferEnabled } = useGatedOfferEnabled();
  const showSalonTrial15Nudge = gatedOfferEnabled && !founderCallEnabled && !welcomeOfferEnabled;

  // The pro trial code is gated behind BOTH marketing opt-ins captured during
  // registration (texts + email): subscribers see the code, everyone else sees
  // it locked.
  const smsOptedIn = watch("acceptsSmsMarketing") === true;
  const emailOptedIn = watch("acceptsMarketing") === true;
  const smsSubscribed = smsOptedIn && emailOptedIn;

  const phoneNumber = watch("phoneNumber") as string | undefined;
  const formattedPhone = phoneNumber
    ? formatPhoneNumber(phoneNumber, watch("phoneCountryCode") as string | undefined)
    : "";

  // Late opt-in from the success screen: flips the missing consent and, once
  // both are on, re-emits SUBSCRIPTION_STATUS so the parent theme unlocks the
  // 15% off code too.
  const handleLateOptIn = (which: "sms" | "email") => {
    const nextSms = which === "sms" ? true : smsOptedIn;
    const nextEmail = which === "email" ? true : emailOptedIn;
    setValue(which === "sms" ? "acceptsSmsMarketing" : "acceptsMarketing", true, {
      shouldDirty: true,
    });
    if (!isInIframeApp) return;
    try {
      const targetOrigin = resolveParentOrigin();
      if (!targetOrigin) return;
      const unlocked = nextSms && nextEmail;
      window.parent.postMessage(
        {
          type: IframeMessageTypes.SUBSCRIPTION_STATUS,
          data: {
            email: (watch("email") as string | undefined) ?? null,
            phone: phoneNumber ?? null,
            smsSubscribed: nextSms,
            emailSubscribed: nextEmail,
            discountUnlocked: unlocked,
            discountCode: unlocked ? "SALONTRIAL15" : null,
          },
          timestamp: new Date().toISOString(),
        },
        targetOrigin
      );
    } catch (err) {
      console.error("[SuccessForm] Failed to post late SUBSCRIPTION_STATUS:", err);
    }
  };


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
      const values = watch() as { email?: string; accountType?: string; phone?: string };
      const subscriptionPayload = {
        email: values?.email ?? null,
        phone: values?.phone ?? null,
        smsSubscribed: watch("acceptsSmsMarketing") === true,
        emailSubscribed: watch("acceptsMarketing") === true,
        // Both opt-ins required to unlock the pro trial code.
        discountUnlocked: smsSubscribed,
        discountCode: smsSubscribed ? "SALONTRIAL15" : null,
      };
      window.parent.postMessage(
        {
          type: IframeMessageTypes.REGISTRATION_SUCCESS,
          data: {
            email: values?.email,
            accountType: values?.accountType,
            autoApproved: !!autoApproved,
            monthlyOrderVolume: monthlyOrderVolume ?? null,
            founderCallEligible: showFounderCallNudge,
            ...subscriptionPayload,
          },
          timestamp: new Date().toISOString(),
        },
        targetOrigin
      );
      // Dedicated message so the theme can listen for just the marketing
      // subscription state without parsing the registration payload:
      // unlocked -> show the 15% off code, locked -> re-promote the opt-in.
      window.parent.postMessage(
        {
          type: IframeMessageTypes.SUBSCRIPTION_STATUS,
          data: subscriptionPayload,
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

  const closeToShop = () => {
    if (isInIframeClose) {
      closeIframe("registration_complete", {
        founderCallEligible: showFounderCallNudge,
        accountType: accountType ?? null,
        monthlyOrderVolume: monthlyOrderVolume ?? null,
      });
    } else {
      navigate("/");
    }
  };

  // The code lives in memory only, so after a reload nothing will ever settle it.
  const [welcomeOfferTimedOut, setWelcomeOfferTimedOut] = useState(false);
  useEffect(() => {
    if (discountCode || welcomeOfferSettled) return;
    const t = window.setTimeout(() => setWelcomeOfferTimedOut(true), 6000);
    return () => window.clearTimeout(t);
  }, [discountCode, welcomeOfferSettled]);

  const welcomeOfferStatus = discountCode
    ? "ready"
    : welcomeOfferSettled || welcomeOfferTimedOut
      ? "failed"
      : "loading";

  return (
    <div className="space-y-[clamp(12px,2vh,25px)] animate-fade-in text-center">
      {/* Success Icon */}
      <div className="hidden sm:block relative h-[130px] mb-5">
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
        <h1 className="font-termina font-medium uppercase text-2xl md:text-3xl text-foreground tracking-[-0.006em]">
          {autoApproved ? "Welcome to Drop Dead" : "You're all set!"}
        </h1>
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
                    src={kristiAvatar}
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
            ? "bg-muted border-border/50"
            : "bg-muted border-border/50",
        )}
      >
        <div className="flex items-center gap-5">
          <div
            className={cn(
              "w-[50px] h-[50px] rounded-form flex items-center justify-center",
              "bg-foreground",
            )}
          >
            {autoApproved ? (
              <Check className="w-[25px] h-[25px] text-background" strokeWidth={2.5} />
            ) : (
              <Sparkles className="w-[25px] h-[25px] text-background" />
            )}
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">
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
        <ProWelcomeCard
          code={discountCode}
          endsAt={discountExpiry}
          status={welcomeOfferStatus}
          onShop={closeToShop}
        />
      )}

      {!showFounderCallNudge && !welcomeOfferEnabled && (
        <div className="space-y-3 pt-1">
          {showSalonTrial15Nudge && (
            <div className="relative overflow-hidden p-5 rounded-[20px] border border-status-green/30 bg-muted/40 text-left">
              <div
                className="absolute inset-0 pointer-events-none opacity-80"
                style={{
                  background:
                    "linear-gradient(110deg, transparent 25%, hsl(var(--status-green) / 0.32) 50%, transparent 75%)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 4s linear infinite",
                }}
              />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-status-green/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-status-green/20 to-transparent" />
              <div className="relative">
              <p className="text-[10px] font-medium text-status-green uppercase tracking-wider">
                {smsSubscribed ? "15% off unlocked" : "Subscriber-only offer"}
              </p>

              <p className="mt-1 text-sm font-semibold text-foreground">
                {smsSubscribed
                  ? "Your SALONTRIAL15 code is ready"
                  : "Subscribe to texts and email to unlock 15% off your first order"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                {smsSubscribed
                  ? "We don't give away free samples - as a premium, small-batch business, every unit matters. Use this code to feel the product in hand, see how it holds up, and invest in extensions you'll trust to offer your clients."
                  : "This 15% off pro trial code is reserved for stylists subscribed to both our texts and emails. Turn on what's missing below and the full code is revealed instantly on this screen."}
              </p>
              {smsSubscribed ? (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText("SALONTRIAL15").then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    });
                  }}
                  style={{ touchAction: "manipulation" }}
                  className="w-full mt-3 flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-dashed border-status-green/40 bg-status-green/5 hover:bg-status-green/10 transition-colors"
                  aria-label="Copy SALONTRIAL15 code"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Tag className="w-3.5 h-3.5 text-status-green shrink-0" />
                    <span className="text-sm font-mono font-semibold text-status-green tracking-wider">
                      SALONTRIAL15
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
                <>
                  <div
                    className="w-full mt-3 flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-dashed border-border bg-muted/60"
                    aria-label="Discount code locked"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm font-mono font-semibold text-muted-foreground tracking-wider">
                        SALON•••••15
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">Locked</span>
                  </div>

                  {/* Late opt-in: let them fix whatever is missing without
                      leaving the success screen. */}
                  <div className="mt-3 space-y-2">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      Still missing
                    </p>
                    {!smsOptedIn && (
                      <button
                        type="button"
                        onClick={() => handleLateOptIn("sms")}
                        style={{ touchAction: "manipulation" }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border bg-background/70 hover:bg-foreground/[0.03] transition-colors text-left"
                      >
                        <span className="w-[18px] h-[18px] rounded-md border border-muted-foreground/30 bg-muted shrink-0" />
                        <span className="text-xs text-foreground">
                          Subscribe to texts
                          {formattedPhone ? ` at ${formattedPhone}` : ""}
                        </span>
                      </button>
                    )}
                    {!emailOptedIn && (
                      <button
                        type="button"
                        onClick={() => handleLateOptIn("email")}
                        style={{ touchAction: "manipulation" }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border bg-background/70 hover:bg-foreground/[0.03] transition-colors text-left"
                      >
                        <span className="w-[18px] h-[18px] rounded-md border border-muted-foreground/30 bg-muted shrink-0" />
                        <span className="text-xs text-foreground">Subscribe to emails</span>
                      </button>
                    )}
                    <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                      Message and data rates may apply. Unsubscribe any time by replying STOP or
                      using the unsubscribe link.
                    </p>
                  </div>
                </>
              )}
              </div>
            </div>

          )}
          <Button
            type="button"
            onClick={closeToShop}
            className="w-full h-12 min-h-12 touch-manipulation rounded-form group"
          >
            <span className="flex items-center justify-center gap-2">
              You are approved. Go to shop
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Button>
          <div className="flex items-center justify-center gap-1.5 text-muted-foreground/70">
            <LockOpen className="w-3 h-3" />
            <span className="text-[11px]">Pro pricing unlocked</span>
          </div>
        </div>
      )}

    </div>

  );
};
