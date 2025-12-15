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

    // Build the autocomplete URL
    const params = new URLSearchParams({
      input: input.trim(),
      key: apiKey,
      types: 'address',
    });

    // Add country restriction if provided
    if (country) {
      const countryCode = country === 'United States' ? 'us' : country === 'Canada' ? 'ca' : '';
      if (countryCode) {
        params.append('components', `country:${countryCode}`);
      }
    }

    // Add session token for billing optimization
    if (sessionToken) {
      params.append('sessiontoken', sessionToken);
    }

    console.log('Fetching autocomplete for:', input);

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`
    );

    const data = await response.json();
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', data.status, data.error_message);
      throw new Error(data.error_message || `API error: ${data.status}`);
    }

    console.log('Got', data.predictions?.length || 0, 'predictions');

    return new Response(JSON.stringify({ 
      predictions: data.predictions || [] 
    }), {
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
