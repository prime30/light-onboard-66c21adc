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
    acceptsSmsMarketing: z.boolean().nullish().default(false),
    password: z.string().min(8).optional(),
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
    acceptsSmsMarketing: z.boolean().nullish().default(false),
    password: z.string().min(8).optional(),
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
    acceptsSmsMarketing: z.boolean().nullish().default(false),
    password: z.string().min(8).optional(),
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
  accepts_sms_marketing?: boolean;
  subscribe_order_updates?: boolean;
  social_media_handle?: string;
  referral_source?: string;
};

const defaultCustomerCreateInput: Partial<CustomerCreateInput> = {
  accepts_marketing: false,
  accepts_sms_marketing: false,
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

  const existingCustomer = existingCustomerSearch?.customers?.[0];
  const existingCustomerId = existingCustomer?.id;
  const existingShopifyId = existingCustomer?.shopify_id;

  // If a customer already exists, decide whether to soft-merge or block.
  // We treat the presence of an "Account type:" Shopify tag as proof the
  // customer has already completed a B2B application. Anything else
  // (e.g. an order-only customer, or a Klaviyo-synced support contact)
  // is fair game to soft-merge: we PUT the new application data onto
  // the existing record instead of creating a duplicate.
  if (existingCustomer) {
    let alreadyApplied = false;
    if (existingShopifyId) {
      const shopifyDomain = Deno.env.get("SHOPIFY_STORE_DOMAIN");
      const shopifyAdminToken = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN");
      if (shopifyDomain && shopifyAdminToken) {
        try {
          const tagRes = await fetch(
            `https://${shopifyDomain}/admin/api/2024-10/customers/${existingShopifyId}.json`,
            {
              method: "GET",
              headers: {
                "X-Shopify-Access-Token": shopifyAdminToken,
                "Content-Type": "application/json",
              },
            }
          );
          if (tagRes.ok) {
            const json = await tagRes.json();
            const tagStr: string = json?.customer?.tags ?? "";
            alreadyApplied = tagStr
              .split(",")
              .map((t: string) => t.trim())
              .some((t: string) => /^account type:/i.test(t));
          } else {
            console.warn("Could not fetch Shopify tags for soft-merge check:", tagRes.status);
            // Fail closed — if we can't tell, keep prior behavior and block
            // so we never silently overwrite a legit prior application.
            alreadyApplied = true;
          }
        } catch (e) {
          console.warn("Error checking Shopify tags for soft-merge (failing closed):", e);
          alreadyApplied = true;
        }
      }
    }

    if (alreadyApplied) {
      console.log("Existing customer has prior application — blocking:", requestBody.data.email);
      return sendError(409, ["Customer already exists with this email address"], "Conflict", [
        {
          type: "LOGIN",
          label: "Go to Login",
          url: "/login",
        },
      ]);
    }

    console.log(
      "Existing un-applied customer found — soft-merging application onto:",
      existingCustomerId
    );
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
    accepts_sms_marketing: customer.accepts_sms_marketing,
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
    const isSoftMerge = !!existingCustomerId;
    const targetUrl = isSoftMerge
      ? `${customerFieldsApiUrl}/${existingCustomerId}.json`
      : customerFieldsApiUrl;
    const targetMethod = isSoftMerge ? "PUT" : "POST";
    console.log(
      `Sending ${targetMethod} to Customer Fields API (${isSoftMerge ? "soft-merge" : "create"})...`
    );
    const apiResponse = await fetch(targetUrl, {
      method: targetMethod,
      headers: apiHeaders,
      body: JSON.stringify(customerFieldsRequest),
    });

    const responseText = await apiResponse.text();

    if (!apiResponse.ok) {
      // Log full upstream detail server-side only; never echo raw API
      // response back to the client (may leak internals/stack traces).
      console.error("Customer Fields API request failed:", apiResponse.status, responseText);
      const safeStatus = apiResponse.status >= 400 && apiResponse.status < 500 ? 400 : 502;
      return sendError(safeStatus, [
        "We couldn't complete your registration right now. Please try again in a moment.",
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
    let shopifyCustomerId: number | undefined = customerFieldsData.customer.shopify_id;
    const preferredMethods = (parseResult.data as { preferredMethods?: string[] }).preferredMethods;

    const shopifyDomain = Deno.env.get("SHOPIFY_STORE_DOMAIN");
    const shopifyAdminToken = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN");

    // Fallback: if Helium didn't return a shopify_id (race / async link),
    // resolve it via Shopify Admin search by email so we still get tags and
    // native fields written.
    if (!shopifyCustomerId && shopifyDomain && shopifyAdminToken) {
      try {
        const searchRes = await fetch(
          `https://${shopifyDomain}/admin/api/2024-10/customers/search.json?query=${encodeURIComponent(`email:${customer.email}`)}`,
          {
            method: "GET",
            headers: {
              "X-Shopify-Access-Token": shopifyAdminToken,
              "Content-Type": "application/json",
            },
          }
        );
        if (searchRes.ok) {
          const sjson = await searchRes.json();
          const sid = sjson?.customers?.[0]?.id;
          if (typeof sid === "number") {
            shopifyCustomerId = sid;
            console.log("Resolved shopify_id via email fallback:", sid);
          }
        } else {
          console.warn("Shopify email-fallback search failed:", searchRes.status);
        }
      } catch (e) {
        console.warn("Error in Shopify email-fallback search (non-blocking):", e);
      }
    }

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

    // Marketing consent — email and SMS are tracked separately for TCPA / GDPR
    // compliance. Each channel needs its own explicit opt-in checkbox in the UI;
    // we never derive one from the other.
    const acceptsEmailMarketingFlag = customer.accepts_marketing === true;
    const acceptsSmsMarketingFlag = customer.accepts_sms_marketing === true;
    const customerPhone = formatPhoneNumber(
      customer.phone_country_code,
      customer.phone_number
    );
    const canCollectSms = acceptsSmsMarketingFlag && !!customerPhone;
    const consentTimestamp = new Date().toISOString();

    // Build a human-readable note summarizing the application — lands in
    // the native Shopify customer `note` field so support can see context
    // without opening Helium.
    const noteLines: string[] = [];
    if (customer.account_type) {
      const label = accountTypeLabelMap[customer.account_type] ?? customer.account_type;
      noteLines.push(`Account type: ${label}`);
    }
    if (customer.business_name) noteLines.push(`Business: ${customer.business_name}`);
    if (customer.license_number) noteLines.push(`License #: ${customer.license_number}`);
    if (customer.salon_size) noteLines.push(`Salon size: ${customer.salon_size}`);
    if (customer.salon_structure) noteLines.push(`Salon structure: ${customer.salon_structure}`);
    if (customer.school_name) noteLines.push(`School: ${customer.school_name}`);
    if (customer.school_state) noteLines.push(`School state: ${customer.school_state}`);
    if (customer.referral_source) noteLines.push(`Referral: ${customer.referral_source}`);
    if (customer.social_media_handle) noteLines.push(`Social: ${customer.social_media_handle}`);
    const applicationNote = noteLines.length
      ? `Application submitted ${consentTimestamp}\n${noteLines.join("\n")}`
      : "";

    // Native fields we always want mirrored onto the Shopify customer record,
    // so they're populated regardless of Helium field-mapping configuration.
    const hasNativeAddress = !!(
      customer.business_address ||
      customer.city ||
      customer.province_code ||
      customer.zip_code ||
      customer.country_code
    );

    const needsShopifyUpdate =
      !!shopifyCustomerId &&
      (newTags.length > 0 ||
        taxExemptFlag ||
        acceptsEmailMarketingFlag ||
        canCollectSms ||
        !!customer.first_name ||
        !!customer.last_name ||
        !!customerPhone ||
        !!applicationNote ||
        hasNativeAddress);


    if (needsShopifyUpdate) {
      if (shopifyDomain && shopifyAdminToken) {
        try {
          // Fetch existing customer to merge tags and detect whether a
          // default_address already exists (avoid clobbering it).
          let existingTags: string[] = [];
          let existingHasDefaultAddress = false;
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
            existingHasDefaultAddress = !!existing?.customer?.default_address?.address1;
          } else {
            console.warn("Could not fetch existing Shopify customer:", getRes.status);
          }

          const mergedTags = Array.from(new Set([...existingTags, ...newTags]));

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const customerUpdate: Record<string, any> = { id: shopifyCustomerId };

          // Native identity fields — always mirror so the Shopify record
          // isn't blank regardless of Helium field-mapping config.
          if (customer.first_name) customerUpdate.first_name = customer.first_name;
          if (customer.last_name) customerUpdate.last_name = customer.last_name;
          if (customerPhone) customerUpdate.phone = customerPhone;
          if (applicationNote) customerUpdate.note = applicationNote;

          if (newTags.length > 0) customerUpdate.tags = mergedTags.join(", ");
          if (taxExemptFlag) customerUpdate.tax_exempt = true;

          // Native default address — only set if the customer doesn't
          // already have one (don't overwrite a customer-edited address).
          if (hasNativeAddress && !existingHasDefaultAddress) {
            customerUpdate.addresses = [
              {
                first_name: customer.first_name,
                last_name: customer.last_name,
                company: customer.business_name,
                address1: customer.business_address,
                address2: customer.suite_number,
                city: customer.city,
                province_code: customer.province_code,
                zip: customer.zip_code,
                country_code: customer.country_code,
                phone: customerPhone,
                default: true,
              },
            ];
          }

          // Email marketing — independent of SMS
          if (acceptsEmailMarketingFlag) {
            customerUpdate.email_marketing_consent = {
              state: "subscribed",
              opt_in_level: "single_opt_in",
              consent_updated_at: consentTimestamp,
            };
          }

          // SMS marketing — requires its own opt-in AND a valid E.164 phone.
          if (canCollectSms) {
            customerUpdate.phone = customerPhone;
            customerUpdate.sms_marketing_consent = {
              state: "subscribed",
              opt_in_level: "single_opt_in",
              consent_updated_at: consentTimestamp,
              consent_collected_from: "OTHER",
            };
          }

          const putCustomer = async (payload: Record<string, unknown>) =>
            fetch(
              `https://${shopifyDomain}/admin/api/2024-10/customers/${shopifyCustomerId}.json`,
              {
                method: "PUT",
                headers: {
                  "X-Shopify-Access-Token": shopifyAdminToken,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ customer: payload }),
              }
            );

          let updRes = await putCustomer(customerUpdate);
          let updResBodyText = "";

          if (!updRes.ok) {
            updResBodyText = await updRes.text();
            // Shopify rejects the whole PUT if any single field is invalid
            // (commonly `phone` — bad NANP area code, duplicate, etc.). Retry
            // without phone/SMS so tags/note/tax_exempt/address still land.
            const phoneRejected =
              updRes.status === 422 && /"phone"/i.test(updResBodyText);
            if (phoneRejected && ("phone" in customerUpdate || "sms_marketing_consent" in customerUpdate)) {
              console.warn(
                "Shopify rejected phone on customer update; retrying without phone/SMS:",
                updResBodyText
              );
              const { phone: _p, sms_marketing_consent: _s, ...retryPayload } = customerUpdate;
              updRes = await putCustomer(retryPayload);
              if (!updRes.ok) {
                updResBodyText = await updRes.text();
              }
            }
          }

          if (!updRes.ok) {
            console.warn("Failed to update Shopify customer:", updRes.status, updResBodyText);
          } else {
            console.log("Updated Shopify customer:", {
              shopifyCustomerId,
              fields: Object.keys(customerUpdate).filter((k) => k !== "id"),
              tags: newTags,
            });
          }

        } catch (updErr) {
          console.warn("Error updating Shopify customer (non-blocking):", updErr);
        }
      } else {
        console.warn("SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN not set; skipping update");
      }
    }


    // ----------------------------------------------------------------
    // Proof-of-consent log — TCPA / GDPR. Writes one row per channel the
    // user opted into so we can later prove (a) they ticked the box,
    // (b) when, (c) from what IP/UA, (d) what disclosure text they saw.
    // Best-effort: failures here are logged but do NOT block the response.
    // ----------------------------------------------------------------
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

      if (supabaseUrl && serviceRoleKey && (acceptsEmailMarketingFlag || canCollectSms)) {
        const ipAddress =
          req.headers.get("cf-connecting-ip") ??
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          null;
        const userAgent = req.headers.get("user-agent") ?? null;
        const sourceUrl = req.headers.get("origin") ?? req.headers.get("referer") ?? null;

        const EMAIL_DISCLOSURE =
          "Email me about promotions, new products & deals — Marketing emails from Drop Dead Extensions. Unsubscribe anytime.";
        const SMS_DISCLOSURE =
          "By checking this box, you agree to receive recurring automated marketing text messages (cart reminders, new drops, restocks) from Drop Dead Extensions at the phone number you provided. Consent is not a condition of purchase. Msg frequency varies. Msg & data rates may apply. Reply STOP to cancel, HELP for help.";

        const consentRows: Array<Record<string, unknown>> = [];
        if (acceptsEmailMarketingFlag) {
          consentRows.push({
            shopify_customer_id: shopifyCustomerId ? String(shopifyCustomerId) : null,
            email: customer.email ?? null,
            phone_e164: null,
            channel: "email",
            granted: true,
            opt_in_level: "single_opt_in",
            disclosure_text: EMAIL_DISCLOSURE,
            source_url: sourceUrl,
            ip_address: ipAddress,
            user_agent: userAgent,
          });
        }
        if (canCollectSms) {
          consentRows.push({
            shopify_customer_id: shopifyCustomerId ? String(shopifyCustomerId) : null,
            email: customer.email ?? null,
            phone_e164: customerPhone,
            channel: "sms",
            granted: true,
            opt_in_level: "single_opt_in",
            disclosure_text: SMS_DISCLOSURE,
            source_url: sourceUrl,
            ip_address: ipAddress,
            user_agent: userAgent,
          });
        }

        if (consentRows.length > 0) {
          const logRes = await fetch(
            `${supabaseUrl}/rest/v1/marketing_consent_log`,
            {
              method: "POST",
              headers: {
                apikey: serviceRoleKey,
                Authorization: `Bearer ${serviceRoleKey}`,
                "Content-Type": "application/json",
                Prefer: "return=minimal",
              },
              body: JSON.stringify(consentRows),
            }
          );
          if (!logRes.ok) {
            console.warn(
              "Failed to write marketing_consent_log:",
              logRes.status,
              await logRes.text()
            );
          } else {
            console.log("Logged marketing consent:", {
              channels: consentRows.map((r) => r.channel),
            });
          }
        }
      }
    } catch (logErr) {
      console.warn("Error writing marketing consent log (non-blocking):", logErr);
    }



    // ----------------------------------------------------------------
    // Auto-approval: if a password was sent AND the admin has flipped
    // auto_approval_enabled = true, activate the Shopify customer
    // server-side so they can sign in immediately. Without this the
    // Shopify customer stays in "invited" state and Helium shows
    // "Account not active". Failures here are logged but do NOT block
    // the success response — the user still has a registered account
    // and can be activated later via the standard invite flow.
    // ----------------------------------------------------------------
    const submittedPassword = (parseResult.data as { password?: string }).password;
    if (submittedPassword && shopifyCustomerId) {
      try {
        let autoApprovalEnabled = false;
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (supabaseUrl && serviceRoleKey) {
          const settingsRes = await fetch(
            `${supabaseUrl}/rest/v1/app_settings?singleton=eq.true&select=auto_approval_enabled`,
            {
              headers: {
                apikey: serviceRoleKey,
                Authorization: `Bearer ${serviceRoleKey}`,
              },
            }
          );
          if (settingsRes.ok) {
            const rows = (await settingsRes.json()) as Array<{ auto_approval_enabled?: boolean }>;
            autoApprovalEnabled = rows?.[0]?.auto_approval_enabled === true;
          }
        }

        if (autoApprovalEnabled) {
          const shopifyDomain = Deno.env.get("SHOPIFY_STORE_DOMAIN");
          const shopifyAdminToken = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN");
          if (shopifyDomain && shopifyAdminToken) {
            // Step 1: ask Shopify Admin API for the activation URL.
            const urlRes = await fetch(
              `https://${shopifyDomain}/admin/api/2024-10/customers/${shopifyCustomerId}/account_activation_url.json`,
              {
                method: "POST",
                headers: {
                  "X-Shopify-Access-Token": shopifyAdminToken,
                  "Content-Type": "application/json",
                },
              }
            );

            // Track whether activation succeeded; if not, on a soft-merge
            // (where the customer may already be enabled with a prior
            // password from support/Klaviyo) we fall back to a Storefront
            // customerRecover so they get a reset link by email and can
            // claim the account themselves.
            let activated = false;
            let activationStatusForFallback = 0;

            if (urlRes.ok) {
              const json = await urlRes.json();
              const activationUrl: string | undefined = json?.account_activation_url;
              if (activationUrl) {
                // Step 2: POST password to the activation URL exactly like
                // the activate-account edge function does.
                const activateRes = await fetch(activationUrl, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                  },
                  body: new URLSearchParams({
                    "customer[password]": submittedPassword,
                    "customer[password_confirmation]": submittedPassword,
                  }).toString(),
                  redirect: "manual",
                });

                if (activateRes.status === 302 || activateRes.status === 200) {
                  console.log("Auto-activated Shopify customer:", shopifyCustomerId);
                  activated = true;
                } else {
                  const txt = await activateRes.text();
                  activationStatusForFallback = activateRes.status;
                  console.warn(
                    "Auto-activation POST failed (non-blocking):",
                    activateRes.status,
                    txt.substring(0, 300)
                  );
                }
              } else {
                console.warn("No account_activation_url returned for customer", shopifyCustomerId);
              }
            } else {
              const txt = await urlRes.text();
              activationStatusForFallback = urlRes.status;
              console.warn(
                "Failed to fetch account_activation_url (non-blocking):",
                urlRes.status,
                txt.substring(0, 300)
              );
            }

            // Fallback: on a soft-merge, an existing Shopify customer is
            // often already "enabled" (support set a password, or they
            // recovered previously). The Admin activation endpoint returns
            // 422 in that case. Send a Storefront password-reset email so
            // the user can claim the account with their chosen password.
            const isSoftMerge = !!existingCustomerId;
            if (!activated && isSoftMerge) {
              try {
                const storefrontToken = Deno.env.get("SHOPIFY_STOREFRONT_ACCESS_TOKEN");
                if (storefrontToken) {
                  const recoverRes = await fetch(
                    `https://${shopifyDomain}/api/2024-10/graphql.json`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "X-Shopify-Storefront-Access-Token": storefrontToken,
                      },
                      body: JSON.stringify({
                        query:
                          "mutation customerRecover($email: String!) { customerRecover(email: $email) { customerUserErrors { code field message } } }",
                        variables: { email: customer.email },
                      }),
                    }
                  );
                  if (recoverRes.ok) {
                    const rJson = await recoverRes.json();
                    const errs = rJson?.data?.customerRecover?.customerUserErrors ?? [];
                    if (errs.length === 0) {
                      console.log(
                        "Soft-merge: sent password-reset email to already-enabled customer:",
                        customer.email,
                        "(activation status was",
                        activationStatusForFallback + ")"
                      );
                    } else {
                      console.warn(
                        "Soft-merge customerRecover returned userErrors (non-blocking):",
                        JSON.stringify(errs)
                      );
                    }
                  } else {
                    console.warn(
                      "Soft-merge customerRecover HTTP failed (non-blocking):",
                      recoverRes.status,
                      (await recoverRes.text()).substring(0, 200)
                    );
                  }
                } else {
                  console.warn(
                    "Soft-merge fallback: SHOPIFY_STOREFRONT_ACCESS_TOKEN missing, skipping reset email"
                  );
                }
              } catch (recoverErr) {
                console.warn(
                  "Soft-merge customerRecover threw (non-blocking):",
                  recoverErr
                );
              }
            }
          } else {
            console.warn(
              "Auto-approval enabled but SHOPIFY_STORE_DOMAIN/SHOPIFY_ADMIN_ACCESS_TOKEN missing"
            );
          }
        }
      } catch (activationErr) {
        console.warn("Auto-approval activation threw (non-blocking):", activationErr);
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
