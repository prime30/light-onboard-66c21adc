import { useEffect, useState, KeyboardEvent } from "react";
import { useNavigate } from "react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Loader2, Lock, Settings as SettingsIcon, X, Tag as TagIcon } from "lucide-react";
import { setAdminMode } from "@/lib/admin-mode";

const MAX_TAGS = 50;
const MAX_TAG_LENGTH = 80;

const AdminSettingsPage = () => {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [autoApproval, setAutoApproval] = useState<boolean | null>(null);
  const [updating, setUpdating] = useState(false);
  const [loadingSetting, setLoadingSetting] = useState(true);

  // Extra customer tags
  const [extraTags, setExtraTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [savingTags, setSavingTags] = useState(false);
  const [tagsDirty, setTagsDirty] = useState(false);

  // Load current settings on mount
  useEffect(() => {
    let cancelled = false;
    supabase.rpc("get_auto_approval_enabled").then(({ data, error }) => {
      if (cancelled) return;
      if (error) console.error("Failed to load setting:", error);
      setAutoApproval((data as boolean | null) ?? false);
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
      // Hydrate tags from verify response if present
      const tags = (data?.setting?.extra_customer_tags ?? []) as string[];
      setExtraTags(Array.isArray(tags) ? tags : []);
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
    setAutoApproval(next);
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
      toast({ title: "Error", description: "Could not save the setting.", variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const addTag = (raw: string) => {
    const t = raw.trim().replace(/,/g, " ").slice(0, MAX_TAG_LENGTH);
    if (!t) return;
    if (extraTags.some((x) => x.toLowerCase() === t.toLowerCase())) {
      setTagInput("");
      return;
    }
    if (extraTags.length >= MAX_TAGS) {
      toast({
        title: "Tag limit reached",
        description: `Max ${MAX_TAGS} tags.`,
        variant: "destructive",
      });
      return;
    }
    setExtraTags((prev) => [...prev, t]);
    setTagInput("");
    setTagsDirty(true);
  };

  const removeTag = (tag: string) => {
    setExtraTags((prev) => prev.filter((t) => t !== tag));
    setTagsDirty(true);
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === "Backspace" && tagInput === "" && extraTags.length > 0) {
      e.preventDefault();
      removeTag(extraTags[extraTags.length - 1]);
    }
  };

  const saveTags = async () => {
    setSavingTags(true);
    // Include any unsubmitted text in the input
    const pending = tagInput.trim();
    let payload = extraTags;
    if (pending) {
      const t = pending.replace(/,/g, " ").slice(0, MAX_TAG_LENGTH);
      if (!extraTags.some((x) => x.toLowerCase() === t.toLowerCase())) {
        payload = [...extraTags, t];
      }
      setExtraTags(payload);
      setTagInput("");
    }
    try {
      const { data, error } = await supabase.functions.invoke("admin-toggle-setting", {
        body: { email, password, extraCustomerTags: payload },
      });
      if (error || !data?.success) {
        toast({
          title: "Failed to save tags",
          description: "Could not update customer tags.",
          variant: "destructive",
        });
        return;
      }
      const saved = (data?.setting?.extra_customer_tags ?? payload) as string[];
      setExtraTags(saved);
      setTagsDirty(false);
      toast({
        title: "Tags saved",
        description: saved.length
          ? `${saved.length} tag${saved.length === 1 ? "" : "s"} will be applied to new accounts.`
          : "No extra tags will be applied.",
      });
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Could not save tags.", variant: "destructive" });
    } finally {
      setSavingTags(false);
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
              <h1 className="text-xl font-semibold text-foreground">Admin access</h1>
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
            <h1 className="text-2xl font-semibold text-foreground">App settings</h1>
            <p className="text-sm text-muted-foreground">Signed in as {email}</p>
          </div>
        </div>

        {/* Auto-approval */}
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
              <span
                className={
                  autoApproval ? "text-status-green font-medium" : "font-medium text-foreground"
                }
              >
                {autoApproval ? "Auto-approval ON" : "Manual review (24h notice)"}
              </span>
            </div>
          )}
        </div>

        {/* Extra customer tags */}
        <div className="p-6 rounded-2xl bg-card border border-border/50 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
              <TagIcon className="w-4 h-4 text-foreground" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-medium text-foreground">Extra customer tags</h2>
              <p className="text-sm text-muted-foreground">
                Tags added here are applied to every new Shopify customer on submission, alongside
                the existing "Preferred method:" tags. Type a tag and press Enter or comma. Max{" "}
                {MAX_TAGS} tags, {MAX_TAG_LENGTH} characters each.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 min-h-[2.25rem] p-2 rounded-[10px] border border-border/50 bg-background">
              {extraTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full bg-muted text-sm text-foreground"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="w-4 h-4 inline-flex items-center justify-center rounded-full hover:bg-foreground/10 transition-colors"
                    aria-label={`Remove ${tag}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder={extraTags.length === 0 ? "e.g. Wholesale, Pro-2026" : "Add tag…"}
                className="flex-1 min-w-[120px] bg-transparent outline-none text-sm placeholder:text-muted-foreground px-1"
                maxLength={MAX_TAG_LENGTH}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                {extraTags.length} / {MAX_TAGS} tag{extraTags.length === 1 ? "" : "s"}
                {tagsDirty || tagInput.trim() ? " · unsaved changes" : ""}
              </span>
              <Button
                type="button"
                size="sm"
                onClick={saveTags}
                disabled={savingTags || (!tagsDirty && !tagInput.trim())}
              >
                {savingTags ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save tags"}
              </Button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setAuthed(false);
            setPassword("");
            setAdminMode(false);
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
