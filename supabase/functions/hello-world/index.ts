console.log("Hello World function up and running!");

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
};

Deno.serve((req) => {
  const { method, url } = req;
  const urlObj = new URL(url);

  // Handle CORS preflight requests
  if (method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    // Get query parameters
    const name = urlObj.searchParams.get("name") || "World";

    // Create response data
    const responseData = {
      message: `Hello, ${name}!`,
      timestamp: new Date().toISOString(),
      method: method,
      path: urlObj.pathname,
      query: Object.fromEntries(urlObj.searchParams),
    };

    // Return JSON response
    return new Response(JSON.stringify(responseData, null, 2), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      status: 200,
    });
  } catch (error: unknown) {
    console.error("Error in hello-world function:", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 500,
      }
    );
  }
});
