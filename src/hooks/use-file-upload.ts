/**
 * File Upload Hook
 * 
 * Manages file upload state and integration with Supabase Storage.
 * Tracks upload progress, handles errors, and provides upload functionality.
 */

import { useState, useCallback } from "react";
import { uploadFile, uploadFiles, deleteFile, deleteFiles, type UploadResult } from "@/lib/storage-service";

export interface UploadedFile {
  localFile: File;
  storagePath?: string;
  storageUrl?: string;
  isUploaded: boolean;
  isUploading: boolean;
  error?: string;
}

export interface UseFileUploadOptions {
  category: "license" | "enrollment" | "tax-exempt" | "license-proof";
  userId: string | null;
  onUploadComplete?: (results: UploadResult[]) => void;
  onUploadError?: (error: string) => void;
}

export function useFileUpload(options: UseFileUploadOptions) {
  const { category, userId, onUploadComplete, onUploadError } = options;
  
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  /**
   * Upload a single file to storage
   */
  const uploadSingleFile = useCallback(async (file: File): Promise<UploadResult> => {
    if (!userId) {
      const error = "User must be authenticated to upload files";
      onUploadError?.(error);
      return { success: false, error };
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Add to local state as uploading
      setUploadedFiles((prev) => [
        ...prev,
        { localFile: file, isUploaded: false, isUploading: true },
      ]);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      const result = await uploadFile(file, userId, category);

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Update local state with result
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.localFile === file
            ? {
                ...f,
                storagePath: result.path,
                storageUrl: result.url,
                isUploaded: result.success,
                isUploading: false,
                error: result.error,
              }
            : f
        )
      );

      if (result.success) {
        onUploadComplete?.([result]);
      } else {
        onUploadError?.(result.error || "Upload failed");
      }

      return result;
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 500);
    }
  }, [userId, category, onUploadComplete, onUploadError]);

  /**
   * Upload multiple files to storage
   */
  const uploadMultipleFiles = useCallback(async (files: File[]): Promise<UploadResult[]> => {
    if (!userId) {
      const error = "User must be authenticated to upload files";
      onUploadError?.(error);
      return files.map(() => ({ success: false, error }));
    }

    if (files.length === 0) return [];

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Add all files to local state as uploading
      setUploadedFiles((prev) => [
        ...prev,
        ...files.map((file) => ({
          localFile: file,
          isUploaded: false,
          isUploading: true,
        })),
      ]);

      // Upload files with progress tracking
      const results: UploadResult[] = [];
      for (let i = 0; i < files.length; i++) {
        const result = await uploadFile(files[i], userId, category);
        results.push(result);
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));

        // Update local state for this file
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.localFile === files[i]
              ? {
                  ...f,
                  storagePath: result.path,
                  storageUrl: result.url,
                  isUploaded: result.success,
                  isUploading: false,
                  error: result.error,
                }
              : f
          )
        );
      }

      const successfulUploads = results.filter((r) => r.success);
      const failedUploads = results.filter((r) => !r.success);

      if (successfulUploads.length > 0) {
        onUploadComplete?.(successfulUploads);
      }

      if (failedUploads.length > 0) {
        onUploadError?.(
          `${failedUploads.length} file(s) failed to upload`
        );
      }

      return results;
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 500);
    }
  }, [userId, category, onUploadComplete, onUploadError]);

  /**
   * Remove a file from local state and storage (if uploaded)
   */
  const removeFile = useCallback(async (file: File) => {
    const uploadedFile = uploadedFiles.find((f) => f.localFile === file);
    
    if (uploadedFile?.storagePath) {
      await deleteFile(uploadedFile.storagePath);
    }

    setUploadedFiles((prev) => prev.filter((f) => f.localFile !== file));
  }, [uploadedFiles]);

  /**
   * Remove all files from local state and storage
   */
  const removeAllFiles = useCallback(async () => {
    const pathsToDelete = uploadedFiles
      .filter((f) => f.storagePath)
      .map((f) => f.storagePath!);

    if (pathsToDelete.length > 0) {
      await deleteFiles(pathsToDelete);
    }

    setUploadedFiles([]);
  }, [uploadedFiles]);

  /**
   * Get storage paths for all successfully uploaded files
   */
  const getUploadedPaths = useCallback(() => {
    return uploadedFiles
      .filter((f) => f.isUploaded && f.storagePath)
      .map((f) => f.storagePath!);
  }, [uploadedFiles]);

  /**
   * Check if all files have been uploaded
   */
  const allFilesUploaded = uploadedFiles.length > 0 && 
    uploadedFiles.every((f) => f.isUploaded);

  /**
   * Check if any files have errors
   */
  const hasErrors = uploadedFiles.some((f) => f.error);

  return {
    uploadedFiles,
    isUploading,
    uploadProgress,
    uploadSingleFile,
    uploadMultipleFiles,
    removeFile,
    removeAllFiles,
    getUploadedPaths,
    allFilesUploaded,
    hasErrors,
  };
}
