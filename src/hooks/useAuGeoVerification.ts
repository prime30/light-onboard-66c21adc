import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "dd:au-geo:token";

type StoredToken = { token: string; expiresAt: number; email: string; method: "ip" | "gps" };

export type AuGeoStatus =
  | "idle"
  | "checking"
  | "verified"
  | "needs-gps"
  | "gps-prompting"
  | "gps-denied"
  | "gps-outside-au"
  | "failed";

export type AuGeoState = {
  status: AuGeoStatus;
  method?: "ip" | "gps";
  token?: string;
  reason?: string;
};

function readStored(email: string): StoredToken | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredToken;
    if (
      parsed &&
      parsed.email === email.toLowerCase() &&
      typeof parsed.expiresAt === "number" &&
      Date.now() < parsed.expiresAt
    ) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writeStored(v: StoredToken) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

function clearStored() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Verifies the user is physically in Australia before allowing AU-specific
 * registration flow. IP first, GPS fallback. Blocks VPN spoofing at submit
 * time via HMAC token minted server-side.
 */
export function useAuGeoVerification(params: {
  countryCode: string | undefined;
  email: string | undefined;
}) {
  const { countryCode, email } = params;
  const isAu = (countryCode || "").toUpperCase() === "AU";

  const [state, setState] = useState<AuGeoState>({ status: "idle" });
  const inFlight = useRef(false);

  const callVerify = useCallback(
    async (coords?: { lat: number; lng: number }) => {
      if (!email) return;
      if (inFlight.current) return;
      inFlight.current = true;
      setState((s) => ({ ...s, status: coords ? "gps-prompting" : "checking" }));
      try {
        const { data, error } = await supabase.functions.invoke("verify-au-geo", {
          body: { email, ...(coords || {}) },
        });
        if (error) {
          setState({ status: "failed", reason: error.message });
          return;
        }
        const d = data as {
          verified: boolean;
          method?: "ip" | "gps";
          token?: string;
          expiresAt?: number;
          reason?: string;
        };
        if (d.verified && d.token && d.expiresAt && d.method) {
          writeStored({ token: d.token, expiresAt: d.expiresAt, email: email.toLowerCase(), method: d.method });
          setState({ status: "verified", method: d.method, token: d.token });
        } else if (d.reason === "needs_gps") {
          setState({ status: "needs-gps", reason: d.reason });
        } else if (d.reason === "gps_outside_au") {
          setState({ status: "gps-outside-au", reason: d.reason });
        } else {
          setState({ status: "failed", reason: d.reason });
        }
      } catch (e) {
        setState({ status: "failed", reason: (e as Error).message });
      } finally {
        inFlight.current = false;
      }
    },
    [email],
  );

  // Kick off IP check whenever AU becomes the country and we have an email.
  useEffect(() => {
    if (!isAu || !email) {
      setState({ status: "idle" });
      return;
    }
    const stored = readStored(email);
    if (stored) {
      setState({ status: "verified", method: stored.method, token: stored.token });
      return;
    }
    void callVerify();
  }, [isAu, email, callVerify]);

  const requestGps = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState({ status: "gps-denied", reason: "unsupported" });
      return;
    }
    setState((s) => ({ ...s, status: "gps-prompting" }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void callVerify({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        setState({ status: "gps-denied", reason: err.message });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }, [callVerify]);

  const reset = useCallback(() => {
    clearStored();
    setState({ status: "idle" });
  }, []);

  return { ...state, isAu, requestGps, reset, retry: () => callVerify() };
}

export function readAuGeoToken(email: string): string | null {
  const s = readStored(email);
  return s?.token ?? null;
}
