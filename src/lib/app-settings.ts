import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Flags = {
  autoApprovalEnabled: boolean;
  welcomeOfferEnabled: boolean;
  founderCallHighVolumeOnly: boolean;
  founderCallEnabled: boolean;
};

let cachedFlags: Flags | null = null;
let inFlightFlags: Promise<Flags> | null = null;

async function fetchFlags(): Promise<Flags> {
  if (cachedFlags) return cachedFlags;
  if (inFlightFlags) return inFlightFlags;
  inFlightFlags = (async () => {
    const { data, error } = await supabase.functions.invoke("public-app-flags", { body: {} });
    if (error || !data) {
      cachedFlags = { autoApprovalEnabled: false, welcomeOfferEnabled: false, founderCallHighVolumeOnly: false, founderCallEnabled: true };
      return cachedFlags;
    }
    cachedFlags = {
      autoApprovalEnabled: !!(data as Flags).autoApprovalEnabled,
      welcomeOfferEnabled: !!(data as Flags).welcomeOfferEnabled,
      founderCallHighVolumeOnly: !!(data as Flags).founderCallHighVolumeOnly,
      founderCallEnabled: (data as Flags).founderCallEnabled !== false,
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
