import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { uploadFile } from "@/components/registration/actions/uploadFile";
import { UploadFileItem } from "@/lib/validations/file-schema";

export interface UploadFileContextType {
  queue: UploadFileItem[];
  isUploading: boolean;
  addFiles: (files: File[]) => UploadFileItem[];
  clearQueue: () => void;
  retryFile: (id: string) => void;
}

const UploadFileContext = createContext<UploadFileContextType | undefined>(undefined);

export const useUploadFile = () => {
  const context = useContext(UploadFileContext);
  if (context === undefined) {
    throw new Error("useUploadFile must be used within an UploadFileProvider");
  }
  return context;
};

interface UploadFileProviderProps {
  children: React.ReactNode;
}

export const UploadFileProvider: React.FC<UploadFileProviderProps> = ({ children }) => {
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
    (
      id: string,
      status: UploadFileItem["status"],
      options?: { error?: string; publicUrl?: string }
    ) => {
      setQueue((prevQueue) =>
        prevQueue.map((item) =>
          item.id === id
            ? { ...item, status, error: options?.error, url: options?.publicUrl }
            : item
        )
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
          const result = await uploadFile(
            item.file
            // (progress) => {
            //   updateFileProgress(item.id, progress);
            // }
          );

          // Mark as completed
          console.log("upload", result);
          updateFileStatus(item.id, "completed");
        } catch (error) {
          // Mark as error
          const errorMessage = error instanceof Error ? error.message : "Upload failed";
          updateFileStatus(item.id, "error", { error: errorMessage });
        }
      }
    } finally {
      isUploadingRef.current = false;
      setIsUploading(false);
    }
  }, [queue, updateFileStatus]);

  useEffect(() => {
    if (isUploadingRef.current) return;
    if (queue.length === 0) return;

    // Auto-start upload
    console.log("process");
    processQueue();
  }, [queue.length, processQueue]);

  const addFiles = useCallback((files: File[]) => {
    const newItems: UploadFileItem[] = files.map((file) => ({
      id: generateId(),
      file,
      status: "pending",
      progress: 0,
    }));

    setQueue((prevQueue) => {
      for (const newItem of newItems) {
        prevQueue.push(newItem);
      }
      return prevQueue.slice();
    });
    return newItems;
  }, []);

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

  const value: UploadFileContextType = {
    queue,
    isUploading,
    addFiles,
    clearQueue,
    retryFile,
  };

  return <UploadFileContext.Provider value={value}>{children}</UploadFileContext.Provider>;
};
