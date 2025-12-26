import { useState, useCallback, useRef } from 'react';
import { Upload, Image as ImageIcon, X, AlertCircle } from 'lucide-react';
import { ImageFile, loadImage, isValidImageType, formatFileSize } from '@/lib/imageProcessing';
import { Button } from '@/components/ui/button';

interface ImageUploaderProps {
  images: ImageFile[];
  onImagesChange: (images: ImageFile[]) => void;
  maxFiles?: number;
  singleFile?: boolean;
}

const ImageUploader = ({ 
  images, 
  onImagesChange, 
  maxFiles = 20,
  singleFile = false 
}: ImageUploaderProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setError(null);
    const fileArray = Array.from(files);
    
    // Filter valid files
    const validFiles = fileArray.filter(file => {
      if (!isValidImageType(file)) {
        setError('Поддерживаются только JPG и PNG файлы');
        return false;
      }
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        setError('Размер файла должен быть менее 50МБ');
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Load images
    try {
      const loadedImages = await Promise.all(validFiles.map(loadImage));
      
      if (singleFile) {
        onImagesChange([loadedImages[0]]);
      } else {
        const newImages = [...images, ...loadedImages].slice(0, maxFiles);
        onImagesChange(newImages);
      }
    } catch {
      setError('Не удалось загрузить некоторые изображения');
    }
  }, [images, onImagesChange, maxFiles, singleFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const removeImage = useCallback((id: string) => {
    onImagesChange(images.filter(img => img.id !== id));
  }, [images, onImagesChange]);

  const clearAll = useCallback(() => {
    onImagesChange([]);
    setError(null);
  }, [onImagesChange]);

  return (
    <div className="w-full space-y-4">
      {/* Upload Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`upload-zone flex flex-col items-center justify-center min-h-[200px] ${
          isDragOver ? 'drag-over' : ''
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/jpg"
          multiple={!singleFile}
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Upload className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-lg font-medium text-foreground">
              Перетащите изображения сюда
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              или нажмите для выбора файлов
            </p>
          </div>
          <Button variant="outline" className="mt-2" type="button">
            <ImageIcon className="w-4 h-4 mr-2" />
            {singleFile ? 'Выбрать изображение' : 'Выбрать изображения'}
          </Button>
          <p className="text-xs text-muted-foreground">
            Поддержка: JPG, PNG • Макс. {singleFile ? '1 файл' : `${maxFiles} файлов`} • До 50МБ каждый
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              Выбрано {images.length} {images.length === 1 ? 'изображение' : images.length < 5 ? 'изображения' : 'изображений'}
            </span>
            <Button variant="ghost" size="sm" onClick={clearAll}>
              Очистить всё
            </Button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {images.map((image) => (
              <div
                key={image.id}
                className="relative group aspect-square rounded-xl overflow-hidden border border-border bg-muted"
              >
                <img
                  src={image.preview}
                  alt={image.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(image.id);
                    }}
                    className="p-2 rounded-full bg-card text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-foreground/80 to-transparent">
                  <p className="text-xs text-card truncate">{image.name}</p>
                  <p className="text-xs text-card/70">
                    {image.width}×{image.height} • {formatFileSize(image.size)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;