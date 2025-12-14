import { useState, useEffect, useRef } from "react";

interface CountdownTime {
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

export const useCountdown = (durationInHours: number): CountdownTime => {
  const endTimeRef = useRef<number | null>(null);
  
  // Initialize end time once on first render
  if (endTimeRef.current === null) {
    endTimeRef.current = Date.now() + durationInHours * 60 * 60 * 1000;
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

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return timeLeft;
};
