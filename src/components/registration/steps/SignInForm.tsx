import { ChangeEventHandler, useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Mail,
  Lock,
  Check,
  Headphones,
  Users,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeText } from "../FadeText";
import { useGlobalApp } from "@/contexts";
import { TextInput } from "@/components/TextInput";
import { useForm, UseFormRegister } from "react-hook-form";
import { LoginFormData, loginSchema } from "@/lib/validations/auth-schemas";
import { dirtyFieldOptions } from "../context";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { useNavigate } from "react-router";
import { FormUpdateData, useCustomerLogin } from "@/hooks/messages";
import { resolveSsoPresentation, isSafeReturnUrl } from "@/lib/sso-context";
import { checkCustomerGate } from "@/lib/customer-gate";

export type LoginErrorKind =
  | "no_account"
  | "wrong_password"
  | "unactivated"
  | "rate_limited"
  | "generic";

export type LoginErrorState = {
  kind: LoginErrorKind;
  message: string;
} | null;

type UseSignInFormReturn = {
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  register: UseFormRegister<z.Infer<typeof loginSchema>>;
  watch: ReturnType<typeof useForm<z.Infer<typeof loginSchema>>>["watch"];
  setValue: ReturnType<typeof useForm<z.Infer<typeof loginSchema>>>["setValue"];
  errors: ReturnType<typeof useForm<LoginFormData>>["formState"]["errors"];
  isSubmitting: boolean;
  isPasswordReset: boolean;
  isLoginSuccessful: boolean;
  rememberMe: boolean;
  setRememberMe: React.Dispatch<React.SetStateAction<boolean>>;
  loginError: LoginErrorState;
  forgotPasswordError: LoginErrorState;
  switchToForgotPassword: () => void;
  goToApply: () => void;
  precheckEmailExists: (email: string) => void;
  isPrecheckingEmail: boolean;
};

type SignInFormProps = {
  initialEmail?: string;
};

