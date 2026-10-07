import { createClient } from "npm:@supabase/supabase-js@2";

const FUNCTION_VERSION = "U1-20261007";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
  "X-Function-Version": FUNCTION_VERSION,
};

const BUCKET_NAME = "registration-documents";
const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const UNSUPPORTED_TYPE_MESSAGE = "Please upload a PDF, JPG, PNG or WEBP file.";

type DetectedType = { mime: string; ext: string };

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0): boolean =>
  bytes.length >= offset + signature.length && signature.every((b, i) => bytes[offset + i] === b);

// The stored type and extension come from the file's own bytes, never from the
// browser-declared type or the filename, so a mislabeled file can't be stored
// (and later served) as something else. Some Android and Windows pickers send
// an empty or nonstandard type for PDFs, which this accepts.
function detectFileType(head: Uint8Array): DetectedType | null {
  // The PDF spec allows junk before the header within the first 1024 bytes.
  const pdfHeader = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
  for (let i = 0; i + pdfHeader.length <= Math.min(head.length, 1024); i++) {
    if (startsWith(head, pdfHeader, i)) return { mime: "application/pdf", ext: "pdf" };
  }
  if (startsWith(head, [0xff, 0xd8, 0xff])) return { mime: "image/jpeg", ext: "jpg" };
  if (startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mime: "image/png", ext: "png" };
  if (startsWith(head, [0x52, 0x49, 0x46, 0x46]) && startsWith(head, [0x57, 0x45, 0x42, 0x50], 8)) {
    return { mime: "image/webp", ext: "webp" };
  }
  if (startsWith(head, [0x47, 0x49, 0x46, 0x38])) return { mime: "image/gif", ext: "gif" };
  return null;
}

/**
 * Creates a user folder path by hashing the email
 */
async function createUserFolderPath(email: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(email);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex.substring(0, 16); // Use first 16 chars of hash
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client with service role for controlled storage writes
    const sbAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const email = formData.get("email") as string;

    if (!file) {
      console.log("No file provided in request");
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!email) {
      return new Response(JSON.stringify({ error: "User email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return new Response(
        JSON.stringify({
          error: `File too large. Maximum size is ${Math.floor(MAX_UPLOAD_SIZE_BYTES / (1024 * 1024))}MB.`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
    const detected = detectFileType(head);
    if (!detected) {
      console.log("Rejected upload: unrecognized content", { declaredType: file.type, size: file.size });
      return new Response(JSON.stringify({ error: UNSUPPORTED_TYPE_MESSAGE }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (detected.mime !== file.type.toLowerCase()) {
      console.log("Upload type differs from declared", { declaredType: file.type, detected: detected.mime });
    }

    // Create a unique file path using hashed user folder and timestamp
    const normalizedEmail = email.trim().toLowerCase();
    const userFolder = await createUserFolderPath(normalizedEmail);
    const fileName = `user-uploads/${userFolder}/${Date.now()}-${crypto.randomUUID()}.${detected.ext}`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await sbAdmin.storage
      .from(BUCKET_NAME)
      .upload(fileName, new Blob([await file.arrayBuffer()], { type: detected.mime }), {
        contentType: detected.mime,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload failed:", uploadError.message);
      return new Response(JSON.stringify({ error: uploadError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate URL that points to our get-image function
    const imageUrl = `${supabaseUrl}/functions/v1/get-image?path=${encodeURIComponent(fileName)}`;

    return new Response(
      JSON.stringify({
        success: true,
        path: uploadData.path,
        publicUrl: imageUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
