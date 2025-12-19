import { useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const PasswordInputField = ({
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
        <Input id={id} type={showPassword ? "text" : "password"} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} className={cn("pr-[50px] rounded-form transition-all duration-500 focus:shadow-[inset_0_0_20px_rgba(0,0,0,0.03)]", isSignin ? "h-input-prominent pl-[60px] bg-muted border-border/30 focus:border-foreground/20 focus:bg-background placeholder:text-muted-foreground/40" : "h-button pl-[55px] bg-muted border-border/50 focus:border-foreground/30 focus:bg-background")} />
        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-[15px] top-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-form-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-300 focus:outline-none haptic-press" aria-label={showPassword ? "Hide password" : "Show password"}>
          {showPassword ? <EyeOff className="w-[16px] h-[16px] transition-transform duration-200 hover:scale-110" /> : <Eye className="w-[16px] h-[16px] transition-transform duration-200 hover:scale-110" />}
        </button>
      </div>
    </div>;
};

// Password strength calculator
export const getPasswordStrength = (password: string): {
  score: number;
  label: string;
  color: string;
} => {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return {
    score: 1,
    label: "Weak",
    color: "bg-red-500"
  };
  if (score <= 2) return {
    score: 2,
    label: "Fair",
    color: "bg-orange-500"
  };
  if (score <= 3) return {
    score: 3,
    label: "Good",
    color: "bg-yellow-500"
  };
  if (score <= 4) return {
    score: 4,
    label: "Strong",
    color: "bg-green-500"
  };
  return {
    score: 5,
    label: "Excellent",
    color: "bg-green-600"
  };
};

export const PasswordStrengthMeter = ({
  password
}: {
  password: string;
}) => {
  const strength = getPasswordStrength(password);
  if (!password) return null;
  return <div className="space-y-2.5 animate-fade-in">
      <div className="flex gap-[5px]">
        {[1, 2, 3, 4, 5].map(level => <div key={level} className={cn("h-[5px] flex-1 rounded-full transition-all duration-300", level <= strength.score ? strength.color : "bg-border")} />)}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Password strength</span>
        <span className={cn("text-xs font-medium", strength.score <= 2 ? "text-red-500" : strength.score <= 3 ? "text-yellow-600" : "text-green-600")}>{strength.label}</span>
      </div>
    </div>;
};
