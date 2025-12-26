import { pipeline, env } from '@huggingface/transformers';
import type { ImageFile, ProcessedImage } from './imageProcessing';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

const MAX_IMAGE_DIMENSION = 1024;

let segmenter: any = null;
let isModelLoading = false;

export const loadBackgroundRemovalModel = async (
  onProgress?: (progress: number) => void
): Promise<void> => {
  if (segmenter) return;
  if (isModelLoading) {
    // Wait for existing load
    while (isModelLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return;
  }
  
  isModelLoading = true;
  try {
    onProgress?.(10);
    segmenter = await pipeline(
      'image-segmentation',
      'Xenova/segformer-b0-finetuned-ade-512-512',
      {
        device: 'webgpu',
        progress_callback: (data: any) => {
          if (data.progress) {
            onProgress?.(10 + data.progress * 0.6);
          }
        },
      }
    );
    onProgress?.(70);
  } catch (error) {
    // Fallback to CPU if WebGPU not available
    segmenter = await pipeline(
      'image-segmentation',
      'Xenova/segformer-b0-finetuned-ade-512-512',
      {
        progress_callback: (data: any) => {
          if (data.progress) {
            onProgress?.(10 + data.progress * 0.6);
          }
        },
      }
    );
    onProgress?.(70);
  } finally {
    isModelLoading = false;
  }
};

function resizeImageIfNeeded(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement
): boolean {
  let width = image.naturalWidth;
  let height = image.naturalHeight;

  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    if (width > height) {
      height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
      width = MAX_IMAGE_DIMENSION;
    } else {
      width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
      height = MAX_IMAGE_DIMENSION;
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(image, 0, 0, width, height);
    return true;
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(image, 0, 0);
  return false;
}

export const removeBackground = async (
  imageFile: ImageFile,
  onProgress?: (progress: number) => void
): Promise<ProcessedImage> => {
  // Load model if not already loaded
  await loadBackgroundRemovalModel(onProgress);
  onProgress?.(75);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = async () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        resizeImageIfNeeded(canvas, ctx, img);
        onProgress?.(80);
        
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        
        const result = await segmenter(imageData);
        onProgress?.(90);
        
        if (!result || !Array.isArray(result) || result.length === 0 || !result[0].mask) {
          reject(new Error('Invalid segmentation result'));
          return;
        }
        
        // Create output canvas
        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = canvas.width;
        outputCanvas.height = canvas.height;
        const outputCtx = outputCanvas.getContext('2d');
        
        if (!outputCtx) {
          reject(new Error('Could not get output canvas context'));
          return;
        }
        
        outputCtx.drawImage(canvas, 0, 0);
        
        const outputImageData = outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
        const data = outputImageData.data;
        
        // Apply inverted mask to alpha channel
        for (let i = 0; i < result[0].mask.data.length; i++) {
          const alpha = Math.round((1 - result[0].mask.data[i]) * 255);
          data[i * 4 + 3] = alpha;
        }
        
        outputCtx.putImageData(outputImageData, 0, 0);
        onProgress?.(95);
        
        // Convert to blob (PNG for transparency)
        outputCanvas.toBlob(
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
              newWidth: outputCanvas.width,
              newHeight: outputCanvas.height,
              newSize: blob.size,
            });
          },
          'image/png',
          1.0
        );
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageFile.preview;
  });
};
