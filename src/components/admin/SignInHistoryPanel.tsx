import { useState } from "react";
import { Search, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { passwordSourceLabel } from "@/lib/password-source";

type Event = { id: string; attempt_id: string | null; created_at: string; source: string; outcome: string; code: string | null; password_source: string; evidence: string; user_agent: string | null };

export function SignInHistoryPanel({ adminToken }: { adminToken: string }) {
  const [email, setEmail] = useState("");
  const [searchedEmail, setSearchedEmail] = useState("");
  const [events, setEvents] = useState<Event[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const load = async (more = false) => {
    setLoading(true); setError("");
    const address = more ? searchedEmail : email.trim().toLowerCase();
    try {
      const { data, error: requestError } = await supabase.functions.invoke("sign-in-history", { body: { action: "history", token: adminToken, email: address, offset: more ? events.length : 0 } });
      if (requestError || !data?.events) throw new Error("Couldn't load sign-in history.");
      setEvents(more ? [...events, ...data.events] : data.events);
      setSearchedEmail(address); setHasMore(!!data.hasMore); setLoaded(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't load history."); }
    finally { setLoading(false); }
  };
  return (
    <section className="space-y-5 border-t border-border pt-5">
      <h3 className="text-base font-medium">Customer sign-in history</h3>
      <form className="flex flex-wrap gap-2.5" onSubmit={(e) => { e.preventDefault(); void load(); }}>
        <Input type="email" required aria-label="Customer email" placeholder="Customer email" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 min-w-[200px]" />
        <Button type="submit" variant="outline" disabled={loading}><Search className="h-4 w-4 mr-2.5" />{loading ? "Loading..." : "Find attempts"}</Button>
      </form>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {loaded && <p className="text-xs text-muted-foreground">History starts October 28, 2026. Older overwritten attempts cannot be recovered. Browser reports are unverified. Autofill detection varies by browser.</p>}
      {loaded && events.length === 0 && <p className="text-sm text-muted-foreground">No recorded events for this email.</p>}
      <ul className="divide-y divide-border">
        {events.map((event) => (
          <li key={event.id} className="py-5 space-y-2.5 text-sm min-w-0">
            <div className="flex flex-wrap justify-between gap-2.5">
              <time className="text-muted-foreground">{new Date(event.created_at).toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC")}</time>
              <span className="font-medium break-words">{event.outcome}{event.code ? ` (${event.code})` : ""}</span>
            </div>
            <p className="break-words">{passwordSourceLabel(event.password_source)}</p>
            <p className="text-xs text-muted-foreground break-all">{event.source === "browser_report" ? "Browser report, unverified" : event.source}{event.attempt_id ? ` · Attempt ${event.attempt_id.slice(0, 8)}` : ""}</p>
            {event.user_agent && <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Browser details</summary><p className="pt-2.5 break-all">{event.user_agent}</p></details>}
          </li>
        ))}
      </ul>
      {hasMore && <Button variant="outline" onClick={() => void load(true)} disabled={loading}><ChevronDown className="h-4 w-4 mr-2.5" />Load older events</Button>}
    </section>
  );
}