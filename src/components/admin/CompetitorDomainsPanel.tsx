import { useEffect, useState, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";

const DOMAIN_RE = /^[a-z0-9.-]+\.[a-z]{2,}$/;

/**
 * Admin editor for the competitor email blocklist stored in app_settings.
 * Blocked domains are enforced by check-email and create-customer.
 */
export function CompetitorDomainsPanel({ token }: { token: string }) {
  const { toast } = useToast();
  const [domains, setDomains] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void supabase.functions
      .invoke("admin-toggle-setting", { body: { token } })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data?.success) {
          const list = (data?.setting?.competitor_email_domains ?? []) as string[];
          setDomains(Array.isArray(list) ? list : []);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const normalize = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/^@/, "")
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "");

  const addDomain = (raw: string) => {
    const domain = normalize(raw);
    if (!domain) return;
    if (!DOMAIN_RE.test(domain)) {
      toast({
        title: "Invalid domain",
        description: `"${raw.trim()}" doesn't look like a domain (e.g. competitor.com).`,
        variant: "destructive",
      });
      return;
    }
    if (domains.includes(domain)) {
      setInput("");
      return;
    }
    setDomains((prev) => [...prev, domain]);
    setInput("");
    setDirty(true);
  };

  const removeDomain = (domain: string) => {
    setDomains((prev) => prev.filter((d) => d !== domain));
    setDirty(true);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addDomain(input);
    } else if (e.key === "Backspace" && input === "" && domains.length > 0) {
      e.preventDefault();
      removeDomain(domains[domains.length - 1]);
    }
  };

  const save = async () => {
    setSaving(true);
    let payload = domains;
    const pending = normalize(input);
    if (pending && DOMAIN_RE.test(pending) && !domains.includes(pending)) {
      payload = [...domains, pending];
      setDomains(payload);
      setInput("");
    }
    try {
      const { data, error } = await supabase.functions.invoke("admin-toggle-setting", {
        body: { token, competitorEmailDomains: payload },
      });
      if (error || !data?.success) {
        toast({
          title: "Failed to save",
          description: "Could not update the competitor blocklist.",
          variant: "destructive",
        });
        return;
      }
      const saved = (data?.setting?.competitor_email_domains ?? payload) as string[];
      setDomains(saved);
      setDirty(false);
      toast({
        title: "Blocklist saved",
        description: `${saved.length} competitor domain${saved.length === 1 ? "" : "s"} blocked from registering.`,
      });
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Could not save the blocklist.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-[15px] border border-border/60 bg-background/60 p-[20px] space-y-[15px]">
      <div className="space-y-[5px]">
        <h3 className="font-grotesk text-[15px] font-medium text-foreground">Competitor blocklist</h3>
        <p className="text-[12px] text-muted-foreground leading-[1.5]">
          Emails on these domains cannot register. Subdomains are blocked too. Blocked attempts are
          recorded on the lead record.
        </p>
      </div>

      <div className="flex flex-wrap gap-[10px]">
        {loading ? (
          <span className="text-[12px] text-muted-foreground">Loading...</span>
        ) : domains.length === 0 ? (
          <span className="text-[12px] text-muted-foreground">No domains blocked.</span>
        ) : (
          domains.map((domain) => (
            <span
              key={domain}
              className="inline-flex items-center gap-[5px] rounded-full border border-border/60 bg-muted/50 px-[10px] py-[5px] text-[12px] text-foreground"
            >
              {domain}
              <button
                type="button"
                onClick={() => removeDomain(domain)}
                aria-label={`Remove ${domain}`}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-[12px] h-[12px]" />
              </button>
            </span>
          ))
        )}
      </div>

      <div className="flex gap-[10px]">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="competitor.com"
          className="flex-1"
        />
        <Button type="button" variant="outline" onClick={() => addDomain(input)} disabled={!input.trim()}>
          Add
        </Button>
        <Button type="button" onClick={save} disabled={saving || (!dirty && !input.trim())}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
