import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type OAuthNamespace = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
};

const oauth = () => (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;

export default function OAuthConsentPage() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const load = async () => {
    if (!authorizationId) {
      setError("Missing authorization_id");
      return;
    }
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      setNeedsSignIn(true);
      return;
    }
    setNeedsSignIn(false);
    const { data, error: detailsError } = await oauth().getAuthorizationDetails(authorizationId);
    if (detailsError) {
      setError(detailsError.message);
      return;
    }
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) {
      window.location.href = immediate;
      return;
    }
    setDetails(data);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorizationId]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    setPassword("");
    await load();
  };

  const decide = async (approve: boolean) => {
    setBusy(true);
    setError(null);
    const { data, error: decideError } = approve
      ? await oauth().approveAuthorization(authorizationId)
      : await oauth().denyAuthorization(authorizationId);
    if (decideError) {
      setBusy(false);
      setError(decideError.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  };

  const clientName = details?.client?.name ?? "this app";

  return (
    <main className="min-h-[100dvh] flex items-center justify-center p-5 bg-background">
      <div className="w-full max-w-[420px] rounded-[15px] border border-border bg-card p-[25px] space-y-[15px]">
        <h1 className="text-xl font-medium tracking-[-0.006em]">Connect an app</h1>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {needsSignIn ? (
          <form onSubmit={signIn} className="space-y-[15px]">
            <p className="text-sm text-muted-foreground">
              Sign in to your pro account to continue authorizing this connection.
            </p>
            <div className="space-y-[5px]">
              <Label htmlFor="consent-email">Email</Label>
              <Input
                id="consent-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-[5px]">
              <Label htmlFor="consent-password">Password</Label>
              <Input
                id="consent-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        ) : !details ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <div className="space-y-[15px]">
            <p className="text-sm text-muted-foreground">
              {clientName} is requesting access to your account. It will be able to read your
              registration details and update your communication preferences as you.
            </p>
            <div className="flex gap-[10px]">
              <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>
                Approve
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                disabled={busy}
                onClick={() => decide(false)}
              >
                Deny
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
