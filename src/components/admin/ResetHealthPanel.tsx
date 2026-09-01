import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  adminEmail: string;
  adminToken: string;
}

interface Report {
  windowStart: string;
  affectedUsersThisWeek: number;
  affectedUsersPriorWeek: number;
  attemptsThisWeek: number;
  byReason: Record<string, number>;
  byCode: Record<string, number>;
  byDevice: Record<string, number>;
  byInAppBrowser: Record<string, number>;
  sampleEmails: string[];
  resetFailuresThisWeek?: number;
  activationFailuresThisWeek?: number;
  resetFailuresPriorWeek?: number;
  activationFailuresPriorWeek?: number;
  inAppBrowserShare?: number;
  inAppBrowserCount?: number;
  resetSpiking?: boolean;
  activationSpiking?: boolean;
}

interface Resp {
  success?: boolean;
  alerted?: boolean;
  report?: Report;
  error?: string;
}

function Tally({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  return (
    <div className="rounded-[10px] border border-border/60 p-5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">{title}</p>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">None</p>
      ) : (
        <ul className="space-y-1">
          {entries.map(([k, v]) => (
            <li key={k} className="flex items-center justify-between text-sm">
              <span className="text-foreground/80">{k}</span>
              <span className="font-medium">{v}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ResetHealthPanel({ adminToken }: Props) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [alerted, setAlerted] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<Resp>("reset-health-check", {
        body: { token: adminToken },
      });
      if (error || !data?.report) throw new Error(data?.error || error?.message || "Failed");
      setReport(data.report);
      setAlerted(!!data.alerted);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load reset health");
    } finally {
      setLoading(false);
    }
  };

  const delta =
    report && report.affectedUsersPriorWeek > 0
      ? Math.round(
          ((report.affectedUsersThisWeek - report.affectedUsersPriorWeek) /
            report.affectedUsersPriorWeek) *
            100
        )
      : null;

  return (
    <section className="rounded-[15px] border border-border bg-background/60 p-5 space-y-5">
      <div className="flex items-start justify-between gap-5">
        <div>
          <h3 className="text-base font-medium">Reset failures (7d)</h3>
          <p className="text-sm text-muted-foreground">
            Password reset and activation dead ends, by reason, device and in-app browser.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? "Loading..." : report ? "Refresh" : "Load report"}
        </Button>
      </div>

      {report && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            <div className="rounded-[10px] bg-muted/40 p-5">
              <p className="text-xs text-muted-foreground">Accounts affected</p>
              <p className="text-2xl font-medium">{report.affectedUsersThisWeek}</p>
            </div>
            <div className="rounded-[10px] bg-muted/40 p-5">
              <p className="text-xs text-muted-foreground">Prior week</p>
              <p className="text-2xl font-medium">{report.affectedUsersPriorWeek}</p>
            </div>
            <div className="rounded-[10px] bg-muted/40 p-5">
              <p className="text-xs text-muted-foreground">Failed attempts</p>
              <p className="text-2xl font-medium">{report.attemptsThisWeek}</p>
            </div>
            <div className="rounded-[10px] bg-muted/40 p-5">
              <p className="text-xs text-muted-foreground">Change</p>
              <p className="text-2xl font-medium">
                {delta === null ? "n/a" : `${delta > 0 ? "+" : ""}${delta}%`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
            <div className="rounded-[10px] border border-border/60 p-5">
              <p className="text-xs text-muted-foreground">Password resets</p>
              <p className="text-2xl font-medium">{report.resetFailuresThisWeek ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">
                prior week {report.resetFailuresPriorWeek ?? 0}
                {report.resetSpiking ? " (spiking)" : ""}
              </p>
            </div>
            <div className="rounded-[10px] border border-border/60 p-5">
              <p className="text-xs text-muted-foreground">Activation links</p>
              <p className="text-2xl font-medium">{report.activationFailuresThisWeek ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">
                prior week {report.activationFailuresPriorWeek ?? 0}
                {report.activationSpiking ? " (spiking)" : ""}
              </p>
            </div>
            <div className="rounded-[10px] border border-border/60 p-5">
              <p className="text-xs text-muted-foreground">In-app browsers</p>
              <p className="text-2xl font-medium">{report.inAppBrowserShare ?? 0}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                {report.inAppBrowserCount ?? 0} of {report.affectedUsersThisWeek}
              </p>
            </div>
          </div>

          {alerted && (
            <p className="text-sm text-destructive">
              Spike threshold met. An internal alert was sent for this window.
            </p>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <Tally title="By reason" data={report.byReason} />
            <Tally title="By Shopify code" data={report.byCode} />
            <Tally title="By device" data={report.byDevice} />
            <Tally title="By in-app browser" data={report.byInAppBrowser} />
          </div>

          {report.sampleEmails.length > 0 && (
            <div className="rounded-[10px] border border-border/60 p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
                Recent affected accounts
              </p>
              <ul className="space-y-1 text-sm">
                {report.sampleEmails.map((e) => (
                  <li key={e} className="text-foreground/80">
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
