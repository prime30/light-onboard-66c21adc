import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Module-scope IP-geo cache. Survives across warm invocations of the same
// isolate so we don't burn an ipapi.co call on every keystroke. 24h TTL.
type GeoEntry = { lat: number; lng: number; expiresAt: number };
const ipGeoCache = new Map<string, GeoEntry | null>();
const GEO_TTL_MS = 24 * 60 * 60 * 1000;

async function lookupIpGeo(ip: string): Promise<GeoEntry | null> {
  const cached = ipGeoCache.get(ip);
  if (cached !== undefined && (cached === null || cached.expiresAt > Date.now())) {
    return cached;
  }
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 600);
    const res = await fetch(`https://ipapi.co/${ip}/json/`, { signal: ctrl.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      ipGeoCache.set(ip, null);
      return null;
    }
    const geo = (await res.json()) as { latitude?: number; longitude?: number };
    if (typeof geo.latitude !== "number" || typeof geo.longitude !== "number") {
      ipGeoCache.set(ip, null);
      return null;
    }
    const entry: GeoEntry = {
      lat: geo.latitude,
      lng: geo.longitude,
      expiresAt: Date.now() + GEO_TTL_MS,
    };
    ipGeoCache.set(ip, entry);
    return entry;
  } catch {
    // Negative-cache for a short window so we don't retry-storm on outages.
    ipGeoCache.set(ip, { lat: 0, lng: 0, expiresAt: Date.now() + 60_000 } as GeoEntry);
    ipGeoCache.set(ip, null);
    return null;
  }
}


serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { input, sessionToken, country, regionCode } = await req.json();

    if (!input || input.trim().length < 2) {
      return new Response(JSON.stringify({ predictions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!apiKey) {
      console.error("GOOGLE_PLACES_API_KEY not configured");
      throw new Error("Google Places API key not configured");
    }

    // Build request body for Places API (New)
    const requestBody: Record<string, unknown> = {
      input: input.trim(),
      includedPrimaryTypes: ["street_address", "premise", "subpremise"],
    };

    // Add country restriction if provided
    if (country) {
      const countryCode = country === "United States" ? "US" : country === "Canada" ? "CA" : "";
      if (countryCode) {
        requestBody.includedRegionCodes = [countryCode];
      }
    }

    // Bias results to the user's state/province when supplied. Without this,
    // Google falls back to the caller's IP — which is the Supabase edge
    // datacenter (us-west) and skews everything toward California.
    const STATE_CENTROIDS: Record<string, { lat: number; lng: number }> = {
      AL: { lat: 32.806671, lng: -86.79113 }, AK: { lat: 61.370716, lng: -152.404419 },
      AZ: { lat: 33.729759, lng: -111.431221 }, AR: { lat: 34.969704, lng: -92.373123 },
      CA: { lat: 36.116203, lng: -119.681564 }, CO: { lat: 39.059811, lng: -105.311104 },
      CT: { lat: 41.597782, lng: -72.755371 }, DE: { lat: 39.318523, lng: -75.507141 },
      DC: { lat: 38.897438, lng: -77.026817 }, FL: { lat: 27.766279, lng: -81.686783 },
      GA: { lat: 33.040619, lng: -83.643074 }, HI: { lat: 21.094318, lng: -157.498337 },
      ID: { lat: 44.240459, lng: -114.478828 }, IL: { lat: 40.349457, lng: -88.986137 },
      IN: { lat: 39.849426, lng: -86.258278 }, IA: { lat: 42.011539, lng: -93.210526 },
      KS: { lat: 38.5266, lng: -96.726486 }, KY: { lat: 37.66814, lng: -84.670067 },
      LA: { lat: 31.169546, lng: -91.867805 }, ME: { lat: 44.693947, lng: -69.381927 },
      MD: { lat: 39.063946, lng: -76.802101 }, MA: { lat: 42.230171, lng: -71.530106 },
      MI: { lat: 43.326618, lng: -84.536095 }, MN: { lat: 45.694454, lng: -93.900192 },
      MS: { lat: 32.741646, lng: -89.678696 }, MO: { lat: 38.456085, lng: -92.288368 },
      MT: { lat: 46.921925, lng: -110.454353 }, NE: { lat: 41.12537, lng: -98.268082 },
      NV: { lat: 38.313515, lng: -117.055374 }, NH: { lat: 43.452492, lng: -71.563896 },
      NJ: { lat: 40.298904, lng: -74.521011 }, NM: { lat: 34.840515, lng: -106.248482 },
      NY: { lat: 42.165726, lng: -74.948051 }, NC: { lat: 35.630066, lng: -79.806419 },
      ND: { lat: 47.528912, lng: -99.784012 }, OH: { lat: 40.388783, lng: -82.764915 },
      OK: { lat: 35.565342, lng: -96.928917 }, OR: { lat: 44.572021, lng: -122.070938 },
      PA: { lat: 40.590752, lng: -77.209755 }, RI: { lat: 41.680893, lng: -71.51178 },
      SC: { lat: 33.856892, lng: -80.945007 }, SD: { lat: 44.299782, lng: -99.438828 },
      TN: { lat: 35.747845, lng: -86.692345 }, TX: { lat: 31.054487, lng: -97.563461 },
      UT: { lat: 40.150032, lng: -111.862434 }, VT: { lat: 44.045876, lng: -72.710686 },
      VA: { lat: 37.769337, lng: -78.169968 }, WA: { lat: 47.400902, lng: -121.490494 },
      WV: { lat: 38.491226, lng: -80.954453 }, WI: { lat: 44.268543, lng: -89.616508 },
      WY: { lat: 42.755966, lng: -107.30249 },
      AB: { lat: 53.933271, lng: -116.576504 }, BC: { lat: 53.726669, lng: -127.647621 },
      MB: { lat: 53.760871, lng: -98.813873 }, NB: { lat: 46.565315, lng: -66.461914 },
      NL: { lat: 53.135509, lng: -57.660435 }, NS: { lat: 44.681987, lng: -63.744311 },
      NT: { lat: 64.825542, lng: -124.845733 }, NU: { lat: 70.299932, lng: -83.107574 },
      ON: { lat: 51.253775, lng: -85.323213 }, PE: { lat: 46.510712, lng: -63.416813 },
      QC: { lat: 52.939916, lng: -73.549136 }, SK: { lat: 52.939916, lng: -106.450857 },
      YT: { lat: 64.282315, lng: -135.0 },
    };
    const centroid =
      typeof regionCode === "string"
        ? STATE_CENTROIDS[regionCode.trim().toUpperCase()]
        : undefined;

    // Resolve a bias point. Priority:
    //   1. Explicit state/province centroid (user already picked one).
    //   2. IP-geo fallback derived from the caller's real IP (x-forwarded-for),
    //      so first-keystroke results are local instead of CA-datacenter.
    let biasPoint: { lat: number; lng: number; radiusKm: number } | null = null;
    if (centroid) {
      biasPoint = { lat: centroid.lat, lng: centroid.lng, radiusKm: 150 };
    } else {
      const fwd = req.headers.get("x-forwarded-for") ?? "";
      const clientIp = fwd.split(",")[0]?.trim();
      // Skip private/loopback IPs so dev requests don't waste an API call.
      const isPublic =
        clientIp &&
        !/^(10\.|192\.168\.|127\.|169\.254\.|::1|fc|fd)/i.test(clientIp);
      if (isPublic) {
        try {
          // ipapi.co — free, no key, 1000 req/day. Times out fast so the
          // autocomplete UX never stalls if the lookup is slow.
          const ctrl = new AbortController();
          const timeout = setTimeout(() => ctrl.abort(), 600);
          const geoRes = await fetch(`https://ipapi.co/${clientIp}/json/`, {
            signal: ctrl.signal,
          });
          clearTimeout(timeout);
          if (geoRes.ok) {
            const geo = (await geoRes.json()) as {
              latitude?: number;
              longitude?: number;
              city?: string;
              region?: string;
            };
            if (
              typeof geo.latitude === "number" &&
              typeof geo.longitude === "number"
            ) {
              // ~75km radius around the user's metro — tight enough to
              // suppress out-of-state matches but wide enough to catch
              // neighboring suburbs.
              biasPoint = {
                lat: geo.latitude,
                lng: geo.longitude,
                radiusKm: 75,
              };
              console.log(
                `[address-autocomplete] IP geo: ${geo.city}, ${geo.region}`,
              );
            }
          }
        } catch (geoErr) {
          // Fail silently — Google's default behavior takes over.
          console.warn("[address-autocomplete] IP geo failed:", geoErr);
        }
      }
    }

    if (biasPoint) {
      requestBody.locationBias = {
        circle: {
          center: { latitude: biasPoint.lat, longitude: biasPoint.lng },
          radius: biasPoint.radiusKm * 1000,
        },
      };
    }

    // Add session token for billing optimization
    if (sessionToken) {
      requestBody.sessionToken = sessionToken;
    }

    console.log(
      "Fetching autocomplete for:",
      input,
      regionCode ? `(bias: ${regionCode})` : biasPoint ? "(bias: IP-geo)" : "",
    );


    // Use Places API (New) endpoint
    const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (data.error) {
      console.error("Google Places API error:", data.error.message);
      throw new Error(data.error.message || "API error");
    }

    // Transform response to match expected format
    const predictions = (data.suggestions || [])
      .map((suggestion: { placePrediction?: { placeId: string; text?: { text: string } } }) => ({
        place_id: suggestion.placePrediction?.placeId,
        description: suggestion.placePrediction?.text?.text || "",
      }))
      .filter((p: { place_id?: string }) => p.place_id);

    console.log("Got", predictions.length, "predictions");

    return new Response(JSON.stringify({ predictions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Address autocomplete error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        predictions: [],
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
