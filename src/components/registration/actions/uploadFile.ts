export async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-file`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: formData,
    });

    const data = await response.json();
    return data.publicUrl;
  } catch (error) {
    console.error("Error fetching address predictions:", error);
    return "";
  } finally {
    console.log("file finished");
  }
}
