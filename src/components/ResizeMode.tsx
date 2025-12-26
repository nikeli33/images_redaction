import { useState, useEffect, useCallback } from 'react';
import { Lock, Unlock, Maximize2 } from 'lucide-react';
import { ImageFile, ProcessedImage, resizeImage } from '@/lib/imageProcessing';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import ImageUploader from './ImageUploader';
import ProcessingResults from './ProcessingResults';

const ResizeMode = () => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [width, setWidth] = useState<number>(800);
  const [height, setHeight] = useState<number>(600);
  const [keepAspectRatio, setKeepAspectRatio] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessedImage[]>([]);

  // Update aspect ratio when first image is loaded
  useEffect(() => {
    if (images.length > 0 && images[0].width && images[0].height) {
      const ratio = images[0].width / images[0].height;
      setAspectRatio(ratio);
      setWidth(images[0].width);
      setHeight(images[0].height);
    }
  }, [images]);

  const handleWidthChange = useCallback((newWidth: number) => {
    setWidth(newWidth);
    if (keepAspectRatio && aspectRatio) {
      setHeight(Math.round(newWidth / aspectRatio));
    }
  }, [keepAspectRatio, aspectRatio]);

  const handleHeightChange = useCallback((newHeight: number) => {
    setHeight(newHeight);
    if (keepAspectRatio && aspectRatio) {
      setWidth(Math.round(newHeight * aspectRatio));
    }
  }, [keepAspectRatio, aspectRatio]);

  const handleResize = async () => {
    if (images.length === 0 || width <= 0 || height <= 0) return;

    setProcessing(true);
    setProgress(0);
    setResults([]);

    const processedImages: ProcessedImage[] = [];

    for (let i = 0; i < images.length; i++) {
      try {
        const result = await resizeImage(images[i], width, height);
        processedImages.push(result);
        setProgress(((i + 1) / images.length) * 100);
      } catch (error) {
        console.error(`Не удалось изменить размер ${images[i].name}:`, error);
      }
    }

    setResults(processedImages);
    setProcessing(false);
  };

  const handleReset = () => {
    setImages([]);
    setResults([]);
    setProgress(0);
    setWidth(800);
    setHeight(600);
  };

  if (results.length > 0) {
    return (
      <ProcessingResults
        results={results}
        onReset={handleReset}
        title="Изменение размера завершено"
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-foreground mb-2">Изменить размер изображения</h2>
        <p className="text-muted-foreground">
          Измените размер изображений до точных размеров с сохранением качества
        </p>
      </div>

      <ImageUploader images={images} onImagesChange={setImages} />

      {images.length > 0 && (
        <div className="card-elevated p-6 animate-fade-in">
          <h3 className="text-lg font-medium text-foreground mb-4">Параметры изменения размера</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="width">Ширина (пикс.)</Label>
              <Input
                id="width"
                type="number"
                min={1}
                max={10000}
                value={width}
                onChange={(e) => handleWidthChange(parseInt(e.target.value) || 0)}
                disabled={processing}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="height">Высота (пикс.)</Label>
              <Input
                id="height"
                type="number"
                min={1}
                max={10000}
                value={height}
                onChange={(e) => handleHeightChange(parseInt(e.target.value) || 0)}
                disabled={processing}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4 p-3 rounded-lg bg-muted">
            <Switch
              id="aspect-ratio"
              checked={keepAspectRatio}
              onCheckedChange={setKeepAspectRatio}
              disabled={processing}
            />
            <Label htmlFor="aspect-ratio" className="flex items-center gap-2 cursor-pointer">
              {keepAspectRatio ? (
                <Lock className="w-4 h-4 text-primary" />
              ) : (
                <Unlock className="w-4 h-4 text-muted-foreground" />
              )}
              Сохранить пропорции
            </Label>
          </div>

          {/* Processing Progress */}
          {processing && (
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Обработка...</span>
                <span className="text-foreground font-medium">{Math.round(progress)}%</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full progress-bar transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-center">
            <button
              onClick={handleResize}
              disabled={processing || width <= 0 || height <= 0}
              className="btn-brand min-w-[200px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Maximize2 className="w-5 h-5 mr-2" />
              {processing ? 'Изменение размера...' : 'Изменить размер'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResizeMode;