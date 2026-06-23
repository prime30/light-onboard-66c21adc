import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, TrendingDown, TrendingUp, Minus, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

type MonthRow = {
  monthLabel: string;
  currentKey: string;
  priorKey: string;
  current: number;
  prior: number;
  delta: number;
  deltaPct: number | null;
  isCurrentMonth: boolean;
};

type ApiResponse = {
  success: boolean;
  generatedAt?: string;
  currentMonth?: string;
  series?: MonthRow[];
  totals?: { current: number; prior: number; delta: number; deltaPct: number | null };
  sources?: {
    liveCount: number;
    backfillCount: number;
    backfillTotal: number;
    backfillLastFetchedAt: string | null;
  };
  error?: string;
};

interface Props {
  adminEmail: string;
  adminPassword: string;
}



function fmtPct(pct: number | null): string {
  if (pct === null) return "—";
  const rounded = Math.round(pct * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}%`;
}

function pctTone(pct: number | null): string {
  if (pct === null || pct === 0) return "text-muted-foreground";
  return pct > 0 ? "text-status-green" : "text-status-red";
}

export function RegistrationYoYPanel({ adminEmail, adminPassword }: Props) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillStatus, setBackfillStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!adminEmail || !adminPassword) return;
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: invokeError } = await supabase.functions.invoke(
        "admin-registration-yoy",
        { body: { email: adminEmail, password: adminPassword } },
      );
      if (invokeError) throw invokeError;
      const typed = res as ApiResponse;
      if (!typed?.success) throw new Error(typed?.error ?? "Request failed");
      setData(typed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load comparison");
    } finally {
      setLoading(false);
    }
  }, [adminEmail, adminPassword]);

  const runBackfill = useCallback(
    async (range?: { createdAtMin: string; createdAtMax: string; label?: string }) => {
      if (!adminEmail || !adminPassword) return;
      setBackfilling(true);
      setBackfillStatus(
        range
          ? `Refilling Helium range ${range.label ?? `${range.createdAtMin} → ${range.createdAtMax}`}…`
          : "Starting Helium backfill…",
      );
      let page = 1;
      let totalFetched = 0;
      let totalUpserted = 0;
      try {
        for (let i = 0; i < 50; i++) {
          const { data: res, error: invokeError } = await supabase.functions.invoke(
            "admin-backfill-helium-customers",
            {
              body: {
                email: adminEmail,
                password: adminPassword,
                startPage: page,
                ...(range
                  ? { createdAtMin: range.createdAtMin, createdAtMax: range.createdAtMax }
                  : {}),
              },
            },
          );
          if (invokeError) throw invokeError;
          const typed = res as {
            success: boolean;
            error?: string;
            fetched: number;
            upserted: number;
            done: boolean;
            nextPage: number | null;
          };
          if (!typed?.success) throw new Error(typed?.error ?? "Backfill failed");
          totalFetched += typed.fetched;
          totalUpserted += typed.upserted;
          setBackfillStatus(
            `Pulled ${totalFetched.toLocaleString()} customers from Helium (${totalUpserted.toLocaleString()} stored)…`,
          );
          if (typed.done || !typed.nextPage) break;
          page = typed.nextPage;
        }
        setBackfillStatus(
          `Done. ${totalFetched.toLocaleString()} fetched, ${totalUpserted.toLocaleString()} stored.`,
        );
        await load();
      } catch (err) {
        setBackfillStatus(
          `Backfill failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      } finally {
        setBackfilling(false);
      }
    },
    [adminEmail, adminPassword, load],
  );

  const refillRange = useCallback(() => {
    const min = window.prompt(
      "Refill Helium customers created on/after (YYYY-MM-DD):",
      "2026-03-06",
    );
    if (!min) return;
    const max = window.prompt(
      "Refill Helium customers created before (YYYY-MM-DD, exclusive):",
      "2026-04-13",
    );
    if (!max) return;
    void runBackfill({
      createdAtMin: `${min}T00:00:00Z`,
      createdAtMax: `${max}T00:00:00Z`,
      label: `${min} → ${max}`,
    });
  }, [runBackfill]);


  useEffect(() => {
    void load();
  }, [load]);

  const series = data?.series ?? [];
  const totals = data?.totals;
  const sources = data?.sources;

  const chartData = series.map((row) => ({
    month: row.monthLabel,
    "This year": row.current,
    "Last year": row.prior,
  }));

  return (
    <section className="bg-card border border-border rounded-[15px] p-6 space-y-5">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1 min-w-[240px] flex-1">
          <h2 className="text-base font-medium text-foreground">
            Year over year: completed registrations
          </h2>
          <p className="text-sm text-muted-foreground">
            Rolling 12-month window vs the matching 12 months from a year ago.
            Merges this app's completed signups with the Helium customer
            history, deduped by email. Test accounts excluded.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void runBackfill()}
            disabled={loading || backfilling}
            title="Pull every customer from the Helium Customer Fields API and store their signup date"
          >
            {backfilling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span className="ml-2 text-xs">Backfill from Helium</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={refillRange}
            disabled={loading || backfilling}
            title="Re-pull a specific date range from Helium (use to fill gaps)"
          >
            <Download className="w-4 h-4" />
            <span className="ml-2 text-xs">Refill date range…</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span className="ml-2 text-xs">Refresh</span>
          </Button>
        </div>
      </header>

      {backfillStatus && (
        <div className="text-xs text-muted-foreground border border-border/60 rounded-[10px] px-3 py-2">
          {backfillStatus}
        </div>
      )}

      {sources && (
        <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>
            Live signups counted:{" "}
            <span className="text-foreground tabular-nums">{sources.liveCount.toLocaleString()}</span>
          </span>
          <span>·</span>
          <span>
            From Helium backfill:{" "}
            <span className="text-foreground tabular-nums">{sources.backfillCount.toLocaleString()}</span>
          </span>
          <span>·</span>
          <span>
            Backfill stored total:{" "}
            <span className="text-foreground tabular-nums">{sources.backfillTotal.toLocaleString()}</span>
          </span>
          {sources.backfillLastFetchedAt && (
            <>
              <span>·</span>
              <span>
                Last pulled{" "}
                {new Date(sources.backfillLastFetchedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </>
          )}
          {sources.backfillTotal === 0 && (
            <span className="text-status-amber">
              · Click "Backfill from Helium" to populate historical data.
            </span>
          )}
        </div>
      )}


      {error && (
        <div className="text-sm text-status-red bg-status-red/5 border border-status-red/20 rounded-[10px] p-3">
          {error}
        </div>
      )}

      {totals && (
        <div className="grid grid-cols-3 gap-3">
          <SummaryCard label="This year (rolling 12m)" value={totals.current} />
          <SummaryCard label="Prior 12 months" value={totals.prior} />
          <SummaryCard
            label="YoY change"
            value={
              <span className={cn("inline-flex items-center gap-1", pctTone(totals.deltaPct))}>
                <DeltaIcon pct={totals.deltaPct} />
                {fmtPct(totals.deltaPct)}
              </span>
            }
            sub={
              <span className={pctTone(totals.delta === 0 ? 0 : totals.delta)}>
                {totals.delta > 0 ? "+" : ""}
                {totals.delta} signups
              </span>
            }
          />
        </div>
      )}

      <div className="h-72 w-full">
        {loading && !data ? (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">
            No data yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 10,
                  fontSize: 12,
                }}
                cursor={{ fill: "hsl(var(--foreground) / 0.04)" }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Last year" fill="hsl(var(--muted-foreground) / 0.45)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="This year" fill="hsl(var(--foreground))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {series.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left font-normal py-2 pr-4">Month</th>
                <th className="text-right font-normal py-2 px-2">This year</th>
                <th className="text-right font-normal py-2 px-2">Last year</th>
                <th className="text-right font-normal py-2 pl-2">YoY</th>
              </tr>
            </thead>
            <tbody>
              {series.map((row) => (
                <tr
                  key={row.currentKey}
                  className={cn(
                    "border-b border-border/40 last:border-0",
                    row.isCurrentMonth && "bg-foreground/[0.012]",
                  )}
                >
                  <td className="py-2 pr-4 text-foreground">
                    {row.monthLabel}
                    {row.isCurrentMonth && (
                      <span className="ml-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        partial
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums text-foreground">{row.current}</td>
                  <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">{row.prior}</td>
                  <td className={cn("py-2 pl-2 text-right tabular-nums", pctTone(row.deltaPct))}>
                    {fmtPct(row.deltaPct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function SummaryCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="border border-border/60 rounded-[10px] p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xl font-medium text-foreground mt-1">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function DeltaIcon({ pct }: { pct: number | null }) {
  if (pct === null || pct === 0) return <Minus className="w-4 h-4" />;
  return pct > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
}
