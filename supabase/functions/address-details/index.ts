import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
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
      } else if (types.includes("sublocality_level_1") && !addressDetails.city) {
        addressDetails.city = longText;
      } else if (types.includes("administrative_area_level_1")) {
        addressDetails.state = longText;
        addressDetails.stateShort = shortText;
      } else if (types.includes("country")) {
        addressDetails.country = longText;
      } else if (types.includes("postal_code")) {
        addressDetails.postalCode = longText;
      }
    }

    // Build street address
    addressDetails.streetAddress = [addressDetails.streetNumber, addressDetails.route]
      .filter(Boolean)
      .join(" ");

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