function useSignInForm(props: SignInFormProps = {}): UseSignInFormReturn {
  const { initialEmail } = props;
  const { setEmail, ssoContext } = useGlobalApp();
  const navigate = useNavigate();
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [isLoginSuccessful, setIsLoginSuccessful] = useState(false);
  const [loginError, setLoginError] = useState<LoginErrorState>(null);
  const [forgotPasswordError, setForgotPasswordError] = useState<LoginErrorState>(null);

  const { register, watch, setValue, formState, handleSubmit, setError, clearErrors, subscribe } =
    useForm<z.Infer<typeof loginSchema>>({
      mode: "onChange",
      defaultValues: {
        email: "",
        password: "",
        formType: "login",
      },
      resolver: zodResolver(loginSchema),
    });
  const { errors } = formState;

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mid-SSO chokepoint: only gate logins that originated from a Circle/Syndicate
  // SSO redirect. Everything else (direct login, account management, etc.) is
  // unaffected — the gate predicate must be false in those cases.
  const isMidSso =
    !!ssoContext &&
    (ssoContext.source === "syndicate" || ssoContext.source === "circle") &&
    isSafeReturnUrl(ssoContext.returnUrl);

  // Classify a parent-supplied error message into a structured kind.
  // Shopify's customer login typically returns generic "Unidentified customer"
  // for both unknown email and wrong password. We pre-flight existence via
  // the customer-gate edge function, so by the time we get here the account
  // is known to exist (or the gate was degraded) — treat as wrong password.
  const classifyLoginError = useCallback((raw: string): LoginErrorState => {
    const msg = (raw || "").toLowerCase();
    if (!msg) {
      return { kind: "generic", message: "Something went wrong. Please try again." };
    }
    if (msg.includes("rate") || msg.includes("too many") || msg.includes("429")) {
      return {
        kind: "rate_limited",
        message: "Too many attempts. Please wait a moment before trying again.",
      };
    }
    if (msg.includes("activate") || msg.includes("not activated") || msg.includes("inactive")) {
      return {
        kind: "unactivated",
        message:
          "Your account hasn't been activated yet. Check your email for the activation link.",
      };
    }
    if (
      msg.includes("unidentified") ||
      msg.includes("invalid") ||
      msg.includes("incorrect") ||
      msg.includes("password") ||
      msg.includes("credentials")
    ) {
      return {
        kind: "wrong_password",
        message: "Incorrect password. Please try again or reset your password.",
      };
    }
    return { kind: "generic", message: raw };
  }, []);

  // Watchdog: parent reports `success` after its login fetch resolves, but in
  // some cross-origin cookie scenarios the session cookie is silently dropped
  // (opaqueredirect / 3rd-party cookie). In that case CUSTOMER_DATA with
  // isLoggedIn:true never arrives. If the watchdog fires, treat it as a
  // failed login and surface "contact support" instead of a stale success.
  const successWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearSuccessWatchdog = useCallback(() => {
    if (successWatchdogRef.current) {
      clearTimeout(successWatchdogRef.current);
      successWatchdogRef.current = null;
    }
  }, []);
  useEffect(() => () => clearSuccessWatchdog(), [clearSuccessWatchdog]);

  const loginUpdate: (message: FormUpdateData) => void = useCallback(
    (message) => {
      if (message.status === "submitting") {
        setIsSubmitting(true);
      } else {
        setIsSubmitting(false);
      }

      if (message.status === "error") {
        clearSuccessWatchdog();
        setIsLoginSuccessful(false);
        setLoginError(classifyLoginError(message.message));
      }

      if (message.status === "success") {
        setLoginError(null);
        setIsLoginSuccessful(true);
        clearSuccessWatchdog();
        successWatchdogRef.current = setTimeout(() => {
          // CUSTOMER_DATA never confirmed login — treat as failure.
          setIsLoginSuccessful(false);
          setIsSubmitting(false);
          setLoginError({
            kind: "generic",
            message:
              "Login failed. Please contact support at hello@dropdeadextensions.com.",
          });
        }, 3000);
      }
    },
    [classifyLoginError, clearSuccessWatchdog]
  );

  const forgotPasswordUpdate: (message: FormUpdateData) => void = useCallback(
    (message) => {
      if (message.status === "submitting") {
        setIsSubmitting(true);
      } else {
        setIsSubmitting(false);
      }

      if (message.status === "error") {
        const raw = (message.message || "").toLowerCase();
        if (raw.includes("rate") || raw.includes("too many") || raw.includes("429")) {
          setForgotPasswordError({
            kind: "rate_limited",
            message: "Too many requests. Please wait a moment before trying again.",
          });
        } else {
          setForgotPasswordError({
            kind: "generic",
            message: message.message || "Couldn't send reset email. Please try again.",
          });
        }
      }

      if (message.status === "success") {
        setForgotPasswordError(null);
        setValue("formType", "login");
        setIsPasswordReset(true);
      }
    },
    [setValue]
  );

  const { login, forgotPassword } = useCustomerLogin({
    loginUpdate,
    forgotPasswordUpdate,
  });

  const email = watch("email");

  // Clear server errors when fields change. The "no_account" error is tied to
  // the email value specifically, so we only clear it when the email actually
  // changes (not when the user edits the password). Other server errors clear
  // on any edit.
  const lastClearedEmailRef = useRef<string>("");
  useEffect(() => {
    const unsubscribe = subscribe({
      formState: {
        values: true,
      },
      callback: ({ values, errors }) => {
        if (errors?.root?.form) {
          clearErrors("root.form");
        }

        const nextEmail = (values?.email || "").trim().toLowerCase();
        if (nextEmail !== lastClearedEmailRef.current) {
          lastClearedEmailRef.current = nextEmail;
          // Clear "no account" guidance the moment the email value changes,
          // before the user submits or re-blurs.
          setLoginError((prev) => (prev?.kind === "no_account" ? null : prev));
          setForgotPasswordError((prev) => (prev?.kind === "no_account" ? null : prev));
        }
      },
    });

    return unsubscribe;
  }, [subscribe, clearErrors]);

  useEffect(() => {
    if (initialEmail) {
      setValue("email", initialEmail, dirtyFieldOptions);
      return;
    }
    // Prefill from a previously remembered email
    try {
      const remembered = localStorage.getItem("dde_remembered_email");
      if (remembered) {
        setValue("email", remembered, dirtyFieldOptions);
      }
    } catch {
      // localStorage may be unavailable (e.g. iframe partitioning) — silently ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync email to global app context. Email is used for uploading files,
  // and shares the email between forms.
  useEffect(() => {
    setEmail(email || "");
  }, [email, setEmail]);

  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem("dde_remembered_email");
    } catch {
      return false;
    }
  });

  const onSubmit = handleSubmit(
    async (data: z.infer<typeof loginSchema>) => {
      // Reset prior structured errors
      setLoginError(null);
      setForgotPasswordError(null);

      if (data.formType === "login") {
        // Persist or clear remembered email based on checkbox
        try {
          if (rememberMe && data.email) {
            localStorage.setItem("dde_remembered_email", data.email);
          } else {
            localStorage.removeItem("dde_remembered_email");
          }
        } catch {
          // Ignore storage errors (private mode / partitioned iframe)
        }

        // Pre-flight: check whether the customer exists in Shopify so we can
        // distinguish "no account" from "wrong password" (Shopify returns the
        // same generic error for both). Fail-open: a degraded gate proceeds
        // with the normal login attempt.
        setIsSubmitting(true);
        const gate = await checkCustomerGate(data.email);

        if (!gate.found && !gate.degraded) {
          setIsSubmitting(false);
          setLoginError({
            kind: "no_account",
            message: "We couldn't find an account with this email.",
          });
          return;
        }

        // Mid-SSO eligibility chokepoint (existing behavior).
        if (isMidSso && gate.found && !gate.eligible) {
          setIsSubmitting(false);
          navigate("/not-eligible", { replace: true });
          return;
        }

        login({
          email: data.email,
          password: data.password,
        });
      }
      if (data.formType === "forgot_password") {
        // Pre-flight: avoid sending a "reset email sent" message when the
        // account doesn't exist. Fail-open if gate is degraded.
        setIsSubmitting(true);
        const gate = await checkCustomerGate(data.email);
        if (!gate.found && !gate.degraded) {
          setIsSubmitting(false);
          setForgotPasswordError({
            kind: "no_account",
            message: "We couldn't find an account with this email.",
          });
          return;
        }

        forgotPassword({
          email: data.email,
        });
      }
    },
    (errors) => {
      console.log("invalid form", errors);
      setError("root.form", {
        type: "validation",
        message: "Please fix the errors above and try again.",
      });
    }
  );

  const switchToForgotPassword = useCallback(() => {
    setLoginError(null);
    setForgotPasswordError(null);
    setValue("formType", "forgot_password");
  }, [setValue]);

  const goToApply = useCallback(() => {
    navigate("/auth");
  }, [navigate]);

  // Lightweight email pre-check on blur. Surfaces a "no account found" error
  // before the user submits, so they don't waste a round trip typing a wrong
  // password or filling in fields for an email that isn't registered. Cached
  // per-email and guarded against stale responses by a request token.
  const [isPrecheckingEmail, setIsPrecheckingEmail] = useState(false);
  const precheckCacheRef = useRef<Map<string, boolean>>(new Map());
  const precheckTokenRef = useRef(0);

  const precheckEmailExists = useCallback(
    (rawEmail: string) => {
      const normalized = (rawEmail || "").trim().toLowerCase();
      // Skip empty / obviously invalid emails — let zod handle that path.
      if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
        return;
      }

      // Cached: synchronously apply, no network call.
      const cached = precheckCacheRef.current.get(normalized);
      if (cached !== undefined) {
        if (cached === false) {
          setLoginError({
            kind: "no_account",
            message: "We couldn't find an account with this email.",
          });
          setForgotPasswordError({
            kind: "no_account",
            message: "We couldn't find an account with this email.",
          });
        }
        return;
      }

      const token = ++precheckTokenRef.current;
      setIsPrecheckingEmail(true);
      checkCustomerGate(normalized)
        .then((gate) => {
          // Stale response — a newer precheck has started or email changed.
          if (token !== precheckTokenRef.current) return;
          // Don't cache degraded results so we'll retry next time.
          if (!gate.degraded) {
            precheckCacheRef.current.set(normalized, gate.found);
          }
          if (!gate.found && !gate.degraded) {
            setLoginError({
              kind: "no_account",
              message: "We couldn't find an account with this email.",
            });
            setForgotPasswordError({
              kind: "no_account",
              message: "We couldn't find an account with this email.",
            });
          }
        })
        .catch(() => {
          // Fail-open: do nothing on errors, the submit path will retry.
        })
        .finally(() => {
          if (token === precheckTokenRef.current) {
            setIsPrecheckingEmail(false);
          }
        });
    },
    []
  );

  return {
    register,
    watch,
    setValue,
    errors,
    onSubmit,
    isSubmitting,
    isPasswordReset,
    isLoginSuccessful,
    rememberMe,
    setRememberMe,
    loginError,
    forgotPasswordError,
    switchToForgotPassword,
    goToApply,
    precheckEmailExists,
    isPrecheckingEmail,
  };
}

