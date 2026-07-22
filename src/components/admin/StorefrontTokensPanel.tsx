import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  adminEmail: string;
  adminToken: string;
}

interface TokenRow {
  id: number;
  title: string;
  created_at: string;
  lovable_prefix?: boolean;
  lovable_kind?: string | null;
}

interface ListResp {
  success: boolean;
  total: number;
  cap: number;
  lovableCount: number;
  otherCount: number;
  tokens: TokenRow[];
  error?: string;
}

interface CleanupResp {
  success: boolean;
  dryRun: boolean;
  keepPerKind: number;
  totals: { allTokens: number; lovableTokens: number; wouldKeep: number; wouldDelete: number };
  keep: TokenRow[];
  delete: TokenRow[];
  deleted: number[];
  failed: Array<{ id: number; status: number; detail: string }>;
  error?: string;
}

export function StorefrontTokensPanel({ adminToken }: Props) {
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<ListResp | null>(null);
  const [preview, setPreview] = useState<CleanupResp | null>(null);
  const [purging, setPurging] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<ListResp>("list-storefront-tokens", {
        body: { token: adminToken },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Failed");
      setList(data);
      setPreview(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load tokens");
    } finally {
      setLoading(false);
    }
  };

  const runPreview = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<CleanupResp>("cleanup-storefront-tokens", {
        body: { token: adminToken, dryRun: true, keepPerKind: 1 },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Failed");
      setPreview(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Preview failed");
    } finally {
      setLoading(false);
    }
  };

  const runPurge = async () => {
    if (!preview) return;
    const n = preview.totals.wouldDelete;
    if (n === 0) { toast.info("Nothing to delete"); return; }
    if (!confirm(`Delete ${n} lovable-* storefront tokens? Keeps newest 1 per kind.`)) return;
    setPurging(true);
    try {
      const { data, error } = await supabase.functions.invoke<CleanupResp>("cleanup-storefront-tokens", {
        body: { token: adminToken, dryRun: false, keepPerKind: 1 },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Failed");
      toast.success(`Deleted ${data.deleted.length} tokens${data.failed.length ? ` (${data.failed.length} failed)` : ""}`);
      setPreview(data);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Purge failed");
    } finally {
      setPurging(false);
    }
  };

  return (
    <section className="rounded-[15px] border border-border/40 bg-card/40 p-5 space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">Shopify storefront tokens</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Shopify caps each store at 100. Cleanup deletes SPA-minted <code>lovable-*</code> tokens and keeps the newest per kind.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={load} disabled={loading || purging}>
            {loading && !preview ? "Loading..." : "Load list"}
          </Button>
          <Button size="sm" variant="outline" onClick={runPreview} disabled={loading || purging}>
            Preview cleanup
          </Button>
          <Button size="sm" onClick={runPurge} disabled={!preview || purging || preview.totals.wouldDelete === 0}>
            {purging ? "Deleting..." : `Delete ${preview?.totals.wouldDelete ?? 0}`}
          </Button>
        </div>
      </header>

      {list && (
        <div className="text-xs text-muted-foreground grid grid-cols-4 gap-3">
          <Stat label="Total" value={`${list.total} / ${list.cap}`} />
          <Stat label="lovable-*" value={list.lovableCount} />
          <Stat label="Other apps" value={list.otherCount} />
          <Stat label="Slots free" value={list.cap - list.total} />
        </div>
      )}

      {preview && (
        <div className="text-xs">
          <div className="mb-2 text-muted-foreground">
            Would keep <b className="text-foreground">{preview.totals.wouldKeep}</b>, delete{" "}
            <b className="text-foreground">{preview.totals.wouldDelete}</b> (dry run).
          </div>
          {preview.delete.length > 0 && (
            <details className="rounded-[10px] border border-border/40 bg-background/30 p-3">
              <summary className="cursor-pointer text-xs font-medium">Show {preview.delete.length} to delete</summary>
              <ul className="mt-2 max-h-64 overflow-auto space-y-1 font-mono text-[11px]">
                {preview.delete.map((t) => (
                  <li key={t.id} className="text-muted-foreground">
                    <span className="text-foreground">{t.title}</span> · {t.created_at}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {list && list.tokens.length > 0 && !preview && (
        <details className="rounded-[10px] border border-border/40 bg-background/30 p-3">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Show all {list.tokens.length} tokens</summary>
          <ul className="mt-2 max-h-80 overflow-auto space-y-1 font-mono text-[11px]">
            {list.tokens.map((t) => (
              <li key={t.id} className={t.lovable_prefix ? "text-foreground" : "text-muted-foreground"}>
                {t.title || "(untitled)"} · {t.created_at}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[10px] border border-border/40 bg-background/30 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium mt-0.5">{value}</div>
    </div>
  );
}
