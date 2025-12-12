import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Sparkles } from "lucide-react";

interface LoginStepProps {
  email: string;
  password: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
}

export const LoginStep = ({
  email,
  password,
  onEmailChange,
  onPasswordChange,
}: LoginStepProps) => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Visual header */}
      <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-muted to-accent/10">
        <div className="w-14 h-14 rounded-xl bg-background shadow-soft flex items-center justify-center">
          <Sparkles className="w-7 h-7 text-accent" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Welcome back</h2>
          <p className="text-sm text-muted-foreground">
            Sign in to access your pro account
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login-email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="login-email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              className="h-12 pl-10 rounded-xl bg-muted/50 border-border"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="login-password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="login-password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              className="h-12 pl-10 rounded-xl bg-muted/50 border-border"
            />
          </div>
        </div>

        <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Forgot password?
        </button>
      </div>
    </div>
  );
};
