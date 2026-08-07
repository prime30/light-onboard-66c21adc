import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Flags = {
  autoApprovalEnabled: boolean;
  welcomeOfferEnabled: boolean;
  founderCallHighVolumeOnly: boolean;
  founderCallEnabled: boolean;
  businessOperationStepEnabled: boolean;
  orderVolumeStepEnabled: boolean;
  preferredMethodStepEnabled: boolean;
  businessLocationStepEnabled: boolean;
  referralStepEnabled: boolean;
};

const FLAGS_CACHE_KEY = "dd_app_flags_v1";

/**
 * Warm start: reuse the last known flags from localStorage so the very first
 * render already has the real step configuration. Without this the registration
 * flow briefly builds its step list from placeholder defaults and then rebuilds
 * it when the network flags land, which shifts step numbers mid-flow.
 */
function readPersistedFlags(): Flags | null {
  try {
    const raw = localStorage.getItem(FLAGS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Flags>;
    if (typeof parsed?.autoApprovalEnabled !== "boolean") return null;
    return parsed as Flags;
  } catch {
    return null;
  }
}

function persistFlags(flags: Flags) {
  try {
    localStorage.setItem(FLAGS_CACHE_KEY, JSON.stringify(flags));
  } catch {
    /* storage unavailable - ignore */
  }
}

let cachedFlags: Flags | null = readPersistedFlags();
let inFlightFlags: Promise<Flags> | null = null;

async function fetchFlags(): Promise<Flags> {
  if (cachedFlags) return cachedFlags;
  if (inFlightFlags) return inFlightFlags;
  inFlightFlags = (async () => {
    const { data, error } = await supabase.functions.invoke("public-app-flags", { body: {} });
    if (error || !data) {
      cachedFlags = { autoApprovalEnabled: false, welcomeOfferEnabled: false, founderCallHighVolumeOnly: false, founderCallEnabled: true, businessOperationStepEnabled: true, orderVolumeStepEnabled: true, preferredMethodStepEnabled: true, businessLocationStepEnabled: false, referralStepEnabled: true };
      return cachedFlags;
    }
    cachedFlags = {
      autoApprovalEnabled: !!(data as Flags).autoApprovalEnabled,
      welcomeOfferEnabled: !!(data as Flags).welcomeOfferEnabled,
      founderCallHighVolumeOnly: !!(data as Flags).founderCallHighVolumeOnly,
      founderCallEnabled: (data as Flags).founderCallEnabled !== false,
      businessOperationStepEnabled: (data as Flags).businessOperationStepEnabled !== false,
      orderVolumeStepEnabled: (data as Flags).orderVolumeStepEnabled !== false,
      preferredMethodStepEnabled: (data as Flags).preferredMethodStepEnabled !== false,
      businessLocationStepEnabled: !!(data as Flags).businessLocationStepEnabled,
      referralStepEnabled: (data as Flags).referralStepEnabled !== false,
    };
    return cachedFlags;
  })();
  try {
    return await inFlightFlags;
  } finally {
    inFlightFlags = null;
  }
}

export async function fetchAutoApprovalEnabled(): Promise<boolean> {
  return (await fetchFlags()).autoApprovalEnabled;
}

export async function fetchWelcomeOfferEnabled(): Promise<boolean> {
  return (await fetchFlags()).welcomeOfferEnabled;
}

export async function fetchFounderCallHighVolumeOnly(): Promise<boolean> {
  return (await fetchFlags()).founderCallHighVolumeOnly;
}

function useFlag(pick: (f: Flags) => boolean): { enabled: boolean; loading: boolean } {
  const [enabled, setEnabled] = useState<boolean>(cachedFlags ? pick(cachedFlags) : false);
  const [loading, setLoading] = useState<boolean>(cachedFlags === null);
  useEffect(() => {
    let cancelled = false;
    fetchFlags().then((f) => {
      if (cancelled) return;
      setEnabled(pick(f));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [pick]);
  return { enabled, loading };
}

export function useAutoApproval() {
  return useFlag((f) => f.autoApprovalEnabled);
}
export function useWelcomeOffer() {
  return useFlag((f) => f.welcomeOfferEnabled);
}
export function useFounderCallHighVolumeOnly() {
  return useFlag((f) => f.founderCallHighVolumeOnly);
}
export function useFounderCallEnabled() {
  // Default true so the invite still shows during the flag's first fetch.
  const [enabled, setEnabled] = useState<boolean>(cachedFlags ? cachedFlags.founderCallEnabled : true);
  const [loading, setLoading] = useState<boolean>(cachedFlags === null);
  useEffect(() => {
    let cancelled = false;
    fetchFlags().then((f) => {
      if (cancelled) return;
      setEnabled(f.founderCallEnabled);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return { enabled, loading };
}

/** Both default to true (step shown) while the flags are still loading. */
function useFlagDefaultTrue(pick: (f: Flags) => boolean): { enabled: boolean; loading: boolean } {
  const [enabled, setEnabled] = useState<boolean>(cachedFlags ? pick(cachedFlags) : true);
  const [loading, setLoading] = useState<boolean>(cachedFlags === null);
  useEffect(() => {
    let cancelled = false;
    fetchFlags().then((f) => {
      if (cancelled) return;
      setEnabled(pick(f));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [pick]);
  return { enabled, loading };
}

const pickBizOpStep = (f: Flags) => f.businessOperationStepEnabled;
const pickOrderVolumeStep = (f: Flags) => f.orderVolumeStepEnabled;
const pickPreferredMethodStep = (f: Flags) => f.preferredMethodStepEnabled;

export function useBusinessOperationStepEnabled() {
  return useFlagDefaultTrue(pickBizOpStep);
}
export function useOrderVolumeStepEnabled() {
  return useFlagDefaultTrue(pickOrderVolumeStep);
}
export function usePreferredMethodStepEnabled() {
  return useFlagDefaultTrue(pickPreferredMethodStep);
}
const pickReferralStep = (f: Flags) => f.referralStepEnabled;
export function useReferralStepEnabled() {
  return useFlagDefaultTrue(pickReferralStep);
}
/** Business Location is hidden by default (opt-in via admin settings). */
const pickBusinessLocationStep = (f: Flags) => f.businessLocationStepEnabled;
export function useBusinessLocationStepEnabled() {
  return useFlag(pickBusinessLocationStep);
}
