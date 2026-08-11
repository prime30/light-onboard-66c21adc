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
      toast.success(`Re-issued ${data.sent} of ${data.attempted} account setup emails`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Repair failed");
    } finally {
      setBusy(false);
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
            call failed and the recovery fallback returned 401. Repair re-issues the Shopify account setup email
            (invite for invited/disabled, reset for enabled).
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
