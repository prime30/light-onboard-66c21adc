/**
 * Storage Service for Supabase Storage
 * 
 * Handles file uploads to the registration-documents bucket.
 * Files are organized by user ID for RLS policy compliance.
 */

import { supabase } from "@/integrations/supabase/client";

const BUCKET_NAME = "registration-documents";

export interface UploadResult {
  success: boolean;
  path?: string;
  url?: string;
  error?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * Generate a unique file path for storage
 * Format: {userId}/{category}/{timestamp}_{filename}
 */
function generateFilePath(userId: string, category: string, fileName: string): string {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `${userId}/${category}/${timestamp}_${sanitizedFileName}`;
}

/**
 * Upload a single file to the registration-documents bucket
 */
export async function uploadFile(
  file: File,
  userId: string,
  category: "license" | "enrollment" | "tax-exempt" | "license-proof"
): Promise<UploadResult> {
  try {
    const filePath = generateFilePath(userId, category, file.name);

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Storage upload error:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    // Get the signed URL for the uploaded file
    const { data: urlData } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(data.path, 60 * 60 * 24 * 7); // 7 days expiry

    return {
      success: true,
      path: data.path,
      url: urlData?.signedUrl,
    };
  } catch (err) {
    console.error("Unexpected upload error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error occurred",
    };
  }
}

/**
 * Upload multiple files to the registration-documents bucket
 */
export async function uploadFiles(
  files: File[],
  userId: string,
  category: "license" | "enrollment" | "tax-exempt" | "license-proof"
): Promise<UploadResult[]> {
  const results = await Promise.all(
    files.map((file) => uploadFile(file, userId, category))
  );
  return results;
}

/**
 * Delete a file from storage
 */
export async function deleteFile(filePath: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error("Storage delete error:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Unexpected delete error:", err);
    return false;
  }
}

/**
 * Delete multiple files from storage
 */
export async function deleteFiles(filePaths: string[]): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(filePaths);

    if (error) {
      console.error("Storage delete error:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Unexpected delete error:", err);
    return false;
  }
}

/**
 * Get a signed URL for a file (for viewing)
 */
export async function getSignedUrl(
  filePath: string,
  expiresIn: number = 60 * 60 // 1 hour default
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error("Error creating signed URL:", error);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error("Unexpected signed URL error:", err);
    return null;
  }
}

/**
 * List all files for a user in a specific category
 */
export async function listUserFiles(
  userId: string,
  category?: "license" | "enrollment" | "tax-exempt" | "license-proof"
): Promise<string[]> {
  try {
    const path = category ? `${userId}/${category}` : userId;
    
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(path);

    if (error) {
      console.error("Error listing files:", error);
      return [];
    }

    return data.map((file) => `${path}/${file.name}`);
  } catch (err) {
    console.error("Unexpected list error:", err);
    return [];
  }
}
