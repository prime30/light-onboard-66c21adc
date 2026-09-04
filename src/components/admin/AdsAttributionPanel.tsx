import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type ChannelRow = {
  key: string;
  label: string;
  paid: boolean;
  count: number;
  completed: number;
  pct: number;
};

type CampaignRow = {
  key: string;
  channelLabel: string;
  campaign: string;
  count: number;
  completed: number;
};

type Data = {
  total: number;
  tracked: number;
  trackedRate: number;
  paidTotal: number;
  paidCompleted: number;
  paidShare: number;
  socialClickTotal: number;
  socialClickCompleted: number;
  socialClickShare: number;
  taggedClicks?: number;
  untaggedClicks?: number;
  taggedShare?: number;
  channels: ChannelRow[];
  campaigns: CampaignRow[];
  timeline?: TimelineRow[];
};

type TimelineRow = {
  day: string;
  total: number;
  paid: number;
  social: number;
};

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

export const AdsAttributionPanel = ({ adminEmail, adminToken }: Props) => {
  const [loading, setLoading] = useState(false);
  const [sinceDays, setSinceDays] = useState(30);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: invokeErr } = await supabase.functions.invoke(
        "admin-ads-attribution",
        { body: { token: adminToken, sinceDays } }
      );
      if (invokeErr || !res?.success) {
        setError(res?.error ?? invokeErr?.message ?? "Failed to load attribution");
        setData(null);
        return;
      }
      setData(res as Data);
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

  const maxCount = Math.max(1, ...(data?.channels.map((c) => c.count) ?? [0]));

  return (
    <div className="space-y-4 rounded-[15px] border border-border/50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">Where registrations came from</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Channel is derived from the click ids and campaign tags on the landing page
            (Meta, Google, TikTok, email, direct). Only signups after tracking went live
            carry a channel.
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat label="Submissions" value={data.total.toString()} />
            <Stat label="Tracked" value={`${data.trackedRate}%`} />
            <Stat
              label="Paid ads"
              value={data.paidTotal.toString()}
              hint={`${data.paidShare}% of signups · ${data.paidCompleted} completed`}
            />
            <Stat
              label="Social link clicks"
              value={(data.socialClickTotal ?? 0).toString()}
              hint={`${data.socialClickShare ?? 0}% of signups · ${data.socialClickCompleted ?? 0} completed`}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Social link clicks are free in-app taps from Facebook, Instagram or TikTok
            (fbclid / ttclid without paid campaign params). They are never counted as ads.
          </p>

          <div className="space-y-1.5">
            {data.channels.length === 0 ? (
              <p className="text-xs text-muted-foreground">No submissions in this range.</p>
            ) : (
              data.channels.map((c) => (
                <div key={c.key} className="space-y-1">
                  <div className="flex items-center justify-between text-[12px]">
                    <span
                      className={cn(
                        "truncate",
                        c.key === "untracked" ? "text-muted-foreground italic" : "text-foreground"
                      )}
                    >
                      {c.label}
                      {c.paid && (
                        <span className="ml-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                          paid
                        </span>
                      )}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {c.count} · {c.pct}% · {c.completed} completed
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        c.paid ? "bg-foreground" : "bg-foreground/25"
                      )}
                      style={{ width: `${(c.count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {(data.timeline?.length ?? 0) > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Daily paid vs social clicks
                </p>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-sm bg-foreground" /> Paid ads
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-sm bg-foreground/30" /> Social clicks
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-sm bg-muted" /> Other
                  </span>
                </div>
              </div>
              <div className="flex items-end gap-[3px] h-20">
                {(data.timeline ?? []).map((d) => {
                  const max = Math.max(1, ...(data.timeline ?? []).map((x) => x.total));
                  const h = (n: number) => `${(n / max) * 100}%`;
                  const other = Math.max(0, d.total - d.paid - d.social);
                  return (
                    <div
                      key={d.day}
                      className="flex-1 min-w-[3px] flex flex-col justify-end gap-[1px]"
                      title={`${d.day}: ${d.paid} paid · ${d.social} social clicks · ${other} other (${d.total} total)`}
                    >
                      <div className="rounded-sm bg-muted" style={{ height: h(other) }} />
                      <div className="rounded-sm bg-foreground/30" style={{ height: h(d.social) }} />
                      <div className="rounded-sm bg-foreground" style={{ height: h(d.paid) }} />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
                <span>{data.timeline?.[0]?.day}</span>
                <span>{data.timeline?.[(data.timeline?.length ?? 1) - 1]?.day}</span>
              </div>
            </div>
          )}

          {data.campaigns.length > 0 && (
            <details className="rounded-[10px] bg-muted/40 p-3">
              <summary className="text-[11px] uppercase tracking-wide text-muted-foreground cursor-pointer">
                Top ad campaigns
              </summary>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="font-medium pb-1.5 pr-3">Campaign</th>
                      <th className="font-medium pb-1.5 px-2">Channel</th>
                      <th className="font-medium pb-1.5 px-2 text-right">Signups</th>
                      <th className="font-medium pb-1.5 pl-2 text-right">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.campaigns.map((c) => (
                      <tr key={c.key} className="border-t border-border/40">
                        <td className="py-1 pr-3 text-foreground/80">{c.campaign}</td>
                        <td className="py-1 px-2 text-muted-foreground">{c.channelLabel}</td>
                        <td className="py-1 px-2 text-right tabular-nums">{c.count}</td>
                        <td className="py-1 pl-2 text-right tabular-nums">{c.completed}</td>
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

const Stat = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="rounded-[10px] border border-border/50 p-2.5">
    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="text-sm font-medium tabular-nums mt-0.5">{value}</p>
    {hint && <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">{hint}</p>}
  </div>
);
