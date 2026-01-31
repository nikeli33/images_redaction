import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/Header';
import TabNavigation, { ProcessingMode } from '@/components/TabNavigation';
import ResizeMode from '@/components/ResizeMode';
import CropMode from '@/components/CropMode';
import CompressMode from '@/components/CompressMode';
import RemoveBackgroundMode from '@/components/RemoveBackgroundMode';
import RemoveWatermarkMode from '@/components/RemoveWatermarkMode';
import RotateMode from '@/components/RotateMode';
import ConvertMode from '@/components/ConvertMode';

const Index = () => {
  const [activeMode, setActiveMode] = useState<ProcessingMode>('resize');

  const renderMode = () => {
    switch (activeMode) {
      case 'resize':
        return <ResizeMode />;
      case 'crop':
        return <CropMode />;
      case 'compress':
        return <CompressMode />;
      case 'remove-bg':
        return <RemoveBackgroundMode />;
      case 'remove-watermark':
        return <RemoveWatermarkMode />;
      case 'rotate':
        return <RotateMode />;
      case 'convert':
        return <ConvertMode />;
      default:
        return <ResizeMode />;
    }
  };

  return (
    <>
      <Helmet>
        <title>Инструменты для изображений - Изменить размер, Обрезать и Сжать онлайн | Бесплатно</title>
        <meta
          name="description"
          content="Бесплатные онлайн инструменты для обработки изображений. Измените размер до точных пикселей, обрежьте с точностью и сожмите для уменьшения размера файла с сохранением качества. Поддержка JPG и PNG."
        />
        <meta name="keywords" content="изменить размер изображения, обрезать изображение, сжать изображение, обработка изображений, онлайн инструменты, jpg компрессор, png оптимизатор" />
        <link rel="canonical" href="/" />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <TabNavigation activeMode={activeMode} onModeChange={setActiveMode} />

        <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
          <div className="max-w-4xl mx-auto">
            {renderMode()}
          </div>
        </main>

        <footer className="border-t border-border py-6 mt-auto">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            <p>
              Вся обработка происходит в вашем браузере. Ваши изображения никогда не загружаются на сервер.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Index;