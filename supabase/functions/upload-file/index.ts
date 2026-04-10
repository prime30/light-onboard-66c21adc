import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
};

const BUCKET_NAME = "registration-documents";
const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

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

    if (!ALLOWED_FILE_TYPES.has(file.type.toLowerCase())) {
      return new Response(JSON.stringify({ error: "Unsupported file type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create a unique file path using hashed user folder and timestamp
    const normalizedEmail = email.trim().toLowerCase();
    const userFolder = await createUserFolderPath(normalizedEmail);
    const rawFileExt = file.name.split(".").pop() || "bin";
    const safeFileExt = rawFileExt.replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
    const fileName = `user-uploads/${userFolder}/${Date.now()}-${crypto.randomUUID()}.${safeFileExt}`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await sbAdmin.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        contentType: file.type,
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
