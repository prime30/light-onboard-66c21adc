// Bumped by every PR that changes this function, so a probe can tell which
// version is live (GitHub merges do not redeploy functions).
const FUNCTION_VERSION = "UK-20261124";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "X-Function-Version": FUNCTION_VERSION,
};

// Countries that write the street before the house number ("Hauptstrasse 12").
// France and Luxembourg write "12 Rue de Rivoli", like the English-speaking
// countries, so they are not listed.
const ROUTE_FIRST_COUNTRIES = new Set([
  "DE", "AT", "NL", "BE", "IT", "ES", "PT", "GR", "CY", "CZ", "SK", "PL", "HU", "HR",
  "SI", "DK", "SE", "FI", "EE", "LV", "LT", "BG", "RO", "MT",
]);

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { placeId } = await req.json();

    if (!placeId) {
      throw new Error("Place ID is required");
    }

    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!apiKey) {
      console.error("GOOGLE_PLACES_API_KEY not configured");
      throw new Error("Google Places API key not configured");
    }

    console.log("Fetching place details for:", placeId);

    // Use Places API (New) endpoint
    const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "addressComponents,formattedAddress",
      },
    });

    const data = await response.json();

    if (data.error) {
      console.error("Google Places API error:", data.error.message);
      throw new Error(data.error.message || "API error");
    }

    // Parse address components from new API format
    const components = data.addressComponents || [];
    const addressDetails: Record<string, string> = {
      streetNumber: "",
      route: "",
      city: "",
      state: "",
      stateShort: "",
      country: "",
      countryCode: "",
      postalCode: "",
      formattedAddress: data.formattedAddress || "",
    };

    for (const component of components) {
      const types = component.types || [];
      const longText = component.longText || "";
      const shortText = component.shortText || "";

      if (types.includes("street_number")) {
        addressDetails.streetNumber = longText;
      } else if (types.includes("route")) {
        addressDetails.route = longText;
      } else if (types.includes("locality")) {
        addressDetails.city = longText;
      } else if (types.includes("postal_town") && !addressDetails.city) {
        // UK addresses carry the town as postal_town and often no locality.
        addressDetails.city = longText;
      } else if (types.includes("sublocality_level_1") && !addressDetails.city) {
        addressDetails.city = longText;
      } else if (types.includes("administrative_area_level_1")) {
        addressDetails.state = longText;
        addressDetails.stateShort = shortText;
      } else if (types.includes("country")) {
        addressDetails.country = longText;
        addressDetails.countryCode = shortText.toUpperCase();
      } else if (types.includes("postal_code")) {
        addressDetails.postalCode = longText;
      }
    }

    // Build street address
    const parts = ROUTE_FIRST_COUNTRIES.has(addressDetails.countryCode)
      ? [addressDetails.route, addressDetails.streetNumber]
      : [addressDetails.streetNumber, addressDetails.route];
    addressDetails.streetAddress = parts.filter(Boolean).join(" ");

    console.log("Parsed address details:", addressDetails);

    return new Response(JSON.stringify({ details: addressDetails }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Address details error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        details: null,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
