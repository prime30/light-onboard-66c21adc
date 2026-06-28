import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Bell, Calendar as CalendarIcon, Check, ChevronLeft, ChevronRight, Clock, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  FOUNDER_CALL,
  bookSlot,
  fetchSlots,
  type ProxySlot,
} from "@/lib/calendly-proxy";
import { toE164 } from "@/lib/phone-e164";
import { useStepContext, useForm } from "@/components/registration/context";
import { supabase } from "@/integrations/supabase/client";

// Cap how far forward we'll auto-skip empty weeks before giving up and
// showing the waitlist CTA. 8 weeks ≈ 2 months — enough to absorb most
// Calendly date-range gaps without spinning forever.
const MAX_AUTO_SKIP_WEEKS = 8;


type SubStep = "date" | "time" | "confirm";

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

export const ScheduleStep = () => {
  const { setCurrentStep } = useStepContext();
  const { watch } = useForm();
  const values = watch() as {
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
    phoneCountryCode?: string;
  };

  // Convert form phone (national digits + country iso) into strict E.164 for
  // Calendly. We surface the failure reason inline so users can fix it before
  // booking instead of getting an opaque Calendly rejection.
  const phoneResult = toE164(values?.phoneNumber, values?.phoneCountryCode);
  const formPhoneE164 = phoneResult.ok ? phoneResult.value : undefined;
  const phoneError: string | null = phoneResult.ok === false ? phoneResult.reason : null;

  const [subStep, setSubStep] = useState<SubStep>("date");
  const [slotsByDay, setSlotsByDay] = useState<Record<string, ProxySlot[]>>({});
  const [loadingWindow, setLoadingWindow] = useState(false);
  const [windowError, setWindowError] = useState<string | null>(null);
  const [windowStart, setWindowStart] = useState<Date>(() => startOfDayLocal(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<ProxySlot | null>(null);

  const [firstName, setFirstName] = useState(values?.firstName ?? "");
  const [lastName, setLastName] = useState(values?.lastName ?? "");
  const [email, setEmail] = useState(values?.email ?? "");
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);

  // Sync prefill once form values become available (post-submit reset
  // settles a tick after mount, so the initial useState may have captured
  // empty strings).
  const prefilledRef = useRef({ firstName: false, lastName: false, email: false });
  useEffect(() => {
    if (!prefilledRef.current.firstName && values?.firstName && !firstName) {
      setFirstName(values.firstName);
      prefilledRef.current.firstName = true;
    }
    if (!prefilledRef.current.lastName && values?.lastName && !lastName) {
      setLastName(values.lastName);
      prefilledRef.current.lastName = true;
    }
    if (!prefilledRef.current.email && values?.email && !email) {
      setEmail(values.email);
      prefilledRef.current.email = true;
    }
  }, [values?.firstName, values?.lastName, values?.email, firstName, lastName, email]);


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

  // Has the current visible week + its prefetched +7 sibling both come back
  // with zero slots? Used to decide whether to auto-skip forward.
  const userNavigatedRef = useRef(false);
  const autoSkipCountRef = useRef(0);
  const [exhaustedAutoSkip, setExhaustedAutoSkip] = useState(false);

  const weekHasAnySlots = useCallback(
    (start: Date) => {
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        if (availableDays.has(d.toLocaleDateString("en-CA"))) return true;
      }
      return false;
    },
    [availableDays],
  );

  // After every fetch settles, if the user hasn't touched the chevrons and
  // both the visible week AND the +7 prefetched week have zero slots, jump
  // forward by 7 days. Repeat up to MAX_AUTO_SKIP_WEEKS.
  useEffect(() => {
    if (loadingWindow || userNavigatedRef.current || exhaustedAutoSkip) return;
    const nextStart = new Date(windowStart);
    nextStart.setDate(nextStart.getDate() + 7);
    const visibleKey = toYmdUtc(windowStart);
    const nextKey = toYmdUtc(nextStart);
    // Only act once both windows have finished a fetch attempt.
    if (!fetchedWindows.current.has(visibleKey) || !fetchedWindows.current.has(nextKey)) return;
    if (weekHasAnySlots(windowStart) || weekHasAnySlots(nextStart)) return;
    if (autoSkipCountRef.current >= MAX_AUTO_SKIP_WEEKS) {
      setExhaustedAutoSkip(true);
      return;
    }
    autoSkipCountRef.current += 1;
    setWindowStart(nextStart);
  }, [loadingWindow, slotsByDay, windowStart, weekHasAnySlots, exhaustedAutoSkip]);

  const slotsForSelected = useMemo(() => {
    if (!selectedDate) return [];
    const key = selectedDate.toLocaleDateString("en-CA");
    return slotsByDay[key] ?? [];
  }, [selectedDate, slotsByDay]);

  // Waitlist fallback — when calendar is exhausted, let user opt into a
  // notify-me ping instead of bouncing.
  const [waitlistState, setWaitlistState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const submitWaitlist = useCallback(async () => {
    if (!values?.email) {
      setWaitlistState("error");
      return;
    }
    setWaitlistState("sending");
    try {
      await supabase.functions.invoke("track-registration-lead", {
        method: "POST",
        body: {
          email: values.email,
          phase: "step",
          lastStep: "schedule-waitlist",
          lastField: null,
        },
      });
      setWaitlistState("done");
    } catch {
      setWaitlistState("error");
    }
  }, [values?.email]);

  const isDayDisabled = useCallback(
    (d: Date) => {
      const key = d.toLocaleDateString("en-CA");
      const today = startOfDayLocal(new Date());
      if (d < today) return true;
      return !availableDays.has(key);
    },
    [availableDays],
  );




  const canBook =
    !!selectedSlot &&
    firstName.trim().length >= 1 &&
    lastName.trim().length >= 1 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    !phoneError;

  const handleBook = useCallback(async () => {
    if (!canBook || !selectedSlot) return;
    setBooking(true);
    setBookError(null);
    const name = `${firstName.trim()} ${lastName.trim()}`.trim();
    try {
      const result = await bookSlot({
        start_time: selectedSlot.start_time,
        name,
        email: email.trim().toLowerCase(),
        timezone: userTimezone,
        phone: formPhoneE164,
      });
      try {
        sessionStorage.setItem(
          "dde_schedule_booking",
          JSON.stringify({
            start_time: result.start_time,
            timezone: userTimezone,
            cancel_url: result.cancel_url,
            reschedule_url: result.reschedule_url,
            name,
            email: email.trim().toLowerCase(),
            eventName: FOUNDER_CALL.name,
            duration: FOUNDER_CALL.duration,
          }),
        );
      } catch {
        // sessionStorage may be unavailable — confirmed step has fallbacks
      }
      setCurrentStep("schedule-confirmed");
    } catch (err) {
      setBookError(err instanceof Error ? err.message : "Booking failed. Try a different time.");
    } finally {
      setBooking(false);
    }
  }, [canBook, selectedSlot, firstName, lastName, email, formPhoneE164, setCurrentStep]);

  const subStepLabel = subStep === "date" ? "Pick a date" : subStep === "time" ? "Pick a time" : "Confirm details";
  const subStepNumber = subStep === "date" ? 1 : subStep === "time" ? 2 : 3;

  return (
    <div className="space-y-[clamp(12px,2vh,25px)] animate-fade-in">
      <div className="space-y-[clamp(5px,1vh,10px)] text-center animate-stagger-1">
        <div className="inline-flex items-center gap-2.5 px-[15px] py-[6px] rounded-full bg-muted border border-border/50 mb-[5px] animate-badge-pop">
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-foreground text-background text-[9px] font-semibold">
            {subStepNumber}
          </span>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
            {subStepLabel}
          </span>
        </div>
        <h1 className="font-termina font-medium uppercase text-xl sm:text-2xl md:text-3xl text-foreground leading-[1.1] text-balance">
          {FOUNDER_CALL.name}
        </h1>
        <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground pt-1">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            {FOUNDER_CALL.duration} min
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="w-3 h-3" />
            {FOUNDER_CALL.locationLabel}
          </span>
        </div>
        {subStep === "date" ? (
          <button
            type="button"
            onClick={() => setCurrentStep("success")}
            className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors pt-2.5"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to summary
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setSubStep(subStep === "confirm" ? "time" : "date")}
            className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors pt-2.5"
          >
            <ArrowLeft className="w-3 h-3" />
            Back
          </button>
        )}
      </div>

      {subStep === "date" && (
        <div className="rounded-form border border-border bg-card p-5 md:p-10 space-y-5 animate-stagger-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Pick a date</p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  userNavigatedRef.current = true;
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
                  userNavigatedRef.current = true;
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
                setSubStep("time");
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

          {exhaustedAutoSkip && availableDays.size === 0 && (
            <div className="mt-2 pt-5 border-t border-dashed border-border/70 space-y-3 text-center">
              <p className="text-[13px] text-foreground leading-relaxed">
                Eric's calendar is fully booked for the next few weeks.
              </p>
              {waitlistState === "done" ? (
                <p className="inline-flex items-center justify-center gap-1.5 text-[12px] text-status-green">
                  <Check className="w-3.5 h-3.5" /> You're on the list — we'll email you when new slots open.
                </p>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={submitWaitlist}
                    disabled={waitlistState === "sending"}
                    className="rounded-form"
                  >
                    {waitlistState === "sending" ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Adding you…
                      </>
                    ) : (
                      <>
                        <Bell className="w-3.5 h-3.5" /> Notify me when slots open
                      </>
                    )}
                  </Button>
                  {waitlistState === "error" && (
                    <p className="text-[11px] text-destructive">Couldn't sign you up. Try again.</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>

      )}

      {subStep === "time" && selectedDate && (
        <div className="rounded-form border border-border bg-card p-5 md:p-10 space-y-5 animate-stagger-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Pick a time</p>
              <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(selectedDate)}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSubStep("date")}>
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
                      setSubStep("confirm");
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

      {subStep === "confirm" && selectedSlot && (
        <div className="rounded-form border border-border bg-card p-5 md:p-10 space-y-5 animate-stagger-2">
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
            <Button variant="ghost" size="sm" onClick={() => setSubStep("time")}>
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

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
              SMS reminder number
            </Label>
            {formPhoneE164 ? (
              <div className="flex items-center justify-between gap-3 rounded-form border border-border bg-muted/40 px-4 py-3">
                <span className="font-mono text-sm text-foreground tabular-nums">
                  {formPhoneE164}
                </span>
                <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  Sent to Calendly
                </span>
              </div>
            ) : (
              <p className="text-xs text-destructive">
                We can't text your reminder — {(phoneError ?? "phone is missing").toLowerCase()}. Update your phone number on the contact step.
              </p>
            )}
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
  );
};
