export async function uploadFile(
  file: File,
  email: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("email", email);

    const xhr = new XMLHttpRequest();

    // Set up progress tracking
    if (onProgress) {
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });
    }

    // Set up response handlers
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          console.log("file finished");
          resolve(data.publicUrl);
        } catch (error) {
          console.error("Error parsing response:", error);
          reject(new Error("Failed to parse response"));
        }
      } else {
        console.error("Upload failed with status:", xhr.status);
        reject(new Error(`Upload failed with status: ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => {
      console.error("Error uploading file:", xhr.statusText);
      reject(new Error("Upload failed"));
    });

    xhr.addEventListener("abort", () => {
      console.error("Upload was aborted");
      reject(new Error("Upload was aborted"));
    });

    // Set up request
    xhr.open("POST", `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-file`);
    xhr.setRequestHeader(
      "Authorization",
      `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
    );

    // Start the upload
    xhr.send(formData);
  });
}
