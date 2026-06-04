// Client for the Vercel-hosted Calendly proxy (vercel/calendly-proxy).
// The proxy holds the Calendly PAT + event-type URI server-side.
// CORS: the SPA origin MUST be listed in the proxy's ALLOWED_ORIGINS env var.

export const CALENDLY_PROXY_BASE = "https://dd-calendly-proxy.vercel.app";

// Hardcoded event-type metadata. The proxy doesn't expose event-type info;
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

  const url = new URL(`${CALENDLY_PROXY_BASE}/api/calendly/slots`);
  url.searchParams.set("start_date", startDate);
  url.searchParams.set("end_date", endDate);
  const p = (async () => {
    const res = await fetch(url.toString(), {
      method: "GET",
      credentials: "omit",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      const detail = await safeJson(res);
      throw new Error(proxyErrorMessage(detail, `Slots request failed (${res.status})`));
    }
    const data = await res.json();
    return Array.isArray(data?.slots) ? (data.slots as ProxySlot[]) : [];
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
  const res = await fetch(`${CALENDLY_PROXY_BASE}/api/calendly/book`, {
    method: "POST",
    credentials: "omit",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Idempotency-Key": uuidv4(),
    },
    body: JSON.stringify(input),
  });
  const data = await safeJson(res);
  if (!res.ok || !data?.booking) {
    throw new Error(proxyErrorMessage(data, `Booking failed (${res.status})`));
  }
  return data.booking as BookingResult;
}

function proxyErrorMessage(data: any, fallback: string): string {
  const parts: string[] = [];
  if (typeof data?.error === "string") parts.push(data.error);
  else if (typeof data?.error?.message === "string") parts.push(data.error.message);
  else if (typeof data?.message === "string") parts.push(data.message);

  const detail =
    typeof data?.error?.detail === "string"
      ? data.error.detail
      : typeof data?.detail === "string"
        ? data.detail
        : "";

  // Friendlier hint for Calendly's opaque "parameters are invalid" — almost
  // always a duplicate invitee (same email already booked on this event type).
  if (/parameters are invalid/i.test(detail) || /parameters are invalid/i.test(parts[0] ?? "")) {
    return "This time couldn't be booked. The slot may have just been taken, or this email already has a meeting scheduled. Try a different time or email.";
  }

  if (detail && !parts.includes(detail)) parts.push(detail);
  return parts.join(" — ") || fallback;
}

function uuidv4(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function safeJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
