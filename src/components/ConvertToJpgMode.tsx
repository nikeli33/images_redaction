import { useState, useCallback } from 'react';
import { Image as ImageIcon, Download, RefreshCw, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImageFile } from '@/lib/imageProcessing';
import { toast } from 'sonner';

interface ConvertedImage {
    url: string;
    blob: Blob;
    name: string;
    originalSize: number;
    newSize: number;
}

const ConvertToJpgMode = () => {
    const [images, setImages] = useState<ImageFile[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processedImages, setProcessedImages] = useState<ConvertedImage[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);

    const handleFileSelect = (files: FileList | null) => {
        if (!files) return;

        const pngFiles = Array.from(files).filter(file =>
            file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')
        );

        if (pngFiles.length === 0) {
            toast.error('Пожалуйста, выберите PNG изображения');
            return;
        }

        if (pngFiles.length !== files.length) {
            toast.warning(`Выбрано только ${pngFiles.length} PNG изображений из ${files.length}`);
        }

        const newImages: ImageFile[] = pngFiles.map(file => ({
            id: crypto.randomUUID(),
            file,
            preview: URL.createObjectURL(file),
            name: file.name,
            size: file.size,
            width: 0,
            height: 0,
        }));

        setImages(prev => [...prev, ...newImages]);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        handleFileSelect(e.dataTransfer.files);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const removeImage = (id: string) => {
        setImages(prev => {
            const img = prev.find(i => i.id === id);
            if (img) URL.revokeObjectURL(img.preview);
            return prev.filter(i => i.id !== id);
        });
    };

    const convertToJpg = useCallback(async (imageFile: ImageFile): Promise<ConvertedImage> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                // Fill with white background since JPG doesn't support transparency
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Draw image over white background
                ctx.drawImage(img, 0, 0);

                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Failed to create blob'));
                            return;
                        }

                        const url = URL.createObjectURL(blob);
                        const name = imageFile.file.name.replace(/\.png$/i, '.jpg');

                        resolve({
                            url,
                            blob,
                            name,
                            originalSize: imageFile.file.size,
                            newSize: blob.size,
                        });
                    },
                    'image/jpeg',
                    0.92 // High quality JPG
                );
            };

            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = imageFile.preview;
        });
    }, []);

    const handleProcess = useCallback(async () => {
        if (images.length === 0) {
            toast.error('Пожалуйста, выберите PNG изображения');
            return;
        }

        setIsProcessing(true);

        try {
            const results = await Promise.all(
                images.map((img) => convertToJpg(img))
            );

            setProcessedImages(results);
            setShowResults(true);
            toast.success(`Конвертировано ${results.length} изображений в JPG`);
        } catch (error) {
            console.error('Error converting images:', error);
            toast.error('Ошибка при конвертации изображений');
        } finally {
            setIsProcessing(false);
        }
    }, [images, convertToJpg]);

    const handleDownload = (processed: ConvertedImage) => {
        const link = document.createElement('a');
        link.href = processed.url;
        link.download = processed.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadAll = () => {
        processedImages.forEach((img, index) => {
            setTimeout(() => handleDownload(img), index * 100);
        });
    };

    const handleReset = () => {
        images.forEach((img) => URL.revokeObjectURL(img.preview));
        processedImages.forEach((img) => URL.revokeObjectURL(img.url));
        setImages([]);
        setProcessedImages([]);
        setShowResults(false);
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    // Results view
    if (showResults && processedImages.length > 0) {
        return (
            <div className="space-y-8">
                <div className="text-center space-y-3">
                    <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
                        Конвертация завершена
                    </h1>
                    <p className="text-muted-foreground">
                        {processedImages.length} изображений конвертировано из PNG в JPG
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {processedImages.map((img, index) => (
                        <div
                            key={index}
                            className="relative group bg-card rounded-xl border border-border overflow-hidden"
                        >
                            <div className="aspect-video bg-muted/30 flex items-center justify-center">
                                <img
                                    src={img.url}
                                    alt={`Converted ${index + 1}`}
                                    className="max-w-full max-h-full object-contain p-2"
                                />
                            </div>
                            <div className="p-3 space-y-2">
                                <p className="text-sm font-medium truncate">{img.name}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="text-orange-500">{formatSize(img.originalSize)}</span>
                                    <ArrowRight className="w-3 h-3" />
                                    <span className="text-green-500">{formatSize(img.newSize)}</span>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDownload(img)}
                                    className="w-full gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    Скачать JPG
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-center gap-3">
                    <Button variant="outline" onClick={handleReset}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Новые изображения
                    </Button>
                    {processedImages.length > 1 && (
                        <Button onClick={handleDownloadAll} className="btn-brand">
                            <Download className="w-4 h-4 mr-2" />
                            Скачать все JPG
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="text-center space-y-3">
                <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
                    Конвертировать PNG в JPG
                </h1>
                <p className="text-muted-foreground max-w-xl mx-auto">
                    Преобразуйте изображения из формата PNG в JPG.
                    Прозрачный фон будет заменен на белый.
                </p>
            </div>

            {/* Upload area */}
            <div
                className={`
          relative border-2 border-dashed rounded-2xl p-8 md:p-12 text-center transition-all duration-200
          ${isDragOver
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 bg-muted/20'
                    }
        `}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
            >
                <input
                    type="file"
                    accept=".png,image/png"
                    multiple
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-orange-500 rounded-2xl flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-white" />
                    </div>

                    <div>
                        <p className="text-lg font-medium text-foreground">
                            Перетащите PNG изображения сюда
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                            или нажмите для выбора файлов
                        </p>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <span className="px-2 py-1 bg-blue-500/10 text-blue-600 rounded font-medium">PNG</span>
                        <ArrowRight className="w-4 h-4" />
                        <span className="px-2 py-1 bg-orange-500/10 text-orange-600 rounded font-medium">JPG</span>
                    </div>
                </div>
            </div>

            {/* Selected images */}
            {images.length > 0 && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">
                            Выбрано {images.length} изображений
                        </h3>
                        <Button variant="outline" size="sm" onClick={handleReset}>
                            Очистить все
                        </Button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {images.map((img) => (
                            <div
                                key={img.id}
                                className="relative group aspect-square bg-muted/30 rounded-lg overflow-hidden border border-border"
                            >
                                <img
                                    src={img.preview}
                                    alt={img.name}
                                    className="w-full h-full object-cover"
                                />
                                <button
                                    onClick={() => removeImage(img.id)}
                                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold"
                                >
                                    ×
                                </button>
                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                                    <p className="text-xs text-white truncate">{formatSize(img.size)}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Process Button */}
                    <div className="flex justify-center">
                        <Button
                            onClick={handleProcess}
                            disabled={isProcessing}
                            className="btn-brand min-w-[250px] h-12 text-base"
                        >
                            {isProcessing ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Конвертация...</span>
                                </div>
                            ) : (
                                <>
                                    <ImageIcon className="w-5 h-5 mr-2" />
                                    Конвертировать в JPG
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConvertToJpgMode;
