import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Sparkles, ArrowUpRight } from "lucide-react";

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
      {/* Modern hero header */}
      <div className="relative overflow-hidden rounded-2xl bg-foreground p-6">
        {/* Animated gradient orbs */}
        <div 
          className="absolute top-0 right-0 w-[200px] h-[200px] rounded-full blur-[80px] animate-pulse"
          style={{ 
            background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
            animationDuration: '4s'
          }}
        />
        <div 
          className="absolute bottom-0 left-0 w-[150px] h-[150px] rounded-full blur-[60px] animate-pulse"
          style={{ 
            background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)',
            animationDuration: '5s',
            animationDelay: '1s'
          }}
        />
        
        {/* Noise texture */}
        <div 
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-background/10 backdrop-blur-sm border border-background/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-background" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-background">Welcome back</h2>
            <p className="text-sm text-background/50">
              Sign in to access your pro account
            </p>
          </div>
        </div>
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login-email" className="text-sm font-medium text-foreground">
            Email
          </Label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-muted flex items-center justify-center transition-colors group-focus-within:bg-foreground">
              <Mail className="w-4 h-4 text-muted-foreground group-focus-within:text-background transition-colors" />
            </div>
            <Input
              id="login-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              className="h-14 pl-14 rounded-xl bg-muted/50 border-border/50 focus:border-foreground/30 focus:bg-muted transition-all text-base"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="login-password" className="text-sm font-medium text-foreground">
            Password
          </Label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-muted flex items-center justify-center transition-colors group-focus-within:bg-foreground">
              <Lock className="w-4 h-4 text-muted-foreground group-focus-within:text-background transition-colors" />
            </div>
            <Input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              className="h-14 pl-14 rounded-xl bg-muted/50 border-border/50 focus:border-foreground/30 focus:bg-muted transition-all text-base"
            />
          </div>
        </div>

        <button className="group inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          Forgot password?
          <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
        </button>
      </div>

      {/* Divider with social hint */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/50" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-background px-3 text-muted-foreground">
            or continue with email
          </span>
        </div>
      </div>

      {/* Trust indicators */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span>Secure login</span>
        </div>
        <div className="w-1 h-1 rounded-full bg-border" />
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span>256-bit encryption</span>
        </div>
      </div>
    </div>
  );
};
