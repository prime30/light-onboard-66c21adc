import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Check, Loader2, AlertTriangle, RefreshCw, ArrowUpRight, UserCheck } from "lucide-react";
import { useAtom } from "jotai";
import { Button } from "@/components/ui/button";
import { FadeText } from "./FadeText";
import { TextInput } from "@/components/TextInput";
import { useGlobalApp } from "@/contexts";
import { useCloseIframe } from "@/hooks/messages";
import { useApiClient } from "@/hooks/use-api-client";
import { customerAtom } from "@/contexts/store";
import { saveStoredSession } from "@/lib/standalone-session";
import {
  activateAccountSchema,
  ActivateAccountFormData,
} from "@/lib/validations/password-schemas";
import { isTrustedShopifyUrl } from "@/lib/trusted-shopify-url";
import { withBasename } from "@/lib/router-basename";
import { getResetEmailHint, clearResetEmailHint } from "@/lib/reset-email-hint";

type FormState =
  | "form"
  | "signing-in"
  | "success"
  | "already-active"
  | "expired"
  | "invalid"
  | "missing-params"
  | "error"
  | "rate-limited";

type AutoLoginStatus = "idle" | "succeeded" | "failed" | "rate_limited";

interface ActivateAccountFormProps {
  token: string | null;
  customerId: string | null;
  activationUrl?: string | null;
}

