import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Loader2, Lock, Settings as SettingsIcon } from "lucide-react";
import { setAdminMode } from "@/lib/admin-mode";

const AdminSettingsPage = () => {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [autoApproval, setAutoApproval] = useState<boolean | null>(null);
  const [updating, setUpdating] = useState(false);
  const [loadingSetting, setLoadingSetting] = useState(true);

  // Load current setting on mount
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("app_settings")
      .select("auto_approval_enabled")
      .eq("singleton", true)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("Failed to load setting:", error);
        }
        setAutoApproval(data?.auto_approval_enabled ?? false);
        setLoadingSetting(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-toggle-setting", {
        body: { email, password },
      });
      if (error || !data?.success) {
        toast({
          title: "Access denied",
          description: "Invalid credentials.",
          variant: "destructive",
        });
        setPassword("");
        return;
      }
      setAuthed(true);
      setAdminMode(true);
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Could not verify credentials.",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleToggle = async (next: boolean) => {
    if (autoApproval === null) return;
    const previous = autoApproval;
    setAutoApproval(next); // optimistic
    setUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-toggle-setting", {
        body: { email, password, autoApprovalEnabled: next },
      });
      if (error || !data?.success) {
        setAutoApproval(previous);
        toast({
          title: "Failed to update",
          description: "Could not save the setting.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: next ? "Auto-approval enabled" : "Auto-approval disabled",
        description: next
          ? "New submissions will see the welcome screen."
          : "New submissions will see the 24-hour review notice.",
      });
    } catch (err) {
      console.error(err);
      setAutoApproval(previous);
      toast({
        title: "Error",
        description: "Could not save the setting.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm space-y-6 p-8 rounded-2xl bg-card border border-border/50 shadow-sm"
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Lock className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Admin Access</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Sign in to manage app settings.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@dropdeadhair.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={verifying}>
            {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign in"}
          </Button>

          <button
            type="button"
            onClick={() => navigate("/auth")}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to app
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-8 pt-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">App Settings</h1>
            <p className="text-sm text-muted-foreground">Signed in as {email}</p>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-card border border-border/50 space-y-4">
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-1">
              <h2 className="text-base font-medium text-foreground">Auto-approve new accounts</h2>
              <p className="text-sm text-muted-foreground">
                When enabled, the final step shows a welcome message instead of the 24-hour
                review notice. Helium approval should be configured separately.
              </p>
            </div>
            {loadingSetting || autoApproval === null ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground shrink-0 mt-1" />
            ) : (
              <Switch
                checked={autoApproval}
                onCheckedChange={handleToggle}
                disabled={updating}
                aria-label="Toggle auto-approval"
              />
            )}
          </div>
          {autoApproval !== null && (
            <div className="text-xs text-muted-foreground border-t border-border/50 pt-3">
              Current state:{" "}
              <span className={autoApproval ? "text-status-green font-medium" : "font-medium text-foreground"}>
                {autoApproval ? "Auto-approval ON" : "Manual review (24h notice)"}
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            setAuthed(false);
            setPassword("");
          }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
};

export default AdminSettingsPage;
