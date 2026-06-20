import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  RefreshCw,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Ban,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type Signal = { code: string; label: string; weight: number };

type FakeRow = {
  id: string;
  email: string | null;
  name: string | null;
  account_type: string | null;
  business_name: string | null;
  license_number: string | null;
  phone_number: string | null;
  city: string | null;
  state: string | null;
  application_status: string | null;
  created_at: string;
  shopify_customer_id: number | null;
  ip_address: string | null;
  completed_in_seconds: number | null;
  monthly_order_volume: string | null;
  score: number;
  signals: Signal[];
};

interface Props {
  adminEmail: string;
  adminPassword: string;
}

const DAY_OPTIONS = [7, 14, 30, 60, 90];
const MIN_SCORE_OPTIONS = [20, 30, 40, 50, 60];

const scoreTone = (score: number) => {
  if (score >= 70) return "bg-destructive/15 text-destructive border-destructive/30";
  if (score >= 50) return "bg-amber-500/15 text-amber-600 border-amber-500/30";
  if (score >= 30) return "bg-yellow-500/10 text-yellow-700 border-yellow-500/30";
  return "bg-muted text-muted-foreground border-border";
};

const likelihoodLabel = (score: number) => {
  if (score >= 70) return "High";
  if (score >= 50) return "Medium";
  if (score >= 30) return "Low";
  return "Very low";
};

