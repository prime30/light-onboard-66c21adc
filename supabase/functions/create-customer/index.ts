import { FunctionResponse } from "../../lib/types.ts";
import { corsHeaders } from "../../lib/corsHeaders.ts";
import { sendError } from "../../lib/sendError.ts";
import { validateRequestMethod } from "../../lib/validateRequestMethod.ts";
import { parseRequestBody } from "../../lib/parseRequestBody.ts";
import { registrationSchema } from "../../../src/lib/validations/auth-schemas.ts";
import z from "zod";
import { objectKeysToSnake } from "../../lib/caseConverter.ts";

// Interface for the incoming request payload
interface CustomerCreateRequest {
  action: "NEW_CUSTOMER";
  data: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

type CustomerCreateInput = {
  account_type?: string;
  business_operation_type?: string;
  first_name: string;
  last_name: string;
  email: string;
  default_address: {
    address1: string;
    address2: string;
    province: string;
    zip: string;
    country: string;
  };
};

// Interface for the Customer Fields API request
interface CustomerFieldsRequest {
  form_id: string;
  customer: CustomerCreateInput;
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

Deno.serve(async (req: Request) => {
  console.log("Customer create function called");

  // Validate request method
  const methodResponse = validateRequestMethod(req, ["POST"]);
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

  // Parse the request body
  const bodyParseResponse = await parseRequestBody<CustomerCreateRequest>(req);
  if (!bodyParseResponse.success) {
    return sendError(bodyParseResponse.statusCode || 400, bodyParseResponse.errors);
  }

  const requestBody = bodyParseResponse.data;

  // Validate the request body against the schema
  const parseResult = registrationSchema.safeParse(requestBody.data);
  if (!parseResult.success) {
    const validationErrors = z.treeifyError(parseResult.error);
    console.log("Request body validation failed:", validationErrors);
    return sendError(400, validationErrors.errors, "Invalid request data");
  }

  try {
    console.log("Processing customer sync for:", requestBody.data.email);
    const customer = objectKeysToSnake(parseResult.data);
    console.log("customer", customer);

    const customerCreateInput: CustomerCreateInput = {
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: customer.email,
      default_address: {
        address1: customer.address1 || "",
      },
      // customer: {
      //   first_name: requestBody.data.firstName,
      //   last_name: requestBody.data.lastName,
      //   email: requestBody.data.email,
      // },
    };

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
