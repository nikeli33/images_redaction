import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export interface ImageFile {
  id: string;
  file: File;
  preview: string;
  name: string;
  size: number;
  width?: number;
  height?: number;
}

export interface ProcessedImage {
  id: string;
  originalFile: ImageFile;
  processedBlob: Blob;
  processedUrl: string;
  newWidth: number;
  newHeight: number;
  newSize: number;
  compressionRatio?: number;
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type CompressionMode = 'balanced' | 'maximum' | 'quality';

// Load image and get dimensions
export const loadImage = (file: File): Promise<ImageFile> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          id: crypto.randomUUID(),
          file,
          preview: e.target?.result as string,
          name: file.name,
          size: file.size,
          width: img.width,
          height: img.height,
        });
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Resize image
export const resizeImage = async (
  imageFile: ImageFile,
  targetWidth: number,
  targetHeight: number
): Promise<ProcessedImage> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Use high-quality image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      
      const mimeType = imageFile.file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const quality = mimeType === 'image/jpeg' ? 0.92 : undefined;
      
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }
          resolve({
            id: crypto.randomUUID(),
            originalFile: imageFile,
            processedBlob: blob,
            processedUrl: URL.createObjectURL(blob),
            newWidth: targetWidth,
            newHeight: targetHeight,
            newSize: blob.size,
          });
        },
        mimeType,
        quality
      );
    };
    img.onerror = reject;
    img.src = imageFile.preview;
  });
};

// Crop image
export const cropImage = async (
  imageFile: ImageFile,
  cropArea: CropArea
): Promise<ProcessedImage> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = cropArea.width;
      canvas.height = cropArea.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      ctx.drawImage(
        img,
        cropArea.x,
        cropArea.y,
        cropArea.width,
        cropArea.height,
        0,
        0,
        cropArea.width,
        cropArea.height
      );
      
      const mimeType = imageFile.file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const quality = mimeType === 'image/jpeg' ? 0.92 : undefined;
      
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }
          resolve({
            id: crypto.randomUUID(),
            originalFile: imageFile,
            processedBlob: blob,
            processedUrl: URL.createObjectURL(blob),
            newWidth: cropArea.width,
            newHeight: cropArea.height,
            newSize: blob.size,
          });
        },
        mimeType,
        quality
      );
    };
    img.onerror = reject;
    img.src = imageFile.preview;
  });
};

// Helper: convert canvas to blob (promise)
const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> =>
  new Promise((res) => {
    // toBlob callback may pass null in some browsers on error
    try {
      canvas.toBlob((b) => res(b), type, quality);
    } catch (e) {
      // Some browsers throw on unsupported mime types; return null
      res(null);
    }
  });

// Helper: detect transparency (slow for very large images, but ok for single-file processing)
const hasTransparency = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D | null): boolean => {
  if (!ctx) return false;
  try {
    const w = canvas.width;
    const h = canvas.height;
    // Sample pixels instead of scanning all to speed up large images:
    const stepX = Math.max(1, Math.floor(w / 50));
    const stepY = Math.max(1, Math.floor(h / 50));
    const data = ctx.getImageData(0, 0, w, h).data;
    for (let y = 0; y < h; y += stepY) {
      for (let x = 0; x < w; x += stepX) {
        const idx = (y * w + x) * 4;
        const alpha = data[idx + 3];
        if (alpha < 255) return true;
      }
    }
  } catch (e) {
    // if getImageData is blocked (cross-origin), assume no transparency to avoid failing.
    return false;
  }
  return false;
};

// Try progressively compressing to targetType (jpeg/webp), decreasing quality until blob.size < original or minQuality reached
const tryCompressWithQuality = async (
  canvas: HTMLCanvasElement,
  originalSize: number,
  targetType: string,
  startQuality: number,
  minQuality = 0.45,
  step = 0.05
): Promise<Blob | null> => {
  let q = Math.min(0.99, Math.max(0.05, startQuality));
  // try a few rounds; if first attempt already smaller, return it
  for (let attempt = 0; attempt < 12 && q >= minQuality; attempt++) {
    const blob = await canvasToBlob(canvas, targetType, targetType === 'image/png' ? undefined : q);
    if (!blob) { q -= step; continue; }
    if (blob.size < originalSize || q <= minQuality) return blob;
    // lower quality and retry
    q = +(q - step).toFixed(3);
  }
  // last fallback: try one final lowest-quality attempt
  const final = await canvasToBlob(canvas, targetType, minQuality);
  return final;
};

