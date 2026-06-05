import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, TrendingDown, TrendingUp, Users, CheckCircle2, Clock, AlertCircle } from "lucide-react";
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

type SeriesPoint = { date: string; started: number; completed: number; bounceRate: number };
type AccountTypeRow = { type: string; started: number; completed: number; bounceRate: number };
type DropOffRow = { step: string; count: number };

type ApiResponse = {
  success: boolean;
  rangeDays: number;
  graceMinutes: number;
  totals: {
    leads: number;
    completed: number;
    bounced: number;
    inProgress: number;
    bounceRate: number;
    completionRate: number;
  };
  series: SeriesPoint[];
  accountTypes: AccountTypeRow[];
  dropOffSteps: DropOffRow[];
  error?: string;
};

interface Props {
  adminEmail: string;
  adminPassword: string;
}

const RANGE_OPTIONS = [7, 14, 30, 90] as const;

export const RegistrationAnalyticsPanel = ({ adminEmail, adminPassword }: Props) => {
  const [days, setDays] = useState<number>(30);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const totals = data?.totals;
  const hasData = (totals?.leads ?? 0) > 0;

  return (
    <div className="space-y-4 rounded-[15px] border border-border/50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">Registration funnel</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Completion vs bounce for users who entered an email. Excludes the last{" "}
            {data?.graceMinutes ?? 30} min (still in progress) from bounce math.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={fetchData} disabled={loading}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
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

      {/* Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Tile
          icon={<Users className="w-3.5 h-3.5" />}
          label="Started"
          value={totals?.leads ?? 0}
          loading={loading && !data}
        />
        <Tile
          icon={<CheckCircle2 className="w-3.5 h-3.5 text-status-green" />}
          label="Completed"
          value={totals?.completed ?? 0}
          suffix={totals ? `${totals.completionRate}%` : undefined}
          loading={loading && !data}
        />
        <Tile
          icon={<TrendingDown className="w-3.5 h-3.5 text-destructive" />}
          label="Bounced"
          value={totals?.bounced ?? 0}
          suffix={totals ? `${totals.bounceRate}%` : undefined}
          loading={loading && !data}
        />
        <Tile
          icon={<Clock className="w-3.5 h-3.5 text-muted-foreground" />}
          label="In progress"
          value={totals?.inProgress ?? 0}
          loading={loading && !data}
        />
      </div>

      {/* Trend chart */}
      <div className="rounded-[10px] border border-border/50 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Daily trend</div>
          <div className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> bounce % overlay
          </div>
        </div>
        {!hasData && !loading ? (
          <p className="text-xs text-muted-foreground py-8 text-center">
            No registration leads captured yet. Data will appear here as soon as users start entering emails.
          </p>
        ) : (
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.series ?? []} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(d: string) => d.slice(5)}
                />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
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
                  dataKey="started"
                  stroke="hsl(var(--foreground))"
                  strokeWidth={1.5}
                  dot={false}
                  name="Started"
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="completed"
                  stroke="hsl(var(--status-green, 142 71% 45%))"
                  strokeWidth={1.5}
                  dot={false}
                  name="Completed"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="bounceRate"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={false}
                  name="Bounce %"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Account type breakdown */}
      {(data?.accountTypes?.length ?? 0) > 0 && (
        <div className="rounded-[10px] border border-border/50 p-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
            By account type
          </div>
          <div className="divide-y divide-border/50">
            {data!.accountTypes.map((row) => (
              <div key={row.type} className="flex items-center justify-between py-1.5 text-xs">
                <span className="font-medium capitalize">{row.type.replace(/_/g, " ")}</span>
                <span className="text-muted-foreground tabular-nums">
                  {row.completed} / {row.started}
                  <span
                    className={cn(
                      "ml-2",
                      row.bounceRate > 50 ? "text-destructive" : "text-status-green",
                    )}
                  >
                    {row.bounceRate}% bounce
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drop-off steps */}
      {(data?.dropOffSteps?.length ?? 0) > 0 && (
        <div className="rounded-[10px] border border-border/50 p-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
            Top drop-off steps
          </div>
          <div className="divide-y divide-border/50">
            {data!.dropOffSteps.map((row) => (
              <div key={row.step} className="flex items-center justify-between py-1.5 text-xs">
                <span className="font-medium">{row.step}</span>
                <span className="text-muted-foreground tabular-nums">{row.count}</span>
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
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-xl font-semibold tabular-nums">
          {loading ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : value}
        </span>
        {suffix && <span className="text-[11px] text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}
