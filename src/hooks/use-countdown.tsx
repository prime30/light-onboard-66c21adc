import { useState, useEffect, useRef } from "react";

export interface CountdownTime {
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

/**
 * Counts down to a specific end time (ISO string) or a duration from now.
 * Pass `endsAt` (ISO string) for a real server-side expiry, or
 * `durationInHours` as a fallback when no server time is available.
 */
export const useCountdown = (
  endsAtOrDuration: string | number
): CountdownTime => {
  const endTimeRef = useRef<number | null>(null);

  if (endTimeRef.current === null) {
    if (typeof endsAtOrDuration === "string") {
      endTimeRef.current = new Date(endsAtOrDuration).getTime();
    } else {
      endTimeRef.current = Date.now() + endsAtOrDuration * 60 * 60 * 1000;
    }
  }

  const calculateTimeLeft = (): CountdownTime => {
    const now = Date.now();
    const difference = (endTimeRef.current ?? now) - now;

    if (difference <= 0) {
      return { hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }

    return {
      hours: Math.floor(difference / (1000 * 60 * 60)),
      minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((difference % (1000 * 60)) / 1000),
      isExpired: false,
    };
  };

  const [timeLeft, setTimeLeft] = useState<CountdownTime>(calculateTimeLeft);

  // When endsAt changes from a server response, update the ref and state
  useEffect(() => {
    if (typeof endsAtOrDuration === "string") {
      const parsed = new Date(endsAtOrDuration).getTime();
      if (Number.isFinite(parsed) && parsed !== endTimeRef.current) {
        endTimeRef.current = parsed;
        setTimeLeft(calculateTimeLeft());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAtOrDuration]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return timeLeft;
};
