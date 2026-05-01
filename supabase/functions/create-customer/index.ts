import z from "zod";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
};

// ------------------------------------------------------------------
// Spam prevention: disposable email blocklist (inlined for edge fn)
// ------------------------------------------------------------------
const DISPOSABLE_EMAIL_DOMAINS = new Set<string>([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "guerrillamail.org",
  "guerrillamail.biz", "guerrillamail.de", "sharklasers.com", "grr.la",
  "10minutemail.com", "10minutemail.net", "20minutemail.com", "tempmail.com",
  "temp-mail.com", "temp-mail.org", "tempmailo.com", "tempmail.net", "tempmail.plus",
  "tempmailaddress.com", "throwawaymail.com", "throwawaymail.org", "yopmail.com",
  "yopmail.fr", "yopmail.net", "trashmail.com", "trashmail.net", "trashmail.de",
  "getnada.com", "nada.email", "dispostable.com", "fakeinbox.com", "fake-mail.net",
  "maildrop.cc", "mailnesia.com", "mintemail.com", "moakt.com", "spam4.me",
  "spambox.us", "spamgourmet.com", "mvrht.com", "mytemp.email", "mohmal.com",
  "emailondeck.com", "fakemail.net", "inboxbear.com", "mailcatch.com",
  "harakirimail.com", "incognitomail.com", "jetable.org", "mailexpire.com",
  "discard.email", "discardmail.com", "trashymail.com", "tempinbox.com",
  "tempemail.net", "tempemail.co", "tempr.email", "wegwerfmail.de",
  "wegwerfmail.net", "wegwerfmail.org", "yopmail.gq", "yopmail.ml",
  "temporaryinbox.com", "temporarymailaddress.com", "throwawaymail.com",
]);

function isDisposableEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const at = email.lastIndexOf("@");
  if (at === -1) return false;
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!domain) return false;
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return true;
  const parts = domain.split(".");
  for (let i = 1; i < parts.length - 1; i++) {
    if (DISPOSABLE_EMAIL_DOMAINS.has(parts.slice(i).join("."))) return true;
  }
  return false;
}


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
const PREFERRED_METHOD_OPTIONS = [
  "SuperWeft",
  "Keratin Tips",
  "SecreTapes",
  "Volume Weft",
] as const;
const preferredMethodsSchema = z.array(z.enum(PREFERRED_METHOD_OPTIONS)).min(1);

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
    preferredMethods: preferredMethodsSchema,
    birthdayMonth: z.string().nullish(),
    birthdayDay: z.string().nullish(),
    socialMediaHandle: z.string().nullish(),
    referralSource: z.string().nullish(),
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
    preferredMethods: preferredMethodsSchema,
    birthdayMonth: z.string().nullish(),
    birthdayDay: z.string().nullish(),
    socialMediaHandle: z.string().nullish(),
    referralSource: z.string().nullish(),
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
    preferredMethods: preferredMethodsSchema,
    birthdayMonth: z.string().nullish(),
    birthdayDay: z.string().nullish(),
    socialMediaHandle: z.string().nullish(),
    referralSource: z.string().nullish(),
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
  let requestBody: CustomerCreateRequest & { honeypot?: unknown; formStartedAt?: unknown };
  try {
    requestBody = await req.json();
  } catch {
    return sendError(400, ["Invalid JSON in request body"]);
  }

  // Spam: honeypot field. Real users never see / fill it. If populated,
  // silently reject with a generic 400 (don't tip off the bot).
  const honeypotValue = (requestBody as { honeypot?: unknown }).honeypot;
  if (typeof honeypotValue === "string" && honeypotValue.trim() !== "") {
    console.log("Honeypot triggered — rejecting request");
    return sendError(400, ["Submission blocked"]);
  }

  // Spam: min-time-on-form check. A real user takes well over 3s to complete
  // a multi-step registration; bots typically POST in <1s. Reject anything
  // suspiciously fast, missing, malformed, or in the future.
  const MIN_FORM_FILL_MS = 3000;
  const formStartedAtRaw = (requestBody as { formStartedAt?: unknown }).formStartedAt;
  const formStartedAt = typeof formStartedAtRaw === "number" ? formStartedAtRaw : NaN;
  const elapsed = Date.now() - formStartedAt;
  if (!Number.isFinite(formStartedAt) || elapsed < MIN_FORM_FILL_MS || elapsed < 0) {
    console.log("Form-fill timing check failed — rejecting request", { elapsed, formStartedAt });
    return sendError(400, ["Submission blocked"]);
  }

  // Validate the request body against the schema
  const parseResult = registrationSchema.safeParse(requestBody.data);
  if (!parseResult.success) {
    const validationErrors = parseResult.error.issues.map((e: { message: string }) => e.message);
    console.log("Request body validation failed:", validationErrors);
    return sendError(400, validationErrors);
  }

  // Spam: disposable email blocklist. Belt-and-braces server check
  // (client also enforces this, but never trust the client).
  if (isDisposableEmail(parseResult.data.email)) {
    console.log("Disposable email rejected:", parseResult.data.email);
    return sendError(400, [
      "Please use a permanent email address — disposable inboxes aren't accepted",
    ]);
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
    referral_source: customer.referral_source,
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

    // Tag Shopify customer with "Preferred method: X" for each selected method,
    // plus any admin-configured extra tags from app_settings. Fire-and-forget —
    // failures here must not block account creation.
    const shopifyCustomerId = customerFieldsData.customer.shopify_id;
    const preferredMethods = (parseResult.data as { preferredMethods?: string[] }).preferredMethods;

    // Load admin-configured extra tags (best-effort).
    let extraAdminTags: string[] = [];
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrl && serviceRoleKey) {
        const tagsRes = await fetch(
          `${supabaseUrl}/rest/v1/app_settings?singleton=eq.true&select=extra_customer_tags`,
          {
            headers: {
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
            },
          }
        );
        if (tagsRes.ok) {
          const rows = (await tagsRes.json()) as Array<{ extra_customer_tags?: string[] }>;
          const arr = rows?.[0]?.extra_customer_tags;
          if (Array.isArray(arr)) {
            extraAdminTags = arr
              .filter((t): t is string => typeof t === "string")
              .map((t) => t.trim().replace(/,/g, " "))
              .filter(Boolean);
          }
        } else {
          console.warn("Could not fetch admin extra tags:", tagsRes.status);
        }
      }
    } catch (e) {
      console.warn("Error loading admin extra tags (non-blocking):", e);
    }

    const preferredMethodTags = (preferredMethods ?? []).map((m) => `Preferred method: ${m}`);

    const accountTypeLabelMap: Record<string, string> = {
      professional: "Licensed stylist",
      salon: "Salon owner or manager",
      student: "Cosmetology student or apprentice",
    };
    const accountTypeTags: string[] = [];
    if (customer.account_type) {
      const label = accountTypeLabelMap[customer.account_type] ?? customer.account_type;
      accountTypeTags.push(`Account type: ${label}`);
    }

    const taxExemptFlag = customer.tax_exempt === true;
    if (taxExemptFlag) {
      accountTypeTags.push("Tax exempt");
    }

    const newTags = [...accountTypeTags, ...preferredMethodTags, ...extraAdminTags];

    const needsShopifyUpdate = !!shopifyCustomerId && (newTags.length > 0 || taxExemptFlag);

    if (needsShopifyUpdate) {
      const shopifyDomain = Deno.env.get("SHOPIFY_STORE_DOMAIN");
      const shopifyAdminToken = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN");
      if (shopifyDomain && shopifyAdminToken) {
        try {
          // Fetch existing tags to merge
          let existingTags: string[] = [];
          if (newTags.length > 0) {
            const getRes = await fetch(
              `https://${shopifyDomain}/admin/api/2024-10/customers/${shopifyCustomerId}.json`,
              {
                method: "GET",
                headers: {
                  "X-Shopify-Access-Token": shopifyAdminToken,
                  "Content-Type": "application/json",
                },
              }
            );
            if (getRes.ok) {
              const existing = await getRes.json();
              const tagStr: string = existing?.customer?.tags ?? "";
              existingTags = tagStr
                .split(",")
                .map((t: string) => t.trim())
                .filter(Boolean);
            } else {
              console.warn("Could not fetch existing Shopify tags:", getRes.status);
            }
          }

          const mergedTags = Array.from(new Set([...existingTags, ...newTags]));

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const customerUpdate: Record<string, any> = { id: shopifyCustomerId };
          if (newTags.length > 0) customerUpdate.tags = mergedTags.join(", ");
          if (taxExemptFlag) customerUpdate.tax_exempt = true;

          const updRes = await fetch(
            `https://${shopifyDomain}/admin/api/2024-10/customers/${shopifyCustomerId}.json`,
            {
              method: "PUT",
              headers: {
                "X-Shopify-Access-Token": shopifyAdminToken,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ customer: customerUpdate }),
            }
          );

          if (!updRes.ok) {
            const errText = await updRes.text();
            console.warn("Failed to update Shopify customer:", updRes.status, errText);
          } else {
            console.log("Updated Shopify customer:", {
              tags: newTags,
              taxExempt: taxExemptFlag,
            });
          }
        } catch (updErr) {
          console.warn("Error updating Shopify customer (non-blocking):", updErr);
        }
      } else {
        console.warn("SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN not set; skipping update");
      }
    }

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
