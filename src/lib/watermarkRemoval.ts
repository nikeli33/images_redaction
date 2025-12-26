import type { ImageFile, ProcessedImage } from './imageProcessing';

export interface BrushStroke {
  x: number;
  y: number;
  radius: number;
}

// Simple inpainting using surrounding pixels
export const removeWatermark = async (
  imageFile: ImageFile,
  maskData: ImageData,
  onProgress?: (progress: number) => void
): Promise<ProcessedImage> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = async () => {
      try {
        onProgress?.(10);
        
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        onProgress?.(20);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Scale mask to image dimensions
        const scaledMask = scaleMaskToImage(maskData, canvas.width, canvas.height);
        onProgress?.(30);
        
        // Find marked pixels and perform inpainting
        const markedPixels: Array<{x: number, y: number}> = [];
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const maskIdx = (y * canvas.width + x) * 4;
            if (scaledMask.data[maskIdx + 3] > 0) {
              markedPixels.push({x, y});
            }
          }
        }
        
        onProgress?.(40);
        
        // Perform inpainting using surrounding pixels
        const iterations = 5;
        for (let iter = 0; iter < iterations; iter++) {
          for (const pixel of markedPixels) {
            const neighbors = getNeighborColors(data, canvas.width, canvas.height, pixel.x, pixel.y, scaledMask);
            if (neighbors.length > 0) {
              const avgColor = averageColors(neighbors);
              const idx = (pixel.y * canvas.width + pixel.x) * 4;
              data[idx] = avgColor.r;
              data[idx + 1] = avgColor.g;
              data[idx + 2] = avgColor.b;
            }
          }
          onProgress?.(40 + (iter + 1) * 10);
        }
        
        ctx.putImageData(imageData, 0, 0);
        onProgress?.(95);
        
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob'));
              return;
            }
            onProgress?.(100);
            resolve({
              id: crypto.randomUUID(),
              originalFile: imageFile,
              processedBlob: blob,
              processedUrl: URL.createObjectURL(blob),
              newWidth: canvas.width,
              newHeight: canvas.height,
              newSize: blob.size,
            });
          },
          imageFile.file.type === 'image/png' ? 'image/png' : 'image/jpeg',
          0.92
        );
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageFile.preview;
  });
};

function scaleMaskToImage(maskData: ImageData, targetWidth: number, targetHeight: number): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = maskData.width;
  canvas.height = maskData.height;
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(maskData, 0, 0);
  
  const scaledCanvas = document.createElement('canvas');
  scaledCanvas.width = targetWidth;
  scaledCanvas.height = targetHeight;
  const scaledCtx = scaledCanvas.getContext('2d')!;
  scaledCtx.drawImage(canvas, 0, 0, targetWidth, targetHeight);
  
  return scaledCtx.getImageData(0, 0, targetWidth, targetHeight);
}

function getNeighborColors(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  mask: ImageData
): Array<{r: number, g: number, b: number}> {
  const colors: Array<{r: number, g: number, b: number}> = [];
  const radius = 3;
  
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx === 0 && dy === 0) continue;
      
      const nx = x + dx;
      const ny = y + dy;
      
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      
      const maskIdx = (ny * width + nx) * 4;
      if (mask.data[maskIdx + 3] > 0) continue;
      
      const idx = (ny * width + nx) * 4;
      colors.push({
        r: data[idx],
        g: data[idx + 1],
        b: data[idx + 2],
      });
    }
  }
  
  return colors;
}

function averageColors(colors: Array<{r: number, g: number, b: number}>): {r: number, g: number, b: number} {
  const sum = colors.reduce(
    (acc, c) => ({ r: acc.r + c.r, g: acc.g + c.g, b: acc.b + c.b }),
    { r: 0, g: 0, b: 0 }
  );
  return {
    r: Math.round(sum.r / colors.length),
    g: Math.round(sum.g / colors.length),
    b: Math.round(sum.b / colors.length),
  };
}

// Create mask canvas utilities
export const createMaskCanvas = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

export const drawBrushStroke = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number
): void => {
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
};

export const getMaskImageData = (canvas: HTMLCanvasElement): ImageData => {
  const ctx = canvas.getContext('2d')!;
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
};
