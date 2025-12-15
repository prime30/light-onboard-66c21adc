/**
 * Compresses an image file using canvas
 * @param file - The image file to compress
 * @param maxWidth - Maximum width (default 1920)
 * @param maxHeight - Maximum height (default 1080)
 * @param quality - JPEG quality 0-1 (default 0.8)
 * @returns Compressed file or original if not an image/compression failed
 */
export const compressImage = async (
  file: File,
  maxWidth = 1920,
  maxHeight = 1080,
  quality = 0.8
): Promise<File> => {
  // Only compress images
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    img.onload = () => {
      URL.revokeObjectURL(img.src);

      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;

      if (!ctx) {
        resolve(file);
        return;
      }

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);

      // Determine output type
      const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
      const outputQuality = file.type === "image/png" ? undefined : quality;

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            // If compression didn't help, return original
            resolve(file);
            return;
          }

          // Create new file with compressed data
          const compressedFile = new File([blob], file.name, {
            type: outputType,
            lastModified: Date.now(),
          });

          resolve(compressedFile);
        },
        outputType,
        outputQuality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      resolve(file);
    };

    img.src = URL.createObjectURL(file);
  });
};

/**
 * Compresses multiple image files
 */
export const compressImages = async (files: File[]): Promise<File[]> => {
  return Promise.all(files.map((file) => compressImage(file)));
};
