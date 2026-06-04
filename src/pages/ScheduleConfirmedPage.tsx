import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router";
import { ArrowUpRight, Calendar, Check, Mail, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type State = {
  start_time?: string;
  timezone?: string;
  cancel_url?: string;
  reschedule_url?: string;
  name?: string;
  email?: string;
  eventName?: string;
  duration?: number;
};

export default function ScheduleConfirmedPage() {
  const navigate = useNavigate();
  const location = useLocation() as { state?: State };
  const s = location.state ?? {};

  useEffect(() => {
    if (!s.start_time) navigate("/schedule", { replace: true });
  }, [s.start_time, navigate]);

  const when = useMemo(() => {
    if (!s.start_time) return { date: "", time: "" };
    const d = new Date(s.start_time);
    return {
      date: d.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      time: d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
    };
  }, [s.start_time]);

  if (!s.start_time) return null;

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden">
      <div className="max-w-xl mx-auto px-5 pt-5 pb-[max(40px,env(safe-area-inset-bottom))] md:py-10 text-center space-y-[clamp(15px,2.5vh,25px)]">
        <div className="space-y-[clamp(5px,1vh,10px)] animate-stagger-1">
          <div className="inline-flex items-center gap-2.5 px-[15px] py-[6px] rounded-full bg-muted border border-border/50 mb-[5px] animate-badge-pop">
            <Check className="w-3 h-3 text-success" strokeWidth={3} />
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
              Booking confirmed
            </span>
          </div>
          <h1 className="font-termina font-medium uppercase text-xl sm:text-2xl md:text-3xl text-foreground leading-[1.1] text-balance">
            You're booked
          </h1>
          <p className="text-xs text-muted-foreground pt-1">
            A confirmation has been sent to <span className="text-foreground">{s.email}</span>.
          </p>
        </div>

        <div className="rounded-form border border-border bg-card p-5 md:p-10 text-left space-y-5 animate-stagger-2">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-form bg-muted flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{s.eventName ?? "Founder call"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {when.date} · {when.time}
                {s.timezone ? ` · ${s.timezone}` : ""}
                {s.duration ? ` · ${s.duration} min` : ""}
              </p>
            </div>
          </div>

          {s.name && (
            <div className="flex items-start gap-3 pt-5 border-t border-border">
              <div className="w-10 h-10 rounded-form bg-muted flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                <p className="text-xs text-muted-foreground truncate">{s.email}</p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 animate-stagger-3">
          {s.reschedule_url && (
            <Button asChild variant="outline" className="h-11 rounded-form">
              <a href={s.reschedule_url} target="_blank" rel="noopener noreferrer">
                <RotateCcw className="w-4 h-4" /> Reschedule
                <ArrowUpRight className="w-3.5 h-3.5 opacity-60" />
              </a>
            </Button>
          )}
          {s.cancel_url && (
            <Button asChild variant="outline" className="h-11 rounded-form">
              <a href={s.cancel_url} target="_blank" rel="noopener noreferrer">
                <X className="w-4 h-4" /> Cancel
                <ArrowUpRight className="w-3.5 h-3.5 opacity-60" />
              </a>
            </Button>
          )}
        </div>

        <Button variant="ghost" className="text-xs" onClick={() => navigate("/auth")}>
          Done
        </Button>
      </div>
    </div>
  );
}
