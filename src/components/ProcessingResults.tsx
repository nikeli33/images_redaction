import { Download, RotateCcw, Package } from 'lucide-react';
import { ProcessedImage, downloadFile, downloadAllAsZip, formatFileSize } from '@/lib/imageProcessing';
import { Button } from '@/components/ui/button';

interface ProcessingResultsProps {
  results: ProcessedImage[];
  onReset: () => void;
  title: string;
  showCompressionStats?: boolean;
}

const ProcessingResults = ({ results, onReset, title, showCompressionStats }: ProcessingResultsProps) => {
  const totalOriginalSize = results.reduce((sum, r) => sum + r.originalFile.size, 0);
  const totalNewSize = results.reduce((sum, r) => sum + r.newSize, 0);
  const totalSaved = totalOriginalSize - totalNewSize;
  const savedPercentage = ((totalSaved / totalOriginalSize) * 100).toFixed(1);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Download className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">{title}</h2>
        <p className="text-muted-foreground">
          Успешно обработано {results.length} {results.length === 1 ? 'изображение' : results.length < 5 ? 'изображения' : 'изображений'}
        </p>
      </div>

      {/* Compression Stats */}
      {showCompressionStats && (
        <div className="card-elevated p-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Исходный размер</p>
              <p className="text-lg font-semibold text-foreground">{formatFileSize(totalOriginalSize)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Новый размер</p>
              <p className="text-lg font-semibold text-primary">{formatFileSize(totalNewSize)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Сэкономлено</p>
              <p className="text-lg font-semibold text-brand-green">
                {formatFileSize(totalSaved)} ({savedPercentage}%)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {results.map((result) => (
          <div key={result.id} className="card-elevated overflow-hidden">
            <div className="aspect-video bg-muted relative">
              <img
                src={result.processedUrl}
                alt={result.originalFile.name}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="p-4">
              <h4 className="font-medium text-foreground truncate mb-2">
                {result.originalFile.name}
              </h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Размеры:</span>
                  <span className="text-foreground">{result.newWidth} × {result.newHeight}px</span>
                </div>
                <div className="flex justify-between">
                  <span>Исходный размер:</span>
                  <span className="text-foreground">{formatFileSize(result.originalFile.size)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Новый размер:</span>
                  <span className="text-primary font-medium">{formatFileSize(result.newSize)}</span>
                </div>
                {result.compressionRatio !== undefined && (
                  <div className="flex justify-between">
                    <span>Уменьшено на:</span>
                    <span className="text-brand-green font-medium">{result.compressionRatio.toFixed(1)}%</span>
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => downloadFile(result)}
              >
                <Download className="w-4 h-4 mr-2" />
                Скачать
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        {results.length > 1 && (
          <button
            onClick={() => downloadAllAsZip(results)}
            className="btn-brand"
          >
            <Package className="w-5 h-5 mr-2" />
            Скачать всё (.zip)
          </button>
        )}
        <Button variant="outline" onClick={onReset} className="px-8">
          <RotateCcw className="w-4 h-4 mr-2" />
          Обработать ещё
        </Button>
      </div>
    </div>
  );
};

export default ProcessingResults;