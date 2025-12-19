import { useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Mail, Lock, Check, Headphones, Users, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { TextSkeleton } from "@/hooks/use-font-loaded";

// Email validation - requires @ symbol
const isValidEmail = (email: string): boolean => {
  return email.trim() !== "" && email.includes("@");
};

// Password Input with Toggle
const PasswordInputField = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  variant = "signin"
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  variant?: "signin" | "signup";
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isSignin = variant === "signin";
  return <div className="space-y-2.5">
      <Label htmlFor={id} className={cn("font-medium label-float transition-all duration-300 text-left block", isSignin ? "text-xs text-muted-foreground uppercase tracking-[0.1em]" : "text-sm")}>
        {label}
      </Label>
    <div className={cn("relative group rounded-form input-ripple", isSignin ? "input-ultra" : "input-glow")}>
        <div className={cn("absolute left-[15px] top-1/2 -translate-y-1/2 rounded-md flex items-center justify-center transition-all duration-500 group-focus-within:shadow-lg group-focus-within:shadow-foreground/10", isSignin ? "w-[35px] h-[35px] bg-gradient-to-br from-muted to-muted/50 group-focus-within:from-foreground group-focus-within:to-foreground/80" : "w-[30px] h-[30px] rounded-form-sm bg-muted group-focus-within:bg-foreground")}>
          <Lock className="w-[15px] h-[15px] text-muted-foreground group-focus-within:text-background transition-all duration-300 icon-haptic" />
        </div>
        <Input id={id} type={showPassword ? "text" : "password"} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} className={cn("pr-[50px] rounded-form transition-all duration-500 focus:shadow-input-focus", isSignin ? "h-input-prominent pl-[60px] bg-muted border-border/30 focus:border-foreground/20 focus:bg-background placeholder:text-muted-foreground/40" : "h-button pl-[55px] bg-muted border-border/50 focus:border-foreground/30 focus:bg-background")} />
        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-[15px] top-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-form-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-300 focus:outline-none haptic-press" aria-label={showPassword ? "Hide password" : "Show password"}>
          {showPassword ? <EyeOff className="w-[16px] h-[16px] transition-transform duration-200 hover:scale-110" /> : <Eye className="w-[16px] h-[16px] transition-transform duration-200 hover:scale-110" />}
        </button>
      </div>
    </div>;
};

interface SignInFormProps {
  email: string;
  password: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSignUp: () => void;
  showForgotPassword: boolean;
  onForgotPasswordToggle: () => void;
  onForgotPasswordSubmit: () => void;
  isSendingReset: boolean;
  fontsLoaded?: boolean;
}

