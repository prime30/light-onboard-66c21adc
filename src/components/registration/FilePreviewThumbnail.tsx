import { useState, useEffect } from "react";
import { FileText, FileCheck, X, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

interface FilePreviewThumbnailProps {
  file: File;
  label?: string;
  size?: "sm" | "md";
  showLabel?: boolean;
  onRemove?: () => void;
}

export function FilePreviewThumbnail({
  file,
  label,
  size = "sm",
  showLabel = true,
  onRemove,
}: FilePreviewThumbnailProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const isImage = file.type.startsWith("image/");
  const isPdf = file.type === "application/pdf";

  useEffect(() => {
    if (!isImage) return;

    const url = URL.createObjectURL(file);
    setPreview(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file, isImage]);

  const sizeClasses = {
    sm: "w-14 h-14",
    md: "w-20 h-20",
  };

  const iconSizes = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
  };

  const ThumbnailContent = () => (
    <div
      className={cn(
        "relative rounded-lg overflow-hidden border border-border/50 bg-muted flex items-center justify-center group",
        sizeClasses[size]
      )}
    >
      {isImage && preview ? (
        <>
          <img src={preview} alt={file.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors flex items-center justify-center">
            <ZoomIn className="w-4 h-4 text-background opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </>
      ) : isPdf ? (
        <FileText className={cn("text-red-500", iconSizes[size])} />
      ) : (
        <FileCheck className={cn("text-muted-foreground", iconSizes[size])} />
      )}

      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm hover:bg-destructive/90 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );

  if (isImage && preview) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <Dialog>
          <DialogTrigger asChild>
            <button type="button" className="cursor-zoom-in">
              <ThumbnailContent />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl p-2 bg-background/95 backdrop-blur">
            <img
              src={preview}
              alt={file.name}
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
            <p className="text-center text-sm text-muted-foreground mt-2 truncate">{file.name}</p>
          </DialogContent>
        </Dialog>
        {showLabel && label && (
          <span className="text-[10px] text-muted-foreground text-center max-w-16 truncate">
            {label}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <ThumbnailContent />
      {showLabel && label && (
        <span className="text-[10px] text-muted-foreground text-center max-w-16 truncate">
          {label}
        </span>
      )}
    </div>
  );
}

interface FilePreviewGridProps {
  files: { file: File; label: string }[];
  size?: "sm" | "md";
}

export function FilePreviewGrid({ files, size = "sm" }: FilePreviewGridProps) {
  if (files.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {files.map((item, idx) => (
        <FilePreviewThumbnail
          key={`${item.file.name}-${idx}`}
          file={item.file}
          label={item.label}
          size={size}
        />
      ))}
    </div>
  );
}
