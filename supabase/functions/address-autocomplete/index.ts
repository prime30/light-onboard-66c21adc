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
    const { input, sessionToken, country } = await req.json();
    
    if (!input || input.trim().length < 2) {
      return new Response(JSON.stringify({ predictions: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      console.error('GOOGLE_PLACES_API_KEY not configured');
      throw new Error('Google Places API key not configured');
    }

    // Build request body for Places API (New)
    const requestBody: Record<string, unknown> = {
      input: input.trim(),
      includedPrimaryTypes: ['street_address', 'premise', 'subpremise'],
    };

    // Add country restriction if provided
    if (country) {
      const countryCode = country === 'United States' ? 'US' : country === 'Canada' ? 'CA' : '';
      if (countryCode) {
        requestBody.includedRegionCodes = [countryCode];
      }
    }

    // Add session token for billing optimization
    if (sessionToken) {
      requestBody.sessionToken = sessionToken;
    }

    console.log('Fetching autocomplete for:', input);

    // Use Places API (New) endpoint
    const response = await fetch(
      'https://places.googleapis.com/v1/places:autocomplete',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
        },
        body: JSON.stringify(requestBody),
      }
    );

    const data = await response.json();
    
    if (data.error) {
      console.error('Google Places API error:', data.error.message);
      throw new Error(data.error.message || 'API error');
    }

    // Transform response to match expected format
    const predictions = (data.suggestions || []).map((suggestion: { placePrediction?: { placeId: string; text?: { text: string } } }) => ({
      place_id: suggestion.placePrediction?.placeId,
      description: suggestion.placePrediction?.text?.text || '',
    })).filter((p: { place_id?: string }) => p.place_id);

    console.log('Got', predictions.length, 'predictions');

    return new Response(JSON.stringify({ predictions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Address autocomplete error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      predictions: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
