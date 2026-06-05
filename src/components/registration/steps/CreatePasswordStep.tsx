import { useEffect, useState } from "react";
import { Check, Eye, EyeOff, Lock, ShieldCheck, X } from "lucide-react";
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
 * Password requirements — these mirror the zod schema in
 * `auth-schemas.ts → createPasswordValidators`. Keep both in sync so the
 * visual checklist always matches what blocks the user from continuing.
 */
function getPasswordChecks(password: string) {
  return [
    { id: "length", label: "At least 8 characters", passed: password.length >= 8 },
    { id: "lower", label: "One lowercase letter", passed: /[a-z]/.test(password) },
    { id: "upper", label: "One uppercase letter", passed: /[A-Z]/.test(password) },
    { id: "number", label: "One number", passed: /\d/.test(password) },
  ];
}

function RequirementRow({ passed, label }: { passed: boolean; label: string }) {
  return (
    <li className="flex items-center gap-1.5 text-[11px] transition-colors duration-200">
      <span
        className={cn(
          "w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors duration-200",
          passed ? "bg-success/15 text-success" : "bg-muted text-muted-foreground/60"
        )}
      >
        {passed ? <Check className="w-2.5 h-2.5" /> : <X className="w-2 h-2" />}
      </span>
      <span
        className={cn(
          passed ? "text-success" : "text-muted-foreground/70"
        )}
      >
        {label}
      </span>
    </li>
  );
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
    clearErrors,
    setError,
  } = useForm();

  const validationStatus = getStepValidationStatus(currentStep);
  const password = (watch("password") as string | undefined) ?? "";
  const confirmPassword = (watch("confirmPassword") as string | undefined) ?? "";

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const checks = getPasswordChecks(password);
  const allChecksPassed = checks.every((c) => c.passed);
  const passwordValid =
    getValidationStatus("password") === "complete" && allChecksPassed;
  const confirmValid =
    confirmPassword.length > 0 && password === confirmPassword && passwordValid;
  const confirmMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

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
        <div className="space-y-2.5 animate-stagger-2 group">
          <Label
            htmlFor="password"
            className={cn(
              "text-sm font-medium label-float",
              e.password && "text-destructive"
            )}
          >
            Password*
          </Label>
          <div
            className="relative input-glow input-ripple rounded-form"
            data-field-wrapper="password"
          >
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

          {/* Requirements checklist — always visible until every rule is
              satisfied, so the user sees exactly what's still wrong instead
              of relying on a single generic error message. */}
          {!allChecksPassed ? (
            <ul className="space-y-1 pt-1.5" aria-live="polite">
              {checks.map((c) => (
                <RequirementRow key={c.id} passed={c.passed} label={c.label} />
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-success flex items-center gap-1.5 pt-1.5">
              <Check className="w-3 h-3" />
              <span>Password meets all requirements</span>
            </p>
          )}
        </div>

        {/* Confirm password */}
        <div className="space-y-2.5 animate-stagger-3 group">
          <Label
            htmlFor="confirmPassword"
            className={cn(
              "text-sm font-medium label-float",
              e.confirmPassword && "text-destructive"
            )}
          >
            Confirm password*
          </Label>
          <div
            className="relative input-glow input-ripple rounded-form"
            data-field-wrapper="confirmPassword"
          >
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
          {e.confirmPassword?.message ? (
            <p className="text-xs text-destructive">{e.confirmPassword.message}</p>
          ) : confirmMismatch ? (
            <p className="text-xs text-destructive">Passwords do not match</p>
          ) : null}
        </div>
      </div>
    </div>
  );
};