export function ActivateAccountForm({ token, customerId, activationUrl }: ActivateAccountFormProps) {
  const { isInIframe, sendMessage } = useGlobalApp();
  const { closeIframe } = useCloseIframe();
  const { apiCall } = useApiClient();
  const [customer, setCustomer] = useAtom(customerAtom);

  // Reject activation URLs that don't point to a trusted Shopify host —
  // mirrors the reset flow's URL-origin guard.
  const activationUrlIsTrusted = !activationUrl || isTrustedShopifyUrl(activationUrl);
  const safeActivationUrl = activationUrlIsTrusted ? activationUrl : null;
  const hasParams = !!safeActivationUrl || (!!token && !!customerId);
  const [formState, setFormState] = useState<FormState>(
    !activationUrlIsTrusted ? "invalid" : hasParams ? "form" : "missing-params"
  );
  const [serverError, setServerError] = useState<string>("");
  const [activatedEmail, setActivatedEmail] = useState<string | null>(null);
  const [autoLoginStatus, setAutoLoginStatus] = useState<AutoLoginStatus>("idle");
  const iframeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iframeWatchActive = useRef(false);

  // Iframe auto-login watcher: parent flips customerAtom.isLoggedIn after the
  // theme processes USER_LOGIN; if it doesn't happen in 3s, fall through to
  // the success screen with an inline note.
  useEffect(() => {
    if (!iframeWatchActive.current) return;
    if (formState !== "signing-in") return;
    if (customer.isLoggedIn) {
      iframeWatchActive.current = false;
      if (iframeTimeoutRef.current) clearTimeout(iframeTimeoutRef.current);
      setAutoLoginStatus("succeeded");
      setFormState("success");
    }
  }, [customer.isLoggedIn, formState]);

  useEffect(() => {
    return () => {
      if (iframeTimeoutRef.current) clearTimeout(iframeTimeoutRef.current);
    };
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ActivateAccountFormData>({
    resolver: zodResolver(activateAccountSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async (data) => {
    setServerError("");

    const result = await apiCall<{
      activated: boolean;
      email: string | null;
      firstName: string | null;
    }>(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/activate-account`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          safeActivationUrl
            ? { activationUrl: safeActivationUrl, password: data.password }
            : { customerId, token, password: data.password }
        ),
      }
    );

    if (result.success) {
      // The activate-account edge function does a best-effort Admin API
      // lookup for the email; fall back to the sessionStorage hint
      // (typed earlier into "Forgot password?" or anywhere we set it)
      // so auto-sign-in can still proceed when the Admin API token is
      // unset or the lookup transiently fails.
      const customerEmail =
        result.data?.email ?? getResetEmailHint() ?? null;
      const customerFirstName = result.data?.firstName ?? null;
      clearResetEmailHint();

      setActivatedEmail(customerEmail);
      sendMessage("ACCOUNT_ACTIVATED", { customerId, email: customerEmail });

      // No email anywhere → can't auto-sign-in. Drop straight to the
      // success screen with manual-login copy.
      if (!customerEmail) {
        setAutoLoginStatus("failed");
        setFormState("success");
        return;
      }

      setAutoLoginStatus("idle");

      if (isInIframe) {
        // Iframe: parent theme owns the storefront session. Fire USER_LOGIN
        // and jump straight to the success screen — mirroring registration
        // (FormDataContext.submitForm) and ResetPasswordForm. The parent
        // reloads in the background while our success scrim stays on top;
        // CLOSE_IFRAME on the user's "Close" click reveals an
        // already-logged-in storefront. We don't watchdog on CUSTOMER_DATA
        // because the parent ack arrives via a full reload after a couple
        // of retry attempts (~3-4s worst case), which used to race the
        // 3s timer and surface a false "couldn't auto-sign-in" note.
        sendMessage("USER_LOGIN", {
          email: customerEmail,
          password: data.password,
        });
        setAutoLoginStatus("succeeded");
        setFormState("success");
      } else {
        setFormState("signing-in");
        // Standalone: exchange credentials for a Storefront access token.
        const loginResult = await apiCall<{
          accessToken: string;
          expiresAt: string;
        }>(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/customer-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: customerEmail,
            password: data.password,
          }),
        });

        if (loginResult.success && loginResult.data?.accessToken) {
          saveStoredSession({
            accessToken: loginResult.data.accessToken,
            expiresAt: loginResult.data.expiresAt,
            email: customerEmail,
            firstName: customerFirstName,
          });
          setCustomer({
            isLoggedIn: true,
            accessToken: loginResult.data.accessToken,
            expiresAt: loginResult.data.expiresAt,
            email: customerEmail,
            firstName: customerFirstName,
          });
          setAutoLoginStatus("succeeded");
        } else {
          const failed = loginResult as { statusCode?: number };
          setAutoLoginStatus(failed.statusCode === 429 ? "rate_limited" : "failed");
        }
        setFormState("success");
      }
    } else {
      const failResult = result as { error: string; statusCode: number };
      const errorMsg = failResult.error || "";
      if (errorMsg.includes("already been activated") || errorMsg.includes("already active")) {
        setFormState("already-active");
      } else if (errorMsg.includes("expired")) {
        setFormState("expired");
      } else if (errorMsg.includes("invalid") || errorMsg.includes("already been used")) {
        setFormState("invalid");
      } else if (failResult.statusCode === 429) {
        setFormState("rate-limited");
      } else {
        setServerError(errorMsg);
        setFormState("error");
      }
    }
  });

  const handleRetry = useCallback(() => {
    setServerError("");
    setFormState("form");
  }, []);

  const handleClose = useCallback(() => {
    if (isInIframe) {
      closeIframe();
    } else {
      window.location.href = withBasename("/");
    }
  }, [isInIframe, closeIframe]);


  // Signing-in state (auto-login in progress after activation)
  if (formState === "signing-in") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-5 md:px-6 lg:px-8 text-center space-y-6 max-w-[38rem] mx-auto w-full animate-step-enter-right">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-foreground/70 animate-spin" />
        </div>
        <div className="space-y-2">
          <FadeText as="h1" className="font-termina font-medium uppercase text-2xl sm:text-3xl text-foreground leading-[1.1]">
            Signing you in
          </FadeText>
          <FadeText as="p" className="text-sm sm:text-base text-muted-foreground/70 leading-relaxed">
            Account activated. Logging you in with your new password…
          </FadeText>
        </div>
      </div>
    );
  }

  // Success state
  if (formState === "success") {
    const autoLoginNote =
      autoLoginStatus === "rate_limited"
        ? "Too many sign-in attempts — please log in manually in a moment."
        : autoLoginStatus === "failed"
          ? "Couldn't sign you in automatically — please log in with your new password."
          : null;

    const ctaLabel = isInIframe
      ? "Close"
      : autoLoginStatus === "succeeded"
        ? "Continue to store"
        : "Go to login";

    const handleSuccessCta = () => {
      if (isInIframe) {
        closeIframe();
        return;
      }
      window.location.href = autoLoginStatus === "succeeded" ? "/" : "/login";
    };

    return (
      <div className="flex-1 flex flex-col items-center justify-center px-5 md:px-6 lg:px-8 text-center space-y-6 max-w-[38rem] mx-auto w-full animate-step-enter-right">
        <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center">
          <Check className="w-8 h-8 text-success" />
        </div>
        <div className="space-y-2">
          <FadeText as="h1" className="font-termina font-medium uppercase text-2xl sm:text-3xl text-foreground leading-[1.1]">
            Account Activated
          </FadeText>
          <FadeText as="p" className="text-sm sm:text-base text-muted-foreground/70 leading-relaxed">
            Your account is ready.
            {autoLoginStatus === "succeeded" ? (
              <> You're signed in{activatedEmail ? <> as <span className="text-foreground/80">{activatedEmail}</span></> : null}.</>
            ) : (
              <> You can now log in{activatedEmail ? <> with <span className="text-foreground/80">{activatedEmail}</span></> : <> with your new password</>}.</>
            )}
          </FadeText>
          {autoLoginNote && (
            <FadeText as="p" className="text-xs text-muted-foreground/60 leading-relaxed pt-1">
              {autoLoginNote}
            </FadeText>
          )}
        </div>
        <Button
          onClick={handleSuccessCta}
          className="w-full h-button rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium text-base"
        >
          {ctaLabel}
        </Button>
      </div>
    );
  }

  // Already active state
  if (formState === "already-active") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-5 md:px-6 lg:px-8 text-center space-y-6 max-w-[38rem] mx-auto w-full animate-step-enter-right">
        <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center">
          <UserCheck className="w-8 h-8 text-success" />
        </div>
        <div className="space-y-2">
          <FadeText as="h1" className="font-termina font-medium uppercase text-2xl sm:text-3xl text-foreground leading-[1.1]">
            Already Activated
          </FadeText>
          <FadeText as="p" className="text-sm sm:text-base text-muted-foreground/70 leading-relaxed">
            Your account has already been activated. You can log in with your existing password.
          </FadeText>
        </div>
        <Button
          onClick={handleClose}
          className="w-full h-button rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium text-base"
        >
          {isInIframe ? "Close" : "Go to Login"}
        </Button>
      </div>
    );
  }

  // Expired state
  if (formState === "expired") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-5 md:px-6 lg:px-8 text-center space-y-6 max-w-[38rem] mx-auto w-full animate-step-enter-right">
        <div className="w-16 h-16 rounded-full bg-destructive/15 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <FadeText as="h1" className="font-termina font-medium uppercase text-2xl sm:text-3xl text-foreground leading-[1.1]">
            Link Expired
          </FadeText>
          <FadeText as="p" className="text-sm sm:text-base text-muted-foreground/70 leading-relaxed">
            This activation link has expired. Please contact support for a new link.
          </FadeText>
        </div>
        <a
          href="mailto:hello@dropdeadextensions.com"
          className="w-full"
        >
          <Button className="w-full h-button rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium text-base">
            Contact Support
          </Button>
        </a>
      </div>
    );
  }

  // Invalid state
  if (formState === "invalid") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-5 md:px-6 lg:px-8 text-center space-y-6 max-w-[38rem] mx-auto w-full animate-step-enter-right">
        <div className="w-16 h-16 rounded-full bg-destructive/15 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <FadeText as="h1" className="font-termina font-medium uppercase text-2xl sm:text-3xl text-foreground leading-[1.1]">
            Invalid Link
          </FadeText>
          <FadeText as="p" className="text-sm sm:text-base text-muted-foreground/70 leading-relaxed">
            This activation link is invalid or has already been used. Please contact support for assistance.
          </FadeText>
        </div>
        <a
          href="mailto:hello@dropdeadextensions.com"
          className="w-full"
        >
          <Button className="w-full h-button rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium text-base">
            Contact Support
          </Button>
        </a>
      </div>
    );
  }

  // Missing params state
  if (formState === "missing-params") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-5 md:px-6 lg:px-8 text-center space-y-6 max-w-[38rem] mx-auto w-full animate-step-enter-right">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <FadeText as="h1" className="font-termina font-medium uppercase text-2xl sm:text-3xl text-foreground leading-[1.1]">
            Invalid Link
          </FadeText>
          <FadeText as="p" className="text-sm sm:text-base text-muted-foreground/70 leading-relaxed">
            This link appears to be incomplete. Please use the link from your email.
          </FadeText>
        </div>
        <Button
          onClick={handleClose}
          className="w-full h-button rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium text-base"
        >
          {isInIframe ? "Close" : "Go to Store"}
        </Button>
      </div>
    );
  }

  // Rate limited state
  if (formState === "rate-limited") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-5 md:px-6 lg:px-8 text-center space-y-6 max-w-[38rem] mx-auto w-full animate-step-enter-right">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <FadeText as="h1" className="font-termina font-medium uppercase text-2xl sm:text-3xl text-foreground leading-[1.1]">
            Too Many Attempts
          </FadeText>
          <FadeText as="p" className="text-sm sm:text-base text-muted-foreground/70 leading-relaxed">
            Please wait a moment before trying again.
          </FadeText>
        </div>
        <Button
          onClick={handleRetry}
          className="w-full h-button rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium text-base"
        >
          Try Again
        </Button>
      </div>
    );
  }

  // Error state
  if (formState === "error" && serverError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-5 md:px-6 lg:px-8 text-center space-y-6 max-w-[38rem] mx-auto w-full animate-step-enter-right">
        <div className="w-16 h-16 rounded-full bg-destructive/15 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <FadeText as="h1" className="font-termina font-medium uppercase text-2xl sm:text-3xl text-foreground leading-[1.1]">
            Something Went Wrong
          </FadeText>
          <FadeText as="p" className="text-sm sm:text-base text-muted-foreground/70 leading-relaxed">
            {serverError}
          </FadeText>
        </div>
        <Button
          onClick={handleRetry}
          className="w-full h-button rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium text-base"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  // Form state (default)
  return (
    <form
      className="flex-1 flex flex-col items-center px-5 md:px-6 lg:px-8 pb-10 lg:pb-5 overflow-y-auto scrollbar-hide pt-2 animate-step-enter-right text-center space-y-[clamp(15px,4vh,30px)] max-w-[38rem] mx-auto w-full"
      onSubmit={onSubmit}
    >
      <div className="space-y-[6px]">
        <FadeText
          as="h1"
          className="font-termina font-medium uppercase text-2xl sm:text-3xl md:text-4xl text-foreground leading-[1.1] text-balance"
        >
          Activate Account
        </FadeText>
        <FadeText
          as="p"
          className="text-sm sm:text-base text-muted-foreground/70 leading-relaxed"
        >
          Set a password to activate your account
        </FadeText>
      </div>

      <div className="space-y-[clamp(12px,2.5vh,20px)] w-full">
        <TextInput
          name="password"
          type="password"
          placeholder="••••••••"
          register={register}
          error={errors.password}
          label={
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-[0.1em] label-float transition-all duration-300 text-left block">
              Password
            </span>
          }
          prefixIcon={
            <div className="absolute left-[15px] top-1/2 -translate-y-1/2 w-[35px] h-[35px] rounded-md bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center transition-all duration-500 group-focus-within:from-foreground group-focus-within:to-foreground/80 group-focus-within:shadow-lg group-focus-within:shadow-foreground/10">
              <Lock className="w-[15px] h-[15px] text-muted-foreground group-focus-within:text-background transition-all duration-300 icon-haptic" />
            </div>
          }
          className="[&>div.input-glow]:input-ultra"
        />

        <TextInput
          name="confirmPassword"
          type="password"
          placeholder="••••••••"
          register={register}
          error={errors.confirmPassword}
          label={
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-[0.1em] label-float transition-all duration-300 text-left block">
              Confirm Password
            </span>
          }
          prefixIcon={
            <div className="absolute left-[15px] top-1/2 -translate-y-1/2 w-[35px] h-[35px] rounded-md bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center transition-all duration-500 group-focus-within:from-foreground group-focus-within:to-foreground/80 group-focus-within:shadow-lg group-focus-within:shadow-foreground/10">
              <Lock className="w-[15px] h-[15px] text-muted-foreground group-focus-within:text-background transition-all duration-300 icon-haptic" />
            </div>
          }
          className="[&>div.input-glow]:input-ultra"
        />

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-button rounded-full bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40 font-medium text-base"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Activating...
            </>
          ) : (
            "Activate Account"
          )}
        </Button>
      </div>

      <div className="flex items-center justify-center gap-2 sm:gap-3 mt-auto pt-[clamp(16px,3vh,64px)] pb-4">
        <a
          href="mailto:hello@dropdeadextensions.com"
          className="group flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-transparent border border-foreground/10 hover:border-foreground/20 hover:bg-foreground/5 transition-all duration-300 cursor-pointer active:scale-95"
        >
          <span className="text-[10px] sm:text-xs font-medium text-foreground/80">Need help?</span>
          <ArrowUpRight className="w-3 h-3 text-foreground/40 group-hover:text-foreground/70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
        </a>
      </div>
    </form>
  );
}
