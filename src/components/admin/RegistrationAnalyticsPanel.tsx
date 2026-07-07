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
type DropOffFieldRow = { field: string; count: number; step: string };
type ValidationErrorRow = {
  field: string;
  totalErrors: number;
  usersAffected: number;
  bouncedAffected: number;
  bounceRate: number;
};
type DeviceRow = { device: string; started: number; completed: number; bounceRate: number };
type DeviceByStepRow = {
  step: string;
  mobileStarted: number;
  desktopStarted: number;
  mobileBounceRate: number;
  desktopBounceRate: number;
};
type CohortRow = {
  date: string;
  size: number;
  within1h: number;
  within24h: number;
  within7d: number;
  ever: number;
  rate1h: number;
  rate24h: number;
  rate7d: number;
  rateEver: number;
  partial1h: boolean;
  partial24h: boolean;
  partial7d: boolean;
};
type ConsentByType = {
  type: string;
  total: number;
  sms: number;
  email: number;
  smsRate: number;
  emailRate: number;
};

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
  volumeCohorts?: {
    volume: string;
    tier: string;
    started: number;
    completed: number;
    purchasers: number;
    bounceRate: number;
    completionRate: number;
    purchaseRate: number;
  }[];
  dropOffSteps: DropOffRow[];
  dropOffFields?: DropOffFieldRow[];
  validationErrors?: ValidationErrorRow[];
  devices?: DeviceRow[];
  deviceByStep?: DeviceByStepRow[];
  cohorts: CohortRow[];
  consent?: {
    total: number;
    smsYes: number;
    emailYes: number;
    smsRate: number;
    emailRate: number;
    byType: ConsentByType[];
    series: { date: string; total: number; sms: number; smsRate: number }[];
  };
  recovery?: {
    recoveredCount: number;
    bouncedCount: number;
    eligibleCount: number;
    recoveryRate: number;
    medianHoursToRecover: number;
    windowHours: number;
  };
  error?: string;
};


interface Props {
  adminEmail: string;
  adminToken: string;
}

const RANGE_OPTIONS: { label: string; days: number }[] = [
  { label: "24h", days: 1 },
  { label: "72h", days: 3 },
  { label: "Last 7d", days: 7 },
  { label: "Last 14d", days: 14 },
  { label: "Last 30d", days: 30 },
  { label: "Last 90d", days: 90 },
  { label: "Last 120d", days: 120 },
];

