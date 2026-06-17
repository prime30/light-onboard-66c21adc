import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

let cachedAutoApproval: boolean | null = null;
let inFlightAutoApproval: Promise<boolean> | null = null;

export async function fetchAutoApprovalEnabled(): Promise<boolean> {
  if (cachedAutoApproval !== null) return cachedAutoApproval;
  if (inFlightAutoApproval) return inFlightAutoApproval;

  inFlightAutoApproval = (async () => {
    const { data, error } = await supabase.rpc("get_auto_approval_enabled");
    if (error) {
      console.error("Failed to load app_settings:", error);
      cachedAutoApproval = false;
      return false;
    }
    cachedAutoApproval = (data as boolean | null) ?? false;
    return cachedAutoApproval;
  })();

  try {
    return await inFlightAutoApproval;
  } finally {
    inFlightAutoApproval = null;
  }
}

export function useAutoApproval(): { enabled: boolean; loading: boolean } {
  const [enabled, setEnabled] = useState<boolean>(cachedAutoApproval ?? false);
  const [loading, setLoading] = useState<boolean>(cachedAutoApproval === null);

  useEffect(() => {
    let cancelled = false;
    fetchAutoApprovalEnabled().then((v) => {
      if (cancelled) return;
      setEnabled(v);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { enabled, loading };
}

let cachedWelcomeOffer: boolean | null = null;
let inFlightWelcomeOffer: Promise<boolean> | null = null;

export async function fetchWelcomeOfferEnabled(): Promise<boolean> {
  if (cachedWelcomeOffer !== null) return cachedWelcomeOffer;
  if (inFlightWelcomeOffer) return inFlightWelcomeOffer;

  inFlightWelcomeOffer = (async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)("get_welcome_offer_enabled");
    if (error) {
      console.error("Failed to load welcome_offer flag:", error);
      cachedWelcomeOffer = false;
      return false;
    }
    cachedWelcomeOffer = (data as boolean | null) ?? false;
    return cachedWelcomeOffer;
  })();

  try {
    return await inFlightWelcomeOffer;
  } finally {
    inFlightWelcomeOffer = null;
  }
}

export function useWelcomeOffer(): { enabled: boolean; loading: boolean } {
  const [enabled, setEnabled] = useState<boolean>(cachedWelcomeOffer ?? false);
  const [loading, setLoading] = useState<boolean>(cachedWelcomeOffer === null);

  useEffect(() => {
    let cancelled = false;
    fetchWelcomeOfferEnabled().then((v) => {
      if (cancelled) return;
      setEnabled(v);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { enabled, loading };
}

let cachedFounderHighVolume: boolean | null = null;
let inFlightFounderHighVolume: Promise<boolean> | null = null;

export async function fetchFounderCallHighVolumeOnly(): Promise<boolean> {
  if (cachedFounderHighVolume !== null) return cachedFounderHighVolume;
  if (inFlightFounderHighVolume) return inFlightFounderHighVolume;

  inFlightFounderHighVolume = (async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)("get_founder_call_high_volume_only");
    if (error) {
      console.error("Failed to load founder_call_high_volume_only flag:", error);
      cachedFounderHighVolume = false;
      return false;
    }
    cachedFounderHighVolume = (data as boolean | null) ?? false;
    return cachedFounderHighVolume;
  })();

  try {
    return await inFlightFounderHighVolume;
  } finally {
    inFlightFounderHighVolume = null;
  }
}

export function useFounderCallHighVolumeOnly(): { enabled: boolean; loading: boolean } {
  const [enabled, setEnabled] = useState<boolean>(cachedFounderHighVolume ?? false);
  const [loading, setLoading] = useState<boolean>(cachedFounderHighVolume === null);

  useEffect(() => {
    let cancelled = false;
    fetchFounderCallHighVolumeOnly().then((v) => {
      if (cancelled) return;
      setEnabled(v);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { enabled, loading };
}
