import { useState, useRef, useCallback, useEffect } from 'react';
import { Eraser, Undo2, RotateCcw, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import ImageUploader from './ImageUploader';
import ProcessingResults from './ProcessingResults';
import { ImageFile, ProcessedImage } from '@/lib/imageProcessing';
import { removeWatermark, getMaskImageData } from '@/lib/watermarkRemoval';
import { toast } from 'sonner';

const RemoveWatermarkMode = () => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [results, setResults] = useState<ProcessedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [brushSize, setBrushSize] = useState(20);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  const selectedImage = images[0];

  // Initialize canvas when image is selected
  useEffect(() => {
    if (!selectedImage || !canvasRef.current || !maskCanvasRef.current || !containerRef.current) {
      setImageLoaded(false);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const container = containerRef.current!;
      const containerWidth = container.clientWidth;
      const maxHeight = 500;
      
      let displayWidth = img.width;
      let displayHeight = img.height;
      
      // Scale to fit container
      if (displayWidth > containerWidth) {
        const ratio = containerWidth / displayWidth;
        displayWidth = containerWidth;
        displayHeight = img.height * ratio;
      }
      
      if (displayHeight > maxHeight) {
        const ratio = maxHeight / displayHeight;
        displayHeight = maxHeight;
        displayWidth = displayWidth * ratio;
      }

      setCanvasSize({ width: displayWidth, height: displayHeight });

      const canvas = canvasRef.current!;
      const maskCanvas = maskCanvasRef.current!;
      
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      maskCanvas.width = displayWidth;
      maskCanvas.height = displayHeight;

      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, displayWidth, displayHeight);

      // Clear mask canvas
      const maskCtx = maskCanvas.getContext('2d')!;
      maskCtx.clearRect(0, 0, displayWidth, displayHeight);
      
      setHistory([]);
      setImageLoaded(true);
    };
    img.src = selectedImage.preview;
  }, [selectedImage]);

  const saveHistory = useCallback(() => {
    if (!maskCanvasRef.current) return;
    const ctx = maskCanvasRef.current.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
    setHistory(prev => [...prev, imageData]);
  }, []);

  const getCanvasCoordinates = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  const draw = useCallback((x: number, y: number) => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(255, 100, 100, 0.5)';
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
  }, [brushSize]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    saveHistory();
    setIsDrawing(true);
    const { x, y } = getCanvasCoordinates(e);
    draw(x, y);
  }, [saveHistory, getCanvasCoordinates, draw]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing) return;
    const { x, y } = getCanvasCoordinates(e);
    draw(x, y);
  }, [isDrawing, getCanvasCoordinates, draw]);

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    saveHistory();
    setIsDrawing(true);
    const { x, y } = getCanvasCoordinates(e);
    draw(x, y);
  }, [saveHistory, getCanvasCoordinates, draw]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getCanvasCoordinates(e);
    draw(x, y);
  }, [isDrawing, getCanvasCoordinates, draw]);

  const handleUndo = useCallback(() => {
    if (history.length === 0 || !maskCanvasRef.current) return;
    
    const ctx = maskCanvasRef.current.getContext('2d')!;
    const lastState = history[history.length - 1];
    ctx.putImageData(lastState, 0, 0);
    setHistory(prev => prev.slice(0, -1));
  }, [history]);

  const handleReset = useCallback(() => {
    if (!maskCanvasRef.current) return;
    const ctx = maskCanvasRef.current.getContext('2d')!;
    ctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
    setHistory([]);
  }, []);

  const handleProcess = useCallback(async () => {
    if (!selectedImage || !maskCanvasRef.current) {
      toast.error('Пожалуйста, выберите область для удаления');
      return;
    }

    const maskData = getMaskImageData(maskCanvasRef.current);
    
    // Check if any area is marked
    let hasMarkedArea = false;
    for (let i = 3; i < maskData.data.length; i += 4) {
      if (maskData.data[i] > 0) {
        hasMarkedArea = true;
        break;
      }
    }

    if (!hasMarkedArea) {
      toast.error('Пожалуйста, выделите область водяного знака');
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      const result = await removeWatermark(selectedImage, maskData, setProgress);
      setResults([result]);
      toast.success('Водяной знак удален');
    } catch (error) {
      console.error('Error removing watermark:', error);
      toast.error('Ошибка при удалении водяного знака');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  }, [selectedImage]);

  const handleFullReset = () => {
    setImages([]);
    setResults([]);
    setProgress(0);
    setHistory([]);
    setImageLoaded(false);
  };

  if (results.length > 0) {
    return (
      <ProcessingResults
        results={results}
        onReset={handleFullReset}
        title="Водяной знак удален"
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
          Удалить водяной знак
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Выделите область с водяным знаком кистью и нажмите «Удалить». 
          Обработка происходит в браузере.
        </p>
      </div>

      {images.length === 0 ? (
        <ImageUploader 
          images={images} 
          onImagesChange={setImages}
          maxFiles={1}
          singleFile
        />
      ) : (
        <div className="space-y-6">
          {/* Brush Controls */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                  Размер кисти:
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setBrushSize(Math.max(5, brushSize - 5))}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <Slider
                  value={[brushSize]}
                  onValueChange={(v) => setBrushSize(v[0])}
                  min={5}
                  max={100}
                  step={5}
                  className="flex-1 max-w-[150px]"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setBrushSize(Math.min(100, brushSize + 5))}
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground w-10">{brushSize}px</span>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUndo}
                  disabled={history.length === 0}
                  className="gap-2"
                >
                  <Undo2 className="w-4 h-4" />
                  Назад
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Сброс
                </Button>
              </div>
            </div>
          </div>

          {/* Canvas Area */}
          <div 
            ref={containerRef}
            className="relative bg-muted/30 rounded-xl border border-border overflow-hidden flex items-center justify-center min-h-[300px]"
          >
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            )}
            <div className="relative" style={{ width: canvasSize.width, height: canvasSize.height }}>
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0"
                style={{ display: imageLoaded ? 'block' : 'none' }}
              />
              <canvas
                ref={maskCanvasRef}
                className="absolute top-0 left-0 cursor-crosshair"
                style={{ 
                  display: imageLoaded ? 'block' : 'none',
                  cursor: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${brushSize}' height='${brushSize}'%3E%3Ccircle cx='${brushSize/2}' cy='${brushSize/2}' r='${brushSize/2 - 1}' fill='rgba(255,100,100,0.3)' stroke='%23ff6464' stroke-width='1'/%3E%3C/svg%3E") ${brushSize/2} ${brushSize/2}, crosshair`,
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
              />
            </div>
          </div>

          {/* Hint */}
          <p className="text-sm text-muted-foreground text-center">
            Закрасьте водяной знак кистью. Выделенная область будет удалена.
          </p>

          {/* Process Button */}
          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              onClick={handleFullReset}
            >
              Выбрать другое изображение
            </Button>
            <Button
              onClick={handleProcess}
              disabled={isProcessing}
              className="btn-brand min-w-[200px] h-12 text-base"
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Обработка...</span>
                </div>
              ) : (
                <>
                  <Eraser className="w-5 h-5 mr-2" />
                  Удалить
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

export default RemoveWatermarkMode;
