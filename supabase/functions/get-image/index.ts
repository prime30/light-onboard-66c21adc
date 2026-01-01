import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
};

const BUCKET_NAME = "registration-documents";
const ALLOWED_FOLDERS = ["user-uploads", "test-uploads"];

function isValidImagePath(path: string): boolean {
  const normalizedPath = path.replace(/^\/+/, "");
  return ALLOWED_FOLDERS.some((folder) => normalizedPath.startsWith(`${folder}/`));
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Get image function called");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Missing environment variables");
      return new Response(
        JSON.stringify({
          error: "Server configuration error",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (req.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const imagePath = url.searchParams.get("path");

    if (!imagePath) {
      return new Response(JSON.stringify({ error: "Image path is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Requested image path:", imagePath);

    if (!isValidImagePath(imagePath)) {
      console.log("Invalid image path access attempt:", imagePath);
      return new Response(
        JSON.stringify({
          error: "Access denied.",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log("Created Supabase client");

    // First check if the file exists by listing it
    const folderPath = imagePath.split("/").slice(0, -1).join("/");
    const fileName = imagePath.split("/").pop();
    console.log("Checking folder:", folderPath, "for file:", fileName);

    const { data: fileList, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list(folderPath);

    if (listError) {
      console.error("List error:", listError);
      return new Response(
        JSON.stringify({
          error: "Could not access folder",
          details: listError,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(
      "Files in folder:",
      fileList?.map((f: { name: string }) => f.name)
    );
    const fileExists = fileList?.some((f: { name: string }) => f.name === fileName);

    if (!fileExists) {
      console.log("File not found in folder");
      return new Response(
        JSON.stringify({
          error: "Image not found",
          details: `File ${fileName} not found in ${folderPath}`,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Try to download the file directly
    console.log("Attempting to download file:", imagePath);
    const { data, error } = await supabase.storage.from(BUCKET_NAME).download(imagePath);

    if (error) {
      console.error("Download error:", error);
      return new Response(
        JSON.stringify({
          error: error.message,
          details: error,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!data) {
      console.log("No data returned");
      return new Response(JSON.stringify({ error: "No image data received" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Image downloaded successfully, size:", data.size);

    // Determine content type from file extension
    const ext = imagePath.toLowerCase().split(".").pop();
    let contentType = "application/octet-stream";

    switch (ext) {
      case "jpg":
      case "jpeg":
        contentType = "image/jpeg";
        break;
      case "png":
        contentType = "image/png";
        break;
      case "gif":
        contentType = "image/gif";
        break;
      case "webp":
        contentType = "image/webp";
        break;
      case "svg":
        contentType = "image/svg+xml";
        break;
    }

    return new Response(data, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
        "Content-Disposition": `inline; filename="${imagePath.split("/").pop()}"`,
      },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
