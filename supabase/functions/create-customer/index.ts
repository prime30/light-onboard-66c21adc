import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { FunctionResponse } from "../../lib/types.ts";
import { corsHeaders } from "../../lib/corsHeaders.ts";
import { sendError } from "../../lib/sendError.ts";

type IsOk<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      errors: string[];
      statusCode?: number;
    };

// Interface for the incoming request payload
interface CustomerSyncRequest {
  action: "NEW_CUSTOMER";
  data: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

// Interface for the Customer Fields API request
interface CustomerFieldsRequest {
  form_id: string;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

// Interface for the Customer Fields API response
interface CustomerFieldsResponse {
  customer: {
    id: string;
    shopify_id?: number;
    first_name: string;
    last_name: string;
    email: string;
  };
}

function validateRequestMethod(req: Request): Response | null {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    return sendError(405, ["Method not allowed. Only POST requests are accepted."]);
  }

  return null;
}

async function parseRequestBody(req: Request): Promise<IsOk<CustomerSyncRequest>> {
  // Parse the request body
  try {
    const requestBody = await req.json();
    return {
      success: true,
      data: requestBody,
    };
  } catch (parseError) {
    console.error("Failed to parse request body:", parseError);
    return {
      success: false,
      errors: ["Invalid JSON in request body"],
      statusCode: 400,
    };
  }
}

serve(async (req: Request) => {
  console.log("Customer create function called");

  const methodResponse = validateRequestMethod(req);
  if (methodResponse) {
    return methodResponse;
  }

  // Get environment variables for Customer Fields API
  const customerFieldsApiUrl = "https://app.customerfields.com/api/v2/customers";
  const customerFieldsFormId = Deno.env.get("HELIUM_PRIVATE_FORM_ID");
  const customerFieldsApiKey = Deno.env.get("HELIUM_PRIVATE_ACCESS_TOKEN");

  // Validate required environment variables
  if (!customerFieldsFormId) {
    console.error("HELIUM_PRIVATE_FORM_ID environment variable is not set");
    return sendError(500, ["Server configuration error: Missing form ID"]);
  }

  const bodyParseResponse = await parseRequestBody(req);
  if (!bodyParseResponse.success) {
    return sendError(bodyParseResponse.statusCode || 400, bodyParseResponse.errors);
  }

  const requestBody = bodyParseResponse.data;

  // TODO: Validate request body schema

  try {
    // // Validate the request structure
    // if (!requestBody.action || requestBody.action !== "NEW_CUSTOMER") {
    //   return sendError(400, ["Invalid action. Expected 'NEW_CUSTOMER'"]);
    // }

    // if (
    //   !requestBody.data ||
    //   !requestBody.data.firstName ||
    //   !requestBody.data.lastName ||
    //   !requestBody.data.email
    // ) {
    //   return sendError(400, [
    //     "Missing required customer data. Expected firstName, lastName, and email",
    //   ]);
    // }

    console.log("Processing customer sync for:", requestBody.data.email);

    // Prepare the Customer Fields API request
    const customerFieldsRequest = {
      form_id: customerFieldsFormId,
      customer: requestBody.data,
      // customer: {
      //   first_name: requestBody.data.firstName,
      //   last_name: requestBody.data.lastName,
      //   email: requestBody.data.email,
      // },
    };
    console.log(customerFieldsRequest);

    // Return success response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const testResponse: FunctionResponse<any> = {
      success: true,
      data: customerFieldsRequest,
      statusCode: 200,
    };

    return new Response(JSON.stringify(testResponse), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    // Prepare headers for the Customer Fields API request
    const apiHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    // Add API key to headers if available
    if (customerFieldsApiKey) {
      apiHeaders["Authorization"] = `Bearer ${customerFieldsApiKey}`;
    }

    // Make the API request to Customer Fields
    console.log("Sending request to Customer Fields API...");
    const apiResponse = await fetch(customerFieldsApiUrl, {
      method: "POST",
      headers: apiHeaders,
      body: JSON.stringify(customerFieldsRequest),
    });

    const responseText = await apiResponse.text();
    console.log(responseText);
    let customerFieldsData: CustomerFieldsResponse;

    // Try to parse the response
    try {
      customerFieldsData = JSON.parse(responseText);
    } catch (_parseError) {
      console.error("Failed to parse Customer Fields API response:", responseText);
      return sendError(502, ["Invalid response from Customer Fields API"]);
    }

    // Check if the API request was successful
    if (!apiResponse.ok) {
      console.error("Customer Fields API request failed:", apiResponse.status, responseText);
      return sendError(apiResponse.status, [
        `Customer Fields API error: ${apiResponse.status} - ${responseText}`,
      ]);
    }

    console.log("Customer Fields API request successful:", customerFieldsData.customer.id);

    // Return success response
    const response: FunctionResponse<CustomerFieldsResponse> = {
      success: true,
      data: customerFieldsData,
      statusCode: 200,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error in customer sync function:", error);
    return sendError(500, [
      error instanceof Error ? error.message : "Unknown internal server error",
    ]);
  }
});
