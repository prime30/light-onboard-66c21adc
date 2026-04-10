const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
};

function sendError(statusCode: number, errors: string[], message?: string) {
  return new Response(
    JSON.stringify({ success: false, statusCode, message: message || "Error", errorMessage: errors }),
    { status: statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

interface UpdateCustomerRequest {
  action: "UPDATE_CUSTOMER";
  helium_id: string;
  data: {
    referral_source?: string;
    [key: string]: unknown;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return sendError(405, ["Method not allowed"]);
  }

  const formId = Deno.env.get("HELIUM_PRIVATE_FORM_ID");
  const apiKey = Deno.env.get("HELIUM_PRIVATE_ACCESS_TOKEN");

  if (!formId) return sendError(500, ["Server configuration error: Missing form ID"]);
  if (!apiKey) return sendError(500, ["Server configuration error"]);

  let body: UpdateCustomerRequest;
  try {
    body = await req.json();
  } catch {
    return sendError(400, ["Invalid JSON in request body"]);
  }

  if (body.action !== "UPDATE_CUSTOMER" || !body.helium_id || !body.data) {
    return sendError(400, ["Invalid request: action, helium_id, and data are required"]);
  }

  const url = `https://app.customerfields.com/api/v2/customers/${body.helium_id}`;

  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        form_id: formId,
        customer: body.data,
      }),
    });

    const text = await response.text();

    if (!response.ok) {
      console.error("Helium update failed:", response.status, text);
      return sendError(response.status, [`Helium API error: ${response.status}`]);
    }

    return new Response(
      JSON.stringify({ success: true, statusCode: 200, data: JSON.parse(text) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error in update-customer:", err);
    return sendError(500, [err instanceof Error ? err.message : "Unknown error"]);
  }
});
