import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  accept?: string;
  placeholder?: string;
  error?: boolean;
  errorMessage?: string;
}

export const FileUpload = ({
  file,
  onFileChange,
  accept = ".pdf,.jpg,.jpeg,.png",
  placeholder = "No file chosen",
  error = false,
  errorMessage,
}: FileUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    onFileChange(selectedFile);
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
      // Validate file type
      const acceptedTypes = accept.split(",").map(t => t.trim().toLowerCase());
      const fileExt = `.${droppedFile.name.split(".").pop()?.toLowerCase()}`;
      
      if (acceptedTypes.some(type => fileExt === type || droppedFile.type.includes(type.replace(".", "")))) {
        onFileChange(droppedFile);
      }
    }
  }, [accept, onFileChange]);

  const handleRemoveFile = () => {
    onFileChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative flex items-center gap-4 p-4 rounded-[15px] border-2 border-dashed transition-all duration-300",
          isDragOver 
            ? "border-foreground bg-foreground/5 scale-[1.01]" 
            : error 
              ? "border-destructive/50 bg-destructive/5" 
              : "border-border/50 bg-muted/30 hover:border-foreground/30 hover:bg-muted/50",
          file && !error && "border-foreground/30 bg-foreground/5"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
        />
        
        {file ? (
          <>
            <div className="w-10 h-10 rounded-[10px] bg-foreground/10 flex items-center justify-center flex-shrink-0">
              <FileCheck className="w-5 h-5 text-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
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
                error ? "text-destructive" : "text-muted-foreground"
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
                error && "border-destructive/50"
              )}
            >
              <Upload className="w-4 h-4 mr-2" />
              Browse
            </Button>
          </>
        )}
      </div>
      {error && errorMessage && (
        <p className="text-xs text-destructive">{errorMessage}</p>
      )}
    </div>
  );
};
