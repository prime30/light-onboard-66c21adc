import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  adminEmail: string;
  adminToken: string;
}

interface BackfillResp {
  success: boolean;
  dryRun: boolean;
  pages: number;
  customersSeen: number;
  eligible: number;
  profileOk: number;
  profileFail: number;
  eventOk: number;
  eventFail: number;
  nextPageUrl: string | null;
  hasMore: boolean;
  failures: Array<{ email: string; step: string; status: number; detail: unknown }>;
  error?: string;
}

export function KlaviyoBackfillPanel({ adminToken }: Props) {
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<BackfillResp | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [totals, setTotals] = useState({ eligible: 0, profileOk: 0, eventOk: 0, profileFail: 0, eventFail: 0 });

  const run = async (dryRun: boolean, useCursor: boolean) => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke<BackfillResp>("backfill-klaviyo-completion", {
        body: {
          token: adminToken,
          dryRun,
          limit: 5000,
          pageUrl: useCursor ? cursor : null,
        },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Backfill failed");
      setLastResult(data);
      setCursor(data.nextPageUrl);
      if (!dryRun) {
        setTotals((t) => ({
          eligible: t.eligible + data.eligible,
          profileOk: t.profileOk + data.profileOk,
          eventOk: t.eventOk + data.eventOk,
          profileFail: t.profileFail + data.profileFail,
          eventFail: t.eventFail + data.eventFail,
        }));
      }
      toast.success(
        dryRun
          ? `Dry run: ${data.eligible} eligible across ${data.customersSeen} customers`
          : `Ran: ${data.profileOk} profiles, ${data.eventOk} events${data.hasMore ? " (more remaining)" : " (done)"}`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Backfill failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="rounded-[15px] border border-border/40 bg-card/40 p-5 space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">Klaviyo registration completion backfill</h3>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
            Marks every existing Shopify customer as <code>registration_completed: true</code> in Klaviyo and fires a
            backdated <b>Completed Registration</b> event. Drops legacy customers out of the "Finish your registration"
            flow. Safe to re-run; dry run counts eligibility without hitting Klaviyo.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => run(true, false)} disabled={running}>
            {running ? "Running..." : "Dry run"}
          </Button>
          <Button size="sm" onClick={() => run(false, false)} disabled={running}>
            Run backfill
          </Button>
          {cursor && (
            <Button size="sm" variant="outline" onClick={() => run(false, true)} disabled={running}>
              Continue
            </Button>
          )}
        </div>
      </header>

      {(totals.eligible > 0 || lastResult) && (
        <div className="grid grid-cols-5 gap-3 text-xs">
          <Stat label="Eligible (session)" value={totals.eligible || lastResult?.eligible || 0} />
          <Stat label="Profiles OK" value={totals.profileOk} />
          <Stat label="Events OK" value={totals.eventOk} />
          <Stat label="Profile fails" value={totals.profileFail} />
          <Stat label="Event fails" value={totals.eventFail} />
        </div>
      )}

      {lastResult && (
        <div className="text-xs text-muted-foreground">
          Last batch: {lastResult.pages} pages, {lastResult.customersSeen} customers scanned,{" "}
          {lastResult.hasMore ? (
            <span className="text-foreground">more remaining. Click <b>Continue</b> to resume.</span>
          ) : (
            <span className="text-foreground">no more customers.</span>
          )}
        </div>
      )}

      {lastResult && lastResult.failures.length > 0 && (
        <details className="rounded-[10px] border border-border/40 bg-background/30 p-3">
          <summary className="cursor-pointer text-xs font-medium">Show {lastResult.failures.length} sample failures</summary>
          <ul className="mt-2 max-h-64 overflow-auto space-y-1 font-mono text-[11px]">
            {lastResult.failures.map((f, i) => (
              <li key={i} className="text-muted-foreground">
                <span className="text-foreground">{f.email}</span> · {f.step} · {f.status}
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
