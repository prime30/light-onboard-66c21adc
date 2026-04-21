import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BUCKET_NAME = "registration-documents";
const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const HELIUM_BASE = "https://app.customerfields.com/api/v2";

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hashEmail(email: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

/**
 * Verify a claimed Shopify customer ID actually belongs to the claimed email.
 * Without this check, any logged-in customer could mark *anyone* as tax-exempt.
 */
async function verifyShopifyCustomer(
  customerId: string,
  email: string,
  shopifyDomain: string,
  shopifyToken: string
): Promise<boolean> {
  const res = await fetch(
    `https://${shopifyDomain}/admin/api/2024-10/customers/${customerId}.json`,
    {
      headers: {
        "X-Shopify-Access-Token": shopifyToken,
        "Content-Type": "application/json",
      },
    }
  );
  if (!res.ok) {
    console.error("Shopify customer lookup failed:", res.status);
    return false;
  }
  const data = await res.json();
  const shopifyEmail: string | undefined = data?.customer?.email;
  return shopifyEmail?.toLowerCase().trim() === email.toLowerCase().trim();
}

/**
 * Find the Helium (Customer Fields) record for a Shopify customer by email,
 * then PATCH tax_exempt + tax_exempt_file in a single update.
 */
async function updateHeliumTaxExempt(
  email: string,
  fileUrl: string,
  apiKey: string,
  formId: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  // Look up Helium customer ID by email
  const searchUrl = `${HELIUM_BASE}/customers/search.json?page=1&limit=1&email=${encodeURIComponent(email)}`;
  const searchRes = await fetch(searchUrl, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  });
  if (!searchRes.ok) {
    const text = await searchRes.text();
    return { ok: false, status: 502, error: `Helium search failed: ${text}` };
  }
  const search = await searchRes.json();
  const heliumId = search?.customers?.[0]?.id;
  if (!heliumId) {
    return { ok: false, status: 404, error: "Customer not found in Helium" };
  }

  // PATCH the customer with both fields together
  const patchRes = await fetch(`${HELIUM_BASE}/customers/${heliumId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      form_id: formId,
      customer: {
        tax_exempt: true,
        tax_exempt_file: fileUrl,
      },
    }),
  });

  if (!patchRes.ok) {
    const text = await patchRes.text();
    return { ok: false, status: patchRes.status, error: `Helium update failed: ${text}` };
  }
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { success: false, error: "Method not allowed" });

  // Env
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const shopifyDomain = Deno.env.get("SHOPIFY_STORE_DOMAIN") ?? "";
  const shopifyToken = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN") ?? "";
  const heliumKey = Deno.env.get("HELIUM_PRIVATE_ACCESS_TOKEN") ?? "";
  const heliumFormId = Deno.env.get("HELIUM_PRIVATE_FORM_ID") ?? "";

  if (!supabaseUrl || !serviceKey || !shopifyDomain || !shopifyToken || !heliumKey || !heliumFormId) {
    console.error("Missing required environment variables");
    return json(500, { success: false, error: "Server configuration error" });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const customerId = (formData.get("shopify_customer_id") as string | null)?.trim();
    const email = (formData.get("shopify_customer_email") as string | null)?.trim().toLowerCase();

    // Input validation
    if (!file) return json(400, { success: false, error: "File is required" });
    if (!customerId) return json(400, { success: false, error: "shopify_customer_id is required" });
    if (!email) return json(400, { success: false, error: "shopify_customer_email is required" });
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return json(400, { success: false, error: "File too large (max 10MB)" });
    }
    if (!ALLOWED_FILE_TYPES.has(file.type.toLowerCase())) {
      return json(400, { success: false, error: "Unsupported file type" });
    }

    // Verify the claimed customer ID actually belongs to the claimed email
    const verified = await verifyShopifyCustomer(customerId, email, shopifyDomain, shopifyToken);
    if (!verified) {
      console.warn("Customer verification failed", { customerId, email });
      return json(403, { success: false, error: "Customer verification failed" });
    }

    // Upload file (mirrors upload-file/index.ts pathing so files live alongside onboarding docs)
    const sbAdmin = createClient(supabaseUrl, serviceKey);
    const userFolder = await hashEmail(email);
    const ext = (file.name.split(".").pop() || "bin").replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
    const path = `user-uploads/${userFolder}/tax-exempt-${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await sbAdmin.storage
      .from(BUCKET_NAME)
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error("Upload failed:", uploadError.message);
      return json(500, { success: false, error: "File upload failed" });
    }

    const fileUrl = `${supabaseUrl}/functions/v1/get-image?path=${encodeURIComponent(path)}`;

    // Push to Helium → flips tax_exempt + writes file URL on the Shopify customer
    const heliumResult = await updateHeliumTaxExempt(email, fileUrl, heliumKey, heliumFormId);
    if (!heliumResult.ok) {
      console.error("Helium update failed:", heliumResult.error);
      return json(heliumResult.status, { success: false, error: heliumResult.error });
    }

    return json(200, { success: true, tax_exempt: true, file_url: fileUrl });
  } catch (err) {
    console.error("Unexpected error:", err);
    return json(500, { success: false, error: "Internal server error" });
  }
});
