import { useEffect, useState } from "react";
import { countries } from "@/data/locations";

const CACHE_KEY = "dd:geo:country";

// The form uses "UK" while ipwho.is (and the cache, which stores the raw
// response) uses ISO "GB".
function normalize(raw: string | null | undefined): string | null {
  const code = (raw || "").toUpperCase();
  const mapped = code === "GB" ? "UK" : code;
  return countries.some((c) => c.code === mapped) ? mapped : null;
}

function readCache(): string | null {
  try {
    return normalize(sessionStorage.getItem(CACHE_KEY));
  } catch {
    return null;
  }
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
 * Returns a `countries` code ("UK" for Great Britain) or null if
 * unknown/unsupported. Copy and the EU phone dial seed only: never write it
 * into countryCode.
 */
export function useGeoCountry(): string | null {
  const [country, setCountry] = useState<string | null>(() => readCache());

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
        const normalized = normalize(code);
        if (normalized) setCountry(normalized);
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
