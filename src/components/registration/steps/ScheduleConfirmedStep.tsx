import { useEffect, useMemo, useState } from "react";
import { Calendar, Check, Mail, Sparkles, MessageCircle, ListChecks, AlertTriangle, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCloseIframe } from "@/hooks/messages";
import { useWelcomeOffer, useFounderCallHighVolumeOnly } from "@/lib/app-settings";
import { buildRegistrationCloseExtras } from "@/lib/founder-call-eligibility";

type Booking = {
  start_time?: string;
  end_time?: string;
  timezone?: string;
  cancel_url?: string;
  reschedule_url?: string;
  name?: string;
  email?: string;
  eventName?: string;
  duration?: number;
  join_url?: string;
};

export const ScheduleConfirmedStep = () => {
  const { closeIframe, isInIframe } = useCloseIframe();
  const { enabled: welcomeOfferEnabled } = useWelcomeOffer();
  const { enabled: founderHighVolumeOnly } = useFounderCallHighVolumeOnly();
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

  const calendarLinks = useMemo(() => {
    if (!booking.start_time) return null;
    const start = new Date(booking.start_time);
    const durationMin = booking.duration ?? 30;
    const end = booking.end_time
      ? new Date(booking.end_time)
      : new Date(start.getTime() + durationMin * 60_000);

    const toIcsStamp = (d: Date) =>
      d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

    const title = booking.eventName ?? "Founder call with Eric";
    const details = [
      "Founder call with Eric from Drop Dead Extensions.",
      booking.join_url ? `Join: ${booking.join_url}` : "",
      booking.reschedule_url ? `Reschedule: ${booking.reschedule_url}` : "",
      booking.cancel_url ? `Cancel: ${booking.cancel_url}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    const location = booking.join_url ?? "Zoom";

    const google = new URL("https://calendar.google.com/calendar/render");
    google.searchParams.set("action", "TEMPLATE");
    google.searchParams.set("text", title);
    google.searchParams.set("dates", `${toIcsStamp(start)}/${toIcsStamp(end)}`);
    google.searchParams.set("details", details);
    google.searchParams.set("location", location);

    const outlook = new URL("https://outlook.live.com/calendar/0/deeplink/compose");
    outlook.searchParams.set("path", "/calendar/action/compose");
    outlook.searchParams.set("rru", "addevent");
    outlook.searchParams.set("subject", title);
    outlook.searchParams.set("startdt", start.toISOString());
    outlook.searchParams.set("enddt", end.toISOString());
    outlook.searchParams.set("body", details);
    outlook.searchParams.set("location", location);

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Drop Dead Extensions//Founder Call//EN",
      "BEGIN:VEVENT",
      `UID:${toIcsStamp(start)}-dde-founder-call@dropdeadextensions.com`,
      `DTSTAMP:${toIcsStamp(new Date())}`,
      `DTSTART:${toIcsStamp(start)}`,
      `DTEND:${toIcsStamp(end)}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${details.replace(/\n/g, "\\n")}`,
      `LOCATION:${location}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const icsUrl = `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;

    return { google: google.toString(), outlook: outlook.toString(), ics: icsUrl };
  }, [booking]);

  const handleGoToShop = () => {
    if (isInIframe) {
      const extras = buildRegistrationCloseExtras({
        founderHighVolumeOnly,
        welcomeOfferEnabled,
      });
      closeIframe("registration_complete", extras);
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

          {calendarLinks && (
            <div className="pt-5 border-t border-border space-y-[10px]">
              <div className="flex items-center gap-2">
                <CalendarPlus className="w-4 h-4 text-foreground" strokeWidth={1.75} />
                <p className="text-sm font-medium text-foreground">Add to your calendar</p>
              </div>
              <div className="grid grid-cols-3 gap-[10px]">
                <a
                  href={calendarLinks.google}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-foreground text-center px-3 py-2.5 rounded-form border border-border bg-background hover:bg-muted transition-colors"
                >
                  Google
                </a>
                <a
                  href={calendarLinks.outlook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-foreground text-center px-3 py-2.5 rounded-form border border-border bg-background hover:bg-muted transition-colors"
                >
                  Outlook
                </a>
                <a
                  href={calendarLinks.ics}
                  download="founder-call.ics"
                  className="text-xs font-medium text-foreground text-center px-3 py-2.5 rounded-form border border-border bg-background hover:bg-muted transition-colors"
                >
                  Apple / .ics
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* No-show notice */}
      <div
        role="alert"
        className="rounded-form border border-[hsl(var(--status-red)/0.3)] bg-[hsl(var(--status-red)/0.08)] p-5 md:p-6 text-left flex items-start gap-3 animate-stagger-2"
      >
        <div className="w-9 h-9 rounded-form bg-[hsl(var(--status-red)/0.12)] flex items-center justify-center shrink-0">
          <AlertTriangle className="w-4 h-4 text-[hsl(var(--status-red))]" strokeWidth={2} />
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-[hsl(var(--status-red))] leading-tight">
            Please don't no-show
          </p>
          <p className="text-[12px] text-foreground/80 leading-relaxed">
            Eric blocks this time off just for you — the same way you'd block a chair for a client.
            If something comes up, use the reschedule or cancel link in your confirmation email so
            the slot opens back up for someone else.
          </p>
          {(booking.reschedule_url || booking.cancel_url) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
              {booking.reschedule_url && (
                <a
                  href={booking.reschedule_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12px] font-medium text-[hsl(var(--status-red))] underline underline-offset-2"
                >
                  Reschedule
                </a>
              )}
              {booking.cancel_url && (
                <a
                  href={booking.cancel_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12px] font-medium text-[hsl(var(--status-red))] underline underline-offset-2"
                >
                  Cancel
                </a>
              )}
            </div>
          )}
        </div>
      </div>

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
