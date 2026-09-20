import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type ChannelRow = {
  key: string;
  label: string;
  paid: boolean;
  count: number;
  completed: number;
  orders?: number;
  revenue?: number;
  aov?: number;
  pct: number;
};

type CampaignRow = {
  key: string;
  channel?: string;
  channelLabel: string;
  campaign: string;
  count: number;
  completed: number;
  orders?: number;
  revenue?: number;
  aov?: number;
  cost?: number;
  roas?: number | null;
  profit?: number | null;
  costPerSignup?: number | null;
  costSource?: string | null;
  metaSpend?: number | null;
  metaImpressions?: number | null;
  metaClicks?: number | null;
  metaLinkClicks?: number | null;
  metaPurchases?: number | null;
  metaRevenue?: number | null;
  metaRoas?: number | null;
};

type MetaOnlyRow = {
  campaign: string;
  spend: number;
  clicks: number;
  linkClicks: number;
  purchases: number;
  revenue: number;
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
  affiliateTotal?: number;
  affiliateCompleted?: number;
  affiliateShare?: number;
  refWithoutCampaign?: number;
  ordersTotal?: number;
  revenueTotal?: number;
  buyersTotal?: number;
  repeatOrdersTotal?: number;
  repeatRevenueTotal?: number;
  paidOrders?: number;
  paidRevenue?: number;
  paidBuyers?: number;
  paidAov?: number;
  paidPurchaseRate?: number;
  paidCost?: number;
  paidRoas?: number | null;
  paidCostPerSignup?: number | null;
  paidCostPerPurchase?: number | null;
  socialOrders?: number;
  socialRevenue?: number;
  affiliateOrders?: number;
  affiliateRevenue?: number;
  preSignupBuyers?: number;
  preSignupRevenue?: number;
  phoneMatchedBuyers?: number;
  phoneMatchedRevenue?: number;
  ordersSyncedAt?: string | null;
  ordersSyncedLeads?: number;

  metaConnected?: boolean;
  metaSpend?: number;
  metaImpressions?: number;
  metaClicks?: number;
  metaLinkClicks?: number;
  metaPurchases?: number;
  metaRevenue?: number;
  metaRoas?: number | null;
  metaCostPerLead?: number | null;
  metaCurrency?: string;
  metaSyncedAt?: string | null;
  metaOnlyCampaigns?: MetaOnlyRow[];



  topRefs?: RefRow[];
  channels: ChannelRow[];
  campaigns: CampaignRow[];
  timeline?: TimelineRow[];
};

