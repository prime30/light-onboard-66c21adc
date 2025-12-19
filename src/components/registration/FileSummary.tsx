import { useState, useEffect, useMemo } from "react";
import { FileCheck, FileText, ZoomIn, X, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadedFile {
  file: File;
  label: string;
}

interface FileSummaryProps {
  files: UploadedFile[];
  title?: string;
}

const isImageFile = (file: File) => {
  return file.type.startsWith("image/") || 
    /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const FilePreviewItem = ({ 
  file, 
  label,
  onPreview 
}: { 
  file: File; 
  label: string;
  onPreview: () => void;
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isImageFile(file)) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  return (
    <div className="flex items-center gap-3 p-3 rounded-md bg-muted/30 border border-border/30">
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
        <div className="w-10 h-10 rounded-md bg-foreground/5 flex items-center justify-center flex-shrink-0">
          {file.type === "application/pdf" ? (
            <FileText className="w-4 h-4 text-muted-foreground" />
          ) : (
            <FileCheck className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground/70">{formatFileSize(file.size)}</p>
      </div>
    </div>
  );
};

const HeaderThumbnail = ({ file }: { file: File | null }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (file && isImageFile(file)) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  if (previewUrl) {
    return (
      <div className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0 border border-border/50">
        <img 
          src={previewUrl} 
          alt="Preview" 
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className="w-8 h-8 rounded-md bg-foreground/10 flex items-center justify-center">
      <FileCheck className="w-4 h-4 text-foreground" />
    </div>
  );
};

export const FileSummary = ({ files, title = "Uploaded Documents" }: FileSummaryProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxFile, setLightboxFile] = useState<File | null>(null);

  // Find the first image file for the header thumbnail
  const firstImageFile = useMemo(() => {
    return files.find(item => isImageFile(item.file))?.file || null;
  }, [files]);

  if (files.length === 0) return null;

  const openLightbox = (file: File) => {
    if (isImageFile(file)) {
      const url = URL.createObjectURL(file);
      setLightboxUrl(url);
      setLightboxFile(file);
    }
  };

  const closeLightbox = () => {
    if (lightboxUrl) {
      URL.revokeObjectURL(lightboxUrl);
    }
    setLightboxUrl(null);
    setLightboxFile(null);
  };

  // Close on escape
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
  }, [lightboxUrl]);

  return (
    <>
      <div className="rounded-lg border border-border/50 bg-muted/20 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <HeaderThumbnail file={firstImageFile} />
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground">{files.length} file{files.length !== 1 ? "s" : ""} ready for submission</p>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
        
        {isExpanded && (
          <div className="px-4 pb-4 space-y-2 border-t border-border/30 pt-3">
            {files.map((item, index) => (
              <FilePreviewItem
                key={`${item.file.name}-${item.file.lastModified}-${index}`}
                file={item.file}
                label={item.label}
                onPreview={() => openLightbox(item.file)}
              />
            ))}
          </div>
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
              alt={lightboxFile?.name || "Preview"} 
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
            
            {lightboxFile && (
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background/80 to-transparent rounded-b-lg">
                <p className="text-sm font-medium text-foreground truncate">{lightboxFile.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(lightboxFile.size)}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