export const SignInForm = ({
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onSignUp,
  showForgotPassword,
  onForgotPasswordToggle,
  onForgotPasswordSubmit,
  isSendingReset,
  fontsLoaded = true
}: SignInFormProps) => {
  const [emailTouched, setEmailTouched] = useState(false);
  const emailIsValid = isValidEmail(email);
  const showEmailError = emailTouched && email.trim() !== "" && !emailIsValid;

  if (showForgotPassword) {
    return (
      <div key="forgot-password" className="space-y-[clamp(15px,4vh,30px)] text-center animate-step-enter-right">
        <div className="space-y-[6px]">
          <h1 className="font-termina font-medium uppercase text-2xl sm:text-3xl md:text-4xl text-foreground leading-[1.1] text-balance">
            {fontsLoaded ? <span className="animate-fade-in-text">Reset password</span> : <TextSkeleton width="70%" height="1.1em" className="mx-auto" />}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground/70 leading-relaxed">
            {fontsLoaded ? <span className="animate-fade-in-text">Enter your email and we'll send you a reset link</span> : <TextSkeleton width="85%" height="1em" className="mx-auto" />}
          </p>
        </div>

        <div className="space-y-[clamp(12px,2.5vh,20px)]">
          <div className="space-y-2.5">
            <Label htmlFor="reset-email" className="text-xs font-medium text-muted-foreground uppercase tracking-[0.1em] label-float transition-all duration-300 group-focus-within:text-foreground text-left block">
              Email address
            </Label>
            <div className={`relative group input-ultra input-ripple rounded-form ${showEmailError ? 'ring-2 ring-destructive/50' : ''}`}>
              <div className={`absolute left-[15px] top-1/2 -translate-y-1/2 w-[35px] h-[35px] rounded-md bg-gradient-to-br ${showEmailError ? 'from-destructive/20 to-destructive/10' : 'from-muted to-muted/50'} flex items-center justify-center transition-all duration-500 group-focus-within:from-foreground group-focus-within:to-foreground/80 group-focus-within:shadow-lg group-focus-within:shadow-foreground/10`}>
                <Mail className={`w-[15px] h-[15px] ${showEmailError ? 'text-destructive' : 'text-muted-foreground'} group-focus-within:text-background transition-all duration-300 icon-haptic`} />
              </div>
              <Input 
                id="reset-email" 
                type="email" 
                placeholder="you@example.com" 
                value={email} 
                onChange={e => onEmailChange(e.target.value)} 
                onBlur={() => setEmailTouched(true)}
                className={`h-input-prominent pl-[60px] rounded-form bg-muted ${showEmailError ? 'border-destructive/50' : 'border-border/30'} focus:border-foreground/20 focus:bg-background transition-all duration-500 placeholder:text-muted-foreground/40 focus:shadow-input-focus`}
              />
            </div>
            {showEmailError && (
              <p className="text-xs text-destructive text-left animate-slide-in-right">Please enter a valid email address</p>
            )}
          </div>

          <Button
            onClick={onForgotPasswordSubmit}
            disabled={!emailIsValid || isSendingReset}
            className="w-full h-button rounded-form bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40 font-medium text-base"
          >
            {isSendingReset ? (
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
          onClick={onForgotPasswordToggle}
          className="flex items-center justify-center gap-2 w-full text-sm text-muted-foreground hover:text-foreground transition-colors pt-2 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" />
          Back to login
        </button>
      </div>
    );
  }

  return (
    <div key="sign-in" className="space-y-[clamp(15px,4vh,30px)] text-center animate-step-enter-left">
      <div className="space-y-[6px]">
        <h1 className="font-termina font-medium uppercase text-2xl sm:text-3xl md:text-4xl text-foreground leading-[1.1] text-balance">
          {fontsLoaded ? <span className="animate-fade-in-text">Welcome back</span> : <TextSkeleton width="65%" height="1.1em" className="mx-auto" />}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground/70 leading-relaxed">
          {fontsLoaded ? <span className="animate-fade-in-text">Login to access your pro account</span> : <TextSkeleton width="75%" height="1em" className="mx-auto" />}
        </p>
      </div>


      <div className="space-y-[clamp(12px,2.5vh,20px)] animate-stagger-3">
        <div className="space-y-2.5">
          <Label htmlFor="login-email" className="text-xs font-medium text-muted-foreground uppercase tracking-[0.1em] label-float transition-all duration-300 group-focus-within:text-foreground text-left block">
            Email address
          </Label>
          <div className={`relative group input-ultra input-ripple rounded-form ${showEmailError ? 'ring-2 ring-destructive/50' : ''}`}>
            <div className={`absolute left-[15px] top-1/2 -translate-y-1/2 w-[35px] h-[35px] rounded-md bg-gradient-to-br ${showEmailError ? 'from-destructive/20 to-destructive/10' : 'from-muted to-muted/50'} flex items-center justify-center transition-all duration-500 group-focus-within:from-foreground group-focus-within:to-foreground/80 group-focus-within:shadow-lg group-focus-within:shadow-foreground/10`}>
              <Mail className={`w-[15px] h-[15px] ${showEmailError ? 'text-destructive' : 'text-muted-foreground'} group-focus-within:text-background transition-all duration-300 icon-haptic`} />
            </div>
            <Input 
              id="login-email" 
              type="email" 
              placeholder="you@example.com" 
              value={email} 
              onChange={e => onEmailChange(e.target.value)} 
              onBlur={() => setEmailTouched(true)}
              className={`h-input-prominent pl-[60px] rounded-form bg-muted ${showEmailError ? 'border-destructive/50' : 'border-border/30'} focus:border-foreground/20 focus:bg-background transition-all duration-500 placeholder:text-muted-foreground/40 focus:shadow-input-focus`}
            />
          </div>
          {showEmailError && (
            <p className="text-xs text-destructive text-left animate-slide-in-right">Please enter a valid email address</p>
          )}
        </div>

        <PasswordInputField id="login-password" label="Password" value={password} onChange={onPasswordChange} placeholder="••••••••" />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <div className="relative w-[18px] h-[18px]">
              <input type="checkbox" className="peer sr-only" />
              <div className="w-full h-full rounded-sm border-2 border-border/50 bg-muted peer-checked:bg-foreground peer-checked:border-foreground transition-all duration-300 peer-focus-visible:ring-2 peer-focus-visible:ring-foreground/20 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background" />
              <Check className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-background opacity-0 peer-checked:opacity-100 transition-opacity duration-200" />
            </div>
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">Remember me</span>
          </label>

          <button onClick={onForgotPasswordToggle} className="group inline-flex items-center gap-[5px] text-sm text-muted-foreground hover:text-foreground transition-all duration-300">
            <span className="relative">
              Forgot password?
              <span className="absolute left-0 bottom-0 w-0 h-px bg-foreground transition-all duration-300 group-hover:w-full" />
            </span>
            <ArrowUpRight className="w-[15px] h-[15px] opacity-0 -translate-x-1 -translate-y-0.5 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-300" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 sm:gap-3 pt-[clamp(6px,1.5vh,12px)] animate-stagger-4">
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

      <p className="text-xs text-muted-foreground text-center pt-1">
        Don't have an account?{" "}
        <button onClick={onSignUp} className="text-foreground underline underline-offset-2 hover:no-underline">
          Apply
        </button>
      </p>
    </div>
  );
};