export const SignInForm = () => {
  const navigate = useNavigate();
  const { email, ssoContext } = useGlobalApp();
  const ssoPresentation = resolveSsoPresentation(ssoContext);
  const {
    register,
    watch,
    setValue,
    errors,
    onSubmit,
    isSubmitting,
    isPasswordReset,
    isLoginSuccessful,
    rememberMe,
    setRememberMe,
    loginError,
    forgotPasswordError,
    switchToForgotPassword,
    goToApply,
    precheckEmailExists,
  } = useSignInForm({
    initialEmail: email,
  });

  // Run a one-shot precheck once on mount when an initial email is present
  // (e.g. remembered email or hand-off from another form).
  useEffect(() => {
    if (email) {
      precheckEmailExists(email);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    register("formType", { value: "login" });
  }, [register]);

  const showForgotPassword = watch("formType") === "forgot_password";
  const onEmailChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      // Handle email change
      setValue("email", e.target.value, { ...dirtyFieldOptions, shouldValidate: false });
    },
    [setValue]
  );

  const onEmailBlur: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      setValue("email", e.target.value, dirtyFieldOptions);
      precheckEmailExists(e.target.value);
    },
    [setValue, precheckEmailExists]
  );

  if (showForgotPassword) {
    return (
      <form
        key="forgot-password"
        className="flex-1 flex flex-col items-center px-5 md:px-6 lg:px-8 pb-10 lg:pb-5 overflow-y-auto scrollbar-hide pt-2 animate-step-enter-right text-center space-y-[clamp(15px,4vh,30px)] max-w-[38rem] mx-auto w-full"
        onSubmit={onSubmit}
      >
        <div className="space-y-[6px]">
          <FadeText
            as="h1"
            className="font-termina font-medium uppercase text-2xl sm:text-3xl md:text-4xl text-foreground leading-[1.1] text-balance"
          >
            Reset password
          </FadeText>
          <FadeText
            as="p"
            className="text-sm sm:text-base text-muted-foreground/70 leading-relaxed"
          >
            Enter your email and we'll send you a reset link
          </FadeText>
        </div>

        <div className="space-y-[clamp(12px,2.5vh,20px)] w-full">
          <TextInput
            name="email"
            type="email"
            placeholder="you@example.com"
            onChange={onEmailChange}
            onBlur={onEmailBlur}
            value={watch("email")}
            error={errors.email}
            autoComplete="username"
            label={
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-[0.1em] label-float transition-all duration-300 group-focus-within:text-foreground text-left block">
                Email address
              </span>
            }
            prefixIcon={
              <div className="absolute left-[15px] top-1/2 -translate-y-1/2 w-[35px] h-[35px] rounded-md bg-muted flex items-center justify-center transition-all duration-300 group-focus-within:bg-foreground/10">
                <Mail className="w-[15px] h-[15px] text-muted-foreground group-focus-within:text-foreground transition-all duration-300 icon-haptic" />
              </div>
            }
            className="[&>div.input-glow]:input-ultra"
          />

          {forgotPasswordError && (
            <div className="text-destructive text-sm text-left py-2.5 px-3 rounded-form bg-destructive/10 border border-destructive/20 w-full flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p>{forgotPasswordError.message}</p>
                {forgotPasswordError.kind === "no_account" && (
                  <button
                    type="button"
                    onClick={goToApply}
                    className="mt-1 inline-flex items-center gap-1 text-foreground underline underline-offset-2 hover:no-underline font-medium"
                  >
                    Apply for access
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
          {errors?.root?.form?.message && !forgotPasswordError && (
            <div className="text-destructive text-sm text-left py-2 px-3 rounded-form bg-destructive/10 border border-destructive/20 w-full">
              {errors.root.form.message}
            </div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-button rounded-full bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40 font-medium text-base"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              "Send reset link"
            )}
          </Button>
        </div>

        <button
          onClick={() => setValue("formType", "login")}
          className="flex items-center justify-center gap-2 w-full text-sm text-muted-foreground hover:text-foreground transition-colors pt-2 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" />
          Back to login
        </button>
      </form>
    );
  }

  return (
    <div className="max-w-[38rem] mx-auto w-full">
      <form
        key="sign-in"
        className="flex-1 flex flex-col items-center px-5 md:px-[30px] lg:px-[40px] pb-10 lg:pb-[clamp(5px,1vh,20px)] overflow-y-auto scrollbar-hide pt-[30px] md:pt-[10px] animate-step-enter-left text-center space-y-[clamp(10px,2.5vh,30px)]"
        onSubmit={onSubmit}
      >
        <div className="space-y-[5px] pt-[5px]" data-sso-headline-container>
          <FadeText
            as="h1"
            className="font-termina font-medium uppercase text-2xl sm:text-3xl md:text-4xl text-foreground leading-[1.25] text-balance py-[5px]"
            data-sso-headline
          >
            {ssoPresentation?.tagline ?? "Welcome back"}
          </FadeText>
          <FadeText
            as="p"
            className="text-sm sm:text-base text-muted-foreground/70 leading-relaxed"
          >
            {ssoPresentation
              ? "Sign in with your pro account to continue"
              : "Login to access your pro account"}
          </FadeText>
        </div>

        {isPasswordReset && (
          <div className="text-status-green text-sm text-left py-2 px-3 rounded-form bg-status-green/10 border border-status-green/30 w-full">
            Password reset email sent! Check your email for a link to reset your password.
          </div>
        )}

        <div className="space-y-[clamp(12px,2.5vh,20px)] animate-stagger-3 w-full">
          <TextInput
            name="email"
            type="email"
            placeholder="you@example.com"
            error={errors.email}
            onChange={onEmailChange}
            onBlur={onEmailBlur}
            value={watch("email")}
            autoComplete="username"
            label={
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-[0.1em] label-float transition-all duration-300 group-focus-within:text-foreground text-left block">
                Email address
              </span>
            }
            prefixIcon={
              <div className="absolute left-[15px] top-1/2 -translate-y-1/2 w-[35px] h-[35px] rounded-md bg-muted flex items-center justify-center transition-all duration-300 group-focus-within:bg-foreground/10">
                <Mail className="w-[15px] h-[15px] text-muted-foreground group-focus-within:text-foreground transition-all duration-300 icon-haptic" />
              </div>
            }
            className="[&>div.input-glow]:input-ultra"
          />

          <TextInput
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            register={register}
            error={errors.password}
            label={
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-[0.1em] label-float transition-all duration-300 text-left block">
                Password
              </span>
            }
            prefixIcon={
              <div className="absolute left-[15px] top-1/2 -translate-y-1/2 w-[35px] h-[35px] rounded-md bg-muted flex items-center justify-center transition-all duration-300 group-focus-within:bg-foreground/10">
                <Lock className="w-[15px] h-[15px] text-muted-foreground group-focus-within:text-foreground transition-all duration-300 icon-haptic" />
              </div>
            }
            className="[&>div.input-glow]:input-ultra"
          />

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <div className="relative w-[18px] h-[18px]">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <div className="w-full h-full rounded-sm border-2 border-border/50 bg-muted peer-checked:bg-foreground peer-checked:border-foreground transition-all duration-300 peer-focus-visible:ring-2 peer-focus-visible:ring-foreground/20 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background" />
                <Check className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-background opacity-0 peer-checked:opacity-100 transition-opacity duration-200" />
              </div>
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                Remember me
              </span>
            </label>

            <button
              onClick={switchToForgotPassword}
              type="button"
              className="group inline-flex items-center gap-[5px] text-sm text-muted-foreground hover:text-foreground transition-all duration-300"
            >
              <span className="relative">
                Forgot password?
                <span className="absolute left-0 bottom-0 w-0 h-px bg-foreground transition-all duration-300 group-hover:w-full" />
              </span>
              <ArrowUpRight className="w-[15px] h-[15px] opacity-0 -translate-x-1 -translate-y-0.5 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-300" />
            </button>
          </div>
        </div>

        {loginError && (
          <div
            className="text-destructive text-sm text-left py-2.5 px-3 rounded-form bg-destructive/10 border border-destructive/20 w-full flex items-start gap-2"
            role="alert"
            aria-live="polite"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="flex-1 space-y-1">
              <p>{loginError.message}</p>
              {loginError.kind === "no_account" && (
                <button
                  type="button"
                  onClick={goToApply}
                  className="inline-flex items-center gap-1 text-foreground underline underline-offset-2 hover:no-underline font-medium"
                >
                  Apply for access
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
              {loginError.kind === "wrong_password" && (
                <button
                  type="button"
                  onClick={switchToForgotPassword}
                  className="inline-flex items-center gap-1 text-foreground underline underline-offset-2 hover:no-underline font-medium"
                >
                  Reset your password
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
              {loginError.kind === "unactivated" && (
                <a
                  href="mailto:hello@dropdeadextensions.com"
                  className="inline-flex items-center gap-1 text-foreground underline underline-offset-2 hover:no-underline font-medium"
                >
                  Contact support
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        )}
        {errors?.root?.form?.message && !loginError && (
          <div className="text-destructive text-sm text-left py-2 px-3 rounded-form bg-destructive/10 border border-destructive/20 w-full">
            {errors.root.form.message}
          </div>
        )}

        <Button
          type="submit"
          disabled={isSubmitting || isLoginSuccessful}
          className={`w-full h-button rounded-full font-medium text-base py-3 transition-colors ${
            isLoginSuccessful
              ? "bg-success text-success-foreground hover:bg-success/90 disabled:opacity-100"
              : loginError
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40"
          }`}
        >
          {isLoginSuccessful ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Logged In!
            </>
          ) : isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            </>
          ) : loginError ? (
            <>
              <AlertCircle className="w-4 h-4 mr-2" />
              Login failed
            </>
          ) : (
            "Log In"
          )}
        </Button>

        {/* Divider */}
        <div className="w-full flex items-center gap-4 my-[clamp(8px,1.5vh,24px)]">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <span className="text-xs text-muted-foreground/50 uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>

        <div className="text-center">
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-3 font-medium">
            Don't have an account?
          </p>
          <Button
            onClick={() => navigate("/auth")}
            variant="outline"
            className="px-8 w-full h-button rounded-full bg-transparent border-2 border-foreground/20 text-foreground hover:bg-foreground/5 hover:border-foreground/30 font-medium text-base group"
          >
            Apply for Access
            <ArrowUpRight className="w-4 h-4 ml-2 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Button>
        </div>
      </form>

      <div className="flex items-center justify-center gap-2 sm:gap-3 mt-auto pt-[clamp(16px,3vh,64px)] pb-4 animate-stagger-4">
        <a
          href="https://dropdeadextensions.com/pages/contact"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => navigator.vibrate?.(10)}
          className="group flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-transparent border border-foreground/10 hover:border-foreground/20 hover:bg-foreground/5 transition-all duration-300 cursor-pointer active:scale-95"
        >
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-foreground/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <Headphones className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-foreground/70" />
          </div>
          <span className="text-[10px] sm:text-xs font-medium text-foreground/80">Support</span>
          <ArrowUpRight className="w-3 h-3 text-foreground/40 group-hover:text-foreground/70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
        </a>
        <a
          href="https://dropdeadextensions.com/pages/syndicate"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => navigator.vibrate?.(10)}
          className="group flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-transparent border border-foreground/10 hover:border-foreground/20 hover:bg-foreground/5 transition-all duration-300 cursor-pointer active:scale-95"
        >
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-foreground/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-foreground/70" />
          </div>
          <span className="text-[10px] sm:text-xs font-medium text-foreground/80">Community</span>
          <ArrowUpRight className="w-3 h-3 text-foreground/40 group-hover:text-foreground/70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
        </a>
      </div>
    </div>
  );
};
