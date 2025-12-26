import { useState } from 'react';
import { FileDown, Gauge, Zap, Sparkles } from 'lucide-react';
import { ImageFile, ProcessedImage, compressImage, CompressionMode, formatFileSize } from '@/lib/imageProcessing';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import ImageUploader from './ImageUploader';
import ProcessingResults from './ProcessingResults';

const compressionModes = [
  {
    value: 'balanced' as CompressionMode,
    label: 'Сбалансированный',
    description: 'Хороший баланс размера и качества',
    icon: Gauge,
  },
  {
    value: 'maximum' as CompressionMode,
    label: 'Максимальное сжатие',
    description: 'Минимальный размер файла',
    icon: Zap,
  },
  {
    value: 'quality' as CompressionMode,
    label: 'Максимальное качество',
    description: 'Лучшее качество, минимальное сжатие',
    icon: Sparkles,
  },
];

const CompressMode = () => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [mode, setMode] = useState<CompressionMode>('balanced');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessedImage[]>([]);

  const handleCompress = async () => {
    if (images.length === 0) return;

    setProcessing(true);
    setProgress(0);
    setResults([]);

    const processedImages: ProcessedImage[] = [];

    for (let i = 0; i < images.length; i++) {
      try {
        const result = await compressImage(images[i], mode);
        processedImages.push(result);
        setProgress(((i + 1) / images.length) * 100);
      } catch (error) {
        console.error(`Не удалось сжать ${images[i].name}:`, error);
      }
    }

    setResults(processedImages);
    setProcessing(false);
  };

  const handleReset = () => {
    setImages([]);
    setResults([]);
    setProgress(0);
  };

  // Calculate estimated savings
  const totalOriginalSize = images.reduce((sum, img) => sum + img.size, 0);
  const estimatedReduction = mode === 'maximum' ? 60 : mode === 'balanced' ? 40 : 20;
  const estimatedNewSize = totalOriginalSize * (1 - estimatedReduction / 100);

  if (results.length > 0) {
    return (
      <ProcessingResults
        results={results}
        onReset={handleReset}
        title="Сжатие завершено"
        showCompressionStats
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-foreground mb-2">Сжать изображение</h2>
        <p className="text-muted-foreground">
          Уменьшите размер файла с сохранением визуального качества
        </p>
      </div>

      <ImageUploader images={images} onImagesChange={setImages} />

      {images.length > 0 && (
        <div className="card-elevated p-6 animate-fade-in">
          <h3 className="text-lg font-medium text-foreground mb-4">Режим сжатия</h3>
          
          <RadioGroup
            value={mode}
            onValueChange={(value) => setMode(value as CompressionMode)}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
            disabled={processing}
          >
            {compressionModes.map((option) => {
              const Icon = option.icon;
              return (
                <div key={option.value}>
                  <RadioGroupItem
                    value={option.value}
                    id={option.value}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={option.value}
                    className={`
                      flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer
                      transition-all duration-200
                      ${mode === option.value 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-muted-foreground'
                      }
                    `}
                  >
                    <Icon className={`w-6 h-6 ${mode === option.value ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="font-medium text-foreground">{option.label}</span>
                    <span className="text-xs text-muted-foreground text-center">{option.description}</span>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>

          {/* Estimated Savings */}
          <div className="mt-6 p-4 rounded-lg bg-muted">
            <h4 className="text-sm font-medium text-foreground mb-2">Ожидаемая экономия</h4>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Оригинал: </span>
                <span className="font-medium text-foreground">{formatFileSize(totalOriginalSize)}</span>
              </div>
              <div className="text-muted-foreground">→</div>
              <div>
                <span className="text-muted-foreground">Ожидаемый: </span>
                <span className="font-medium text-primary">{formatFileSize(estimatedNewSize)}</span>
              </div>
              <div className="ml-auto px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">
                ~{estimatedReduction}% меньше
              </div>
            </div>
          </div>

          {/* Processing Progress */}
          {processing && (
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Сжатие...</span>
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
              onClick={handleCompress}
              disabled={processing}
              className="btn-brand min-w-[200px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileDown className="w-5 h-5 mr-2" />
              {processing ? 'Сжатие...' : 'Сжать изображения'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompressMode;