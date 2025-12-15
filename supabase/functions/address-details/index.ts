import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { placeId, sessionToken } = await req.json();
    
    if (!placeId) {
      throw new Error('Place ID is required');
    }

    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      console.error('GOOGLE_PLACES_API_KEY not configured');
      throw new Error('Google Places API key not configured');
    }

    // Build the place details URL
    const params = new URLSearchParams({
      place_id: placeId,
      key: apiKey,
      fields: 'address_components,formatted_address',
    });

    // Add session token for billing optimization
    if (sessionToken) {
      params.append('sessiontoken', sessionToken);
    }

    console.log('Fetching place details for:', placeId);

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`
    );

    const data = await response.json();
    
    if (data.status !== 'OK') {
      console.error('Google Places API error:', data.status, data.error_message);
      throw new Error(data.error_message || `API error: ${data.status}`);
    }

    // Parse address components
    const components = data.result.address_components || [];
    const addressDetails: Record<string, string> = {
      streetNumber: '',
      route: '',
      city: '',
      state: '',
      stateShort: '',
      country: '',
      postalCode: '',
      formattedAddress: data.result.formatted_address || '',
    };

    for (const component of components) {
      const types = component.types;
      if (types.includes('street_number')) {
        addressDetails.streetNumber = component.long_name;
      } else if (types.includes('route')) {
        addressDetails.route = component.long_name;
      } else if (types.includes('locality')) {
        addressDetails.city = component.long_name;
      } else if (types.includes('sublocality_level_1') && !addressDetails.city) {
        addressDetails.city = component.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        addressDetails.state = component.long_name;
        addressDetails.stateShort = component.short_name;
      } else if (types.includes('country')) {
        addressDetails.country = component.long_name;
      } else if (types.includes('postal_code')) {
        addressDetails.postalCode = component.long_name;
      }
    }

    // Build street address
    addressDetails.streetAddress = [addressDetails.streetNumber, addressDetails.route]
      .filter(Boolean)
      .join(' ');

    console.log('Parsed address details:', addressDetails);

    return new Response(JSON.stringify({ 
      details: addressDetails 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Address details error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: null
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
