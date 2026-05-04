import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Check, Loader2, AlertTriangle, RefreshCw, ArrowUpRight } from "lucide-react";
import { useAtom } from "jotai";
import { Button } from "@/components/ui/button";
import { FadeText } from "./FadeText";
import { TextInput } from "@/components/TextInput";
import { useGlobalApp } from "@/contexts";
import { useCloseIframe } from "@/hooks/messages";
import { useApiClient } from "@/hooks/use-api-client";
import { customerAtom } from "@/contexts/store";
import { saveStoredSession } from "@/lib/standalone-session";
import { setPendingLogin } from "@/lib/pending-login";
import {
  resetPasswordSchema,
  ResetPasswordFormData,
} from "@/lib/validations/password-schemas";
import { isTrustedShopifyUrl } from "@/lib/trusted-shopify-url";
import { withBasename } from "@/lib/router-basename";
import { getResetEmailHint, clearResetEmailHint } from "@/lib/reset-email-hint";

type FormState =
  | "form"
  | "success"
  | "expired"
  | "invalid"
  | "missing-params"
  | "error"
  | "rate-limited";

interface ResetPasswordFormProps {
  token: string | null;
  customerId: string | null;
  resetUrl?: string | null;
  emailHint?: string | null;
}

type AutoLoginStatus = "idle" | "succeeded" | "failed" | "rate_limited";

