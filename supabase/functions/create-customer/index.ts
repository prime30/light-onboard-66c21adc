import z from "zod";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
};

// Define action interface
interface ErrorAction {
  type: string;
  label: string;
  url?: string;
}

// Send error response
function sendError(
  statusCode: number,
  errors: string[],
  message?: string,
  actions?: ErrorAction[]
) {
  return new Response(
    JSON.stringify({
      success: false,
      statusCode,
      message: message || "Error",
      errorMessage: errors,
      actions: actions || [],
    }),
    {
      status: statusCode,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

// Convert camelCase to snake_case
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

// Convert object keys from camelCase to snake_case
function objectKeysToSnake<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = camelToSnake(key);
      const value = obj[key];
      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        result[snakeKey] = objectKeysToSnake(value as Record<string, unknown>);
      } else {
        result[snakeKey] = value;
      }
    }
  }
  return result;
}

// Format phone number with country code
function formatPhoneNumber(countryCode?: string, phoneNumber?: string): string | undefined {
  if (!phoneNumber) return undefined;
  const cleanPhone = phoneNumber.replace(/\D/g, "");
  if (!cleanPhone) return undefined;
  const code = countryCode?.startsWith("+") ? countryCode : `+${countryCode || "1"}`;
  return `${code}${cleanPhone}`;
}

// Inline the registration schema for edge function
const registrationSchema = z.discriminatedUnion("accountType", [
  z.object({
    accountType: z.literal("professional"),
    businessOperationType: z.enum(["commission", "independent"]),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    preferredName: z.string().nullish(),
    email: z.email(),
    phoneNumber: z.string(),
    phoneCountryCode: z.string().default("+1"),
    businessName: z.string().min(1),
    businessAddress: z.string().min(1),
    suiteNumber: z.string().nullish(),
    countryCode: z.string().min(1).default("US"),
    city: z.string().min(1),
    provinceCode: z.string().min(1),
    zipCode: z.string().min(1),
    licenseNumber: z.string().min(1),
    licenseProofFiles: z.array(z.string()).nullish().default([]),
    taxExempt: z.boolean().default(false),
    taxExemptFile: z.array(z.string()).nullish().default([]),
    wholesaleAgreed: z.literal(true),
    birthdayMonth: z.string().nullish(),
    birthdayDay: z.string().nullish(),
    socialMediaHandle: z.string().nullish(),
    subscribeOrderUpdates: z.boolean().nullish().default(false),
    acceptsMarketing: z.boolean().nullish().default(false),
  }),
  z.object({
    accountType: z.literal("salon"),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    preferredName: z.string().nullish(),
    email: z.email(),
    phoneNumber: z.string(),
    phoneCountryCode: z.string().default("+1"),
    businessName: z.string().min(1),
    businessAddress: z.string().min(1),
    suiteNumber: z.string().nullish(),
    countryCode: z.string().min(1),
    city: z.string().min(1),
    provinceCode: z.string().min(1),
    zipCode: z.string().min(1),
    salonSize: z.string().min(1),
    salonStructure: z.string().min(1),
    licenseNumber: z.string().min(1),
    licenseProofFiles: z.array(z.string()).nullish().default([]),
    taxExempt: z.boolean().default(false),
    taxExemptFile: z.array(z.string()).nullish().default([]),
    wholesaleAgreed: z.literal(true),
    birthdayMonth: z.string().nullish(),
    birthdayDay: z.string().nullish(),
    socialMediaHandle: z.string().nullish(),
    subscribeOrderUpdates: z.boolean().nullish().default(false),
    acceptsMarketing: z.boolean().nullish().default(false),
  }),
  z.object({
    accountType: z.literal("student"),
    schoolName: z.string().min(1),
    schoolState: z.string().min(1),
    enrollmentProofFiles: z.array(z.string()).min(1),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    preferredName: z.string().nullish(),
    email: z.email(),
    phoneNumber: z.string(),
    phoneCountryCode: z.string().default("+1"),
    taxExempt: z.boolean().default(false),
    taxExemptFile: z.array(z.string()).nullish().default([]),
    wholesaleAgreed: z.literal(true),
    birthdayMonth: z.string().nullish(),
    birthdayDay: z.string().nullish(),
    socialMediaHandle: z.string().nullish(),
    subscribeOrderUpdates: z.boolean().nullish().default(false),
    acceptsMarketing: z.boolean().nullish().default(false),
  }),
]);

// Interface for function response
type FunctionResponse<T> = {
  success: boolean;
  statusCode: number;
  message?: string;
  data?: T;
  errorMessage?: string[];
};

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
  referral_source?: string;
};

