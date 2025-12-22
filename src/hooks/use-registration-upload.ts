/**
 * Registration Upload Hook
 *
 * Integrates file uploads with the registration flow.
 * Handles uploading all registration documents when submitting.
 */

import { useCallback, useState } from "react";
import { uploadFile, uploadFiles, type UploadResult } from "@/lib/storage-service";
import { toast } from "sonner";

export interface RegistrationUploadData {
  licenseFile: File | null;
  licenseProofFiles: File[];
  enrollmentProofFiles: File[];
  taxExemptFile: File | null;
}

export interface UploadedDocumentPaths {
  licensePath?: string;
  licenseProofPaths: string[];
  enrollmentProofPaths: string[];
  taxExemptPath?: string;
}

export function useRegistrationUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedPaths, setUploadedPaths] = useState<UploadedDocumentPaths>({
    licenseProofPaths: [],
    enrollmentProofPaths: [],
  });

  /**
   * Upload all registration documents
   */
  const uploadAllDocuments = useCallback(
    async (userId: string, data: RegistrationUploadData): Promise<UploadedDocumentPaths | null> => {
      setIsUploading(true);
      setUploadProgress(0);

      const paths: UploadedDocumentPaths = {
        licenseProofPaths: [],
        enrollmentProofPaths: [],
      };

      try {
        // Count total files to upload
        const totalFiles = [
          data.licenseFile,
          data.taxExemptFile,
          ...data.licenseProofFiles,
          ...data.enrollmentProofFiles,
        ].filter(Boolean).length;

        if (totalFiles === 0) {
          setIsUploading(false);
          return paths;
        }

        let uploadedCount = 0;
        const updateProgress = () => {
          uploadedCount++;
          setUploadProgress(Math.round((uploadedCount / totalFiles) * 100));
        };

        // Upload license file (for salon accounts)
        if (data.licenseFile) {
          const result = await uploadFile(data.licenseFile, userId, "license");
          if (result.success && result.path) {
            paths.licensePath = result.path;
          } else {
            throw new Error(result.error || "Failed to upload license file");
          }
          updateProgress();
        }

        // Upload license proof files (for professional accounts)
        if (data.licenseProofFiles.length > 0) {
          for (const file of data.licenseProofFiles) {
            const result = await uploadFile(file, userId, "license-proof");
            if (result.success && result.path) {
              paths.licenseProofPaths.push(result.path);
            } else {
              console.error("Failed to upload license proof:", result.error);
            }
            updateProgress();
          }
        }

        // Upload enrollment proof files (for student accounts)
        if (data.enrollmentProofFiles.length > 0) {
          for (const file of data.enrollmentProofFiles) {
            const result = await uploadFile(file, userId, "enrollment");
            if (result.success && result.path) {
              paths.enrollmentProofPaths.push(result.path);
            } else {
              console.error("Failed to upload enrollment proof:", result.error);
            }
            updateProgress();
          }
        }

        // Upload tax exempt file
        if (data.taxExemptFile) {
          const result = await uploadFile(data.taxExemptFile, userId, "tax-exempt");
          if (result.success && result.path) {
            paths.taxExemptPath = result.path;
          } else {
            console.error("Failed to upload tax exempt file:", result.error);
          }
          updateProgress();
        }

        setUploadedPaths(paths);
        setUploadProgress(100);

        return paths;
      } catch (error) {
        console.error("Upload error:", error);
        toast.error("Failed to upload some documents. Please try again.");
        return null;
      } finally {
        setIsUploading(false);
        setTimeout(() => setUploadProgress(0), 500);
      }
    },
    []
  );

  /**
   * Reset upload state
   */
  const resetUploadState = useCallback(() => {
    setUploadedPaths({
      licenseProofPaths: [],
      enrollmentProofPaths: [],
    });
    setUploadProgress(0);
    setIsUploading(false);
  }, []);

  return {
    isUploading,
    uploadProgress,
    uploadedPaths,
    uploadAllDocuments,
    resetUploadState,
  };
}
