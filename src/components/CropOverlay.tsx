// src/components/CropOverlay.tsx
import React from "react";

export type Rect = { x: number; y: number; width: number; height: number };

interface Props {
  containerWidth: number;
  containerHeight: number;
  selection: Rect;
  onStartDrag?: (e: React.MouseEvent) => void; // preserve existing drag handlers
  onStartResize?: (e: React.MouseEvent, direction: string) => void;
}

const CropOverlay: React.FC<Props> = ({ containerWidth, containerHeight, selection, onStartDrag, onStartResize }) => {
  const { x, y, width, height } = selection;

  // Boundaries in pixels relative to container
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: containerWidth, height: containerHeight, pointerEvents: 'none' }}>
      {/* top overlay */}
      <div style={{
        position: 'absolute', left: 0, top: 0, width: '100%', height: y,
        background: 'rgba(0,0,0,0.45)'
      }} />
      {/* left overlay */}
      <div style={{
        position: 'absolute', left: 0, top: y, width: x, height,
        background: 'rgba(0,0,0,0.45)'
      }} />
      {/* right overlay */}
      <div style={{
        position: 'absolute', left: x + width, top: y, width: containerWidth - (x + width), height,
        background: 'rgba(0,0,0,0.45)'
      }} />
      {/* bottom overlay */}
      <div style={{
        position: 'absolute', left: 0, top: y + height, width: '100%', height: containerHeight - (y + height),
        background: 'rgba(0,0,0,0.45)'
      }} />

      {/* selection rectangle (transparent center, visible border) */}
      <div
        onMouseDown={onStartDrag}
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width,
          height,
          boxSizing: 'border-box',
          border: '2px solid rgba(255,255,255,0.95)',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.25) inset',
          pointerEvents: 'auto', // allow dragging/resizing
          background: 'transparent'
        }}
        className="crop-selection-rect"
      >
        {/* Resize handles */}
        {['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'].map((handle) => (
          <div
            key={handle}
            className={`absolute w-3 h-3 bg-primary rounded-full border-2 border-card
              ${handle.includes('n') ? 'top-0 -translate-y-1/2' : ''}
              ${handle.includes('s') ? 'bottom-0 translate-y-1/2' : ''}
              ${handle.includes('w') ? 'left-0 -translate-x-1/2' : ''}
              ${handle.includes('e') ? 'right-0 translate-x-1/2' : ''}
              ${handle === 'n' || handle === 's' ? 'left-1/2 -translate-x-1/2 cursor-ns-resize' : ''}
              ${handle === 'e' || handle === 'w' ? 'top-1/2 -translate-y-1/2 cursor-ew-resize' : ''}
              ${handle.includes('n') && handle.includes('w') ? 'cursor-nw-resize' : ''}
              ${handle.includes('n') && handle.includes('e') ? 'cursor-ne-resize' : ''}
              ${handle.includes('s') && handle.includes('w') ? 'cursor-sw-resize' : ''}
              ${handle.includes('s') && handle.includes('e') ? 'cursor-se-resize' : ''}
            `}
            style={{ pointerEvents: 'auto' }} // Ensure handles are interactive
            onMouseDown={(e) => onStartResize && onStartResize(e, handle)}
          />
        ))}
      </div>
    </div>
  );
};

export default CropOverlay;