const defaultCustomerCreateInput: Partial<CustomerCreateInput> = {
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

// Interface for the Customer Fields Search API response
interface CustomerSearchResponse {
  customers: {
    id: string;
    shopify_id?: number;
    first_name: string;
    last_name: string;
    email: string;
    created_at: string;
    updated_at: string;
  }[];
}

// Function to search for existing customer by email
async function searchCustomerByEmail(
  email: string,
  apiKey: string
): Promise<CustomerSearchResponse | null> {
  const searchUrl = `https://app.customerfields.com/api/v2/customers/search.json?page=1&limit=1&sort_by=updated_at&sort_order=desc&email=${encodeURIComponent(email)}`;

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  try {
    console.log("Searching for existing customer with email:", email);
    const response = await fetch(searchUrl, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      console.error("Customer search API request failed:", response.status);
      return null;
    }

    const searchData: CustomerSearchResponse = await response.json();
    return searchData;
  } catch (error) {
    console.error("Error searching for customer:", error);
    return null;
  }
}

Deno.serve(async (req: Request) => {
  console.log("Customer create function called");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate request method
  if (req.method !== "POST") {
    return sendError(405, ["Method not allowed"]);
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
  let requestBody: CustomerCreateRequest;
  try {
    requestBody = await req.json();
  } catch {
    return sendError(400, ["Invalid JSON in request body"]);
  }

  // Validate the request body against the schema
  const parseResult = registrationSchema.safeParse(requestBody.data);
  if (!parseResult.success) {
    const validationErrors = parseResult.error.issues.map((e: { message: string }) => e.message);
    console.log("Request body validation failed:", validationErrors);
    return sendError(400, validationErrors);
  }

  console.log("Processing customer sync for:", requestBody.data.email);

  // First, check if customer already exists
  const existingCustomerSearch = await searchCustomerByEmail(
    requestBody.data.email,
    customerFieldsApiKey
  );

  if (existingCustomerSearch && existingCustomerSearch.customers.length > 0) {
    console.log("Customer already exists with email:", requestBody.data.email);
    return sendError(409, ["Customer already exists with this email address"], "Conflict", [
      {
        type: "LOGIN",
        label: "Go to Login",
        url: "/login",
      },
    ]);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customer = objectKeysToSnake(parseResult.data) as any;

  // Handle tax exempt files (common to all account types)
  const taxExemptFiles = Array.isArray(customer.tax_exempt_file)
    ? customer.tax_exempt_file || []
    : [customer.tax_exempt_file];
  const parseTaxExemptFiles = taxExemptFiles
    .filter(Boolean)
    .map((item: string | { url?: string }) => {
      if (typeof item === "string") return item;
      return item?.url;
    }) as string[];

  // Create base customer input with common fields
  const customerCreateInput: CustomerCreateInput = {
    ...defaultCustomerCreateInput,
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
    customerCreateInput.business_operation_type = customer.business_operation_type;

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

    customerCreateInput.license_number = customer.license_number;

    const licenseFiles = Array.isArray(customer.license_proof_files)
      ? customer.license_proof_files || []
      : [customer.license_proof_files];
    const files = licenseFiles.filter(Boolean).map((item: string | { url?: string }) => {
      if (typeof item === "string") return item;
      return item?.url;
    });
    customerCreateInput.proof_file_1 = files?.[0];
    customerCreateInput.proof_file_2 = files?.[1];
    customerCreateInput.proof_file_3 = files?.[2];
  } else if (customer.account_type === "salon") {
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

    customerCreateInput.salon_size = customer.salon_size;
    customerCreateInput.salon_structure = customer.salon_structure;
    customerCreateInput.license_number = customer.license_number;

    const licenseFiles = Array.isArray(customer.license_proof_files)
      ? customer.license_proof_files || []
      : [customer.license_proof_files];
    const files = licenseFiles.filter(Boolean).map((item: string | { url?: string }) => {
      if (typeof item === "string") return item;
      return item?.url;
    });
    customerCreateInput.proof_file_1 = files?.[0];
    customerCreateInput.proof_file_2 = files?.[1];
    customerCreateInput.proof_file_3 = files?.[2];
  } else if (customer.account_type === "student") {
    customerCreateInput.default_address = {
      phone: formatPhoneNumber(customer.phone_country_code, customer.phone_number),
    };

    customerCreateInput.school_name = customer.school_name;
    customerCreateInput.school_state = customer.school_state;

    const enrollmentFiles = Array.isArray(customer.enrollment_proof_files)
      ? customer.enrollment_proof_files || []
      : [customer.enrollment_proof_files];
    const files = enrollmentFiles.filter(Boolean).map((item: string | { url?: string }) => {
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
    console.log("Sending request to Customer Fields API...");
    const apiResponse = await fetch(customerFieldsApiUrl, {
      method: "POST",
      headers: apiHeaders,
      body: JSON.stringify(customerFieldsRequest),
    });

    const responseText = await apiResponse.text();

    if (!apiResponse.ok) {
      console.error("Customer Fields API request failed:", apiResponse.status, responseText);
      return sendError(apiResponse.status, [
        `Customer Fields API error: ${apiResponse.status} - ${responseText}`,
      ]);
    }

    let customerFieldsData: CustomerFieldsResponse;
    try {
      customerFieldsData = JSON.parse(responseText);
    } catch {
      console.error("Failed to parse Customer Fields API response:", responseText);
      return sendError(502, ["Invalid response from Customer Fields API"]);
    }

    console.log("Customer Fields API request successful:", customerFieldsData.customer.id);

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
