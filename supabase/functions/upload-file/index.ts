import { createClient } from "supabase";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET_NAME = "registration-documents";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL") ?? "";
const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Upload file function called");

    // Get authorization header
    // const authHeader = req.headers.get("Authorization");
    // if (!authHeader) {
    //   console.log("No authorization header provided");
    //   return new Response(JSON.stringify({ error: "No authorization header" }), {
    //     status: 401,
    //     headers: { ...corsHeaders, "Content-Type": "application/json" },
    //   });
    // }

    // Create Supabase client with user's auth token
    console.log("supabaseUrl", supabaseUrl, "supabaseKey", supabaseKey)
    const sbAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    console.log(sbAdmin);

    // return new Response(
    //   JSON.stringify({
    //     success: true,
    //   }),
    //   { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    // );

    // Get the authenticated user
    // const {
    //   data: { user },
    //   error: userError,
    // } = await supabase.auth.getUser();
    // if (userError || !user) {
    //   console.log("User authentication failed:", userError?.message);
    //   return new Response(JSON.stringify({ error: "Unauthorized" }), {
    //     status: 401,
    //     headers: { ...corsHeaders, "Content-Type": "application/json" },
    //   });
    // }

    // console.log("User authenticated:", user.id);

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      console.log("No file provided in request");
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("File received:", file.name, "Size:", file.size, "Type:", file.type);

    // Create a unique file path using user ID and timestamp
    const fileExt = file.name.split(".").pop();
    const fileName = `test-uploads/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

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
    const { data: urlData } = sbAdmin.storage.from("uploads").getPublicUrl(fileName);

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
