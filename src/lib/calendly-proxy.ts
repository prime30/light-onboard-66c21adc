// Calendly client - both slots and booking go through Lovable Cloud edge
// functions (calendly-slots, calendly-book). The Vercel proxy is no longer
// used; Calendly secrets (CALENDLY_API_TOKEN, CALENDLY_EVENT_TYPE_URI) live in
// Cloud and Calendly errors surface verbatim in edge-function logs.

import { supabase } from "@/integrations/supabase/client";

// Hardcoded event-type metadata. Mirrors the founder-call event configured in
// CALENDLY_EVENT_TYPE_URI.
export const FOUNDER_CALL = {
  name: "Founder call with Kristi",
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
      method: "POST",
      body: { start_date: startDate, end_date: endDate },
    });
    if (error) throw new Error(extractInvokeMessage(error, "Couldn't load availability."));
    const payload = data as { slots?: ProxySlot[]; error?: { message?: string } } | null;
    if (payload?.error) throw new Error(payload.error.message ?? "Couldn't load availability.");
    return Array.isArray(payload?.slots) ? payload!.slots : [];
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
  /** E.164 phone, e.g. "+15551234567". Forwarded as Calendly text_reminder_number. */
  phone?: string;
}): Promise<BookingResult> {
  const { data, error } = await supabase.functions.invoke("calendly-book", {
    method: "POST",
    body: input,
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[calendly.book] invoke error", { error, request: input });
    throw new Error(extractInvokeMessage(error, "Booking failed."));
  }
  const payload = data as { booking?: BookingResult; error?: { message?: string; details?: unknown } } | null;
  if (payload?.error) {
    // eslint-disable-next-line no-console
    console.error("[calendly.book] upstream error", { response: payload, request: input });
    throw new Error(payload.error.message ?? "Booking failed.");
  }
  if (!payload?.booking) throw new Error("Booking response was empty.");
  return payload.booking;
}

function extractInvokeMessage(err: any, fallback: string): string {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (typeof err.message === "string" && err.message) return err.message;
  return fallback;
}
