import { useState, useCallback, useRef, useEffect } from 'react';
import { Crop as CropIcon, Move } from 'lucide-react';
import { ImageFile, ProcessedImage, cropImage, CropArea } from '@/lib/imageProcessing';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ImageUploader from './ImageUploader';
import ProcessingResults from './ProcessingResults';
import CropOverlay, { Rect } from './CropOverlay';

const CropMode = () => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 200, height: 200 });
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ProcessedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [displayScale, setDisplayScale] = useState(1);

  const currentImage = images[0];

  // Initialize crop area when image loads
  useEffect(() => {
    if (currentImage?.width && currentImage?.height) {
      const initialWidth = Math.min(200, currentImage.width);
      const initialHeight = Math.min(200, currentImage.height);
      setCropArea({
        x: Math.floor((currentImage.width - initialWidth) / 2),
        y: Math.floor((currentImage.height - initialHeight) / 2),
        width: initialWidth,
        height: initialHeight,
      });
    }
  }, [currentImage]);

  // Calculate display scale for the preview
  useEffect(() => {
    if (containerRef.current && currentImage?.width) {
      const containerWidth = containerRef.current.clientWidth;
      const maxWidth = Math.min(containerWidth, 600);
      setDisplayScale(maxWidth / currentImage.width);
    }
  }, [currentImage]);

  const handleMouseDown = useCallback((e: React.MouseEvent, action: 'move' | string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (action === 'move') {
      setIsDragging(true);
    } else {
      setIsResizing(action);
    }
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!currentImage?.width || !currentImage?.height) return;
    
    const deltaX = (e.clientX - dragStart.x) / displayScale;
    const deltaY = (e.clientY - dragStart.y) / displayScale;

    if (isDragging) {
      setCropArea(prev => ({
        ...prev,
        x: Math.max(0, Math.min(currentImage.width - prev.width, prev.x + deltaX)),
        y: Math.max(0, Math.min(currentImage.height - prev.height, prev.y + deltaY)),
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (isResizing) {
      setCropArea(prev => {
        let newArea = { ...prev };
        
        if (isResizing.includes('e')) {
          newArea.width = Math.max(50, Math.min(currentImage.width - prev.x, prev.width + deltaX));
        }
        if (isResizing.includes('w')) {
          const newWidth = Math.max(50, prev.width - deltaX);
          const newX = prev.x + (prev.width - newWidth);
          if (newX >= 0) {
            newArea.width = newWidth;
            newArea.x = newX;
          }
        }
        if (isResizing.includes('s')) {
          newArea.height = Math.max(50, Math.min(currentImage.height - prev.y, prev.height + deltaY));
        }
        if (isResizing.includes('n')) {
          const newHeight = Math.max(50, prev.height - deltaY);
          const newY = prev.y + (prev.height - newHeight);
          if (newY >= 0) {
            newArea.height = newHeight;
            newArea.y = newY;
          }
        }
        
        return newArea;
      });
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, isResizing, dragStart, displayScale, currentImage]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(null);
  }, []);

  const handleCrop = async () => {
    if (!currentImage) return;

    setProcessing(true);
    
    try {
      const roundedCropArea = {
        x: Math.round(cropArea.x),
        y: Math.round(cropArea.y),
        width: Math.round(cropArea.width),
        height: Math.round(cropArea.height),
      };
      const result = await cropImage(currentImage, roundedCropArea);
      setResults([result]);
    } catch (error) {
      console.error('Не удалось обрезать:', error);
    }
    
    setProcessing(false);
  };

  const handleReset = () => {
    setImages([]);
    setResults([]);
    setCropArea({ x: 0, y: 0, width: 200, height: 200 });
  };

  if (results.length > 0) {
    return (
      <ProcessingResults
        results={results}
        onReset={handleReset}
        title="Обрезка завершена"
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-foreground mb-2">Обрезать изображение</h2>
        <p className="text-muted-foreground">
          Выберите и обрежьте нужную область изображения
        </p>
      </div>

      <ImageUploader images={images} onImagesChange={setImages} singleFile />

      {currentImage && (
        <div className="card-elevated p-6 animate-fade-in">
          <h3 className="text-lg font-medium text-foreground mb-4">Область обрезки</h3>
          
          {/* Manual Controls */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="crop-x">Позиция X (пикс.)</Label>
              <Input
                id="crop-x"
                type="number"
                min={0}
                max={currentImage.width ? currentImage.width - cropArea.width : 0}
                value={Math.round(cropArea.x)}
                onChange={(e) => setCropArea(prev => ({ ...prev, x: parseInt(e.target.value) || 0 }))}
                disabled={processing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="crop-y">Позиция Y (пикс.)</Label>
              <Input
                id="crop-y"
                type="number"
                min={0}
                max={currentImage.height ? currentImage.height - cropArea.height : 0}
                value={Math.round(cropArea.y)}
                onChange={(e) => setCropArea(prev => ({ ...prev, y: parseInt(e.target.value) || 0 }))}
                disabled={processing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="crop-width">Ширина (пикс.)</Label>
              <Input
                id="crop-width"
                type="number"
                min={50}
                max={currentImage.width ? currentImage.width - cropArea.x : 1000}
                value={Math.round(cropArea.width)}
                onChange={(e) => setCropArea(prev => ({ ...prev, width: parseInt(e.target.value) || 50 }))}
                disabled={processing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="crop-height">Высота (пикс.)</Label>
              <Input
                id="crop-height"
                type="number"
                min={50}
                max={currentImage.height ? currentImage.height - cropArea.y : 1000}
                value={Math.round(cropArea.height)}
                onChange={(e) => setCropArea(prev => ({ ...prev, height: parseInt(e.target.value) || 50 }))}
                disabled={processing}
              />
            </div>
          </div>

          {/* Visual Crop Editor */}
          <div 
            ref={containerRef}
            className="relative overflow-hidden rounded-lg bg-muted border border-border"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div 
              className="relative mx-auto"
              style={{ 
                width: currentImage.width ? currentImage.width * displayScale : 'auto',
                maxWidth: '100%'
              }}
            >
              {/* Background Image (dimmed) */}
              <img
                src={currentImage.preview}
                alt="Предпросмотр обрезки"
                className="w-full h-auto" // No opacity, overlay handles dimming
                draggable={false}
              />

              <CropOverlay
                containerWidth={currentImage.width * displayScale}
                containerHeight={currentImage.height * displayScale}
                selection={{
                  x: cropArea.x * displayScale,
                  y: cropArea.y * displayScale,
                  width: cropArea.width * displayScale,
                  height: cropArea.height * displayScale,
                }}
                onStartDrag={(e) => handleMouseDown(e, 'move')}
                onStartResize={handleMouseDown}
              />
            </div>
          </div>

          <p className="text-sm text-muted-foreground mt-3 text-center">
            Перетаскивайте для перемещения • Тяните за углы или края для изменения размера
          </p>

          <div className="mt-6 flex justify-center">
            <button
              onClick={handleCrop}
              disabled={processing}
              className="btn-brand min-w-[200px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CropIcon className="w-5 h-5 mr-2" />
              {processing ? 'Обрезка...' : 'Обрезать изображение'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CropMode;