export const FakeAccountAnalyticsPanel = ({ adminEmail, adminPassword }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<FakeRow[] | null>(null);
  const [days, setDays] = useState(30);
  const [minScore, setMinScore] = useState(30);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set());
  const [totalInWindow, setTotalInWindow] = useState<number | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke(
        "admin-fake-account-analysis",
        { body: { email: adminEmail, password: adminPassword, days, minScore, limit: 200 } },
      );
      if (invokeErr || !data?.success) {
        setError(data?.error ?? invokeErr?.message ?? "Failed to load");
        setRows([]);
        return;
      }
      setRows((data.rows ?? []) as FakeRow[]);
      setTotalInWindow(typeof data.total_in_window === "number" ? data.total_in_window : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [adminEmail, adminPassword, days, minScore]);

  useEffect(() => { void fetchRows(); }, [fetchRows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      (r.email ?? "").toLowerCase().includes(q)
      || (r.name ?? "").toLowerCase().includes(q)
      || (r.business_name ?? "").toLowerCase().includes(q)
      || (r.ip_address ?? "").toLowerCase().includes(q),
    );
  }, [rows, search]);

  const buckets = useMemo(() => {
    const b = { high: 0, medium: 0, low: 0 };
    for (const r of rows ?? []) {
      if (r.score >= 70) b.high++;
      else if (r.score >= 50) b.medium++;
      else if (r.score >= 30) b.low++;
    }
    return b;
  }, [rows]);

  const handleRevoke = useCallback(async (row: FakeRow) => {
    const confirmed = window.confirm(
      `Revoke approval for ${row.email ?? row.id}?\n\nThis sets the profile to "rejected" and removes B2B approval tags from the Shopify customer (if linked).`,
    );
    if (!confirmed) return;
    setRevokingId(row.id);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke("admin-revoke-account", {
        body: {
          email: adminEmail,
          password: adminPassword,
          profileId: row.id,
          shopifyCustomerId: row.shopify_customer_id,
        },
      });
      if (invokeErr || !data?.success) {
        toast({
          title: "Revoke failed",
          description: data?.error ?? invokeErr?.message ?? "Unknown error",
          variant: "destructive",
        });
        return;
      }
      setRejectedIds((prev) => new Set(prev).add(row.id));
      const shop = data.shopify;
      toast({
        title: "Account revoked",
        description: shop?.updated
          ? `Removed ${shop.removedTags?.length ?? 0} approval tag(s) in Shopify.`
          : shop?.message
            ? `Profile marked rejected. Shopify: ${shop.message}`
            : "Profile marked rejected.",
      });
    } catch (e) {
      toast({
        title: "Revoke failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setRevokingId(null);
    }
  }, [adminEmail, adminPassword, toast]);

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h2 className="text-base font-medium">Likely fake accounts</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ranks recently created accounts by signals that suggest they aren&apos;t real
              professionals. Review and revoke approval where appropriate.
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={fetchRows}
          disabled={loading}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          <span className="ml-2">Refresh</span>
        </Button>
      </div>

      {/* Controls */}
      <div className="flex items-end gap-3 flex-wrap">
        <div className="space-y-1">
          <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Window</label>
          <div className="flex gap-1">
            {DAY_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs border transition-colors",
                  days === d
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background border-border hover:bg-muted",
                )}
              >{d}d</button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Min score</label>
          <div className="flex gap-1">
            {MIN_SCORE_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setMinScore(s)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs border transition-colors",
                  minScore === s
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background border-border hover:bg-muted",
                )}
              >≥{s}</button>
            ))}
          </div>
        </div>
        <div className="space-y-1 flex-1 min-w-[180px]">
          <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Search</label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Email, name, business, IP…"
            className="h-8"
          />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="rounded-lg border border-border p-3">
          <div className="text-muted-foreground">Accounts in window</div>
          <div className="text-xl font-medium mt-1">{totalInWindow ?? "—"}</div>
        </div>
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <div className="text-destructive">High likelihood</div>
          <div className="text-xl font-medium mt-1">{buckets.high}</div>
        </div>
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          <div className="text-amber-700">Medium</div>
          <div className="text-xl font-medium mt-1">{buckets.medium}</div>
        </div>
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
          <div className="text-yellow-800">Low</div>
          <div className="text-xl font-medium mt-1">{buckets.low}</div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 text-destructive text-sm px-3 py-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-[80px_1fr_120px_120px_140px] gap-2 px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground bg-muted/40 border-b border-border">
          <div>Score</div>
          <div>Account</div>
          <div>Type</div>
          <div>Created</div>
          <div className="text-right">Actions</div>
        </div>

        {!rows ? (
          <div className="px-3 py-10 text-center text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-3 py-10 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 inline mr-2 text-status-green" />
            No suspicious accounts at score ≥{minScore} in the last {days} days.
          </div>
        ) : (
          filtered.map((row) => {
            const expanded = expandedId === row.id;
            const rejected = rejectedIds.has(row.id) || row.application_status === "rejected";
            return (
              <div key={row.id} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : row.id)}
                  className="w-full grid grid-cols-[80px_1fr_120px_120px_140px] gap-2 px-3 py-2.5 items-center text-left hover:bg-muted/40 transition-colors"
                >
                  <div>
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium",
                      scoreTone(row.score),
                    )}>
                      {row.score}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-sm font-medium truncate">
                      {expanded ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                      <span className="truncate">{row.email ?? "(no email)"}</span>
                      {rejected && (
                        <span className="ml-1 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-destructive/15 text-destructive">
                          Rejected
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate ml-5">
                      {[row.name, row.business_name].filter(Boolean).join(" · ") || "—"}
                      {" · "}{likelihoodLabel(row.score)} likelihood
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{row.account_type ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(row.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant={rejected ? "ghost" : "destructive"}
                      disabled={rejected || revokingId === row.id}
                      onClick={(e) => { e.stopPropagation(); void handleRevoke(row); }}
                    >
                      {revokingId === row.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : rejected ? (
                        <><CheckCircle2 className="w-3.5 h-3.5" /><span className="ml-1.5">Revoked</span></>
                      ) : (
                        <><Ban className="w-3.5 h-3.5" /><span className="ml-1.5">Revoke</span></>
                      )}
                    </Button>
                  </div>
                </button>

                {expanded && (
                  <div className="px-3 pb-4 pt-1 bg-muted/20 space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <Field label="License" value={row.license_number} />
                      <Field label="Phone" value={row.phone_number} />
                      <Field label="City/State" value={[row.city, row.state].filter(Boolean).join(", ") || null} />
                      <Field label="IP" value={row.ip_address} />
                      <Field label="Volume" value={row.monthly_order_volume} />
                      <Field label="Completed in" value={row.completed_in_seconds != null ? `${row.completed_in_seconds}s` : null} />
                      <Field label="Shopify ID" value={row.shopify_customer_id != null ? String(row.shopify_customer_id) : null} />
                      <Field label="Status" value={row.application_status} />
                    </div>

                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">
                        Why this looks suspicious
                      </div>
                      <ul className="space-y-1">
                        {row.signals.map((s) => (
                          <li key={s.code} className="flex items-start gap-2 text-xs">
                            <span className={cn(
                              "shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium border",
                              s.weight >= 20 ? "bg-destructive/10 text-destructive border-destructive/30"
                                : s.weight >= 10 ? "bg-amber-500/10 text-amber-700 border-amber-500/30"
                                : "bg-muted text-muted-foreground border-border",
                            )}>+{s.weight}</span>
                            <span>{s.label}</span>
                          </li>
                        ))}
                        {row.signals.length === 0 && (
                          <li className="text-xs text-muted-foreground">No specific signals.</li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Scores are heuristic, not verdicts. Common triggers: missing or placeholder license, salon
        account on a free email, names with digits or repeated characters, disposable email domains,
        shared phone/IP across multiple recent accounts, and sub-60s completions. Always confirm
        before revoking.
      </p>
    </div>
  );
};