// Compress image
export const compressImage = async (
  imageFile: ImageFile,
  mode: CompressionMode
): Promise<ProcessedImage> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      try {
        // scale logic: keep as before (only shrink for 'maximum' and super-large images)
        let scale = 1;
        if (mode === 'maximum' && (img.width > 2000 || img.height > 2000)) {
          scale = 2000 / Math.max(img.width, img.height);
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Could not get canvas context')); return; }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // detect transparency
        const transparent = hasTransparency(canvas, ctx);

        // choose initial quality based on mode (higher = higher visual quality, lower compression)
        let startQuality = 0.8;
        switch (mode) {
          case 'maximum': startQuality = 0.65; break;
          case 'quality': startQuality = 0.95; break;
          case 'balanced':
          default: startQuality = 0.80; break;
        }

        const originalSize = imageFile.size;

        // capability detection for webp
        let webpSupported = false;
        try {
          // Safari older versions may throw; try toDataURL
          const tiny = canvas.toDataURL('image/webp');
          webpSupported = tiny.indexOf('data:image/webp') === 0;
        } catch (e) {
          webpSupported = false;
        }

        // Strategy:
        // 1) If webpSupported => try webp first (supports alpha).
        // 2) Else if original is PNG and NOT transparent => convert to JPEG.
        // 3) Else fallback to original type (PNG or JPEG) using iterative quality (PNG ignores quality).
        let finalBlob: Blob | null = null;

        if (webpSupported) {
          finalBlob = await tryCompressWithQuality(canvas, originalSize, 'image/webp', startQuality);
        }

        if (!finalBlob) {
          // If original is PNG and has no transparency, converting to JPEG can dramatically shrink size.
          const isPng = imageFile.file.type === 'image/png';
          if (isPng && !transparent) {
            // Draw white background behind image to preserve look when converting to JPEG
            const bgCanvas = document.createElement('canvas');
            bgCanvas.width = canvas.width;
            bgCanvas.height = canvas.height;
            const bgCtx = bgCanvas.getContext('2d');
            if (bgCtx) {
              bgCtx.fillStyle = '#ffffff';
              bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
              bgCtx.drawImage(canvas, 0, 0);
              finalBlob = await tryCompressWithQuality(bgCanvas, originalSize, 'image/jpeg', startQuality);
            }
          }
        }

        if (!finalBlob) {
          // Last attempts: try JPEG (if original wasn't png with transparency) or original mime type
          const preferType = imageFile.file.type === 'image/png' && transparent ? 'image/png' : 'image/jpeg';
          finalBlob = await tryCompressWithQuality(canvas, originalSize, preferType, startQuality);
        }

        if (!finalBlob) {
          reject(new Error('Failed to create compressed blob'));
          return;
        }

        // compute compression ratio (positive = size reduced, negative = size increased)
        const compressionRatio = ((originalSize - finalBlob.size) / originalSize) * 100;

        resolve({
          id: crypto.randomUUID(),
          originalFile: imageFile,
          processedBlob: finalBlob,
          processedUrl: URL.createObjectURL(finalBlob),
          newWidth: canvas.width,
          newHeight: canvas.height,
          newSize: finalBlob.size,
          compressionRatio, // allow negative values so UI can show growth
        });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (e) => reject(new Error('Image load error'));
    // imageFile.preview is a data URL created earlier
    img.src = imageFile.preview;
  });
};

// Download single file
export const downloadFile = (processedImage: ProcessedImage) => {
  const extension = processedImage.processedBlob.type === 'image/png' ? '.png' : '.jpg';
  const baseName = processedImage.originalFile.name.replace(/\.[^/.]+$/, '');
  saveAs(processedImage.processedBlob, `${baseName}_processed${extension}`);
};

// Download all as ZIP
export const downloadAllAsZip = async (processedImages: ProcessedImage[]) => {
  const zip = new JSZip();
  
  processedImages.forEach((img, index) => {
    const extension = img.processedBlob.type === 'image/png' ? '.png' : '.jpg';
    const baseName = img.originalFile.name.replace(/\.[^/.]+$/, '');
    zip.file(`${baseName}_processed_${index + 1}${extension}`, img.processedBlob);
  });
  
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, 'processed_images.zip');
};

// Format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Validate file type
export const isValidImageType = (file: File): boolean => {
  return ['image/jpeg', 'image/png', 'image/jpg'].includes(file.type);
};
