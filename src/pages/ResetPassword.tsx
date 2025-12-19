import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff, Check, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import logoSvg from "@/assets/logo.svg";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Check if user has a valid session from the reset link
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Invalid or expired reset link");
        navigate("/auth");
      }
    };
    checkSession();
  }, [navigate]);

  const isValidPassword = password.length >= 8;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const canSubmit = isValidPassword && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        toast.error(error.message);
      } else {
        setIsSuccess(true);
        toast.success("Password updated successfully!");
        setTimeout(() => {
          navigate("/auth");
        }, 2000);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to reset password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-background">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <img src={logoSvg} alt="Logo" className="h-10 w-auto" />
        </div>

        {isSuccess ? (
          <div className="text-center space-y-4 animate-fade-in">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">Password Reset Complete</h1>
            <p className="text-muted-foreground">
              Your password has been updated. Redirecting to sign in...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-[-0.02em] text-balance">
                Create new password
              </h1>
              <p className="text-sm text-muted-foreground">
                Enter a new password for your account
              </p>
            </div>

            <div className="space-y-4">
              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-xs font-medium text-muted-foreground uppercase tracking-[0.1em]">
                  New Password
                </Label>
                <div className="relative group">
                  <div className="absolute left-[15px] top-1/2 -translate-y-1/2 w-[35px] h-[35px] rounded-md bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center transition-all duration-500 group-focus-within:from-foreground group-focus-within:to-foreground/80">
                    <Lock className="w-[15px] h-[15px] text-muted-foreground group-focus-within:text-background transition-all duration-300" />
                  </div>
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-input-prominent pl-[60px] pr-[50px] rounded-form bg-muted/30 border-border/30 focus:border-foreground/20 focus:bg-background transition-all duration-500 text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-[15px] top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                  </button>
                </div>
                <p className={cn(
                  "text-xs transition-colors",
                  password.length > 0 && isValidPassword ? "text-green-600" : "text-muted-foreground"
                )}>
                  {password.length > 0 && isValidPassword && <Check className="w-3 h-3 inline mr-1" />}
                  Must be at least 8 characters
                </p>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-xs font-medium text-muted-foreground uppercase tracking-[0.1em]">
                  Confirm Password
                </Label>
                <div className="relative group">
                  <div className="absolute left-[15px] top-1/2 -translate-y-1/2 w-[35px] h-[35px] rounded-md bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center transition-all duration-500 group-focus-within:from-foreground group-focus-within:to-foreground/80">
                    <Lock className="w-[15px] h-[15px] text-muted-foreground group-focus-within:text-background transition-all duration-300" />
                  </div>
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-input-prominent pl-[60px] pr-[50px] rounded-form bg-muted/30 border-border/30 focus:border-foreground/20 focus:bg-background transition-all duration-500 text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-[15px] top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && (
                  <p className={cn(
                    "text-xs transition-colors",
                    passwordsMatch ? "text-green-600" : "text-destructive"
                  )}>
                    {passwordsMatch ? (
                      <><Check className="w-3 h-3 inline mr-1" />Passwords match</>
                    ) : (
                      "Passwords do not match"
                    )}
                  </p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="w-full h-button rounded-form bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40 font-medium text-base"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>

            <button
              type="button"
              onClick={() => navigate("/auth")}
              className="flex items-center justify-center gap-2 w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to sign in
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
