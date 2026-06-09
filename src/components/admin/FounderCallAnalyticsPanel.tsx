import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  RefreshCw,
  Phone,
  CheckCircle2,
  CalendarClock,
  Percent,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

type SeriesPoint = { date: string; completed: number; booked: number; takeRate: number };
type TypeRow = { type: string; completed: number; booked: number; takeRate: number };
type RecentRow = {
  email: string;
  accountType: string | null;
  bookedAt: string | null;
  startTime: string | null;
};

type ApiResponse = {
  success: boolean;
  rangeDays: number;
  founderCall?: {
    completedCount: number;
    bookedCount: number;
    futureCount: number;
    takeRate: number;
    series: SeriesPoint[];
    byType: TypeRow[];
    recent: RecentRow[];
  };
  error?: string;
};

const RANGE_OPTIONS = [7, 14, 30, 90] as const;

interface Props {
  adminEmail: string;
  adminPassword: string;
}

export const FounderCallAnalyticsPanel = ({ adminEmail, adminPassword }: Props) => {
  const [days, setDays] = useState<number>(30);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<string | null>(null);

  const runBackfill = useCallback(
    async (dryRun: boolean) => {
      setBackfilling(true);
      setBackfillResult(null);
      try {
        const { data: res, error: invokeErr } = await supabase.functions.invoke(
          "backfill-founder-calls",
          {
            body: {
              email: adminEmail,
              password: adminPassword,
              dryRun,
              daysBack: 365,
              daysForward: 90,
            },
          },
        );
        if (invokeErr || !res?.success) {
          setBackfillResult(`Error: ${res?.error ?? invokeErr?.message ?? "failed"}`);
        } else {
          setBackfillResult(
            `${dryRun ? "Dry run" : "Backfilled"} — ${res.bookingsFound} Calendly bookings, ${res.updated} leads ${dryRun ? "would be" : ""} updated, ${res.skipped} already stamped, ${res.noLead} with no matching lead.`,
          );
          if (!dryRun) fetchDataRef.current?.();
        }
      } catch (e) {
        setBackfillResult(`Error: ${e instanceof Error ? e.message : "failed"}`);
      } finally {
        setBackfilling(false);
      }
    },
    [adminEmail, adminPassword],
  );

  const fetchDataRef = { current: null as null | (() => void) };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: invokeErr } = await supabase.functions.invoke(
        "admin-registration-analytics",
        { body: { email: adminEmail, password: adminPassword, days } },
      );
      if (invokeErr || !res?.success) {
        setError(res?.error ?? invokeErr?.message ?? "Failed to load analytics");
        setData(null);
        return;
      }
      setData(res as ApiResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [adminEmail, adminPassword, days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fc = data?.founderCall;
  const hasData = (fc?.completedCount ?? 0) > 0;

  return (
    <div className="space-y-4 rounded-[15px] border border-border/50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">Founder call take rate</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Of users who completed registration, how many opted into a 30-min call with Eric.
            Bookings are stamped when Calendly accepts the invitee.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={fetchData} disabled={loading}>
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5 text-[11px]">
        {RANGE_OPTIONS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDays(d)}
            className={cn(
              "px-2.5 py-1 rounded-full border transition-colors",
              days === d
                ? "border-foreground/60 bg-foreground/[0.04] text-foreground"
                : "border-border/50 text-muted-foreground hover:text-foreground",
            )}
          >
            Last {d}d
          </button>
        ))}
      </div>

      {error && (
        <div className="text-xs text-destructive flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Tile
          icon={<CheckCircle2 className="w-3.5 h-3.5 text-status-green" />}
          label="Completed"
          value={fc?.completedCount ?? 0}
          loading={loading && !data}
        />
        <Tile
          icon={<Phone className="w-3.5 h-3.5" />}
          label="Booked call"
          value={fc?.bookedCount ?? 0}
          loading={loading && !data}
        />
        <Tile
          icon={<Percent className="w-3.5 h-3.5 text-foreground" />}
          label="Take rate"
          value={fc?.takeRate ?? 0}
          suffix="%"
          loading={loading && !data}
        />
        <Tile
          icon={<CalendarClock className="w-3.5 h-3.5 text-muted-foreground" />}
          label="Upcoming"
          value={fc?.futureCount ?? 0}
          loading={loading && !data}
        />
      </div>

      {/* Trend */}
      <div className="rounded-[10px] border border-border/50 p-3">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
          Daily trend
        </div>
        {!hasData && !loading ? (
          <p className="text-xs text-muted-foreground py-8 text-center">
            No completed registrations in this range yet.
          </p>
        ) : (
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={fc?.series ?? []}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(d: string) => d.slice(5)}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="completed"
                  stroke="hsl(var(--foreground))"
                  strokeWidth={1.5}
                  dot={false}
                  name="Completed regs"
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="booked"
                  stroke="hsl(var(--status-green, 142 71% 45%))"
                  strokeWidth={1.5}
                  dot={false}
                  name="Booked calls"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="takeRate"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={false}
                  name="Take rate %"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* By account type */}
      {(fc?.byType?.length ?? 0) > 0 && (
        <div className="rounded-[10px] border border-border/50 p-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
            By account type
          </div>
          <div className="divide-y divide-border/50">
            {fc!.byType.map((row) => (
              <div
                key={row.type}
                className="flex items-center justify-between py-1.5 text-xs"
              >
                <span className="font-medium capitalize">{row.type.replace(/_/g, " ")}</span>
                <span className="text-muted-foreground tabular-nums">
                  {row.booked} / {row.completed}
                  <span
                    className={cn(
                      "ml-2",
                      row.takeRate >= 25 ? "text-status-green" : "text-muted-foreground",
                    )}
                  >
                    {row.takeRate}%
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent bookings */}
      {(fc?.recent?.length ?? 0) > 0 && (
        <div className="rounded-[10px] border border-border/50 p-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
            Recent bookings
          </div>
          <div className="divide-y divide-border/50">
            {fc!.recent.map((r) => (
              <div
                key={`${r.email}-${r.bookedAt ?? ""}`}
                className="flex items-center justify-between gap-3 py-1.5 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{r.email}</div>
                  <div className="text-[10px] text-muted-foreground capitalize">
                    {(r.accountType ?? "unknown").replace(/_/g, " ")}
                  </div>
                </div>
                <div className="text-right tabular-nums text-muted-foreground shrink-0">
                  {r.startTime ? new Date(r.startTime).toLocaleString() : "—"}
                  <div className="text-[10px]">
                    booked {r.bookedAt ? new Date(r.bookedAt).toLocaleDateString() : "—"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

function Tile({
  icon,
  label,
  value,
  suffix,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-[10px] border border-border/50 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-xl font-semibold tabular-nums">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : (
            value
          )}
        </span>
        {suffix && <span className="text-[11px] text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}
