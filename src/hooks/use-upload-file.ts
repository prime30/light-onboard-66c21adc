import { uploadFile } from "@/components/registration/actions/uploadFile";
import { useState, useCallback, useRef } from "react";

export interface UploadFileItem {
  id: string;
  file: File;
  status: "pending" | "uploading" | "completed" | "error";
  progress: number;
  error?: string;
}

export interface UseUploadFileReturn {
  queue: UploadFileItem[];
  isUploading: boolean;
  addFiles: (files: File[]) => void;
  clearQueue: () => void;
  retryFile: (id: string) => void;
}

export const useUploadFile = (): UseUploadFileReturn => {
  const [queue, setQueue] = useState<UploadFileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const isUploadingRef = useRef(false);

  const generateId = (): string => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

  const updateFileProgress = useCallback((id: string, progress: number) => {
    setQueue((prevQueue) =>
      prevQueue.map((item) => (item.id === id ? { ...item, progress } : item))
    );
  }, []);

  const updateFileStatus = useCallback(
    (id: string, status: UploadFileItem["status"], error?: string) => {
      setQueue((prevQueue) =>
        prevQueue.map((item) => (item.id === id ? { ...item, status, error } : item))
      );
    },
    []
  );

  const processQueue = useCallback(async () => {
    if (isUploadingRef.current) return;

    const pendingFiles = queue.filter((item) => item.status === "pending");
    if (pendingFiles.length === 0) return;

    isUploadingRef.current = true;
    setIsUploading(true);

    try {
      for (const item of pendingFiles) {
        // Update status to uploading
        updateFileStatus(item.id, "uploading");

        try {
          await uploadFile(
            item.file
            // (progress) => {
            //   updateFileProgress(item.id, progress);
            // }
          );

          // Mark as completed
          updateFileStatus(item.id, "completed");
        } catch (error) {
          // Mark as error
          const errorMessage = error instanceof Error ? error.message : "Upload failed";
          updateFileStatus(item.id, "error", errorMessage);
        }
      }
    } finally {
      isUploadingRef.current = false;
      setIsUploading(false);
    }
  }, [queue, updateFileStatus]);

  const addFiles = useCallback(
    (files: File[]) => {
      const newItems: UploadFileItem[] = files.map((file) => ({
        id: generateId(),
        file,
        status: "pending",
        progress: 0,
      }));

      setQueue((prevQueue) => [...prevQueue, ...newItems]);

      // Auto-start upload
      processQueue();
    },
    [processQueue]
  );

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const retryFile = useCallback(
    (id: string) => {
      setQueue((prevQueue) =>
        prevQueue.map((item) =>
          item.id === id
            ? { ...item, status: "pending" as const, progress: 0, error: undefined }
            : item
        )
      );

      // Auto-start upload after retry
      processQueue();
    },
    [processQueue]
  );

  return {
    queue,
    isUploading,
    addFiles,
    clearQueue,
    retryFile,
  };
};