export function ResetPasswordForm({ token, customerId, resetUrl, emailHint }: ResetPasswordFormProps) {
  const { isInIframe, sendMessage } = useGlobalApp();
  const { closeIframe } = useCloseIframe();
  const { apiCall } = useApiClient();
  const [, setCustomer] = useAtom(customerAtom);

  // Valid if either a trusted full reset URL is present, or both legacy params.
  // Reject reset_url values that don't point at one of our known Shopify hosts —
  // prevents the iframe from POSTing the user's new password to an attacker-
  // controlled origin if the link was tampered with.
  const resetUrlIsTrusted = !resetUrl || isTrustedShopifyUrl(resetUrl);
  const safeResetUrl = resetUrlIsTrusted ? resetUrl : null;
  const hasParams = !!safeResetUrl || (!!token && !!customerId);
  const [formState, setFormState] = useState<FormState>(
    !resetUrlIsTrusted ? "invalid" : hasParams ? "form" : "missing-params"
  );
  const [serverError, setServerError] = useState<string>("");
  
  const [resetCustomer, setResetCustomer] = useState<{
    firstName: string | null;
    email: string | null;
  }>({ firstName: null, email: null });
  const [autoLoginStatus, setAutoLoginStatus] = useState<AutoLoginStatus>("idle");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async (data) => {
    setServerError("");

    const result = await apiCall<{
      reset: boolean;
      email: string | null;
      firstName: string | null;
      accessToken: string | null;
      expiresAt: string | null;
    }>(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-password`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          safeResetUrl
            ? { resetUrl: safeResetUrl, password: data.password }
            : { customerId, token, password: data.password }
        ),
      }
    );

    if (result.success) {
      // Shopify's Storefront API can return customer.email = null from
      // customerResetByUrl for certain account states / access scopes
      // (legacy customers, etc.). Fall back to the email the user typed
      // into "Forgot password?" earlier in this same browser session,
      // captured by SignInForm via setResetEmailHint().
      const customerEmail =
        result.data?.email ?? emailHint ?? getResetEmailHint() ?? null;
      // Hint is single-use — clear regardless of which path resolved it
      // so a subsequent reset attempt with a different email isn't
      // contaminated.
      clearResetEmailHint();

      setResetCustomer({
        firstName: result.data?.firstName ?? null,
        email: customerEmail,
      });
      sendMessage("PASSWORD_RESET_SUCCESS", {
        customerId,
        email: customerEmail,
      });

      // Defensive: even with the hint fallback, if we still have no email
      // (e.g. user opened the reset link in a different browser/session),
      // there's no way to auto-sign-in. Drop to success with manual-login
      // copy.
      if (!customerEmail) {
        setAutoLoginStatus("failed");
        setFormState("success");
        return;
      }

      setAutoLoginStatus("idle");

      if (isInIframe) {
        // Mark that we're sitting on the success screen so the global
        // CUSTOMER_DATA handler doesn't yank us to /already-logged-in
        // when the parent theme reloads in its newly-authed state.
        try {
          sessionStorage.setItem("dde_on_success_screen", "1");
        } catch {
          // ignore storage failures
        }
        // Iframe: parent Shopify theme owns the storefront session. Fire
        // USER_LOGIN immediately and jump straight to the success screen —
        // mirroring the registration flow (FormDataContext.submitForm).
        // The parent reloads in the background while our success scrim
        // stays on top; CLOSE_IFRAME (on "Close" click) reveals an
        // already-logged-in storefront with no flash. We don't race a
        // CUSTOMER_DATA watchdog because the parent ack arrives via a
        // full reload, not via postback after a reset.
        sendMessage("USER_LOGIN", {
          email: customerEmail,
          password: data.password,
        });
        // Queue same creds for re-flush on closeIframe() — safety net
        // covering races where the parent dropped/ignored the first message.
        setPendingLogin({ email: customerEmail, password: data.password });
        setAutoLoginStatus("succeeded");
        setFormState("success");
      } else {
        // Standalone: prefer the access token returned directly by
        // customerResetByUrl (already a fresh, valid Storefront token).
        // Falls back to a customer-login exchange if Shopify didn't issue
        // one (some legacy account states).
        let accessToken = result.data?.accessToken ?? null;
        let expiresAt = result.data?.expiresAt ?? null;
        let loginFailedCode: number | undefined;

        if (!accessToken) {
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
            accessToken = loginResult.data.accessToken;
            expiresAt = loginResult.data.expiresAt;
          } else {
            loginFailedCode = (loginResult as { statusCode?: number }).statusCode;
          }
        }

        if (accessToken) {
          saveStoredSession({
            accessToken,
            expiresAt: expiresAt ?? undefined,
            email: customerEmail,
            firstName: resetCustomer.firstName,
          });
          setCustomer({
            isLoggedIn: true,
            accessToken,
            expiresAt,
            email: customerEmail,
            firstName: resetCustomer.firstName,
          });
          setAutoLoginStatus("succeeded");
        } else {
          setAutoLoginStatus(loginFailedCode === 429 ? "rate_limited" : "failed");
        }
        // Always reach the success screen — password IS reset; the inline
        // note explains the auto-login outcome if it didn't take.
        setFormState("success");
      }
    } else {
      const failResult = result as { error: string; statusCode: number };
      const errorMsg = failResult.error || "";
      if (errorMsg.includes("expired")) {
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

  // Sends the user back to the sign-in screen where the "Forgot password?"
  // flow lives. Works identically inside the iframe and standalone — the
  // /login route is the canonical entry point for requesting a fresh link.
  const handleRequestNewLink = useCallback(() => {
    window.location.assign(withBasename("/login?forgot=1"));
  }, []);


  // Success state
  if (formState === "success") {
    const autoLoginNote =
      autoLoginStatus === "rate_limited"
        ? "Too many sign-in attempts — please log in manually in a moment."
        : autoLoginStatus === "failed"
          ? "Couldn't sign you in automatically — please log in with your new password."
          : null;

    const ctaLabel = autoLoginStatus === "failed" || autoLoginStatus === "rate_limited"
      ? "Go to login"
      : isInIframe
        ? "Close and continue shopping"
        : "Continue to store";

    const handleSuccessCta = () => {
      if (autoLoginStatus === "failed" || autoLoginStatus === "rate_limited") {
        window.location.href = withBasename("/login");
        return;
      }
      if (isInIframe) {
        closeIframe();
        return;
      }
      window.location.href = withBasename("/");
    };

    return (
      <div className="flex-1 flex flex-col items-center justify-center px-5 md:px-6 lg:px-8 text-center space-y-6 max-w-[38rem] mx-auto w-full animate-step-enter-right">
        <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center">
          <Check className="w-8 h-8 text-success" />
        </div>
        <div className="space-y-2">
          <FadeText as="h1" className="font-termina font-medium uppercase text-2xl sm:text-3xl text-foreground leading-[1.1]">
            {resetCustomer.firstName
              ? `You're all set, ${resetCustomer.firstName}`
              : "Password reset"}
          </FadeText>
          <FadeText as="p" className="text-sm sm:text-base text-muted-foreground/70 leading-relaxed">
            Your password has been changed successfully.
            {autoLoginStatus === "succeeded" ? (
              <> You're signed in{resetCustomer.email ? <> as <span className="text-foreground/80">{resetCustomer.email}</span></> : null}.</>
            ) : (
              <> You can now log in{resetCustomer.email ? <> with <span className="text-foreground/80">{resetCustomer.email}</span></> : <> with your new password</>}.</>
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
            This password reset link has expired. Please request a new one from the login page.
          </FadeText>
        </div>
        <div className="w-full space-y-2">
          <Button
            onClick={handleRequestNewLink}
            className="w-full h-button rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium text-base"
          >
            Request a new link
          </Button>
          <Button
            onClick={handleClose}
            variant="ghost"
            className="w-full h-button rounded-full text-foreground/60 hover:text-foreground hover:bg-transparent font-medium text-sm"
          >
            {isInIframe ? "Close" : "Back to store"}
          </Button>
        </div>
      </div>
    );
  }
  // Invalid / already used state
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
            This reset link is invalid or has already been used. Please request a new password reset.
          </FadeText>
        </div>
        <div className="w-full space-y-2">
          <Button
            onClick={handleRequestNewLink}
            className="w-full h-button rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium text-base"
          >
            Request a new link
          </Button>
          <Button
            onClick={handleClose}
            variant="ghost"
            className="w-full h-button rounded-full text-foreground/60 hover:text-foreground hover:bg-transparent font-medium text-sm"
          >
            {isInIframe ? "Close" : "Back to store"}
          </Button>
        </div>
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
            This link appears to be incomplete. Please use the link from your password reset email.
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

  // Error state (network / unexpected)
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
          Reset Password
        </FadeText>
        <FadeText
          as="p"
          className="text-sm sm:text-base text-muted-foreground/70 leading-relaxed"
        >
          Enter your new password below
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
              New Password
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
              Resetting...
            </>
          ) : (
            "Reset Password"
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