type RefRow = {
  ref: string;
  total: number;
  completed: number;
  untaggedAd: number;
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
  // Ad spend inputs, keyed by "channel::campaign".
  const [costDraft, setCostDraft] = useState<Record<string, string>>({});
  const [savingCost, setSavingCost] = useState<string | null>(null);
  const [syncingMeta, setSyncingMeta] = useState(false);
  const [metaNote, setMetaNote] = useState<string | null>(null);



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

  const saveCost = useCallback(
    async (row: CampaignRow) => {
      const raw = costDraft[row.key];
      const cost = Number((raw ?? "").replace(/[^0-9.]/g, ""));
      if (!Number.isFinite(cost) || cost < 0) return;
      setSavingCost(row.key);
      setError(null);
      try {
        const { data: res, error: invokeErr } = await supabase.functions.invoke(
          "admin-ads-attribution",
          {
            body: {
              token: adminToken,
              action: "setCampaignCost",
              channel: row.channel ?? row.key.split("::")[0],
              campaign: row.campaign || row.key.split("::")[1],
              cost,
            },
          }
        );
        if (invokeErr || !res?.success) {
          setError(res?.error ?? invokeErr?.message ?? "Failed to save spend");
          return;
        }
        setCostDraft((d) => {
          const next = { ...d };
          delete next[row.key];
          return next;
        });
        await fetchData();
      } finally {
        setSavingCost(null);
      }
    },
    [adminToken, costDraft, fetchData]
  );

  // Pulls fresh spend and results from the Meta ad account.
  const syncMeta = useCallback(async () => {
    setSyncingMeta(true);
    setMetaNote(null);
    setError(null);
    try {
      const { data: res, error: invokeErr } = await supabase.functions.invoke("meta-ads-sync", {
        body: { token: adminToken, daysBack: Math.max(sinceDays, 90) },
      });
      if (invokeErr || !res?.success) {
        setMetaNote(res?.error ?? invokeErr?.message ?? "Could not pull figures from Meta.");
        return;
      }
      setMetaNote(
        `Pulled ${res.rowsWritten ?? 0} campaign days from Meta: ${money(res.spend ?? 0)} spend, ${
          res.purchases ?? 0
        } purchases reported.`,
      );
      await fetchData();
    } catch (e) {
      setMetaNote(e instanceof Error ? e.message : "Could not pull figures from Meta.");
    } finally {
      setSyncingMeta(false);
    }
  }, [adminToken, fetchData, sinceDays]);

  // Pulls store orders in, matching by email first and phone number second.
  const [syncingOrders, setSyncingOrders] = useState(false);
  const [ordersNote, setOrdersNote] = useState<string | null>(null);
  const syncOrders = useCallback(async () => {
    setSyncingOrders(true);
    setOrdersNote(null);
    setError(null);
    try {
      const { data: res, error: invokeErr } = await supabase.functions.invoke(
        "backfill-first-orders",
        { body: { token: adminToken, daysBack: 1095 } },
      );
      if (invokeErr || !res?.success) {
        setOrdersNote(res?.error ?? invokeErr?.message ?? "Could not pull orders from the store.");
        return;
      }
      setOrdersNote(
        `Read ${res.totalOrdersSeen ?? 0} orders, matched ${res.matchedLeads ?? 0} signups (${
          res.phoneMatched ?? 0
        } by phone number).`,
      );
      await fetchData();
    } catch (e) {
      setOrdersNote(e instanceof Error ? e.message : "Could not pull orders from the store.");
    } finally {
      setSyncingOrders(false);
    }
  }, [adminToken, fetchData]);

  const syncAgeHours = data?.ordersSyncedAt
    ? (Date.now() - Date.parse(data.ordersSyncedAt)) / 3_600_000
    : null;
  const syncStale = syncAgeHours == null || syncAgeHours > 36;
  const syncAgeLabel =
    syncAgeHours == null
      ? "never"
      : syncAgeHours < 1
        ? "just now"
        : syncAgeHours < 48
          ? `${Math.round(syncAgeHours)} hours ago`
          : `${Math.round(syncAgeHours / 24)} days ago`;

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
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
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
            <Stat
              label="Affiliate referrals"
              value={(data.affiliateTotal ?? 0).toString()}
              hint={`${data.affiliateShare ?? 0}% of signups · ${data.affiliateCompleted ?? 0} completed`}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Social link clicks are free in-app taps from Facebook, Instagram or TikTok
            (fbclid / ttclid without paid campaign params). They are never counted as ads.
          </p>

          <div className="space-y-2 rounded-[10px] border border-border/50 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Purchases and revenue from paid ads
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Stat
                label="Paid ad purchases"
                value={(data.paidOrders ?? 0).toString()}
                hint={`${data.paidPurchaseRate ?? 0}% of paid signups bought · ${data.paidBuyers ?? 0} customers`}
              />
              <Stat label="Paid ad revenue" value={money(data.paidRevenue ?? 0)} />
              <Stat label="Average order" value={money(data.paidAov ?? 0)} />
              <Stat
                label="All channels"
                value={money(data.revenueTotal ?? 0)}
                hint={`${data.ordersTotal ?? 0} purchases in range`}
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Stat
                label="Ad spend entered"
                value={money(data.paidCost ?? 0)}
                hint={
                  (data.paidCost ?? 0) > 0
                    ? `${money(data.paidCostPerSignup ?? 0)} per signup`
                    : "Add spend per campaign below"
                }
              />
              <Stat
                label="Return on ad spend"
                value={data.paidRoas == null ? "—" : `${data.paidRoas.toFixed(2)}x`}
                hint={
                  data.paidRoas == null
                    ? "Needs ad spend"
                    : `${money((data.paidRevenue ?? 0) - (data.paidCost ?? 0))} above spend`
                }
              />
              <Stat
                label="Cost per purchase"
                value={data.paidCostPerPurchase == null ? "—" : money(data.paidCostPerPurchase)}
              />
              <Stat
                label="Repeat purchases"
                value={(data.repeatOrdersTotal ?? 0).toString()}
                hint={`${money(data.repeatRevenueTotal ?? 0)} beyond first orders`}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
              <span>
                Social link clicks: {data.socialOrders ?? 0} purchases ·{" "}
                {money(data.socialRevenue ?? 0)}
              </span>
              <span>
                Affiliate referrals: {data.affiliateOrders ?? 0} purchases ·{" "}
                {money(data.affiliateRevenue ?? 0)}
              </span>
              {(data.preSignupBuyers ?? 0) > 0 && (
                <span>
                  Already customers before signing up: {data.preSignupBuyers} ·{" "}
                  {money(data.preSignupRevenue ?? 0)} (not counted)
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Revenue counts orders from customers whose first ever order came at or
              after their signup, matched by email to the channel that signup came
              from. People who were already buying before they signed up are listed
              separately and left out, so an existing customer cannot make a campaign
              look profitable. It only covers orders already pulled in from the store,
              so run the purchases sync to keep it current.
            </p>

          </div>

          <div className="space-y-2 rounded-[10px] border border-border/50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  What Meta reports vs what we verified
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {data.metaConnected
                    ? `Pulled straight from your Meta ad account${
                        data.metaSyncedAt
                          ? `, last updated ${new Date(data.metaSyncedAt).toLocaleString()}`
                          : ""
                      }.`
                    : "No Meta figures pulled in yet for this range. Use Sync Meta to pull spend and results from the ad account."}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0"
                onClick={syncMeta}
                disabled={syncingMeta}
              >
                {syncingMeta ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 mr-1.5" /> Sync Meta
                  </>
                )}
              </Button>
            </div>
            {metaNote && <p className="text-[11px] text-muted-foreground">{metaNote}</p>}
            {data.metaConnected && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Stat
                    label="Meta ad spend"
                    value={money(data.metaSpend ?? 0)}
                    hint={`${(data.metaImpressions ?? 0).toLocaleString()} impressions · ${(
                      data.metaLinkClicks ?? 0
                    ).toLocaleString()} link clicks`}
                  />
                  <Stat
                    label="Meta says purchases"
                    value={(data.metaPurchases ?? 0).toString()}
                    hint={`${money(data.metaRevenue ?? 0)} reported revenue`}
                  />
                  <Stat
                    label="We verified purchases"
                    value={(data.paidOrders ?? 0).toString()}
                    hint={`${money(data.paidRevenue ?? 0)} matched by email`}
                  />
                  <Stat
                    label="Meta return on spend"
                    value={data.metaRoas == null ? "—" : `${data.metaRoas.toFixed(2)}x`}
                    hint={
                      data.metaCostPerLead == null
                        ? undefined
                        : `${money(data.metaCostPerLead)} per paid signup we saw`
                    }
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Meta counts a sale when someone clicked or saw an ad within its
                  attribution window, even on untagged links. Ours only counts signups
                  that arrived with a campaign tag and later ordered with the same email,
                  so ours is the lower, verifiable floor.
                </p>
                {(data.metaOnlyCampaigns?.length ?? 0) > 0 && (
                  <div className="space-y-1 rounded-[10px] bg-muted/40 p-2.5">
                    <p className="text-[11px]">Meta campaigns we cannot match to signups</p>
                    {(data.metaOnlyCampaigns ?? []).map((m) => (
                      <div
                        key={m.campaign}
                        className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground"
                      >
                        <span className="truncate">{m.campaign}</span>
                        <span className="tabular-nums shrink-0">
                          {money(m.spend)} spent · {m.purchases} Meta purchases
                        </span>
                      </div>
                    ))}
                    <p className="text-[11px] text-muted-foreground">
                      These are usually ads whose links carry no utm_campaign tag, so their
                      signups land in direct instead.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>



          {(() => {
            const tagged = data.taggedClicks ?? 0;
            const untagged = data.untaggedClicks ?? 0;
            const sum = tagged + untagged;
            if (sum === 0) return null;
            const pct = data.taggedShare ?? 0;
            return (
              <div className="space-y-1.5 rounded-[10px] bg-muted/40 p-3">
                <div className="flex items-center justify-between text-[12px]">
                  <span>Tagged ad clicks vs untagged</span>
                  <span className="text-muted-foreground tabular-nums">
                    {tagged} tagged · {untagged} untagged · {pct}% tagged
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden flex">
                  <div className="h-full bg-foreground" style={{ width: `${(tagged / sum) * 100}%` }} />
                  <div className="h-full bg-foreground/25" style={{ width: `${(untagged / sum) * 100}%` }} />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Untagged means the visit arrived with a click id or source but no
                  utm_campaign, so it cannot be credited to a specific ad. Add
                  utm_campaign to every ad link to shrink this number.
                </p>
              </div>
            );
          })()}

          {(data.topRefs?.length ?? 0) > 0 && (
            <div className="space-y-2 rounded-[10px] bg-muted/40 p-3">
              <div className="flex items-center justify-between text-[12px]">
                <span>Top referral ids</span>
                {(data.refWithoutCampaign ?? 0) > 0 && (
                  <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600">
                    {data.refWithoutCampaign} ad link{(data.refWithoutCampaign ?? 0) === 1 ? "" : "s"} missing campaign tag
                  </span>
                )}
              </div>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="font-medium pb-1.5 pr-3">Ref id</th>
                    <th className="font-medium pb-1.5 px-2 text-right">Signups</th>
                    <th className="font-medium pb-1.5 px-2 text-right">Completed</th>
                    <th className="font-medium pb-1.5 pl-2 text-right">Untagged ad links</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.topRefs ?? []).map((r) => (
                    <tr key={r.ref} className="border-t border-border/40">
                      <td className="py-1 pr-3 text-foreground/80 truncate max-w-[220px]">{r.ref}</td>
                      <td className="py-1 px-2 text-right tabular-nums">{r.total}</td>
                      <td className="py-1 px-2 text-right tabular-nums">{r.completed}</td>
                      <td className="py-1 pl-2 text-right tabular-nums">
                        {r.untaggedAd > 0 ? (
                          <span className="text-amber-600">{r.untaggedAd}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[11px] text-muted-foreground">
                Untagged ad links arrived with a referral id and an ad click id but no
                utm_campaign, so the sale cannot be tied to a specific ad. Add
                utm_campaign to those affiliate ad links.
              </p>
            </div>
          )}

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
                      {(c.orders ?? 0) > 0 && (
                        <span className="text-foreground/70">
                          {" "}· {c.orders} bought · {money(c.revenue ?? 0)}
                        </span>
                      )}
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
                      <th className="font-medium pb-1.5 px-2 text-right">Purchases</th>
                      <th className="font-medium pb-1.5 px-2 text-right">Revenue</th>
                      <th className="font-medium pb-1.5 px-2 text-right">Meta purchases</th>
                      <th className="font-medium pb-1.5 px-2 text-right">Meta revenue</th>
                      <th className="font-medium pb-1.5 px-2 text-right">Spend</th>
                      <th className="font-medium pb-1.5 pl-2 text-right">Return</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.campaigns.map((c) => {
                      const draft = costDraft[c.key];
                      const dirty = draft !== undefined && Number(draft) !== (c.cost ?? 0);
                      return (
                        <tr key={c.key} className="border-t border-border/40">
                          <td className="py-1 pr-3 text-foreground/80">{c.campaign}</td>
                          <td className="py-1 px-2 text-muted-foreground">{c.channelLabel}</td>
                          <td className="py-1 px-2 text-right tabular-nums">
                            {c.count}
                            <span className="text-muted-foreground"> · {c.completed}</span>
                          </td>
                          <td className="py-1 px-2 text-right tabular-nums">{c.orders ?? 0}</td>
                          <td className="py-1 px-2 text-right tabular-nums">{money(c.revenue ?? 0)}</td>
                          <td className="py-1 px-2 text-right tabular-nums text-muted-foreground">
                            {c.metaPurchases == null ? "—" : c.metaPurchases}
                          </td>
                          <td className="py-1 px-2 text-right tabular-nums text-muted-foreground">
                            {c.metaRevenue == null ? "—" : money(c.metaRevenue)}
                          </td>
                          <td className="py-1 px-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-muted-foreground">$</span>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={draft ?? String(c.cost ?? 0)}
                                onChange={(e) =>
                                  setCostDraft((d) => ({ ...d, [c.key]: e.target.value }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveCost(c);
                                }}
                                className="w-16 rounded-[10px] border border-border/60 bg-background px-1.5 py-0.5 text-right text-[11px] tabular-nums outline-none focus:border-foreground/40"
                              />
                              {dirty && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-[10px]"
                                  disabled={savingCost === c.key}
                                  onClick={() => saveCost(c)}
                                >
                                  {savingCost === c.key ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    "Save"
                                  )}
                                </Button>
                              )}
                            </div>
                          </td>
                          <td className="py-1 pl-2 text-right tabular-nums">
                            {c.roas == null ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <span
                                className={cn(
                                  c.roas >= 1 ? "text-emerald-600" : "text-amber-600"
                                )}
                              >
                                {c.roas.toFixed(2)}x
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
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

const money = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n >= 1000 ? 0 : 2,
  });

const Stat = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="rounded-[10px] border border-border/50 p-2.5">
    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="text-sm font-medium tabular-nums mt-0.5">{value}</p>
    {hint && <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">{hint}</p>}
  </div>
);
