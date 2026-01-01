console.log("Hello World function up and running!");
import { hello, corsHeaders } from "../../lib/index.ts";

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
      message: `Hello, ${hello}!`,
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
