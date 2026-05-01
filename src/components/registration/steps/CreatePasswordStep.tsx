import { useState } from "react";
import { Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CheckMarkIcon } from "@/components/CheckMarkIcon";
import { StepValidationIcon } from "@/components/registration/StepValidationIcon";
import { useForm } from "../context";

function PasswordPrefixIcon({ error }: { error: boolean }) {
  return (
    <div
      className={cn(
        "absolute left-[15px] top-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-form-sm flex items-center justify-center transition-all duration-300 group-focus-within:bg-foreground/10",
        error ? "bg-destructive/10" : "bg-muted"
      )}
    >
      <Lock
        className={cn(
          "w-[15px] h-[15px] group-focus-within:text-foreground transition-all duration-300 icon-haptic",
          error ? "text-destructive" : "text-muted-foreground"
        )}
      />
    </div>
  );
}

/**
 * Password strength meter — purely visual signal, no scoring penalty on submit.
 * Buckets: <8 → weak, 8-11 → fair, 12+ with mixed → strong.
 */
function getStrength(password: string): { score: 0 | 1 | 2 | 3; label: string; tone: string } {
  if (!password) return { score: 0, label: "", tone: "bg-border" };
  if (password.length < 8) return { score: 1, label: "Weak", tone: "bg-destructive" };
  const hasMix =
    /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password);
  if (password.length >= 12 && hasMix) {
    return { score: 3, label: "Strong", tone: "bg-success" };
  }
  return { score: 2, label: "Fair", tone: "bg-amber-500" };
}

export const CreatePasswordStep = () => {
  const {
    register,
    errors,
    watch,
    getValidationStatus,
    currentStep,
    getStepValidationStatus,
    getStepNumber,
  } = useForm();

  const validationStatus = getStepValidationStatus(currentStep);
  const password = (watch("password") as string | undefined) ?? "";
  const confirmPassword = (watch("confirmPassword") as string | undefined) ?? "";

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const strength = getStrength(password);
  const passwordValid = getValidationStatus("password") === "complete";
  const confirmValid =
    confirmPassword.length > 0 && password === confirmPassword && passwordValid;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = errors as any;

  return (
    <div className="space-y-[clamp(12px,2vh,25px)]">
      <div className="space-y-[clamp(5px,1vh,10px)] text-center animate-stagger-1">
        <div className="inline-flex items-center gap-2.5 px-[15px] py-[6px] rounded-full bg-muted border border-border/50 mb-[5px] animate-badge-pop">
          <StepValidationIcon status={validationStatus} />
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
            Step {getStepNumber(currentStep)}
          </span>
        </div>
        <h1 className="font-termina font-medium uppercase text-xl sm:text-2xl md:text-3xl text-foreground leading-[1.1] text-balance">
          Create your password
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground/70 leading-relaxed">
          Used to sign in to your wholesale account.
        </p>
        <p className="text-[10px] text-muted-foreground/60 flex items-center justify-center gap-1.5 pt-1">
          <ShieldCheck className="w-2.5 h-2.5" />
          <span>Stored securely. Never visible to anyone but you.</span>
        </p>
      </div>

      <div className="space-y-5">
        {/* Password */}
        <div className="space-y-2.5 animate-stagger-2 group" data-field-wrapper="password">
          <Label
            htmlFor="password"
            className={cn(
              "text-sm font-medium label-float",
              e.password && "text-destructive"
            )}
          >
            Password*
          </Label>
          <div className="relative input-glow input-ripple rounded-form">
            <PasswordPrefixIcon error={!!e.password} />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              {...register("password")}
              className={cn(
                "h-input rounded-form bg-muted border-border/50 focus:border-foreground/20 focus:bg-background transition-all duration-300 pl-14 pr-20",
                e.password && "border-destructive/50 bg-destructive/5"
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-12 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
            <CheckMarkIcon show={passwordValid} />
          </div>

          {/* Strength meter */}
          {password.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="flex gap-1">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-colors duration-300",
                      strength.score >= i ? strength.tone : "bg-border"
                    )}
                  />
                ))}
              </div>
              <p
                className={cn(
                  "text-[11px] font-medium transition-colors duration-200",
                  strength.score === 1 && "text-destructive",
                  strength.score === 2 && "text-amber-600",
                  strength.score === 3 && "text-success"
                )}
              >
                {strength.label}
              </p>
            </div>
          )}

          {e.password?.message && (
            <p className="text-xs text-destructive">{e.password.message}</p>
          )}
        </div>

        {/* Confirm password */}
        <div className="space-y-2.5 animate-stagger-3 group" data-field-wrapper="confirmPassword">
          <Label
            htmlFor="confirmPassword"
            className={cn(
              "text-sm font-medium label-float",
              e.confirmPassword && "text-destructive"
            )}
          >
            Confirm password*
          </Label>
          <div className="relative input-glow input-ripple rounded-form">
            <PasswordPrefixIcon error={!!e.confirmPassword} />
            <Input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Re-enter your password"
              {...register("confirmPassword")}
              className={cn(
                "h-input rounded-form bg-muted border-border/50 focus:border-foreground/20 focus:bg-background transition-all duration-300 pl-14 pr-20",
                e.confirmPassword && "border-destructive/50 bg-destructive/5"
              )}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-12 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showConfirm ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showConfirm ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
            <CheckMarkIcon show={confirmValid} />
          </div>
          {e.confirmPassword?.message && (
            <p className="text-xs text-destructive">{e.confirmPassword.message}</p>
          )}
        </div>
      </div>
    </div>
  );
};
