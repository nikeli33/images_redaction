import { ImageIcon, ExternalLink } from 'lucide-react';

const Header = () => {
  return (
    <header className="w-full border-b border-border bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-brand-blue via-brand-teal to-brand-green shadow-md">
              <ImageIcon className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">
                <span className="text-gradient">Инструменты</span>
              </h1>
              <p className="text-xs text-muted-foreground">Изменить • Обрезать • Сжать</p>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-6">
            <span className="text-sm text-muted-foreground">Бесплатная онлайн обработка изображений</span>
            <a 
              href="#" 
              className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-secondary transition-colors"
            >
              <span>Ещё инструменты</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
