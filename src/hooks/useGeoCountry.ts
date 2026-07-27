import { useEffect, useState } from "react";

const CACHE_KEY = "dd:geo:country";
const SUPPORTED = ["US", "CA", "AU", "GB", "IE", "NZ", "ZA"] as const;
type Supported = (typeof SUPPORTED)[number];

function readCache(): Supported | null {
  try {
    const v = sessionStorage.getItem(CACHE_KEY);
    if (v && (SUPPORTED as readonly string[]).includes(v)) return v as Supported;
  } catch {
    /* ignore */
  }
  return null;
}

function writeCache(v: string) {
  try {
    sessionStorage.setItem(CACHE_KEY, v);
  } catch {
    /* ignore */
  }
}

/**
 * Lightweight IP-based country detection.
 * Uses ipwho.is (CORS-enabled, no key). Cached per session.
 * Returns ISO-2 uppercase or null if unknown/unsupported.
 */
export function useGeoCountry(): Supported | null {
  const [country, setCountry] = useState<Supported | null>(() => readCache());

  useEffect(() => {
    if (country) return;
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    (async () => {
      try {
        const res = await fetch("https://ipwho.is/?fields=country_code,success", {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as { success?: boolean; country_code?: string };
        const code = (data?.country_code || "").toUpperCase();
        if (cancelled) return;
        writeCache(code);
        if ((SUPPORTED as readonly string[]).includes(code)) {
          setCountry(code as Supported);
        }
      } catch {
        /* ignore */
      } finally {
        clearTimeout(timer);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [country]);

  return country;
}
