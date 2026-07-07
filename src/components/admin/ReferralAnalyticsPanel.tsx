import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type SourceRow = { key: string; label: string; count: number; pct: number };

interface Props {
  adminEmail: string;
  adminToken: string;
}

const RANGES: { label: string; days: number }[] = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "1y", days: 365 },
  { label: "All", days: 3650 },
];

export const ReferralAnalyticsPanel = ({ adminEmail, adminToken }: Props) => {
  const [loading, setLoading] = useState(false);
  const [sinceDays, setSinceDays] = useState(90);
  const [data, setData] = useState<{
    total: number;
    withSource: number;
    answerRate: number;
    sources: SourceRow[];
    byAccountType: Record<string, Record<string, number>>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: invokeErr } = await supabase.functions.invoke(
        "admin-referral-analytics",
        { body: { email: adminEmail, password: adminToken, sinceDays } }
      );
      if (invokeErr || !res?.success) {
        setError(res?.error ?? invokeErr?.message ?? "Failed to load analytics");
        setData(null);
        return;
      }
      setData({
        total: res.total,
        withSource: res.withSource,
        answerRate: res.answerRate,
        sources: res.sources,
        byAccountType: res.byAccountType,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [adminEmail, adminToken, sinceDays]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const maxCount = Math.max(1, ...(data?.sources.map((s) => s.count) ?? [0]));
  const accountTypes = Object.keys(data?.byAccountType ?? {}).sort();

  return (
    <div className="space-y-4 rounded-[15px] border border-border/50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">How they heard about us</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Aggregated from the optional referral question on the preferences step.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={fetchData}
          disabled={loading}
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5 text-[11px]">
        {RANGES.map((r) => (
          <button
            key={r.days}
            type="button"
            onClick={() => setSinceDays(r.days)}
            className={cn(
              "px-2.5 py-1 rounded-full border transition-colors",
              sinceDays === r.days
                ? "border-foreground/60 bg-foreground/[0.04] text-foreground"
                : "border-border/50 text-muted-foreground hover:text-foreground"
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {!data ? (
        loading ? (
          <div className="p-6 flex justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <p className="p-6 text-center text-sm text-muted-foreground">No data.</p>
        )
      ) : (
        <>
          {/* Top-line stats */}
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Submissions" value={data.total.toString()} />
            <Stat label="Answered" value={data.withSource.toString()} />
            <Stat label="Answer rate" value={`${data.answerRate}%`} />
          </div>

          {/* Bar list */}
          <div className="space-y-1.5">
            {data.sources.length === 0 ? (
              <p className="text-xs text-muted-foreground">No submissions in this range.</p>
            ) : (
              data.sources.map((s) => (
                <div key={s.key} className="space-y-1">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className={cn(
                      "truncate",
                      s.key === "unspecified" ? "text-muted-foreground italic" : "text-foreground"
                    )}>
                      {s.label}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {s.count} · {s.pct}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        s.key === "unspecified" ? "bg-foreground/20" : "bg-foreground"
                      )}
                      style={{ width: `${(s.count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* By account type */}
          {accountTypes.length > 0 && data.sources.length > 0 && (
            <details className="rounded-[10px] bg-muted/40 p-3">
              <summary className="text-[11px] uppercase tracking-wide text-muted-foreground cursor-pointer">
                Breakdown by account type
              </summary>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="font-medium pb-1.5 pr-3">Source</th>
                      {accountTypes.map((t) => (
                        <th key={t} className="font-medium pb-1.5 px-2 text-right tabular-nums">
                          {t}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.sources.map((s) => (
                      <tr key={s.key} className="border-t border-border/40">
                        <td className="py-1 pr-3 text-foreground/80">{s.label}</td>
                        {accountTypes.map((t) => (
                          <td key={t} className="py-1 px-2 text-right tabular-nums">
                            {data.byAccountType[t]?.[s.key] ?? 0}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-[10px] border border-border/50 p-2.5">
    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="text-lg font-medium tabular-nums mt-0.5">{value}</p>
  </div>
);
