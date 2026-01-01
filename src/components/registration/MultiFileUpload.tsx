import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FolderOpen,
  X,
  FileCheck,
  Loader2,
  FileText,
  AlertCircle,
  ZoomIn,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { compressImages } from "@/lib/imageCompression";
import { useUploadFile } from "@/contexts";
import { UploadFileItem } from "@/lib/validations/file-schema";

interface MultiFileUploadProps {
  files: UploadFileItem[];
  onFilesChange: (files: UploadFileItem[]) => void;
  accept?: string;
  placeholder?: string;
  error?: boolean;
  errorMessage?: string;
  maxFiles?: number;
  maxFileSize?: number; // in bytes, default 10MB
  enableCompression?: boolean; // Enable image compression, default true
}

const MAX_FILE_SIZE_DEFAULT = 10 * 1024 * 1024; // 10MB

const formatFileSizeLimit = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
};

const isImageFile = (file: File) => {
  return file.type?.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp)$/i.test(file?.name || "");
};

const formatAcceptedTypes = (accept: string) => {
  return accept
    .split(",")
    .map((t) => t.trim().toUpperCase().replace(".", ""))
    .join(", ");
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// File item component with preview and drag handle
const FileItem = ({
  item,
  index,
  onRemove,
  onPreview,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
  isDragOver,
}: {
  item: UploadFileItem;
  index: number;
  onRemove: () => void;
  onPreview: () => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isDragOver: boolean;
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isImageFile(item.file)) {
      const url = URL.createObjectURL(item.file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [item.file]);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      className={cn(
        "flex items-center gap-2 p-3 rounded-md bg-muted/50 border border-border/50 transition-all duration-200",
        isDragging && "opacity-50 scale-95",
        isDragOver && "border-foreground/50 bg-foreground/5 scale-[1.02]",
        !isDragging && "animate-in fade-in slide-in-from-bottom-2"
      )}
    >
      {/* Drag handle */}
      <div className="cursor-grab active:cursor-grabbing p-1 -ml-1 rounded hover:bg-foreground/10 transition-colors">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>

      {previewUrl ? (
        <button
          type="button"
          onClick={onPreview}
          className="relative w-10 h-10 rounded-md overflow-hidden flex-shrink-0 border border-border/50 group cursor-pointer"
        >
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors duration-200 flex items-center justify-center">
            <ZoomIn className="w-3 h-3 text-background opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          </div>
        </button>
      ) : (
        <div className="w-10 h-10 rounded-md bg-foreground/10 flex items-center justify-center flex-shrink-0">
          {item.file.type === "application/pdf" ? (
            <FileText className="w-4 h-4 text-foreground" />
          ) : (
            <FileCheck className="w-4 h-4 text-foreground" />
          )}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{item.file.name}</p>
        <p className="text-xs text-muted-foreground">{formatFileSize(item.file.size)}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="p-1.5 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const MultiFileUpload = ({
  files,
  onFilesChange,
  accept = ".pdf,.jpg,.jpeg,.png,.webp",
  placeholder = "No files chosen",
  error = false,
  errorMessage,
  maxFiles = 10,
  maxFileSize = MAX_FILE_SIZE_DEFAULT,
  enableCompression = true,
}: MultiFileUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pendingFileIds, setPendingFileIds] = useState<string[]>([]);
  const [fileTypeError, setFileTypeError] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxFile, setLightboxFile] = useState<UploadFileItem | null>(null);
  const { addFiles, queue } = useUploadFile();

  // Drag-and-drop reordering state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Derive pending files from queue using IDs
  const pendingFiles = queue.filter((item) => pendingFileIds.includes(item.id));

  // Derive upload state from pending files
  const isProcessing = pendingFiles.some(
    (file) => file.status === "uploading" || file.status === "pending"
  );
  const totalPendingFiles = pendingFiles.length;
  const progress =
    totalPendingFiles > 0
      ? Math.round(pendingFiles.reduce((acc, file) => acc + file.progress, 0) / totalPendingFiles)
      : 0;

  const closeLightbox = useCallback(() => {
    if (lightboxUrl) {
      URL.revokeObjectURL(lightboxUrl);
    }
    setLightboxUrl(null);
    setLightboxFile(null);
  }, [lightboxUrl]);

  // Close lightbox on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && lightboxUrl) {
        closeLightbox();
      }
    };

    if (lightboxUrl) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [closeLightbox, lightboxUrl]);

  // Handle completed uploads
  useEffect(() => {
    if (pendingFileIds.length === 0) return;

    const allCompleted = pendingFiles.every(
      (file) => file.status === "completed" || file.status === "error"
    );
    const completedItems = pendingFiles.filter((file) => file.status === "completed");

    if (allCompleted && completedItems.length > 0) {
      console.log(completedItems);
      // Add completed files to the component's files state
      onFilesChange([...files, ...completedItems]);
      // Clear pending file IDs
      setPendingFileIds([]);
    }
  }, [pendingFiles, pendingFileIds.length, files, onFilesChange]);

  const validateFileType = useCallback(
    (file: File): boolean => {
      const acceptedTypes = accept.split(",").map((t) => t.trim().toLowerCase());
      const fileExt = `.${file.name.split(".").pop()?.toLowerCase()}`;
      return acceptedTypes.some(
        (type) => fileExt === type || file.type.includes(type.replace(".", ""))
      );
    },
    [accept]
  );

  const processFiles = useCallback(
    async (newFiles: File[]) => {
      // Compress images if enabled
      let filesToProcess = newFiles;
      if (enableCompression) {
        filesToProcess = await compressImages(newFiles);
      }

      const validFiles: File[] = [];
      const invalidTypeFiles: string[] = [];
      const oversizedFiles: string[] = [];

      for (const file of filesToProcess) {
        if (!validateFileType(file)) {
          invalidTypeFiles.push(file.name);
        } else if (file.size > maxFileSize) {
          oversizedFiles.push(file.name);
        } else {
          validFiles.push(file);
        }
      }

      // Build error message
      const errors: string[] = [];
      if (invalidTypeFiles.length > 0) {
        const acceptedFormats = formatAcceptedTypes(accept);
        errors.push(`Invalid type: ${invalidTypeFiles.join(", ")}. Accepted: ${acceptedFormats}`);
      }
      if (oversizedFiles.length > 0) {
        errors.push(
          `Too large (max ${formatFileSizeLimit(maxFileSize)}): ${oversizedFiles.join(", ")}`
        );
      }

      // Check max files limit
      const availableSlots = maxFiles - files.length;
      if (validFiles.length > availableSlots) {
        errors.push(
          `Maximum ${maxFiles} files allowed. ${validFiles.length - availableSlots} file(s) skipped.`
        );
        validFiles.splice(availableSlots);
      }

      if (errors.length > 0) {
        setFileTypeError(errors.join(" • "));
      }

      if (validFiles.length > 0) {
        const newItems = addFiles(validFiles);
        setPendingFileIds(newItems.map((item) => item.id));
        console.log(newItems);
      }
    },
    [accept, addFiles, enableCompression, files.length, maxFileSize, maxFiles, validateFileType]
  );

  console.log(queue);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      processFiles(selectedFiles);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0) {
        processFiles(droppedFiles);
      }
    },
    [processFiles]
  );

  const handleRemoveFile = (index: number) => {
    const newItems = files.filter((_, i) => i !== index);
    onFilesChange(newItems);
  };

  const clearFileTypeError = () => {
    setFileTypeError(null);
  };

  const openLightbox = (item: UploadFileItem) => {
    if (isImageFile(item.file)) {
      const url = URL.createObjectURL(item.file);
      setLightboxUrl(url);
      setLightboxFile(item);
    }
  };

  const hasError = error || !!fileTypeError;
  const canAddMore = files.length < maxFiles;

  return (
    <>
      <div className="space-y-3">
        {/* File type error banner */}
        {fileTypeError && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30 animate-in fade-in slide-in-from-top-1 duration-200">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
            <p className="text-xs text-destructive flex-1">{fileTypeError}</p>
            <button
              type="button"
              onClick={clearFileTypeError}
              className="p-1 rounded-full hover:bg-destructive/10 transition-colors"
            >
              <X className="w-3 h-3 text-destructive" />
            </button>
          </div>
        )}

        {/* Drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "relative flex flex-col items-center justify-center gap-3 p-6 rounded-lg border-2 border-dashed transition-all duration-300 overflow-hidden",
            isDragOver
              ? "border-foreground bg-foreground/5 scale-[1.01]"
              : hasError
                ? "border-destructive/50 bg-destructive/5"
                : isProcessing
                  ? "border-foreground/50 bg-foreground/5"
                  : "border-border/50 bg-muted/30 hover:border-foreground/30 hover:bg-muted/50",
            !canAddMore && "opacity-50 pointer-events-none"
          )}
        >
          {/* Progress bar background */}
          {isProcessing && (
            <div
              className="absolute inset-0 bg-foreground/10 transition-all duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
            disabled={isProcessing || !canAddMore}
            multiple
          />

          {isProcessing ? (
            <div className="relative flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-foreground animate-spin" />
              <div className="flex items-center gap-3 w-48">
                <div className="flex-1 h-1.5 bg-border/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-foreground rounded-full transition-all duration-100 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-foreground tabular-nums w-10">
                  {progress}%
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Processing {totalPendingFiles} file{totalPendingFiles > 1 ? "s" : ""}...
              </p>
            </div>
          ) : (
            <>
              <div
                className={cn(
                  "w-12 h-12 rounded-md flex items-center justify-center transition-colors duration-300",
                  isDragOver ? "bg-foreground text-background" : "bg-muted"
                )}
              >
                <Upload
                  className={cn(
                    "w-6 h-6 transition-colors duration-300",
                    isDragOver ? "text-background" : "text-muted-foreground"
                  )}
                />
              </div>
              <div className="text-center">
                <p
                  className={cn(
                    "text-sm font-medium",
                    hasError ? "text-destructive" : "text-foreground"
                  )}
                >
                  {isDragOver ? "Drop files here" : placeholder}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Drag & drop or click to browse • {files.length}/{maxFiles} files
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "h-[40px] w-full sm:w-auto px-5 rounded-md border-border/50 hover:bg-muted/50",
                  hasError && "border-destructive/50"
                )}
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                Browse files
              </Button>
            </>
          )}
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Uploaded Files ({files.length}){" "}
                {files.length > 1 && (
                  <span className="normal-case font-normal">• Drag to reorder</span>
                )}
              </p>
              {files.length > 1 && (
                <button
                  type="button"
                  onClick={() => onFilesChange([])}
                  className="text-xs text-destructive hover:underline"
                >
                  Remove all
                </button>
              )}
            </div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {files.map((item, index) => (
                <FileItem
                  key={`${item.file.name}-${item.file.lastModified}-${index}`}
                  item={item}
                  index={index}
                  onRemove={() => handleRemoveFile(index)}
                  onPreview={() => openLightbox(item)}
                  onDragStart={(e, idx) => {
                    e.dataTransfer.effectAllowed = "move";
                    setDraggedIndex(idx);
                  }}
                  onDragOver={(e, idx) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (draggedIndex !== null && draggedIndex !== idx) {
                      setDragOverIndex(idx);
                    }
                  }}
                  onDragEnd={() => {
                    if (
                      draggedIndex !== null &&
                      dragOverIndex !== null &&
                      draggedIndex !== dragOverIndex
                    ) {
                      const newItems = [...files];
                      const [draggedItem] = newItems.splice(draggedIndex, 1);
                      newItems.splice(dragOverIndex, 0, draggedItem);
                      onFilesChange(newItems);
                    }
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                  }}
                  isDragging={draggedIndex === index}
                  isDragOver={dragOverIndex === index}
                />
              ))}
            </div>
          </div>
        )}

        {error && errorMessage && !fileTypeError && (
          <p className="text-xs text-destructive">{errorMessage}</p>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200"
          onClick={closeLightbox}
        >
          <div className="absolute inset-0 bg-background/90 backdrop-blur-md" />

          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-foreground/10 hover:bg-foreground/20 transition-colors"
          >
            <X className="w-6 h-6 text-foreground" />
          </button>

          <div
            className="relative max-w-[90vw] max-h-[90vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxUrl}
              alt={lightboxFile?.file.name || "Preview"}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />

            {lightboxFile && (
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background/80 to-transparent rounded-b-lg">
                <p className="text-sm font-medium text-foreground truncate">
                  {lightboxFile.file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(lightboxFile.file.size)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
