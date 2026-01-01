import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
};

const BUCKET_NAME = "registration-documents";

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
const supabaseKey =
  Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Upload file function called");

    // Create Supabase client with user's auth token
    console.log("supabaseUrl", supabaseUrl, "supabaseKey", supabaseKey);
    const sbAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    console.log(sbAdmin);

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
      console.log("No user email provided in request");
      return new Response(JSON.stringify({ error: "User email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("File received:", file.name, "Size:", file.size, "Type:", file.type);

    // Create a unique file path using hashed user folder and timestamp
    const userFolder = await createUserFolderPath(email);
    const fileExt = file.name.split(".").pop();
    const fileName = `user-uploads/${userFolder}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

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

    console.log("File uploaded successfully:", uploadData.path);

    // Get the public URL
    const { data: urlData } = sbAdmin.storage.from(BUCKET_NAME).getPublicUrl(fileName);

    return new Response(
      JSON.stringify({
        success: true,
        path: uploadData.path,
        publicUrl: urlData.publicUrl,
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
