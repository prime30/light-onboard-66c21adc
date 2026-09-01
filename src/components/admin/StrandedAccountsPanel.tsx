import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  adminEmail: string;
  adminToken: string;
}

interface CheckedRow {
  email: string;
  submissionStatus: string;
  submittedAt: string;
  shopifyId: number | null;
  shopifyState: string;
  ordersCount: number;
  activationError: string | null;
  needsPassword: boolean;
}

interface AuditResp {
  success: boolean;
  scanned: number;
  scope: string;
  days: number;
  stateTally: Record<string, number>;
  strandedCount: number;
  stranded: CheckedRow[];
  checked: CheckedRow[];
  error?: string;
}

interface RepairResp {
  success: boolean;
  attempted: number;
  sent: number;
  results: Array<{ email: string; ok: boolean; channel: string; detail: string }>;
  error?: string;
}

interface SendRow {
  email: string;
  channel: string;
  ok: boolean;
  shopify_state: string | null;
  detail: string | null;
  created_at: string;
}

interface LinkResp {
  success: boolean;
  email?: string;
  state?: string;
  alreadyEnabled?: boolean;
  message?: string;
  rawUrl?: string;
  rawUrlStatus?: number | null;
  spaUrl?: string;
  themeActivatePageOk?: boolean;
  error?: string;
}

