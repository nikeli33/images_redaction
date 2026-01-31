import { useState, useCallback } from 'react';
import { RotateCcw, RotateCw, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ImageUploader from './ImageUploader';
import { ImageFile } from '@/lib/imageProcessing';
import { toast } from 'sonner';

const RotateMode = () => {
    const [images, setImages] = useState<ImageFile[]>([]);
    const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
    const [isProcessing, setIsProcessing] = useState(false);
    const [processedImages, setProcessedImages] = useState<{ url: string; blob: Blob; name: string }[]>([]);
    const [showResults, setShowResults] = useState(false);

    const handleRotateLeft = () => {
        setRotation((prev) => (prev - 90 + 360) % 360);
    };

    const handleRotateRight = () => {
        setRotation((prev) => (prev + 90) % 360);
    };

    const rotateImage = useCallback(async (imageFile: ImageFile, degrees: number): Promise<{ url: string; blob: Blob; name: string }> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                // Swap width and height for 90 and 270 degree rotations
                if (degrees === 90 || degrees === 270) {
                    canvas.width = img.height;
                    canvas.height = img.width;
                } else {
                    canvas.width = img.width;
                    canvas.height = img.height;
                }

                // Move to center, rotate, then draw
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate((degrees * Math.PI) / 180);
                ctx.drawImage(img, -img.width / 2, -img.height / 2);

                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Failed to create blob'));
                            return;
                        }

                        const url = URL.createObjectURL(blob);
                        const name = imageFile.file.name.replace(/\.[^/.]+$/, '') + '_rotated.png';
                        resolve({ url, blob, name });
                    },
                    'image/png',
                    1.0
                );
            };

            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = imageFile.preview;
        });
    }, []);

    const handleProcess = useCallback(async () => {
        if (images.length === 0) {
            toast.error('Пожалуйста, выберите изображения');
            return;
        }

        if (rotation === 0) {
            toast.error('Пожалуйста, выберите угол поворота');
            return;
        }

        setIsProcessing(true);

        try {
            const results = await Promise.all(
                images.map((img) => rotateImage(img, rotation))
            );

            setProcessedImages(results);
            setShowResults(true);
            toast.success(`Повернуто ${results.length} изображений`);
        } catch (error) {
            console.error('Error rotating images:', error);
            toast.error('Ошибка при повороте изображений');
        } finally {
            setIsProcessing(false);
        }
    }, [images, rotation, rotateImage]);

    const handleDownload = (processed: { url: string; blob: Blob; name: string }) => {
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
        processedImages.forEach((img) => URL.revokeObjectURL(img.url));
        setImages([]);
        setRotation(0);
        setProcessedImages([]);
        setShowResults(false);
    };

    // Results view
    if (showResults && processedImages.length > 0) {
        return (
            <div className="space-y-8">
                <div className="text-center space-y-3">
                    <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
                        Изображения повернуты
                    </h1>
                    <p className="text-muted-foreground">
                        Скачайте результаты или обработайте новые изображения
                    </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {processedImages.map((img, index) => (
                        <div
                            key={index}
                            className="relative group bg-muted/30 rounded-xl border border-border overflow-hidden"
                        >
                            <img
                                src={img.url}
                                alt={`Rotated ${index + 1}`}
                                className="w-full h-48 object-contain p-2"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleDownload(img)}
                                    className="gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    Скачать
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
                            Скачать все
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
                    Повернуть изображение
                </h1>
                <p className="text-muted-foreground max-w-xl mx-auto">
                    Поворачивайте изображения на 90° влево или вправо. Обработка происходит прямо в браузере.
                </p>
            </div>

            <ImageUploader
                images={images}
                onImagesChange={setImages}
                maxFiles={20}
            />

            {images.length > 0 && (
                <div className="space-y-6">
                    {/* Preview with rotation */}
                    <div className="bg-muted/30 rounded-xl border border-border p-6">
                        <div className="flex flex-col items-center gap-6">
                            {/* Image preview */}
                            <div className="relative w-full max-w-md aspect-square flex items-center justify-center bg-background rounded-lg overflow-hidden">
                                <img
                                    src={images[0].preview}
                                    alt="Preview"
                                    className="max-w-full max-h-full object-contain transition-transform duration-300"
                                    style={{ transform: `rotate(${rotation}deg)` }}
                                />
                            </div>

                            {/* Rotation angle display */}
                            <div className="text-center">
                                <span className="text-2xl font-bold text-foreground">{rotation}°</span>
                                <p className="text-sm text-muted-foreground mt-1">Угол поворота</p>
                            </div>

                            {/* Rotation controls */}
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="outline"
                                    size="lg"
                                    onClick={handleRotateLeft}
                                    className="gap-2 h-14 px-6"
                                >
                                    <RotateCcw className="w-6 h-6" />
                                    <span className="hidden sm:inline">Влево 90°</span>
                                </Button>

                                <Button
                                    variant="outline"
                                    size="lg"
                                    onClick={handleRotateRight}
                                    className="gap-2 h-14 px-6"
                                >
                                    <RotateCw className="w-6 h-6" />
                                    <span className="hidden sm:inline">Вправо 90°</span>
                                </Button>
                            </div>

                            {/* Quick rotation buttons */}
                            <div className="flex gap-2">
                                {[90, 180, 270].map((deg) => (
                                    <Button
                                        key={deg}
                                        variant={rotation === deg ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setRotation(deg)}
                                        className="min-w-[60px]"
                                    >
                                        {deg}°
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Info */}
                    {images.length > 1 && (
                        <p className="text-sm text-muted-foreground text-center">
                            Выбрано {images.length} изображений. Все будут повернуты на {rotation}°
                        </p>
                    )}

                    {/* Process Button */}
                    <div className="flex justify-center">
                        <Button
                            onClick={handleProcess}
                            disabled={isProcessing || rotation === 0}
                            className="btn-brand min-w-[200px] h-12 text-base"
                        >
                            {isProcessing ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Обработка...</span>
                                </div>
                            ) : (
                                <>
                                    <RotateCw className="w-5 h-5 mr-2" />
                                    Повернуть {images.length > 1 ? `(${images.length})` : ''}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RotateMode;
