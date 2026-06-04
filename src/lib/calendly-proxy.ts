// Calendly client — calls Lovable Cloud edge functions (calendly-slots, calendly-book).
// Replaces the previous Vercel proxy. Secrets (CALENDLY_API_TOKEN,
// CALENDLY_EVENT_TYPE_URI) live in Cloud and are never exposed to the browser.

import { supabase } from "@/integrations/supabase/client";

// Hardcoded event-type metadata. The edge function doesn't expose event-type info;
// these mirror the founder-call event configured in CALENDLY_EVENT_TYPE_URI.
export const FOUNDER_CALL = {
  name: "Founder call with Eric",
  duration: 30,
  locationLabel: "Zoom",
};

export type ProxySlot = { start_time: string };

// In-flight + resolved cache so a prefetch from a prior screen makes the
// ScheduleStep render instantly (no network wait on mount).
const slotsCache = new Map<string, Promise<ProxySlot[]>>();
const slotsCacheKey = (start: string, end: string) => `${start}|${end}`;

export async function fetchSlots(startDate: string, endDate: string): Promise<ProxySlot[]> {
  const key = slotsCacheKey(startDate, endDate);
  const cached = slotsCache.get(key);
  if (cached) return cached;

  const p = (async () => {
    const { data, error } = await supabase.functions.invoke("calendly-slots", {
      method: "GET",
      // supabase-js doesn't support GET query params via invoke; pass as body
      // and read in function. To keep the function simple we use POST-like URL:
      body: { start_date: startDate, end_date: endDate },
    });
    if (error) throw new Error(extractMessage(error, "Couldn't load availability."));
    if ((data as any)?.error) throw new Error(extractMessage((data as any).error, "Couldn't load availability."));
    return Array.isArray((data as any)?.slots) ? ((data as any).slots as ProxySlot[]) : [];
  })();

  slotsCache.set(key, p);
  p.catch(() => slotsCache.delete(key));
  return p;
}

/** Fire-and-forget warmup so the schedule screen has slots ready on mount. */
export function prefetchSlots(startDate: string, endDate: string): void {
  void fetchSlots(startDate, endDate).catch(() => {});
}

/** Compute the same initial window ScheduleStep uses (today + next 6 days). */
export function defaultScheduleWindow(): { start: string; end: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const ymd = (d: Date) => d.toISOString().slice(0, 10);
  return { start: ymd(start), end: ymd(end) };
}

export type BookingResult = {
  uri: string;
  name: string;
  email: string;
  start_time: string;
  end_time: string;
  join_url?: string;
  cancel_url?: string;
  reschedule_url?: string;
};

export async function bookSlot(input: {
  start_time: string;
  name: string;
  email: string;
  timezone: string;
}): Promise<BookingResult> {
  const { data, error } = await supabase.functions.invoke("calendly-book", {
    method: "POST",
    body: input,
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[calendly.book] invoke error", { error, request: input });
    throw new Error(extractMessage(error, "Booking failed."));
  }
  if ((data as any)?.error) {
    // eslint-disable-next-line no-console
    console.error("[calendly.book] upstream error", { response: data, request: input });
    throw new Error(extractMessage((data as any).error, "Booking failed."));
  }
  const booking = (data as any)?.booking as BookingResult | undefined;
  if (!booking) throw new Error("Booking response was empty.");
  return booking;
}

function extractMessage(err: any, fallback: string): string {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (typeof err.message === "string" && err.message) {
    const detail = typeof err.details === "string" ? err.details : "";
    return detail ? `${err.message} — ${detail}` : err.message;
  }
  return fallback;
}
