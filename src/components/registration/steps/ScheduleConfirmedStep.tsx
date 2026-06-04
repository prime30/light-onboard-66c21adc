import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Calendar, Check, Mail, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStepContext } from "@/components/registration/context";

type Booking = {
  start_time?: string;
  timezone?: string;
  cancel_url?: string;
  reschedule_url?: string;
  name?: string;
  email?: string;
  eventName?: string;
  duration?: number;
};

export const ScheduleConfirmedStep = () => {
  const { setCurrentStep } = useStepContext();
  const [booking, setBooking] = useState<Booking>({});

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("dde_schedule_booking");
      if (raw) setBooking(JSON.parse(raw) as Booking);
    } catch {
      // ignore
    }
  }, []);

  const when = useMemo(() => {
    if (!booking.start_time) return { date: "", time: "" };
    const d = new Date(booking.start_time);
    return {
      date: d.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      time: d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
    };
  }, [booking.start_time]);

  return (
    <div className="space-y-[clamp(12px,2vh,25px)] animate-fade-in text-center">
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
        {booking.email && (
          <p className="text-xs text-muted-foreground pt-1">
            A confirmation has been sent to <span className="text-foreground">{booking.email}</span>.
          </p>
        )}
      </div>

      {booking.start_time && (
        <div className="rounded-form border border-border bg-card p-5 md:p-10 text-left space-y-5 animate-stagger-2">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-form bg-muted flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{booking.eventName ?? "Founder call"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {when.date} · {when.time}
                {booking.timezone ? ` · ${booking.timezone}` : ""}
                {booking.duration ? ` · ${booking.duration} min` : ""}
              </p>
            </div>
          </div>

          {booking.name && (
            <div className="flex items-start gap-3 pt-5 border-t border-border">
              <div className="w-10 h-10 rounded-form bg-muted flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{booking.name}</p>
                <p className="text-xs text-muted-foreground truncate">{booking.email}</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 animate-stagger-3">
        {booking.reschedule_url && (
          <Button asChild variant="outline" className="h-11 rounded-form">
            <a href={booking.reschedule_url} target="_blank" rel="noopener noreferrer">
              <RotateCcw className="w-4 h-4" /> Reschedule
              <ArrowUpRight className="w-3.5 h-3.5 opacity-60" />
            </a>
          </Button>
        )}
        {booking.cancel_url && (
          <Button asChild variant="outline" className="h-11 rounded-form">
            <a href={booking.cancel_url} target="_blank" rel="noopener noreferrer">
              <X className="w-4 h-4" /> Cancel
              <ArrowUpRight className="w-3.5 h-3.5 opacity-60" />
            </a>
          </Button>
        )}
      </div>

      <Button variant="ghost" className="text-xs" onClick={() => setCurrentStep("success")}>
        Done
      </Button>
    </div>
  );
};
