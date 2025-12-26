import { Maximize2, Crop, FileDown, Wand2, Eraser } from 'lucide-react';

export type ProcessingMode = 'resize' | 'crop' | 'compress' | 'remove-bg' | 'remove-watermark';

interface TabNavigationProps {
  activeMode: ProcessingMode;
  onModeChange: (mode: ProcessingMode) => void;
  disabled?: boolean;
}

const tabs = [
  { id: 'resize' as ProcessingMode, label: 'Изменить размер', icon: Maximize2 },
  { id: 'crop' as ProcessingMode, label: 'Обрезать', icon: Crop },
  { id: 'compress' as ProcessingMode, label: 'Сжать', icon: FileDown },
  { id: 'remove-bg' as ProcessingMode, label: 'Удалить фон', icon: Wand2 },
  { id: 'remove-watermark' as ProcessingMode, label: 'Удалить водяной знак', icon: Eraser },
];

const TabNavigation = ({ activeMode, onModeChange, disabled }: TabNavigationProps) => {
  return (
    <div className="w-full bg-card border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex gap-1 -mb-px overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeMode === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onModeChange(tab.id)}
                disabled={disabled}
                className={`
                  flex items-center gap-2.5 px-6 py-4 text-sm font-medium transition-all duration-200
                  border-b-2 whitespace-nowrap relative
                  ${isActive 
                    ? 'text-primary border-primary' 
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : ''}`} />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TabNavigation;
