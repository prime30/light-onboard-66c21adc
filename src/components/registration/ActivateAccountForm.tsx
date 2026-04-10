import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Check, Loader2, AlertTriangle, RefreshCw, ArrowUpRight, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeText } from "./FadeText";
import { TextInput } from "@/components/TextInput";
import { useGlobalApp } from "@/contexts";
import { useCloseIframe } from "@/hooks/messages";
import { useApiClient } from "@/hooks/use-api-client";
import {
  activateAccountSchema,
  ActivateAccountFormData,
} from "@/lib/validations/password-schemas";

type FormState = "form" | "success" | "already-active" | "expired" | "invalid" | "missing-params" | "error" | "rate-limited";

interface ActivateAccountFormProps {
  token: string | null;
  customerId: string | null;
}

export function ActivateAccountForm({ token, customerId }: ActivateAccountFormProps) {
  const { isInIframe, sendMessage } = useGlobalApp();
  const { closeIframe } = useCloseIframe();
  const { apiCall } = useApiClient();

  const [formState, setFormState] = useState<FormState>(
    !token || !customerId ? "missing-params" : "form"
  );
  const [serverError, setServerError] = useState<string>("");

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

    const result = await apiCall(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/activate-account`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          token,
          password: data.password,
        }),
      }
    );

    if (result.success) {
      setFormState("success");
      sendMessage("ACCOUNT_ACTIVATED", { customerId });
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
      window.location.href = "/";
    }
  }, [isInIframe, closeIframe]);

  // Success state
  if (formState === "success") {
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
            Your account is ready! You can now log in with your new password.
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
          href="mailto:support@dropdeadextensions.com"
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
          href="mailto:support@dropdeadextensions.com"
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
          href="mailto:support@dropdeadextensions.com"
          className="group flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-transparent border border-foreground/10 hover:border-foreground/20 hover:bg-foreground/5 transition-all duration-300 cursor-pointer active:scale-95"
        >
          <span className="text-[10px] sm:text-xs font-medium text-foreground/80">Need help?</span>
          <ArrowUpRight className="w-3 h-3 text-foreground/40 group-hover:text-foreground/70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
        </a>
      </div>
    </form>
  );
}
