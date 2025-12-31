import z from "zod";
import { FunctionResponse } from "../../lib/types.ts";
import { corsHeaders } from "../../lib/corsHeaders.ts";
import { sendError } from "../../lib/sendError.ts";
import { validateRequestMethod } from "../../lib/validateRequestMethod.ts";
import { parseRequestBody } from "../../lib/parseRequestBody.ts";
import { registrationSchema } from "../../../src/lib/validations/auth-schemas.ts";
import { objectKeysToSnake } from "../../lib/caseConverter.ts";
import { formatPhoneNumber } from "../../lib/phoneUtils.ts";

// Interface for the incoming request payload
interface CustomerCreateRequest {
  action: "CREATE_CUSTOMER";
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
  preferred_name?: string;
  email: string;
  default_address: {
    company?: string;
    address1?: string;
    address2?: string;
    city?: string;
    province_code?: string;
    zip?: string;
    country_code?: string;
    phone?: string;
  };
  school_name?: string;
  school_state?: string;
  proof_file_1?: string;
  proof_file_2?: string;
  proof_file_3?: string;
  license_number?: string;
  salon_size?: string;
  salon_structure?: string;
  tax_exempt?: boolean;
  tax_exempt_file?: string;
  birthday_month?: number;
  birthday_day?: number;
  wholesale_agreed?: boolean;
  accepts_marketing?: boolean;
  subscribe_order_updates?: boolean;
  social_media_handle?: string;
};

const defaultCusomterCreateInput: Partial<CustomerCreateInput> = {
  accepts_marketing: false,
  subscribe_order_updates: false,
  tax_exempt: false,
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

  if (!customerFieldsApiKey) {
    console.error("HELIUM_PRIVATE_ACCESS_TOKEN environment variable is not set");
    return sendError(500, ["Server configuration error"]);
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

  console.log("Processing customer sync for:", requestBody.data.email);
  const customer = objectKeysToSnake(parseResult.data);

  // Handle tax exempt files (common to all account types)
  const taxExemptFiles = Array.isArray(customer.tax_exempt_file)
    ? customer.tax_exempt_file || []
    : [customer.tax_exempt_file];
  const parseTaxExemptFiles = taxExemptFiles.filter(Boolean).map((item) => {
    if (typeof item === "string") return item;
    return item?.url;
  }) as string[];

  // Create base customer input with common fields
  const customerCreateInput: CustomerCreateInput = {
    ...defaultCusomterCreateInput,
    account_type: customer.account_type,
    first_name: customer.first_name,
    last_name: customer.last_name,
    preferred_name: customer.preferred_name,
    email: customer.email,
    default_address: {},
    tax_exempt: customer.tax_exempt || false,
    tax_exempt_file: parseTaxExemptFiles?.[0],
    birthday_month: customer.birthday_month ? parseInt(customer.birthday_month) : undefined,
    birthday_day: customer.birthday_day ? parseInt(customer.birthday_day) : undefined,
    wholesale_agreed: customer.wholesale_agreed || false,
    accepts_marketing: customer.accepts_marketing,
    subscribe_order_updates: customer.subscribe_order_updates,
    social_media_handle: customer.social_media_handle,
  };

  // Handle account-type specific fields with type narrowing
  if (customer.account_type === "professional") {
    // TypeScript now knows this is a professional account
    customerCreateInput.business_operation_type = customer.business_operation_type;

    // Handle business location fields for professionals
    customerCreateInput.default_address = {
      company: customer.business_name,
      address1: customer.business_address,
      address2: customer.suite_number,
      city: customer.city,
      province_code: customer.province_code,
      zip: customer.zip_code,
      country_code: customer.country_code,
      phone: formatPhoneNumber(customer.phone_country_code, customer.phone_number),
    };

    // Handle license fields for professionals
    customerCreateInput.license_number = customer.license_number;

    // Handle license proof files for professionals
    const licenseFiles = Array.isArray(customer.license_proof_files)
      ? customer.license_proof_files || []
      : [customer.license_proof_files];
    const files = licenseFiles.filter(Boolean).map((item) => {
      if (typeof item === "string") return item;
      return item?.url;
    });
    customerCreateInput.proof_file_1 = files?.[0];
    customerCreateInput.proof_file_2 = files?.[1];
    customerCreateInput.proof_file_3 = files?.[2];
  } else if (customer.account_type === "salon") {
    // Handle business location fields for salons
    customerCreateInput.default_address = {
      company: customer.business_name,
      address1: customer.business_address,
      address2: customer.suite_number,
      city: customer.city,
      province_code: customer.province_code,
      zip: customer.zip_code,
      country_code: customer.country_code,
      phone: formatPhoneNumber(customer.phone_country_code, customer.phone_number),
    };

    // Handle salon-specific fields
    customerCreateInput.salon_size = customer.salon_size;
    customerCreateInput.salon_structure = customer.salon_structure;
    customerCreateInput.license_number = customer.license_number;

    // Handle license proof files for salons
    const licenseFiles = Array.isArray(customer.license_proof_files)
      ? customer.license_proof_files || []
      : [customer.license_proof_files];
    const files = licenseFiles.filter(Boolean).map((item) => {
      if (typeof item === "string") return item;
      return item?.url;
    });
    customerCreateInput.proof_file_1 = files?.[0];
    customerCreateInput.proof_file_2 = files?.[1];
    customerCreateInput.proof_file_3 = files?.[2];
  } else if (customer.account_type === "student") {
    // Handle student-specific fields
    customerCreateInput.school_name = customer.school_name;
    customerCreateInput.school_state = customer.school_state;

    // Handle enrollment proof files for students
    const enrollmentFiles = Array.isArray(customer.enrollment_proof_files)
      ? customer.enrollment_proof_files || []
      : [customer.enrollment_proof_files];
    const files = enrollmentFiles.filter(Boolean).map((item) => {
      if (typeof item === "string") return item;
      return item?.url;
    });
    customerCreateInput.proof_file_1 = files?.[0];
    customerCreateInput.proof_file_2 = files?.[1];
    customerCreateInput.proof_file_3 = files?.[2];
  }

  // Prepare the Customer Fields API request
  const customerFieldsRequest: CustomerFieldsRequest = {
    form_id: customerFieldsFormId,
    customer: customerCreateInput,
  };

  // Prepare headers for the Customer Fields API request
  const apiHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${customerFieldsApiKey}`,
  };

  try {
    // Make the API request to Customer Fields
    console.log("Sending request to Customer Fields API...");
    const apiResponse = await fetch(customerFieldsApiUrl, {
      method: "POST",
      headers: apiHeaders,
      body: JSON.stringify(customerFieldsRequest),
    });

    const responseText = await apiResponse.text();

    // Check if the API request was successful
    if (!apiResponse.ok) {
      console.error("Customer Fields API request failed:", apiResponse.status, responseText);
      return sendError(apiResponse.status, [
        `Customer Fields API error: ${apiResponse.status} - ${responseText}`,
      ]);
    }

    // Try to parse the response
    let customerFieldsData: CustomerFieldsResponse;
    try {
      customerFieldsData = JSON.parse(responseText);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_parseError) {
      console.error("Failed to parse Customer Fields API response:", responseText);
      return sendError(502, ["Invalid response from Customer Fields API"]);
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
