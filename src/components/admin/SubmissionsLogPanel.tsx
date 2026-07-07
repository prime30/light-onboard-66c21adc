import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, ChevronDown, ChevronRight, AlertCircle, CheckCircle2, Clock, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { buildSupportReply } from "@/lib/admin/support-reply";

type StatusFilter = "needs_attention" | "all" | "pending" | "helium_ok" | "shopify_ok" | "succeeded" | "failed";

type Submission = {
  id: string;
  email: string;
  account_type: string | null;
  status: string;
  helium_customer_id: string | null;
  shopify_customer_id: number | null;
  error_log: Array<{ step: string; status: string; message: string; at: string; field?: string }>;
  ip_address: string | null;
  created_at: string;
  updated_at: string;
  payload: Record<string, unknown>;
};

const STATUS_META: Record<string, { label: string; tone: string }> = {
  succeeded: { label: "Succeeded", tone: "bg-status-green/15 text-status-green" },
  shopify_ok: { label: "Shopify partial", tone: "bg-amber-500/15 text-amber-600" },
  helium_ok: { label: "Helium only", tone: "bg-amber-500/15 text-amber-600" },
  pending: { label: "Pending", tone: "bg-muted text-muted-foreground" },
  failed: { label: "Failed", tone: "bg-destructive/15 text-destructive" },
};

interface Props {
  adminEmail: string;
  adminToken: string;
}

export const SubmissionsLogPanel = ({ adminEmail, adminToken }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<StatusFilter>("needs_attention");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const copySupportReply = useCallback(
    async (s: Submission) => {
      const reply = buildSupportReply(s);
      if (!reply) {
        toast({ title: "Nothing to send", description: "This submission succeeded — no support reply needed." });
        return;
      }
      try {
        await navigator.clipboard.writeText(reply);
        setCopiedId(s.id);
        setTimeout(() => setCopiedId((id) => (id === s.id ? null : id)), 2000);
        toast({ title: "Support reply copied", description: "Paste into your helpdesk reply." });
      } catch {
        toast({ title: "Couldn't copy", description: "Clipboard access was blocked.", variant: "destructive" });
      }
    },
    [toast]
  );

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke(
        "admin-list-submissions",
        {
          body: {
            email: adminEmail,
            token: adminToken,
            status,
            search: search.trim() || undefined,
            limit: 100,
          },
        }
      );
      if (invokeErr || !data?.success) {
        setError(data?.error ?? invokeErr?.message ?? "Failed to load submissions");
        setSubmissions([]);
        return;
      }
      setSubmissions(data.submissions ?? []);
      setCounts(data.counts ?? {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, [adminEmail, adminToken, status, search]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const totalNeedsAttention =
    (counts.pending ?? 0) + (counts.helium_ok ?? 0) + (counts.shopify_ok ?? 0) + (counts.failed ?? 0);

  return (
    <div className="space-y-4 rounded-[15px] border border-border/50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium">Registration submissions</h3>
            {totalNeedsAttention > 0 && (
              <span className="text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600">
                {totalNeedsAttention} need attention
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit log of every signup attempt. Use to replay failed Helium/Shopify writes.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={fetchSubmissions}
          disabled={loading}
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        </Button>
      </div>

      {/* Status counts */}
      <div className="flex flex-wrap gap-1.5 text-[11px]">
        {(["needs_attention", "succeeded", "failed", "shopify_ok", "helium_ok", "pending", "all"] as StatusFilter[]).map(
          (s) => {
            const label =
              s === "needs_attention"
                ? `Needs attention (${totalNeedsAttention})`
                : s === "all"
                ? `All (${Object.values(counts).reduce((a, b) => a + b, 0)})`
                : `${STATUS_META[s]?.label ?? s} (${counts[s] ?? 0})`;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={cn(
                  "px-2.5 py-1 rounded-full border transition-colors",
                  status === s
                    ? "border-foreground/60 bg-foreground/[0.04] text-foreground"
                    : "border-border/50 text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            );
          }
        )}
      </div>

      <div className="flex gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email…"
          className="h-9 text-sm"
        />
      </div>

      {error && (
        <div className="text-xs text-destructive flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </div>
      )}

      <div className="max-h-[480px] overflow-y-auto rounded-[10px] border border-border/50 divide-y divide-border/50">
        {loading && !submissions ? (
          <div className="p-6 flex justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : !submissions || submissions.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">No submissions match this filter.</p>
        ) : (
          submissions.map((s) => {
            const isOpen = expandedId === s.id;
            const meta = STATUS_META[s.status] ?? { label: s.status, tone: "bg-muted text-muted-foreground" };
            const Icon =
              s.status === "succeeded" ? CheckCircle2 : s.status === "failed" ? AlertCircle : Clock;
            return (
              <div key={s.id} className="text-sm">
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? null : s.id)}
                  className="w-full flex items-start gap-3 p-3 text-left hover:bg-muted/40 transition-colors"
                >
                  {isOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground mt-1 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground mt-1 shrink-0" />
                  )}
                  <Icon className="w-3.5 h-3.5 mt-1 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{s.email}</span>
                      <span className={cn("text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded", meta.tone)}>
                        {meta.label}
                      </span>
                      {s.account_type && (
                        <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {s.account_type}
                        </span>
                      )}
                      {s.error_log.length > 0 && (
                        <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">
                          {s.error_log.length} error{s.error_log.length === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(s.created_at).toLocaleString()}
                      {s.helium_customer_id && ` · Helium ${s.helium_customer_id}`}
                      {s.shopify_customer_id && ` · Shopify ${s.shopify_customer_id}`}
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-3 pb-3 pl-10 space-y-2">
                    {s.error_log.length > 0 && (
                      <div className="rounded-[8px] border border-destructive/20 bg-destructive/5 p-2.5 space-y-1">
                        <div className="text-[10px] uppercase tracking-wide text-destructive font-medium">
                          Errors
                        </div>
                        {s.error_log.map((err, i) => (
                          <div key={i} className="text-[11px] text-foreground/80">
                            <span className="font-medium">{err.step}</span>
                            {err.field ? <span className="text-muted-foreground"> · {err.field}</span> : null}
                            : {err.message}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => copySupportReply(s)}
                        className="h-7 text-[11px] gap-1.5"
                      >
                        {copiedId === s.id ? (
                          <>
                            <Check className="w-3 h-3" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Copy support reply
                          </>
                        )}
                      </Button>
                    </div>
                    <details className="rounded-[8px] bg-muted/40 p-2.5">
                      <summary className="text-[10px] uppercase tracking-wide text-muted-foreground cursor-pointer">
                        Full payload
                      </summary>
                      <pre className="text-[10px] mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all">
                        {JSON.stringify(s.payload, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
