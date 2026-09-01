import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  adminToken: string;
}

interface Report {
  windowDays: number;
  windowStart: string;
  attempts: number;
  uniqueEmails: number;
  uniqueDomains: number;
  byDomain: Record<string, number>;
  repeatDomains: string[];
  recent: { email: string; domain: string | null; count: number; lastAt: string | null }[];
}

interface Resp {
  success?: boolean;
  report?: Report;
  error?: string;
}

export function CompetitorAttemptsPanel({ adminToken }: Props) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Report | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<Resp>("admin-competitor-attempts", {
        body: { token: adminToken, days: 30 },
      });
      if (error || !data?.report) throw new Error(data?.error || error?.message || "Failed");
      setReport(data.report);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load competitor attempts");
    } finally {
      setLoading(false);
    }
  };

  const domains = report ? Object.entries(report.byDomain).sort((a, b) => b[1] - a[1]) : [];

  return (
    <section className="rounded-[15px] border border-border bg-background/60 p-5 space-y-5">
      <div className="flex items-start justify-between gap-5">
        <div>
          <h3 className="text-base font-medium">Competitor attempts (30d)</h3>
          <p className="text-sm text-muted-foreground">
            Blocked registration attempts from blocklisted competitor domains.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? "Loading..." : report ? "Refresh" : "Load report"}
        </Button>
      </div>

      {report && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-5">
            <div className="rounded-[10px] bg-muted/40 p-5">
              <p className="text-xs text-muted-foreground">Attempts</p>
              <p className="text-2xl font-medium">{report.attempts}</p>
            </div>
            <div className="rounded-[10px] bg-muted/40 p-5">
              <p className="text-xs text-muted-foreground">Unique emails</p>
              <p className="text-2xl font-medium">{report.uniqueEmails}</p>
            </div>
            <div className="rounded-[10px] bg-muted/40 p-5">
              <p className="text-xs text-muted-foreground">Domains</p>
              <p className="text-2xl font-medium">{report.uniqueDomains}</p>
            </div>
          </div>

          {report.repeatDomains.length > 0 && (
            <p className="text-sm text-destructive">
              Repeat attempts (3+): {report.repeatDomains.join(", ")}. An internal alert is sent for these.
            </p>
          )}

          <div className="rounded-[10px] border border-border/60 p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">By domain</p>
            {domains.length === 0 ? (
              <p className="text-sm text-muted-foreground">None in this window</p>
            ) : (
              <ul className="space-y-1">
                {domains.map(([domain, n]) => (
                  <li key={domain} className="flex items-center justify-between text-sm">
                    <span className="text-foreground/80">{domain}</span>
                    <span className="font-medium">{n}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {report.recent.length > 0 && (
            <div className="rounded-[10px] border border-border/60 p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Recent attempts</p>
              <ul className="space-y-1 text-sm">
                {report.recent.map((r) => (
                  <li key={r.email} className="flex items-center justify-between gap-5">
                    <span className="text-foreground/80 truncate">{r.email}</span>
                    <span className="text-muted-foreground whitespace-nowrap">
                      {r.count}x{r.lastAt ? ` · ${new Date(r.lastAt).toLocaleDateString()}` : ""}
                    </span>
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
