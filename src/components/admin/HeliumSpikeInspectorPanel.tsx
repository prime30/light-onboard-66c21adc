import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search, Download, RefreshCw, Stethoscope } from "lucide-react";


type Record = {
  helium_id: string;
  email: string | null;
  shopify_id: number | null;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  i_am_a: string | null;
  account_type: string | null;
  state: string | null;
  city: string | null;
  country: string | null;
  business_or_salon_name: string | null;
  instagram_handle: string | null;
  tags: string[];
  form_ids: string[];
  note: string | null;
  accepts_marketing: unknown;
  orders_count: number | null;
  total_spent: string | null;
};

type Breakdown = { key: string; count: number };

type ApiResponse = {
  success: boolean;
  total?: number;
  records?: Record[];
  breakdowns?: {
    byDay: Breakdown[];
    byHour: Breakdown[];
    byIAmA: Breakdown[];
    byState: Breakdown[];
    byDomain: Breakdown[];
  };
  error?: string;
};

interface Props {
  adminEmail: string;
  adminToken: string;
}

function toCsv(records: Record[]): string {
  const headers = [
    "created_at", "email", "first_name", "last_name", "i_am_a",
    "state", "city", "country", "business_or_salon_name",
    "instagram_handle", "tags", "form_ids", "orders_count", "total_spent", "note",
  ];
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : Array.isArray(v) ? v.join("|") : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const rows = records.map((r) =>
    [r.created_at, r.email, r.first_name, r.last_name, r.i_am_a, r.state, r.city,
     r.country, r.business_or_salon_name, r.instagram_handle, r.tags, r.form_ids,
     r.orders_count, r.total_spent, r.note].map(escape).join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}

type RefillState = {
  running: boolean;
  iterations: number;
  fetched: number;
  upserted: number;
  done: boolean;
  error: string | null;
};

type AuditRow = { month: string; helium: number; local: number; missing: number };
type AuditResponse = {
  success: boolean;
  heliumTotal?: number;
  localTotal?: number;
  missingTotal?: number;
  surplusTotal?: number;
  iterations?: number;
  comparison?: AuditRow[];
  error?: string;
};

export function HeliumSpikeInspectorPanel({ adminEmail, adminToken }: Props) {
  const [from, setFrom] = useState("2025-01-21");
  const [to, setTo] = useState("2025-01-28");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [refill, setRefill] = useState<RefillState>({
    running: false, iterations: 0, fetched: 0, upserted: 0, done: false, error: null,
  });
  const [audit, setAudit] = useState<AuditResponse | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!adminEmail || !adminToken) return;
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: invokeError } = await supabase.functions.invoke(
        "admin-helium-customers-range",
        {
          body: {
            token: adminToken,
            createdAtMin: `${from}T00:00:00Z`,
            createdAtMax: `${to}T00:00:00Z`,
            limit: 2000,
          },
        },
      );
      if (invokeError) throw invokeError;
      const typed = res as ApiResponse;
      if (!typed?.success) throw new Error(typed?.error ?? "Request failed");
      setData(typed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [adminEmail, adminToken, from, to]);

  const refillRange = useCallback(async () => {
    if (!adminEmail || !adminToken) return;
    setRefill({ running: true, iterations: 0, fetched: 0, upserted: 0, done: false, error: null });
    try {
      let page = 1;
      let totalFetched = 0;
      let totalUpserted = 0;
      let iterations = 0;
      const createdAtMin = `${from}T00:00:00Z`;
      const createdAtMax = `${to}T00:00:00Z`;
      // Loop EF calls until done (each call processes up to 12 pages ≈ 3000 rows)
      for (let safety = 0; safety < 30; safety += 1) {
        const { data: res, error: invokeError } = await supabase.functions.invoke(
          "admin-backfill-helium-customers",
          {
            body: {
              token: adminToken,
              createdAtMin,
              createdAtMax,
              startPage: page,
              maxPages: 3,
            },
          },
        );
        if (invokeError) throw invokeError;
        const r = res as {
          success: boolean; fetched: number; upserted: number; nextPage: number | null;
          done: boolean; error?: string;
        };
        if (!r.success) throw new Error(r.error ?? "Backfill failed");
        totalFetched += r.fetched;
        totalUpserted += r.upserted;
        iterations += 1;
        setRefill({
          running: true, iterations, fetched: totalFetched, upserted: totalUpserted,
          done: r.done, error: null,
        });
        if (r.done) break;
        page = r.nextPage ?? page + 1;
      }
      setRefill((s) => ({ ...s, running: false, done: true }));
      // Auto-reload the inspector view
      await load();
    } catch (err) {
      setRefill((s) => ({
        ...s, running: false, error: err instanceof Error ? err.message : "Refill failed",
      }));
    }
  }, [adminEmail, adminToken, from, to, load]);

  const runAudit = useCallback(async () => {
    if (!adminEmail || !adminToken) return;
    setAuditLoading(true);
    setAuditError(null);
    setAudit(null);
    try {
      const { data: res, error: invokeError } = await supabase.functions.invoke(
        "admin-helium-audit",
        { body: { token: adminToken } },
      );
      if (invokeError) throw invokeError;
      const typed = res as AuditResponse;
      if (!typed?.success) throw new Error(typed?.error ?? "Audit failed");
      setAudit(typed);
    } catch (err) {
      setAuditError(err instanceof Error ? err.message : "Audit failed");
    } finally {
      setAuditLoading(false);
    }
  }, [adminEmail, adminToken]);

  const repairAll = useCallback(async () => {
    if (!adminEmail || !adminToken) return;
    setRefill({ running: true, iterations: 0, fetched: 0, upserted: 0, done: false, error: null });
    try {
      let page = 1;
      let totalFetched = 0;
      let totalUpserted = 0;
      let iterations = 0;
      // No date range = walk all of Helium. Cursor-based, idempotent upsert.
      for (let safety = 0; safety < 60; safety += 1) {
        const { data: res, error: invokeError } = await supabase.functions.invoke(
          "admin-backfill-helium-customers",
          {
            body: {
              token: adminToken,
              startPage: page,
              maxPages: 3,
            },
          },
        );
        if (invokeError) throw invokeError;
        const r = res as {
          success: boolean; fetched: number; upserted: number; nextPage: number | null;
          done: boolean; error?: string;
        };
        if (!r.success) throw new Error(r.error ?? "Repair failed");
        totalFetched += r.fetched;
        totalUpserted += r.upserted;
        iterations += 1;
        setRefill({
          running: true, iterations, fetched: totalFetched, upserted: totalUpserted,
          done: r.done, error: null,
        });
        if (r.done) break;
        page = r.nextPage ?? page + 1;
      }
      setRefill((s) => ({ ...s, running: false, done: true }));
      // Re-run the audit so the user sees the clean state
      await runAudit();
    } catch (err) {
      setRefill((s) => ({
        ...s, running: false, error: err instanceof Error ? err.message : "Repair failed",
      }));
    }
  }, [adminEmail, adminToken, runAudit]);


  const downloadCsv = useCallback(() => {
    if (!data?.records) return;
    const csv = toCsv(data.records);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `helium-customers_${from}_to_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data, from, to]);


  return (
    <section className="bg-card border border-border rounded-[15px] p-6 space-y-5">
      <header className="space-y-1">
        <h2 className="text-base font-medium text-foreground">
          Helium customer inspector
        </h2>
        <p className="text-sm text-muted-foreground">
          Pull stored Helium customer records for a date range to investigate signup spikes.
          Defaults to the Jan 21–27, 2025 surge.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">From (inclusive)</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[160px]" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">To (exclusive)</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[160px]" />
        </div>
        <Button type="button" size="sm" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          <span className="ml-2 text-xs">Load records</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void refillRange()}
          disabled={refill.running}
          title="Re-fetch this range from Helium and upsert into the backfill table"
        >
          {refill.running
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <RefreshCw className="w-4 h-4" />}
          <span className="ml-2 text-xs">Refill this range</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void runAudit()}
          disabled={auditLoading}
          title="Walk all of Helium and compare per-month counts vs our backfill table"
        >
          {auditLoading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Stethoscope className="w-4 h-4" />}
          <span className="ml-2 text-xs">Run full audit</span>
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => void repairAll()}
          disabled={refill.running}
          title="Walk all of Helium and upsert every record. Idempotent — safe to re-run."
        >
          {refill.running
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <RefreshCw className="w-4 h-4" />}
          <span className="ml-2 text-xs">Repair all data</span>
        </Button>
        {data?.records && data.records.length > 0 && (
          <Button type="button" size="sm" variant="ghost" onClick={downloadCsv}>
            <Download className="w-4 h-4" />
            <span className="ml-2 text-xs">Download CSV</span>
          </Button>
        )}
      </div>

      {(refill.running || refill.done || refill.error) && (
        <div className="text-xs rounded-[10px] border border-border/60 bg-muted/20 p-3 space-y-1">
          <div className="font-medium text-foreground">
            Refill {from} → {to}
            {refill.running ? " (running…)" : refill.done ? " ✓ complete" : ""}
          </div>
          <div className="text-muted-foreground tabular-nums">
            iterations: {refill.iterations} · fetched: {refill.fetched} · upserted: {refill.upserted}
          </div>
          {refill.error && <div className="text-status-red">{refill.error}</div>}
        </div>
      )}

      {auditError && (
        <div className="text-sm text-status-red bg-status-red/5 border border-status-red/20 rounded-[10px] p-3">
          Audit: {auditError}
        </div>
      )}

      {audit?.comparison && (
        <AuditTable
          audit={audit}
          onPickMonth={(month) => {
            const [y, m] = month.split("-").map(Number);
            const nextMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
            setFrom(`${month}-01`);
            setTo(`${nextMonth}-01`);
          }}
        />
      )}

      {error && (
        <div className="text-sm text-status-red bg-status-red/5 border border-status-red/20 rounded-[10px] p-3">
          {error}
        </div>
      )}

      {data?.breakdowns && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <BreakdownCard title={`By day (${data.total} total)`} items={data.breakdowns.byDay} max={31} />
          <BreakdownCard title="By account type" items={data.breakdowns.byIAmA} max={10} />
          <BreakdownCard title="Top states" items={data.breakdowns.byState} max={10} />
          <BreakdownCard title="Top email domains" items={data.breakdowns.byDomain} max={10} />
          <BreakdownCard title="By hour (UTC)" items={data.breakdowns.byHour} max={50} />
        </div>
      )}

      {data?.records && data.records.length > 0 && (
        <div className="border border-border/60 rounded-[10px] overflow-hidden">
          <div className="max-h-[480px] overflow-auto">
            <table className="w-full text-xs">
              <thead className="text-[11px] text-muted-foreground bg-muted/30 sticky top-0">
                <tr>
                  <th className="text-left font-normal py-2 px-3">Created (UTC)</th>
                  <th className="text-left font-normal py-2 px-3">Email</th>
                  <th className="text-left font-normal py-2 px-3">Name</th>
                  <th className="text-left font-normal py-2 px-3">Account type</th>
                  <th className="text-left font-normal py-2 px-3">State</th>
                  <th className="text-left font-normal py-2 px-3">Tags</th>
                  <th className="text-left font-normal py-2 px-3">Form</th>
                </tr>
              </thead>
              <tbody>
                {data.records.map((r) => (
                  <tr key={r.helium_id} className="border-t border-border/40">
                    <td className="py-2 px-3 tabular-nums whitespace-nowrap">
                      {r.created_at.replace("T", " ").slice(0, 16)}
                    </td>
                    <td className="py-2 px-3 text-foreground">{r.email ?? "—"}</td>
                    <td className="py-2 px-3 text-muted-foreground">
                      {[r.first_name, r.last_name].filter(Boolean).join(" ") || "—"}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">{r.i_am_a ?? "—"}</td>
                    <td className="py-2 px-3 text-muted-foreground">{r.state ?? "—"}</td>
                    <td className="py-2 px-3 text-muted-foreground max-w-[260px] truncate">
                      {r.tags.join(", ")}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">{r.form_ids.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data && data.records && data.records.length === 0 && (
        <div className="text-sm text-muted-foreground">No records in this range.</div>
      )}
    </section>
  );
}

function BreakdownCard({ title, items, max }: { title: string; items: Breakdown[]; max: number }) {
  const top = items.slice(0, max);
  const maxCount = Math.max(1, ...top.map((i) => i.count));
  return (
    <div className="border border-border/60 rounded-[10px] p-3 space-y-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="space-y-1">
        {top.map((i) => (
          <div key={i.key} className="flex items-center gap-2 text-xs">
            <div className="w-28 shrink-0 truncate text-muted-foreground" title={i.key}>{i.key}</div>
            <div className="flex-1 h-1.5 bg-muted/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-foreground/70"
                style={{ width: `${(i.count / maxCount) * 100}%` }}
              />
            </div>
            <div className="w-10 text-right tabular-nums text-foreground">{i.count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditTable({
  audit,
  onPickMonth,
}: {
  audit: AuditResponse;
  onPickMonth: (month: string) => void;
}) {
  const rows = audit.comparison ?? [];
  return (
    <div className="border border-border/60 rounded-[10px] overflow-hidden">
      <div className="px-3 py-2 bg-muted/30 text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
        <span>Helium total: <span className="text-foreground tabular-nums">{audit.heliumTotal}</span></span>
        <span>Local total: <span className="text-foreground tabular-nums">{audit.localTotal}</span></span>
        <span>
          Missing locally:{" "}
          <span className={`tabular-nums ${audit.missingTotal ? "text-status-red" : "text-foreground"}`}>
            {audit.missingTotal}
          </span>
        </span>
        {audit.surplusTotal ? (
          <span>
            Surplus locally:{" "}
            <span className="tabular-nums text-status-amber">{audit.surplusTotal}</span>
          </span>
        ) : null}
      </div>
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full text-xs">
          <thead className="text-[11px] text-muted-foreground bg-muted/20 sticky top-0">
            <tr>
              <th className="text-left font-normal py-2 px-3">Month</th>
              <th className="text-right font-normal py-2 px-3">Helium</th>
              <th className="text-right font-normal py-2 px-3">Local</th>
              <th className="text-right font-normal py-2 px-3">Missing</th>
              <th className="text-right font-normal py-2 px-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const bad = r.missing > 0;
              return (
                <tr
                  key={r.month}
                  className={`border-t border-border/40 ${bad ? "bg-status-red/5" : ""}`}
                >
                  <td className="py-2 px-3 tabular-nums">{r.month}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-foreground">{r.helium}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">{r.local}</td>
                  <td className={`py-2 px-3 text-right tabular-nums ${bad ? "text-status-red font-medium" : "text-muted-foreground"}`}>
                    {r.missing > 0 ? `+${r.missing}` : r.missing}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {bad && (
                      <button
                        type="button"
                        className="text-[11px] underline text-foreground hover:opacity-70"
                        onClick={() => onPickMonth(r.month)}
                      >
                        select range
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

