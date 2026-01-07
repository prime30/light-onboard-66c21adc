import { ChangeEventHandler, useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Mail,
  Lock,
  Check,
  Headphones,
  Users,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextSkeleton } from "../TextSkeleton";
import { useGlobalApp } from "@/contexts";
import { TextInput } from "@/components/TextInput";
import { useForm, UseFormRegister } from "react-hook-form";
import { LoginFormData, loginSchema } from "@/lib/validations/auth-schemas";
import { dirtyFieldOptions } from "../context";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { useNavigate } from "react-router";
import { IframeMessageTypes } from "@/hooks/use-iframe-comm";

type UseSignInFormReturn = {
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  register: UseFormRegister<z.Infer<typeof loginSchema>>;
  watch: ReturnType<typeof useForm<z.Infer<typeof loginSchema>>>["watch"];
  setValue: ReturnType<typeof useForm<z.Infer<typeof loginSchema>>>["setValue"];
  errors: ReturnType<typeof useForm<LoginFormData>>["formState"]["errors"];
  isSubmitting: boolean;
};

type SignInFormProps = {
  initialEmail?: string;
};

function useSignInForm(props: SignInFormProps = {}): UseSignInFormReturn {
  const { initialEmail } = props;
  const { setEmail, sendMessage } = useGlobalApp();
  const { register, watch, setValue, formState, handleSubmit } = useForm<
    z.Infer<typeof loginSchema>
  >({
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
      formType: "login",
    },
    resolver: zodResolver(loginSchema),
  });
  const { errors, isSubmitting } = formState;

  const email = watch("email");

  useEffect(() => {
    if (initialEmail) {
      setValue("email", initialEmail, dirtyFieldOptions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync email to global app context. Email is used for uploading files,
  // and shares the email between forms.
  useEffect(() => {
    setEmail(email || "");
  }, [email, setEmail]);

  const onSubmit = handleSubmit(
    async (data: z.infer<typeof loginSchema>) => {
      console.log("submit", data);
      if (data.formType === "login") {
        sendMessage(IframeMessageTypes.USER_LOGIN, {
          email: data.email,
          password: data.password,
        });
      }
      if (data.formType === "forgot_password") {
        sendMessage(IframeMessageTypes.USER_FORGOT_PASSWORD, {
          email: data.email,
        });
      }
    },
    (errors) => {
      console.log("invalid form", errors);
    }
  );

  return {
    register,
    watch,
    setValue,
    errors,
    onSubmit,
    isSubmitting,
  };
}

export const SignInForm = () => {
  const navigate = useNavigate();
  const { fontsLoaded, email } = useGlobalApp();
  const { register, watch, setValue, errors, onSubmit, isSubmitting } = useSignInForm({
    initialEmail: email,
  });
  const [isSendingReset, setIsSendingReset] = useState(false);

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
      // Handle email blur
      setValue("email", e.target.value, dirtyFieldOptions);
    },
    [setValue]
  );

  if (showForgotPassword) {
    return (
      <div
        key="forgot-password"
        className="flex-1 flex flex-col items-center px-5 md:px-6 lg:px-8 pb-10 lg:pb-5 overflow-y-auto scrollbar-hide pt-2 animate-step-enter-right text-center space-y-[clamp(15px,4vh,30px)]"
      >
        <div className="space-y-[6px]">
          <h1 className="font-termina font-medium uppercase text-2xl sm:text-3xl md:text-4xl text-foreground leading-[1.1] text-balance">
            {fontsLoaded ? (
              <span className="animate-fade-in-text">Reset password</span>
            ) : (
              <TextSkeleton width="70%" height="1.1em" className="mx-auto" />
            )}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground/70 leading-relaxed">
            {fontsLoaded ? (
              <span className="animate-fade-in-text">
                Enter your email and we'll send you a reset link
              </span>
            ) : (
              <TextSkeleton width="85%" height="1em" className="mx-auto" />
            )}
          </p>
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
            label={
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-[0.1em] label-float transition-all duration-300 group-focus-within:text-foreground text-left block">
                Email address
              </span>
            }
            prefixIcon={
              <div className="absolute left-[15px] top-1/2 -translate-y-1/2 w-[35px] h-[35px] rounded-md bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center transition-all duration-500 group-focus-within:from-foreground group-focus-within:to-foreground/80 group-focus-within:shadow-lg group-focus-within:shadow-foreground/10">
                <Mail className="w-[15px] h-[15px] text-muted-foreground group-focus-within:text-background transition-all duration-300 icon-haptic" />
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
      </div>
    );
  }

  return (
    <div>
      <form
        key="sign-in"
        className="flex-1 flex flex-col items-center px-5 md:px-6 lg:px-8 pb-10 lg:pb-5 overflow-y-auto scrollbar-hide pt-2 animate-step-enter-left text-center space-y-[clamp(15px,4vh,30px)]"
        onSubmit={onSubmit}
      >
        <div className="space-y-[6px]">
          <h1 className="font-termina font-medium uppercase text-2xl sm:text-3xl md:text-4xl text-foreground leading-[1.1] text-balance">
            {fontsLoaded ? (
              <span className="animate-fade-in-text">Welcome back</span>
            ) : (
              <TextSkeleton width="65%" height="1.1em" className="mx-auto" />
            )}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground/70 leading-relaxed">
            {fontsLoaded ? (
              <span className="animate-fade-in-text">Login to access your pro account</span>
            ) : (
              <TextSkeleton width="75%" height="1em" className="mx-auto" />
            )}
          </p>
        </div>

        <div className="space-y-[clamp(12px,2.5vh,20px)] animate-stagger-3 w-full">
          <TextInput
            name="email"
            type="email"
            placeholder="you@example.com"
            error={errors.email}
            onChange={onEmailChange}
            onBlur={onEmailBlur}
            value={watch("email")}
            label={
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-[0.1em] label-float transition-all duration-300 group-focus-within:text-foreground text-left block">
                Email address
              </span>
            }
            prefixIcon={
              <div className="absolute left-[15px] top-1/2 -translate-y-1/2 w-[35px] h-[35px] rounded-md bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center transition-all duration-500 group-focus-within:from-foreground group-focus-within:to-foreground/80 group-focus-within:shadow-lg group-focus-within:shadow-foreground/10">
                <Mail className="w-[15px] h-[15px] text-muted-foreground group-focus-within:text-background transition-all duration-300 icon-haptic" />
              </div>
            }
            className="[&>div.input-glow]:input-ultra"
          />

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

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <div className="relative w-[18px] h-[18px]">
                <input type="checkbox" className="peer sr-only" />
                <div className="w-full h-full rounded-sm border-2 border-border/50 bg-muted peer-checked:bg-foreground peer-checked:border-foreground transition-all duration-300 peer-focus-visible:ring-2 peer-focus-visible:ring-foreground/20 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background" />
                <Check className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-background opacity-0 peer-checked:opacity-100 transition-opacity duration-200" />
              </div>
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                Remember me
              </span>
            </label>

            <button
              onClick={() => setValue("formType", "forgot_password")}
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
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-button rounded-full bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40 font-medium text-base py-3"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            </>
          ) : (
            "Log In"
          )}
        </Button>

        {/* Divider */}
        <div className="w-full flex items-center gap-4 my-6">
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

      <div className="h-full flex-grow" />

      <div className="flex items-center justify-center gap-2 sm:gap-3 mt-auto pt-8 pb-4 animate-stagger-4">
        <a
          href="#"
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
          href="#"
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
