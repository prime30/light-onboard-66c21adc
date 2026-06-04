import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ArrowLeft, Calendar as CalendarIcon, Check, ChevronLeft, ChevronRight, Clock, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { FOUNDER_CALL, bookSlot, fetchSlots, type ProxySlot } from "@/lib/calendly-proxy";

type Step = "date" | "time" | "confirm";

const userTimezone = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
})();

const fmtDate = (d: Date) =>
  d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const startOfDayLocal = (d: Date) => {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
};
const toYmdUtc = (d: Date) => d.toISOString().slice(0, 10);

export default function SchedulePage() {
  const navigate = useNavigate();
  const location = useLocation() as { state?: { firstName?: string; lastName?: string; email?: string } };
  const prefill = location.state ?? {};

  const [step, setStep] = useState<Step>("date");

  const [slotsByDay, setSlotsByDay] = useState<Record<string, ProxySlot[]>>({});
  const [loadingWindow, setLoadingWindow] = useState(false);
  const [windowError, setWindowError] = useState<string | null>(null);
  const [windowStart, setWindowStart] = useState<Date>(() => startOfDayLocal(new Date()));

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<ProxySlot | null>(null);

  const [firstName, setFirstName] = useState(prefill.firstName ?? "");
  const [lastName, setLastName] = useState(prefill.lastName ?? "");
  const [email, setEmail] = useState(prefill.email ?? "");
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);

  // Proxy /slots accepts windows up to 7 days, dates in UTC YYYY-MM-DD.
  const fetchedWindows = useRef<Set<string>>(new Set());
  const fetchWindow = useCallback(async (start: Date) => {
    const startKey = toYmdUtc(start);
    if (fetchedWindows.current.has(startKey)) return;
    fetchedWindows.current.add(startKey);

    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);

    setLoadingWindow(true);
    setWindowError(null);
    try {
      const slots = await fetchSlots(toYmdUtc(start), toYmdUtc(end));
      const byDay: Record<string, ProxySlot[]> = {};
      for (const slot of slots) {
        const localDateKey = new Date(slot.start_time).toLocaleDateString("en-CA");
        (byDay[localDateKey] ||= []).push(slot);
      }
      setSlotsByDay((prev) => {
        const next = { ...prev };
        for (const [k, v] of Object.entries(byDay)) {
          next[k] = [...(next[k] || []), ...v].sort((a, b) => a.start_time.localeCompare(b.start_time));
        }
        return next;
      });
    } catch (err) {
      fetchedWindows.current.delete(startKey);
      setWindowError(err instanceof Error ? err.message : "Couldn't load availability.");
    } finally {
      setLoadingWindow(false);
    }
  }, []);

  useEffect(() => {
    fetchWindow(windowStart);
  }, [windowStart, fetchWindow]);

  // Pre-fetch the following week so the calendar shows ~14 days.
  useEffect(() => {
    const next = new Date(windowStart);
    next.setDate(next.getDate() + 7);
    fetchWindow(next);
  }, [windowStart, fetchWindow]);

  const availableDays = useMemo(() => {
    const s = new Set<string>();
    for (const [k, slots] of Object.entries(slotsByDay)) {
      if (slots.length > 0) s.add(k);
    }
    return s;
  }, [slotsByDay]);

  const isDayDisabled = useCallback(
    (d: Date) => {
      const key = d.toLocaleDateString("en-CA");
      const today = startOfDayLocal(new Date());
      if (d < today) return true;
      return !availableDays.has(key);
    },
    [availableDays],
  );

  const slotsForSelected = useMemo(() => {
    if (!selectedDate) return [];
    const key = selectedDate.toLocaleDateString("en-CA");
    return slotsByDay[key] ?? [];
  }, [selectedDate, slotsByDay]);

  const canBook =
    !!selectedSlot &&
    firstName.trim().length >= 1 &&
    lastName.trim().length >= 1 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleBook = useCallback(async () => {
    if (!canBook || !selectedSlot) return;
    setBooking(true);
    setBookError(null);
    const name = `${firstName.trim()} ${lastName.trim()}`.trim();
    try {
      const booking = await bookSlot({
        start_time: selectedSlot.start_time,
        name,
        email: email.trim().toLowerCase(),
        timezone: userTimezone,
      });
      navigate("/schedule/confirmed", {
        replace: true,
        state: {
          start_time: booking.start_time,
          timezone: userTimezone,
          cancel_url: booking.cancel_url,
          reschedule_url: booking.reschedule_url,
          name,
          email: email.trim().toLowerCase(),
          eventName: FOUNDER_CALL.name,
          duration: FOUNDER_CALL.duration,
        },
      });
    } catch (err) {
      setBookError(err instanceof Error ? err.message : "Booking failed. Try a different time.");
    } finally {
      setBooking(false);
    }
  }, [canBook, selectedSlot, firstName, lastName, email, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-5 py-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-5 mb-10">
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => (step === "date" ? navigate(-1) : setStep(step === "confirm" ? "time" : "date"))}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{FOUNDER_CALL.name}</h1>
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {FOUNDER_CALL.duration} min
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {FOUNDER_CALL.locationLabel}
              </span>
            </div>
          </div>
          <Stepper step={step} />
        </div>

        {/* Step content */}
        {step === "date" && (
          <div className="rounded-form border border-border bg-card p-5 md:p-10 space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Pick a date</p>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const d = new Date(windowStart);
                    d.setDate(d.getDate() - 7);
                    if (d < startOfDayLocal(new Date())) return;
                    setWindowStart(d);
                  }}
                  aria-label="Previous week"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const d = new Date(windowStart);
                    d.setDate(d.getDate() + 7);
                    setWindowStart(d);
                  }}
                  aria-label="Next week"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="relative flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => {
                  if (!d) return;
                  setSelectedDate(d);
                  setSelectedSlot(null);
                  setStep("time");
                }}
                disabled={isDayDisabled}
                month={windowStart}
                onMonthChange={(m) => setWindowStart(m)}
                className="pointer-events-auto"
              />
              {loadingWindow && (
                <div className="absolute inset-0 flex items-center justify-center bg-card/60 backdrop-blur-sm rounded-form">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>

            {windowError && <p className="text-xs text-destructive text-center">{windowError}</p>}
            <p className="text-[11px] text-muted-foreground text-center">Times shown in {userTimezone}</p>
          </div>
        )}

        {step === "time" && selectedDate && (
          <div className="rounded-form border border-border bg-card p-5 md:p-10 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Pick a time</p>
                <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(selectedDate)}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setStep("date")}>
                Change date
              </Button>
            </div>

            {slotsForSelected.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">
                No times available on this day. Pick another date.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {slotsForSelected.map((slot) => {
                  const active = selectedSlot?.start_time === slot.start_time;
                  return (
                    <button
                      key={slot.start_time}
                      type="button"
                      onClick={() => {
                        setSelectedSlot(slot);
                        setStep("confirm");
                      }}
                      className={cn(
                        "h-11 rounded-form border text-sm font-medium transition-all",
                        active
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-background hover:border-foreground/40",
                      )}
                    >
                      {fmtTime(slot.start_time)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {step === "confirm" && selectedSlot && (
          <div className="rounded-form border border-border bg-card p-5 md:p-10 space-y-5">
            <div className="flex items-start gap-3 pb-5 border-b border-border">
              <div className="w-10 h-10 rounded-form bg-muted flex items-center justify-center shrink-0">
                <CalendarIcon className="w-5 h-5 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {fmtTime(selectedSlot.start_time)} · {FOUNDER_CALL.duration} min
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {fmtDate(new Date(selectedSlot.start_time))} · {userTimezone}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setStep("time")}>
                Change
              </Button>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            {bookError && <p className="text-xs text-destructive">{bookError}</p>}

            <Button
              size="lg"
              className="w-full h-12 rounded-form"
              onClick={handleBook}
              disabled={!canBook || booking}
            >
              {booking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Booking…
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" /> Confirm booking
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: "date", label: "Date" },
    { id: "time", label: "Time" },
    { id: "confirm", label: "Confirm" },
  ];
  const activeIdx = steps.findIndex((s) => s.id === step);
  return (
    <ol className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
      {steps.map((s, i) => (
        <li key={s.id} className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center justify-center w-5 h-5 rounded-full border text-[10px] font-semibold transition-colors",
              i <= activeIdx
                ? "bg-foreground text-background border-foreground"
                : "bg-background text-muted-foreground border-border",
            )}
          >
            {i + 1}
          </span>
          <span className={cn(i === activeIdx && "text-foreground")}>{s.label}</span>
          {i < steps.length - 1 && <span className="w-4 h-px bg-border" />}
        </li>
      ))}
    </ol>
  );
}