export function StrandedAccountsPanel({ adminToken }: Props) {
  const [busy, setBusy] = useState(false);
  const [audit, setAudit] = useState<AuditResp | null>(null);
  const [repair, setRepair] = useState<RepairResp | null>(null);
  const [scope, setScope] = useState<"flagged" | "all">("flagged");

  const runAudit = async (nextScope: "flagged" | "all") => {
    setBusy(true);
    setRepair(null);
    try {
      const { data, error } = await supabase.functions.invoke<AuditResp>("admin-stranded-accounts", {
        body: { token: adminToken, action: "audit", scope: nextScope, days: 180, limit: 300 },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Audit failed");
      setScope(nextScope);
      setAudit(data);
      toast.success(`${data.strandedCount} of ${data.scanned} scanned have no password`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Audit failed");
    } finally {
      setBusy(false);
    }
  };

  const runRepair = async () => {
    if (!audit?.stranded.length) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke<RepairResp>("admin-stranded-accounts", {
        body: { token: adminToken, action: "repair", emails: audit.stranded.map((s) => s.email) },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Repair failed");
      setRepair(data);
      toast.success(`Sent ${data.sent} of ${data.attempted} verified password setup emails`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Repair failed");
    } finally {
      setBusy(false);
    }
  };

  const [linkEmail, setLinkEmail] = useState("");
  const [sends, setSends] = useState<SendRow[] | null>(null);
  const [link, setLink] = useState<LinkResp | null>(null);

  const mintLink = async () => {
    const target = linkEmail.trim().toLowerCase();
    if (!target.includes("@")) {
      toast.error("Enter a valid email");
      return;
    }
    setBusy(true);
    setLink(null);
    try {
      const { data, error } = await supabase.functions.invoke<LinkResp>("admin-stranded-accounts", {
        body: { token: adminToken, action: "link", linkEmail: target },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Could not mint link");
      setLink(data);
      if (data.spaUrl) {
        await navigator.clipboard.writeText(data.spaUrl).catch(() => {});
        toast.success("Setup link copied to clipboard");
      } else {
        toast.info(data.message || "No link needed");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not mint link");
    } finally {
      setBusy(false);
    }
  };

  // Support shortcut: send the customer a real Shopify password email straight
  // from here. recover-password promotes invited or disabled customers to
  // enabled first, so this works for both stranded and normal accounts.
  const sendResetEmail = async () => {
    const target = linkEmail.trim().toLowerCase();
    if (!target.includes("@")) {
      toast.error("Enter a valid email");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke<{
        success: boolean;
        channel?: string;
        error?: string;
        detail?: string;
      }>("admin-stranded-accounts", {
        body: { token: adminToken, action: "reset", linkEmail: target },
      });
      if (error || !data?.success) {
        throw new Error(data?.detail || data?.error || error?.message || "Could not send reset email");
      }
      toast.success(`Reset email sent to ${target} (${data.channel ?? "recover"})`);
      void loadSends(target);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send reset email");
    } finally {
      setBusy(false);
    }
  };

  // One-click resend of Shopify's own account invite (activation) email.
  // Enabled customers already have a password, so the backend reports that
  // back instead of failing silently.
  const sendActivationLink = async () => {
    const target = linkEmail.trim().toLowerCase();
    if (!target.includes("@")) {
      toast.error("Enter a valid email");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke<{
        success: boolean;
        sent?: boolean;
        state?: string;
        alreadyEnabled?: boolean;
        message?: string;
        error?: string;
        detail?: string;
      }>("admin-stranded-accounts", {
        body: { token: adminToken, action: "invite", linkEmail: target },
      });
      if (error || !data?.success) {
        throw new Error(data?.detail || data?.error || error?.message || "Could not send activation link");
      }
      if (data.sent) {
        toast.success(data.message || `Activation invite sent to ${target}`);
        void loadSends(target);
      } else {
        toast.info(data.message || "No invite needed");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send activation link");
    } finally {
      setBusy(false);
    }
  };




  // Support-send history so repeat emails to the same person are obvious.
  const loadSends = async (email?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke<{
        success: boolean;
        sends?: SendRow[];
        error?: string;
      }>("admin-stranded-accounts", {
        body: { token: adminToken, action: "sends", linkEmail: email ?? linkEmail.trim().toLowerCase(), limit: 25 },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Failed");
      setSends(data.sends ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load send history");
    }
  };

  const tally = useMemo(() => Object.entries(audit?.stateTally ?? {}), [audit]);

  return (
    <section className="rounded-[15px] border border-border/40 bg-card/40 p-5 space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">Stranded accounts (no password set)</h3>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
            Cross-checks recent applications against their Shopify customer state. Anyone left{" "}
            <code>invited</code> or <code>disabled</code> never got a password written, usually because the activation
            call failed. Repair safely prepares invited or disabled accounts, verifies they are enabled, then sends
            a password setup email. It does not use the storefront activation page.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => runAudit("flagged")} disabled={busy}>
            {busy ? "Working..." : "Audit flagged"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => runAudit("all")} disabled={busy}>
            Audit all recent
          </Button>
          {!!audit?.strandedCount && (
            <Button size="sm" onClick={runRepair} disabled={busy}>
              Re-issue {audit.strandedCount} emails
            </Button>
          )}
        </div>
      </header>

      <div className="rounded-[10px] border border-border/40 bg-background/40 p-4 space-y-2">
        <p className="text-xs text-muted-foreground">
          Direct setup link: mints a fresh Shopify activation URL for one customer and wraps it in our own
          password setup screen. Use this when someone says the invite email does not open a working
          password form. The link is copied to your clipboard so you can send it directly.
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            type="email"
            value={linkEmail}
            onChange={(e) => setLinkEmail(e.target.value)}
            placeholder="customer@email.com"
            className="flex-1 min-w-[220px] rounded-[10px] border border-border/50 bg-background px-3 py-2 text-xs"
          />
          <Button size="sm" variant="outline" onClick={mintLink} disabled={busy}>
            {busy ? "Working..." : "Mint setup link"}
          </Button>
          <Button size="sm" variant="outline" onClick={sendResetEmail} disabled={busy}>
            {busy ? "Working..." : "Send reset email"}
          </Button>
          <Button size="sm" variant="outline" onClick={sendActivationLink} disabled={busy}>
            {busy ? "Working..." : "Send activation link"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => loadSends()} disabled={busy}>
            Send history
          </Button>


        </div>
        {sends && (
          <div className="pt-2 text-[11px] space-y-1">
            <p className="text-muted-foreground">
              {sends.length === 0 ? "No support emails logged yet." : "Recent support emails"}
            </p>
            <ul className="max-h-48 overflow-auto space-y-1 font-mono">
              {sends.map((r, i) => (
                <li key={`${r.email}-${r.created_at}-${i}`} className={r.ok ? "text-muted-foreground" : "text-destructive"}>
                  <span className="text-foreground">{r.email}</span> · {r.channel} ·{" "}
                  {new Date(r.created_at).toLocaleString()}
                  {r.detail ? ` · ${r.detail}` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

        {link && (
          <div className="text-xs space-y-1 pt-1">
            <div className="text-muted-foreground">
              Shopify state: <span className="text-foreground">{link.state}</span>
              {typeof link.rawUrlStatus === "number" && (
                <>
                  {" · "}Storefront activate page:{" "}
                  <span className={link.themeActivatePageOk ? "text-foreground" : "text-destructive"}>
                    HTTP {link.rawUrlStatus}
                  </span>
                </>
              )}
            </div>
            {link.spaUrl && <p className="break-all text-foreground/80">{link.spaUrl}</p>}
            {link.message && <p className="text-muted-foreground">{link.message}</p>}
          </div>
        )}
      </div>

      {audit && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <Stat label="Scanned" value={audit.scanned} />
            <Stat label="No password" value={audit.strandedCount} />
            <Stat label="Scope" value={scope} />
            <Stat label="Window" value={`${audit.days} days`} />
          </div>

          {tally.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Shopify states:{" "}
              {tally.map(([k, v], i) => (
                <span key={k}>
                  {i > 0 && " · "}
                  <span className="text-foreground">{k}</span> {v}
                </span>
              ))}
            </div>
          )}

          {audit.stranded.length > 0 && (
            <div className="rounded-[10px] border border-border/40 bg-background/30 overflow-hidden">
              <ul className="max-h-80 overflow-auto divide-y divide-border/30 text-[11px]">
                {audit.stranded.map((s) => (
                  <li key={s.email} className="px-3 py-2 flex flex-wrap items-baseline gap-x-2">
                    <span className="font-mono text-foreground">{s.email}</span>
                    <span className="text-muted-foreground">{s.shopifyState}</span>
                    <span className="text-muted-foreground">· {s.submissionStatus}</span>
                    <span className="text-muted-foreground">· {new Date(s.submittedAt).toLocaleDateString()}</span>
                    {s.activationError && (
                      <span className="text-muted-foreground/70 basis-full font-mono">{s.activationError}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {repair && (
        <details className="rounded-[10px] border border-border/40 bg-background/30 p-3" open>
          <summary className="cursor-pointer text-xs font-medium">
            Repair result: {repair.sent}/{repair.attempted} sent
          </summary>
          <ul className="mt-2 max-h-64 overflow-auto space-y-1 font-mono text-[11px]">
            {repair.results.map((r) => (
              <li key={r.email} className={r.ok ? "text-muted-foreground" : "text-destructive"}>
                <span className="text-foreground">{r.email}</span> · {r.channel} · {r.ok ? "sent" : r.detail}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[10px] border border-border/40 bg-background/30 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium mt-0.5">{value}</div>
    </div>
  );
}