export const RegistrationAnalyticsPanel = ({ adminEmail, adminToken }: Props) => {
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
        { body: { token: adminToken, days } },
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
  }, [adminEmail, adminToken, days]);

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
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.label}
            type="button"
            onClick={() => setDays(opt.days)}
            className={cn(
              "px-2.5 py-1 rounded-full border transition-colors",
              days === opt.days
                ? "border-foreground/60 bg-foreground/[0.04] text-foreground"
                : "border-border/50 text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
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

      {/* Abandoned-registration recovery */}
      {data?.recovery && data.recovery.eligibleCount > 0 && (
        <div className="rounded-[10px] border border-border/50 p-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
            Abandoned-registration recovery
          </div>
          <p className="text-[10px] text-muted-foreground mb-3">
            Users who completed more than {data.recovery.windowHours}h after first touch — the cohort the Klaviyo
            abandoned-registration flow is designed to bring back. Recovery rate = recovered / (recovered + still-bounced).
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <Tile
              icon={<CheckCircle2 className="w-3.5 h-3.5 text-status-green" />}
              label="Recovered"
              value={data.recovery.recoveredCount}
              suffix={`${data.recovery.recoveryRate}%`}
            />
            <Tile
              icon={<TrendingDown className="w-3.5 h-3.5 text-destructive" />}
              label="Still bounced"
              value={data.recovery.bouncedCount}
            />
            <Tile
              icon={<Clock className="w-3.5 h-3.5 text-muted-foreground" />}
              label="Median time-to-recover"
              value={data.recovery.medianHoursToRecover}
              suffix="hours"
            />
          </div>
        </div>
      )}

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

      {/* Monthly order volume cohorts */}
      {(data?.volumeCohorts?.length ?? 0) > 0 && (
        <div className="rounded-[10px] border border-border/50 p-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
            By monthly order volume
          </div>
          <p className="text-[10px] text-muted-foreground mb-2">
            Classifications from the order-volume step. Purchase % = first order placed / completed registrations.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="text-left py-1.5 pr-3 font-medium">Volume</th>
                  <th className="text-left py-1.5 px-2 font-medium">Tier</th>
                  <th className="text-right py-1.5 px-2 font-medium">Started</th>
                  <th className="text-right py-1.5 px-2 font-medium">Completed</th>
                  <th className="text-right py-1.5 px-2 font-medium">Bounce %</th>
                  <th className="text-right py-1.5 pl-2 font-medium">Purchase %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data!.volumeCohorts!.map((row) => (
                  <tr key={row.volume}>
                    <td className="py-1.5 pr-3 font-medium">{row.volume === "unknown" ? "—" : row.volume}</td>
                    <td className="py-1.5 px-2 text-muted-foreground">{row.tier}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">{row.started}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">
                      {row.completed}
                      <span className="text-[10px] opacity-70 ml-1">({row.completionRate}%)</span>
                    </td>
                    <td
                      className={cn(
                        "py-1.5 px-2 text-right tabular-nums",
                        row.bounceRate > 50 ? "text-destructive" : "text-status-green",
                      )}
                    >
                      {row.bounceRate}%
                    </td>
                    <td className="py-1.5 pl-2 text-right tabular-nums">
                      {row.purchaseRate}%
                      <span className="text-[10px] opacity-70 ml-1">({row.purchasers})</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      {/* Last field before bounce */}
      {(data?.dropOffFields?.length ?? 0) > 0 && (
        <div className="rounded-[10px] border border-border/50 p-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
            Last focused field before bounce
          </div>
          <p className="text-[10px] text-muted-foreground mb-2">
            The exact input users were on right before abandoning. Pair with step to find micro-friction.
          </p>
          <div className="divide-y divide-border/50">
            {data!.dropOffFields!.map((row) => (
              <div key={row.field} className="flex items-center justify-between py-1.5 text-xs gap-3">
                <span className="font-medium truncate">{row.field}</span>
                <span className="text-muted-foreground tabular-nums whitespace-nowrap">
                  {row.count} <span className="text-[10px] opacity-70">· {row.step}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Validation errors */}
      {(data?.validationErrors?.length ?? 0) > 0 && (
        <div className="rounded-[10px] border border-border/50 p-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
            Validation error hotspots
          </div>
          <p className="text-[10px] text-muted-foreground mb-2">
            Fields that fire validation errors most often. High bounce % among affected users = fixable friction.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="text-left py-1.5 pr-3 font-medium">Field</th>
                  <th className="text-right py-1.5 px-2 font-medium">Errors</th>
                  <th className="text-right py-1.5 px-2 font-medium">Users</th>
                  <th className="text-right py-1.5 pl-2 font-medium">Bounce %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data!.validationErrors!.map((row) => (
                  <tr key={row.field}>
                    <td className="py-1.5 pr-3 font-medium truncate max-w-[180px]">{row.field}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">{row.totalErrors}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">{row.usersAffected}</td>
                    <td
                      className={cn(
                        "py-1.5 pl-2 text-right tabular-nums",
                        row.bounceRate > 50 ? "text-destructive" : "text-muted-foreground",
                      )}
                    >
                      {row.bounceRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Device split */}
      {(data?.devices?.length ?? 0) > 0 && (
        <div className="rounded-[10px] border border-border/50 p-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
            By device
          </div>
          <div className="divide-y divide-border/50">
            {data!.devices!.map((row) => (
              <div key={row.device} className="flex items-center justify-between py-1.5 text-xs">
                <span className="font-medium capitalize">{row.device}</span>
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

      {/* Mobile vs desktop bounce per step */}
      {(data?.deviceByStep?.length ?? 0) > 0 && (
        <div className="rounded-[10px] border border-border/50 p-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
            Where abandons happen, by device
          </div>
          <p className="text-[10px] text-muted-foreground mb-2">
            Share of all abandoned registrations that occurred at each step. Columns sum to 100% per device. Steps concentrating the most abandons are the highest-leverage places to fix UX.
          </p>
          {(() => {
            const rows = data!.deviceByStep!.map((row) => ({
              step: row.step,
              mobileBounces: Math.round((row.mobileStarted * row.mobileBounceRate) / 100),
              desktopBounces: Math.round((row.desktopStarted * row.desktopBounceRate) / 100),
              mobileRate: row.mobileBounceRate,
              desktopRate: row.desktopBounceRate,
            }));
            const mobileTotal = rows.reduce((s, r) => s + r.mobileBounces, 0) || 1;
            const desktopTotal = rows.reduce((s, r) => s + r.desktopBounces, 0) || 1;
            const sorted = [...rows].sort(
              (a, b) => b.mobileBounces / mobileTotal - a.mobileBounces / mobileTotal,
            );
            return (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      <th className="text-left py-1.5 pr-3 font-medium">Step</th>
                      <th className="text-right py-1.5 px-2 font-medium">Mobile abandons</th>
                      <th className="text-right py-1.5 px-2 font-medium">Mobile share</th>
                      <th className="text-right py-1.5 px-2 font-medium">Desktop abandons</th>
                      <th className="text-right py-1.5 pl-2 font-medium">Desktop share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {sorted.map((row) => {
                      const mShare = (row.mobileBounces / mobileTotal) * 100;
                      const dShare = (row.desktopBounces / desktopTotal) * 100;
                      const gap = mShare - dShare;
                      return (
                        <tr key={row.step}>
                          <td className="py-1.5 pr-3 font-medium truncate max-w-[200px]">{row.step}</td>
                          <td className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">{row.mobileBounces}</td>
                          <td className={cn("py-1.5 px-2 text-right tabular-nums", gap > 15 ? "text-destructive" : "")}>
                            {mShare.toFixed(1)}%
                          </td>
                          <td className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">{row.desktopBounces}</td>
                          <td className="py-1.5 pl-2 text-right tabular-nums">{dShare.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                    <tr className="text-[10px] text-muted-foreground">
                      <td className="py-1.5 pr-3 uppercase tracking-wide">Total</td>
                      <td className="py-1.5 px-2 text-right tabular-nums">{mobileTotal}</td>
                      <td className="py-1.5 px-2 text-right tabular-nums">100%</td>
                      <td className="py-1.5 px-2 text-right tabular-nums">{desktopTotal}</td>
                      <td className="py-1.5 pl-2 text-right tabular-nums">100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}



      {/* Marketing consent (SMS / email opt-in rates) */}
      {data?.consent && data.consent.total > 0 && (
        <div className="rounded-[10px] border border-border/50 p-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
            Marketing consent
          </div>
          <p className="text-[10px] text-muted-foreground mb-3">
            % of completed registrations that opted in to each channel. Source: submitted
            payload (mirrors what we send to Shopify / Klaviyo).
          </p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <Tile
              icon={<TrendingUp className="w-3.5 h-3.5 text-status-green" />}
              label="SMS opt-in"
              value={data.consent.smsYes}
              suffix={`${data.consent.smsRate}% of ${data.consent.total}`}
            />
            <Tile
              icon={<TrendingUp className="w-3.5 h-3.5 text-status-green" />}
              label="Email opt-in"
              value={data.consent.emailYes}
              suffix={`${data.consent.emailRate}% of ${data.consent.total}`}
            />
          </div>
          <div className="divide-y divide-border/50">
            {data.consent.byType.map((row) => (
              <div key={row.type} className="flex items-center justify-between py-1.5 text-xs gap-3">
                <span className="font-medium capitalize">{row.type.replace(/_/g, " ")}</span>
                <span className="text-muted-foreground tabular-nums whitespace-nowrap">
                  SMS <span className={cn("ml-1", row.smsRate >= 50 ? "text-status-green" : "text-foreground")}>{row.smsRate}%</span>
                  <span className="text-[10px] opacity-70 ml-1">({row.sms}/{row.total})</span>
                  <span className="mx-2 opacity-30">·</span>
                  Email <span className={cn("ml-1", row.emailRate >= 50 ? "text-status-green" : "text-foreground")}>{row.emailRate}%</span>
                  <span className="text-[10px] opacity-70 ml-1">({row.email}/{row.total})</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cohort retention */}
      {(data?.cohorts?.length ?? 0) > 0 && (
        <div className="rounded-[10px] border border-border/50 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Cohort retention (by start day)
            </div>
            <div className="text-[10px] text-muted-foreground">
              % of cohort completed within window · <span className="italic">partial</span> = window not fully elapsed
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="text-left py-1.5 pr-3 font-medium">Day</th>
                  <th className="text-right py-1.5 px-2 font-medium">Size</th>
                  <th className="text-right py-1.5 px-2 font-medium">1h</th>
                  <th className="text-right py-1.5 px-2 font-medium">24h</th>
                  <th className="text-right py-1.5 px-2 font-medium">7d</th>
                  <th className="text-right py-1.5 pl-2 font-medium">Ever</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data!.cohorts.slice(0, 30).map((row) => (
                  <tr key={row.date}>
                    <td className="py-1.5 pr-3 font-medium tabular-nums">{row.date.slice(5)}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">{row.size}</td>
                    <CohortCell rate={row.rate1h} count={row.within1h} partial={row.partial1h} />
                    <CohortCell rate={row.rate24h} count={row.within24h} partial={row.partial24h} />
                    <CohortCell rate={row.rate7d} count={row.within7d} partial={row.partial7d} />
                    <CohortCell rate={row.rateEver} count={row.ever} partial={false} />
                  </tr>
                ))}
              </tbody>
            </table>
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

function CohortCell({ rate, count, partial }: { rate: number; count: number; partial: boolean }) {
  const tone = rate >= 50 ? "text-status-green" : rate >= 25 ? "text-foreground" : "text-muted-foreground";
  return (
    <td className="py-1.5 px-2 text-right tabular-nums">
      <span className={cn(tone, partial && "italic opacity-60")} title={`${count} completed${partial ? " · partial window" : ""}`}>
        {rate}%
      </span>
    </td>
  );
}
