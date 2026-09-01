import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const [filter, setFilter] = useState("");

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
  const q = filter.trim().toLowerCase();
  const recent = (report?.recent ?? []).filter(
    (r) => !q || (r.domain ?? "").toLowerCase().includes(q) || r.email.toLowerCase().includes(q),
  );

  const exportCsv = () => {
    if (recent.length === 0) {
      toast.error("Nothing to export");
      return;
    }
    const head = "email,domain,attempts,last_attempt_at";
    const body = recent
      .map((r) => [r.email, r.domain ?? "", String(r.count), r.lastAt ?? ""].map((v) => `"${v.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`${head}\n${body}\n`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `competitor-attempts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${recent.length} row${recent.length === 1 ? "" : "s"}`);
  };

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
                    <button
                      type="button"
                      onClick={() => setFilter(filter === domain ? "" : domain)}
                      className={`text-left transition-colors hover:text-foreground ${
                        filter === domain ? "text-foreground font-medium" : "text-foreground/80"
                      }`}
                    >
                      {domain}
                    </button>
                    <span className="font-medium">{n}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-[10px] border border-border/60 p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Recent attempts ({recent.length})
              </p>
              <div className="flex items-center gap-3">
                <Input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filter by domain or email"
                  className="h-9 w-[220px] rounded-[10px] text-sm"
                />
                <Button variant="outline" size="sm" onClick={exportCsv}>
                  Export CSV
                </Button>
              </div>
            </div>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No matching attempts</p>
            ) : (
              <ul className="max-h-72 space-y-1 overflow-auto text-sm">
                {recent.map((r) => (
                  <li key={r.email} className="flex items-center justify-between gap-5">
                    <span className="truncate text-foreground/80">{r.email}</span>
                    <span className="whitespace-nowrap text-muted-foreground">
                      {r.domain ? `${r.domain} · ` : ""}
                      {r.count}x{r.lastAt ? ` · ${new Date(r.lastAt).toLocaleDateString()}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
