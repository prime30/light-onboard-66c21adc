// Upload timeout — abort silently-hanging requests so the queue can either
// surface an error to the user or be retried. Without this a stalled edge
// function or dropped connection leaves the item spinning forever and the
// user submits `[null]` for the file field.
const UPLOAD_TIMEOUT_MS = 90_000;

function extractServerError(responseText: string, status: number): string {
  try {
    const parsed = JSON.parse(responseText);
    if (parsed && typeof parsed.error === "string" && parsed.error.trim()) {
      return parsed.error;
    }
  } catch {
    // fall through — response wasn't JSON
  }
  return `Upload failed (${status})`;
}

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
    let didFinish = false;

    const timeoutId = window.setTimeout(() => {
      if (didFinish) return;
      didFinish = true;
      try {
        xhr.abort();
      } catch {
        // ignore
      }
      reject(new Error("Upload timed out — please check your connection and try again"));
    }, UPLOAD_TIMEOUT_MS);

    const finish = () => {
      didFinish = true;
      window.clearTimeout(timeoutId);
    };

    if (onProgress) {
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      });
    }

    xhr.addEventListener("load", () => {
      if (didFinish) return;
      finish();
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (!data?.publicUrl || typeof data.publicUrl !== "string") {
            reject(new Error("Upload succeeded but no URL returned"));
            return;
          }
          resolve(data.publicUrl);
        } catch (error) {
          console.error("Error parsing upload response:", error);
          reject(new Error("Upload failed — invalid server response"));
        }
      } else {
        const message = extractServerError(xhr.responseText, xhr.status);
        console.error("Upload failed:", xhr.status, message);
        reject(new Error(message));
      }
    });

    xhr.addEventListener("error", () => {
      if (didFinish) return;
      finish();
      console.error("Network error uploading file");
      reject(new Error("Upload failed — network error"));
    });

    xhr.addEventListener("abort", () => {
      if (didFinish) return;
      finish();
      reject(new Error("Upload was cancelled"));
    });

    xhr.open("POST", `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-file`);
    xhr.setRequestHeader(
      "Authorization",
      `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
    );
    xhr.send(formData);
  });
}
