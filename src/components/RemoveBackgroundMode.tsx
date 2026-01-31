import { useState, useCallback } from 'react';
import { Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import ImageUploader from './ImageUploader';
import ProcessingResults from './ProcessingResults';
import { ImageFile, ProcessedImage } from '@/lib/imageProcessing';
import { removeBackground } from '@/lib/backgroundRemoval';
import { toast } from 'sonner';

const RemoveBackgroundMode = () => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [results, setResults] = useState<ProcessedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [modelLoading, setModelLoading] = useState(false);
  const [strength, setStrength] = useState(50); // 0-100, степень удаления фона

  const handleProcess = useCallback(async () => {
    if (images.length === 0) {
      toast.error('Пожалуйста, выберите изображения');
      return;
    }

    setIsProcessing(true);
    setModelLoading(true);
    setProgress(0);
    setResults([]);

    const processedResults: ProcessedImage[] = [];

    try {
      for (let i = 0; i < images.length; i++) {
        setCurrentImageIndex(i);

        const result = await removeBackground(images[i], (p) => {
          const baseProgress = (i / images.length) * 100;
          const imageProgress = (p / 100) * (100 / images.length);
          setProgress(Math.round(baseProgress + imageProgress));

          if (p >= 70) {
            setModelLoading(false);
          }
        }, strength / 100); // Конвертируем 0-100 в 0-1

        processedResults.push(result);
      }

      setResults(processedResults);
      toast.success(`Обработано ${processedResults.length} изображений`);
    } catch (error) {
      console.error('Error removing background:', error);
      toast.error('Ошибка при удалении фона');
    } finally {
      setIsProcessing(false);
      setModelLoading(false);
      setProgress(0);
    }
  }, [images, strength]);

  const handleReset = () => {
    setImages([]);
    setResults([]);
    setProgress(0);
  };

  if (results.length > 0) {
    return (
      <ProcessingResults
        results={results}
        onReset={handleReset}
        title="Фон удален"
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
          Удалить фон
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Автоматически удаляйте фон с изображений. Обработка происходит прямо в браузере.
        </p>
      </div>

      <ImageUploader
        images={images}
        onImagesChange={setImages}
        maxFiles={10}
      />

      {images.length > 0 && (
        <div className="space-y-6">
          {/* Info Card */}
          <div className="bg-muted/30 rounded-xl p-4 border border-border">
            <div className="flex items-start gap-3">
              <Wand2 className="w-5 h-5 text-primary mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Как это работает</p>
                <p>
                  Используется нейросеть для сегментации изображения.
                  Первая обработка может занять больше времени из-за загрузки модели.
                </p>
              </div>
            </div>
          </div>

          {/* Strength Slider */}
          <div className="bg-muted/30 rounded-xl p-4 border border-border">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">
                  Степень удаления фона
                </label>
                <span className="text-sm text-muted-foreground font-mono">
                  {strength}%
                </span>
              </div>
              <Slider
                value={[strength]}
                onValueChange={(value) => setStrength(value[0])}
                min={0}
                max={100}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Мягко</span>
                <span>Агрессивно</span>
              </div>
            </div>
          </div>

          {/* Process Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleProcess}
              disabled={isProcessing || images.length === 0}
              className="btn-brand min-w-[200px] h-12 text-base"
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>
                    {modelLoading
                      ? 'Загрузка модели...'
                      : `Обработка ${currentImageIndex + 1}/${images.length}...`
                    }
                  </span>
                </div>
              ) : (
                <>
                  <Wand2 className="w-5 h-5 mr-2" />
                  Удалить фон
                </>
              )}
            </Button>
          </div>

          {/* Progress Bar */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-blue to-brand-green transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {progress}% завершено
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RemoveBackgroundMode;
