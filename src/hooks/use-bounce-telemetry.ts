// Captures lightweight bounce diagnostics for the registration funnel:
//   - device type + viewport (sent once per session)
//   - last focused field within the registration form
//   - validation error field names (debounced batch)
//
// All sends are fire-and-forget through the existing track-registration-lead
// edge function. The function dedupes by email, so we never fire until the
// user has typed a valid email.
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SESSION_KEY = "dd_bounce_telemetry_v1";

function getDevice() {
  if (typeof window === "undefined") return null;
  const w = window.innerWidth || 0;
  const h = window.innerHeight || 0;
  const type = w < 640 ? "mobile" : w < 1024 ? "tablet" : "desktop";
  return { type, width: w, height: h };
}

type Args = {
  email: string | undefined;
  currentStep: string;
  errors: Record<string, unknown>;
  accountType?: string | null;
};

export function useBounceTelemetry({ email, currentStep, errors, accountType }: Args) {
  const lastFocusedRef = useRef<string | null>(null);
  const sentDeviceRef = useRef(false);
  const lastErrorKeysRef = useRef<Set<string>>(new Set());
  const errorQueueRef = useRef<Set<string>>(new Set());
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const normalizedEmail = (email ?? "").trim().toLowerCase();
  const hasEmail = EMAIL_RE.test(normalizedEmail);

  // Track last focused input within the registration form.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const handler = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const name = t.getAttribute("name") || t.getAttribute("id");
      if (!name) return;
      if (!t.closest("form, [data-registration-form]")) return;
      lastFocusedRef.current = name;
    };
    document.addEventListener("focusin", handler, true);
    return () => document.removeEventListener("focusin", handler, true);
  }, []);

  // Send device info once per session as soon as we have a usable email.
  useEffect(() => {
    if (!hasEmail || sentDeviceRef.current) return;
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(SESSION_KEY)) {
      sentDeviceRef.current = true;
      return;
    }
    sentDeviceRef.current = true;
    const device = getDevice();
    if (!device) return;
    void supabase.functions
      .invoke("track-registration-lead", {
        body: {
          email: normalizedEmail,
          phase: "step",
          accountType: accountType ?? null,
          lastStep: currentStep,
          device,
        },
      })
      .then(() => {
        try {
          sessionStorage.setItem(SESSION_KEY, "1");
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        /* non-blocking */
      });
  }, [hasEmail, normalizedEmail, accountType, currentStep]);

  // Detect new validation error field names and batch-flush.
  useEffect(() => {
    if (!hasEmail) return;
    const currentKeys = Object.keys(errors || {});
    const seen = lastErrorKeysRef.current;
    const newKeys: string[] = [];
    for (const k of currentKeys) {
      if (!seen.has(k)) newKeys.push(k);
    }
    lastErrorKeysRef.current = new Set(currentKeys);
    if (newKeys.length === 0) return;
    for (const k of newKeys) errorQueueRef.current.add(k);

    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(() => {
      const fields = Array.from(errorQueueRef.current);
      errorQueueRef.current.clear();
      flushTimerRef.current = null;
      if (fields.length === 0) return;
      void supabase.functions
        .invoke("track-registration-lead", {
          body: {
            email: normalizedEmail,
            phase: "step",
            accountType: accountType ?? null,
            lastStep: currentStep,
            lastField: lastFocusedRef.current,
            validationErrorFields: fields,
          },
        })
        .catch(() => {
          /* non-blocking */
        });
    }, 1500);
    return () => {
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
    };
  }, [errors, hasEmail, normalizedEmail, accountType, currentStep]);

  // On step change, send a step ping including the last focused field (the
  // field they were on right before navigating away — strong drop-off signal).
  useEffect(() => {
    if (!hasEmail) return;
    void supabase.functions
      .invoke("track-registration-lead", {
        body: {
          email: normalizedEmail,
          phase: "step",
          accountType: accountType ?? null,
          lastStep: currentStep,
          lastField: lastFocusedRef.current,
        },
      })
      .catch(() => {
        /* non-blocking */
      });
  }, [currentStep, hasEmail, normalizedEmail, accountType]);
}
