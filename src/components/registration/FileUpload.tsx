import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, FileCheck, Loader2, FileText, AlertCircle, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/imageCompression";

interface FileUploadProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  accept?: string;
  placeholder?: string;
  error?: boolean;
  errorMessage?: string;
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
  return file.type.startsWith("image/") || 
    /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
};

const formatAcceptedTypes = (accept: string) => {
  return accept
    .split(",")
    .map(t => t.trim().toUpperCase().replace(".", ""))
    .join(", ");
};

export const FileUpload = ({
  file,
  onFileChange,
  accept = ".pdf,.jpg,.jpeg,.png",
  placeholder = "No file chosen",
  error = false,
  errorMessage,
  maxFileSize = MAX_FILE_SIZE_DEFAULT,
  enableCompression = true,
}: FileUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileTypeError, setFileTypeError] = useState<string | null>(null);
  const [showLightbox, setShowLightbox] = useState(false);

  // Generate preview URL for image files
  useEffect(() => {
    if (file && isImageFile(file)) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  // Close lightbox on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showLightbox) {
        setShowLightbox(false);
      }
    };
    
    if (showLightbox) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [showLightbox]);

  // Simulate file processing with progress
  useEffect(() => {
    if (!pendingFile) return;

    setIsProcessing(true);
    setProgress(0);

    // Calculate processing time based on file size (larger files = longer animation)
    const fileSizeKB = pendingFile.size / 1024;
    const baseTime = 300; // minimum time in ms
    const sizeMultiplier = Math.min(fileSizeKB / 500, 1); // max multiplier at 500KB
    const totalTime = baseTime + (sizeMultiplier * 700); // 300-1000ms total
    const steps = 20;
    const stepTime = totalTime / steps;

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      // Ease-out progress curve
      const linearProgress = currentStep / steps;
      const easedProgress = 1 - Math.pow(1 - linearProgress, 3);
      setProgress(Math.round(easedProgress * 100));

      if (currentStep >= steps) {
        clearInterval(interval);
        setIsProcessing(false);
        setProgress(100);
        onFileChange(pendingFile);
        setPendingFile(null);
      }
    }, stepTime);

    return () => clearInterval(interval);
  }, [pendingFile, onFileChange]);

  const validateFile = useCallback((selectedFile: File): boolean => {
    // Check file type
    const acceptedTypes = accept.split(",").map(t => t.trim().toLowerCase());
    const fileExt = `.${selectedFile.name.split(".").pop()?.toLowerCase()}`;
    const isValidType = acceptedTypes.some(type => 
      fileExt === type || selectedFile.type.includes(type.replace(".", ""))
    );
    
    if (!isValidType) {
      const acceptedFormats = formatAcceptedTypes(accept);
      setFileTypeError(`Invalid file type. Please upload: ${acceptedFormats}`);
      return false;
    }

    // Check file size
    if (selectedFile.size > maxFileSize) {
      setFileTypeError(`File too large. Maximum size: ${formatFileSizeLimit(maxFileSize)}`);
      return false;
    }
    
    setFileTypeError(null);
    return true;
  }, [accept, maxFileSize]);

  const processFile = async (selectedFile: File) => {
    // Compress image if enabled
    let fileToProcess = selectedFile;
    if (enableCompression && selectedFile.type.startsWith("image/")) {
      fileToProcess = await compressImage(selectedFile);
    }
    
    if (validateFile(fileToProcess)) {
      setPendingFile(fileToProcess);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    if (selectedFile) {
      processFile(selectedFile);
    }
    // Reset input value so same file can be selected again
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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  }, [validateFile]);

  const handleRemoveFile = () => {
    onFileChange(null);
    setProgress(0);
    setPreviewUrl(null);
    setFileTypeError(null);
    setShowLightbox(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const clearFileTypeError = () => {
    setFileTypeError(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const hasError = error || !!fileTypeError;
  const displayErrorMessage = fileTypeError || errorMessage;

  return (
    <>
      <div className="space-y-2">
        {/* File type error banner */}
        {fileTypeError && (
          <div className="flex items-center gap-2 p-3 rounded-[12px] bg-destructive/10 border border-destructive/30 animate-in fade-in slide-in-from-top-1 duration-200">
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

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "relative flex items-center gap-4 p-4 rounded-[15px] border-2 border-dashed transition-all duration-300 overflow-hidden",
            isDragOver 
              ? "border-foreground bg-foreground/5 scale-[1.01]" 
              : hasError 
                ? "border-destructive/50 bg-destructive/5" 
                : isProcessing
                  ? "border-foreground/50 bg-foreground/5"
                  : "border-border/50 bg-muted/30 hover:border-foreground/30 hover:bg-muted/50",
            file && !hasError && !isProcessing && "border-foreground/30 bg-foreground/5"
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
            disabled={isProcessing}
          />
          
          {isProcessing ? (
            <>
              <div className="relative w-10 h-10 rounded-[10px] bg-foreground/10 flex items-center justify-center flex-shrink-0">
                <Loader2 className="w-5 h-5 text-foreground animate-spin" />
              </div>
              <div className="relative flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {pendingFile?.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-border/50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-foreground rounded-full transition-all duration-100 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-foreground tabular-nums">
                    {progress}%
                  </span>
                </div>
              </div>
            </>
          ) : file ? (
            <>
              {previewUrl ? (
                <button
                  type="button"
                  onClick={() => setShowLightbox(true)}
                  className="relative w-12 h-12 rounded-[10px] overflow-hidden flex-shrink-0 border border-border/50 group cursor-pointer"
                >
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors duration-200 flex items-center justify-center">
                    <ZoomIn className="w-4 h-4 text-background opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </div>
                </button>
              ) : (
                <div className="w-10 h-10 rounded-[10px] bg-foreground/10 flex items-center justify-center flex-shrink-0">
                  {file.type === "application/pdf" ? (
                    <FileText className="w-5 h-5 text-foreground" />
                  ) : (
                    <FileCheck className="w-5 h-5 text-foreground" />
                  )}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleRemoveFile}
                className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <div className={cn(
                "w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0 transition-colors duration-300",
                isDragOver ? "bg-foreground text-background" : "bg-muted"
              )}>
                <Upload className={cn(
                  "w-5 h-5 transition-colors duration-300",
                  isDragOver ? "text-background" : "text-muted-foreground"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm",
                  hasError ? "text-destructive" : "text-muted-foreground"
                )}>
                  {isDragOver ? "Drop file here" : placeholder}
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Drag & drop or click to browse
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "h-[40px] px-5 rounded-[10px] border-border/50 hover:bg-muted/50 flex-shrink-0",
                  hasError && "border-destructive/50"
                )}
              >
                <Upload className="w-4 h-4 mr-2" />
                Browse
              </Button>
            </>
          )}
        </div>
        {error && errorMessage && !fileTypeError && (
          <p className="text-xs text-destructive">{errorMessage}</p>
        )}
      </div>

      {/* Lightbox Modal */}
      {showLightbox && previewUrl && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200"
          onClick={() => setShowLightbox(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-background/90 backdrop-blur-md" />
          
          {/* Close button */}
          <button
            type="button"
            onClick={() => setShowLightbox(false)}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-foreground/10 hover:bg-foreground/20 transition-colors"
          >
            <X className="w-6 h-6 text-foreground" />
          </button>

          {/* Image container */}
          <div 
            className="relative max-w-[90vw] max-h-[90vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={previewUrl} 
              alt={file?.name || "Preview"} 
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
            
            {/* File info */}
            {file && (
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background/80 to-transparent rounded-b-lg">
                <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
