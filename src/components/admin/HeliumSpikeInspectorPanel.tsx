import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search, Download } from "lucide-react";

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
  adminPassword: string;
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

export function HeliumSpikeInspectorPanel({ adminEmail, adminPassword }: Props) {
  const [from, setFrom] = useState("2025-01-21");
  const [to, setTo] = useState("2025-01-28");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);

  const load = useCallback(async () => {
    if (!adminEmail || !adminPassword) return;
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: invokeError } = await supabase.functions.invoke(
        "admin-helium-customers-range",
        {
          body: {
            email: adminEmail,
            password: adminPassword,
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
  }, [adminEmail, adminPassword, from, to]);

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
        {data?.records && data.records.length > 0 && (
          <Button type="button" size="sm" variant="ghost" onClick={downloadCsv}>
            <Download className="w-4 h-4" />
            <span className="ml-2 text-xs">Download CSV</span>
          </Button>
        )}
      </div>

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
