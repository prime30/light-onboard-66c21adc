import { useEffect, useMemo, useState } from "react";
import { Calendar, Check, Mail, Sparkles, MessageCircle, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStepContext } from "@/components/registration/context";
import { useCloseIframe } from "@/hooks/messages";

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
  const { closeIframe, isInIframe } = useCloseIframe();
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

  const handleGoToShop = () => {
    if (isInIframe) {
      closeIframe("registration_complete");
    } else {
      window.location.href = "/";
    }
  };

  const expectItems = [
    {
      icon: MessageCircle,
      title: "A real conversation",
      body: "No pitch deck. Eric will ask what you're working on and answer whatever's on your mind.",
    },
    {
      icon: Sparkles,
      title: "Samples in hand",
      body: "He'll have product on the table — SuperWefts, Keratin Tips, Color Ring, and Tapes — to walk through texture, weight, and finish.",
    },
    {
      icon: ListChecks,
      title: "Come with questions",
      body: "Pricing, application, replacements, troubleshooting — jot down anything you want covered.",
    },
  ];

  return (
    <div className="space-y-[clamp(12px,2vh,25px)] animate-fade-in text-center">
      <div className="space-y-[clamp(5px,1vh,10px)] animate-stagger-1">
        <div className="inline-flex items-center gap-2.5 px-[15px] py-[6px] rounded-full bg-muted border border-border/50 mb-[5px] animate-badge-pop">
          <Check className="w-3 h-3 text-success" strokeWidth={3} />
          <span className="font-mono-eyebrow text-[10px] text-muted-foreground">
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

      {/* What to expect & how to prepare */}
      <div className="rounded-form border border-border bg-muted/30 p-5 md:p-[30px] text-left space-y-5 animate-stagger-3">
        <div className="space-y-1">
          <p className="font-mono-eyebrow text-[10px] text-muted-foreground">
            What to expect
          </p>
          <h2 className="text-base md:text-lg font-medium text-foreground tracking-[-0.01em]">
            How to prepare for your call
          </h2>
        </div>
        <ul className="space-y-[15px]">
          {expectItems.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-form bg-background border border-border/60 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-foreground" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground leading-tight">{title}</p>
                <p className="text-[12px] text-muted-foreground leading-relaxed mt-1">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <Button
        type="button"
        onClick={handleGoToShop}
        className="w-full h-12 min-h-12 rounded-form animate-stagger-3"
      >
        Go to shop
      </Button>
    </div>
  );
};
