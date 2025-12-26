// src/components/BackgroundRemover.tsx
import React, { useRef, useState } from 'react';
import { removeBackgroundFromCanvas } from '../lib/bgRemove';

interface Props {
  imageSrc: string; // data URL or blob URL of the image to process
  onResult?: (canvas: HTMLCanvasElement) => void; // callback with result canvas
}

const BackgroundRemover: React.FC<Props> = ({ imageSrc, onResult }) => {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const previewRef = useRef<HTMLCanvasElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [strength, setStrength] = useState(60); // 0..100
  const [lastResultUrl, setLastResultUrl] = useState<string | null>(null);

  const loadToCanvas = async (img: HTMLImageElement) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context required');
    ctx.drawImage(img, 0, 0);
    return canvas;
  };

  const handleProcess = async () => {
    if (!imgRef.current) return;
    setLoading(true);
    try {
      const sourceCanvas = await loadToCanvas(imgRef.current);
      // convert strength 0..100 -> 0..1
      const s = Math.max(0, Math.min(100, strength)) / 100;
      const resultCanvas = await removeBackgroundFromCanvas(sourceCanvas, { strength: s });
      // show preview in local canvas
      if (!previewRef.current) {
        previewRef.current = document.createElement('canvas');
      }
      const preview = previewRef.current!;
      preview.width = resultCanvas.width;
      preview.height = resultCanvas.height;
      const pctx = preview.getContext('2d')!;
      pctx.clearRect(0, 0, preview.width, preview.height);
      pctx.drawImage(resultCanvas, 0, 0);

      // create blob URL to display as img in UI (optional)
      const url = preview.toDataURL('image/png');
      setLastResultUrl(url);
      if (onResult) onResult(resultCanvas);
    } catch (e) {
      console.error('Background removal failed', e);
      // consider showing a toast / user message
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-remover">
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div>
          <img
            ref={imgRef}
            src={imageSrc}
            alt="source"
            style={{ maxWidth: 420, maxHeight: 300, display: 'block' }}
            onLoad={() => { /* image loaded */ }}
          />
          <div style={{ marginTop: 8 }}>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Strength: {strength}%</label>
            <input
              type="range"
              min={0}
              max={100}
              value={strength}
              onChange={(e) => setStrength(Number(e.target.value))}
            />
          </div>
          <div style={{ marginTop: 10 }}>
            <button onClick={handleProcess} disabled={loading}>
              {loading ? 'Processing…' : 'Remove background'}
            </button>
          </div>
        </div>

        <div>
          <div style={{ marginBottom: 6, fontSize: 13 }}>Preview</div>
          {lastResultUrl ? (
            <img src={lastResultUrl} alt="result preview" style={{ maxWidth: 420, maxHeight: 300, background: '#eee' }} />
          ) : (
            <div style={{ width: 420, height: 300, background: '#f6f6f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa' }}>
              No preview yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BackgroundRemover;