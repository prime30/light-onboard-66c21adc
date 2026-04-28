import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

let cached: boolean | null = null;
let inFlight: Promise<boolean> | null = null;

export async function fetchAutoApprovalEnabled(): Promise<boolean> {
  if (cached !== null) return cached;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const { data, error } = await supabase.rpc("get_auto_approval_enabled");

    if (error) {
      console.error("Failed to load app_settings:", error);
      cached = false;
      return false;
    }
    cached = (data as boolean | null) ?? false;
    return cached;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

/** Hook for reading the auto-approval flag in components. */
export function useAutoApproval(): { enabled: boolean; loading: boolean } {
  const [enabled, setEnabled] = useState<boolean>(cached ?? false);
  const [loading, setLoading] = useState<boolean>(cached === null);

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
