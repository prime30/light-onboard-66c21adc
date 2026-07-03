import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { uploadFile } from "@/services/file";
import { UploadFileItem } from "@/lib/validations/file-schema";
import { useGlobalApp } from "./GlobalAppProvider";

export interface UploadFileContextType {
  queue: UploadFileItem[];
  isUploading: boolean;
  overallProgress: number;
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

const UPLOAD_SESSION_STORAGE_KEY = "ddx.upload-session-id";

// A stable per-browser-session identifier used as an upload folder key when
// the user hasn't entered their email yet. Without this, students could pick
// a file on the school step before the global `email` state was populated,
// and the queue would silently no-op forever — the file would sit in
// `pending` and the form would submit `[null]` for enrollmentProofFiles.
function getUploadSessionId(): string {
  if (typeof window === "undefined") return "anon-ssr";
  try {
    let id = window.sessionStorage.getItem(UPLOAD_SESSION_STORAGE_KEY);
    if (!id) {
      id = `anon-${crypto.randomUUID()}`;
      window.sessionStorage.setItem(UPLOAD_SESSION_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return `anon-${Math.random().toString(36).slice(2)}`;
  }
}

export const UploadFileProvider: React.FC<UploadFileProviderProps> = ({ children }) => {
  const { email } = useGlobalApp();
  const [queue, setQueue] = useState<UploadFileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const queueRef = useRef<UploadFileItem[]>([]);
  const isUploadingRef = useRef(false);

  const overallProgress =
    queue.length === 0 ? 0 : queue.reduce((sum, item) => sum + item.progress, 0) / queue.length;

  const generateId = (): string => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

  const updateFileProgress = useCallback((id: string, progress: number) => {
    setQueue((prevQueue) =>
      prevQueue.map((item) => (item.id === id ? { ...item, progress } : item))
    );
  }, []);

  const updateFileStatus = useCallback(
    (id: string, status: UploadFileItem["status"], options?: { error?: string; url?: string }) => {
      setQueue((prevQueue) =>
        prevQueue.map((item) =>
          item.id === id ? { ...item, status, error: options?.error, url: options?.url } : item
        )
      );
    },
    []
  );

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const processQueue = useCallback(async () => {
    if (isUploadingRef.current) return;

    const hasPendingFiles = queueRef.current.some((item) => item.status === "pending");
    if (!hasPendingFiles) return;

    // Fall back to a stable per-session id if email isn't set yet. The server
    // just uses this string as a folder key — real association happens later
    // when the submission payload carries the URLs alongside the real email.
    const uploadKey = email && email.trim() ? email.trim() : getUploadSessionId();

    isUploadingRef.current = true;
    setIsUploading(true);

    try {
      while (true) {
        const item = queueRef.current.find((candidate) => candidate.status === "pending");
        if (!item) break;

        // Update status to uploading
        updateFileStatus(item.id, "uploading");

        try {
          const url = await uploadFile(item.file, uploadKey, (progress) => {
            updateFileProgress(item.id, progress);
          });

          // Mark as completed
          updateFileStatus(item.id, "completed", { url });
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
  }, [email, updateFileProgress, updateFileStatus]);

  useEffect(() => {
    if (isUploadingRef.current) return;
    if (!queue.some((item) => item.status === "pending")) return;

    // Auto-start upload — no longer gated on email; we use a session id fallback
    void processQueue();
  }, [queue, processQueue]);


  const addFiles = useCallback((files: File[]) => {
    const newItems: UploadFileItem[] = files.map((file) => ({
      id: generateId(),
      file,
      status: "pending",
      progress: 0,
    }));

    setQueue((prevQueue) => [...prevQueue, ...newItems]);
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
    },
    []
  );

  const value: UploadFileContextType = {
    queue,
    isUploading,
    overallProgress,
    addFiles,
    clearQueue,
    retryFile,
  };

  return <UploadFileContext.Provider value={value}>{children}</UploadFileContext.Provider>;
};
