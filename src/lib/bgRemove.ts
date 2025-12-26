// src/lib/bgRemove.ts
// Canvas-based background removal utilities (browser-only).
// Strategy:
// 1. Estimate background color by sampling pixels along the image borders.
// 2. For each pixel compute Euclidean distance in RGB to the bg color.
// 3. Build a mask: pixel is foreground if distance > threshold.
// 4. Apply a blur to the mask (ctx.filter = `blur(${px}px)`) to feather edges.
// 5. Use the blurred mask as alpha for an output canvas.

export type RemoveOptions = {
  strength: number; // 0..1 (0 = conservative, 1 = very aggressive)
  sampleStep?: number; // how dense to sample border for bg estimate
  baseThreshold?: number; // base distance threshold
  maxThreshold?: number; // maximum threshold when strength=1
  blurPx?: number; // maximum blur radius in px (used with strength to compute actual blur)
};

const defaultOptions: RemoveOptions = {
  strength: 0.6,
  sampleStep: 8,
  baseThreshold: 32,
  maxThreshold: 180,
  blurPx: 18,
};

// helper - read image pixels from a canvas context
function getImageDataSafe(ctx: CanvasRenderingContext2D, w: number, h: number) {
  return ctx.getImageData(0, 0, w, h);
}

function avgColorFromEdges(data: Uint8ClampedArray, w: number, h: number, step = 8) {
  let r = 0, g = 0, b = 0, count = 0;

  const pushPixel = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    r += data[i]; g += data[i + 1]; b += data[i + 2];
    count++;
  };

  for (let x = 0; x < w; x += step) { pushPixel(x, 0); pushPixel(x, h - 1); }
  for (let y = 0; y < h; y += step) { pushPixel(0, y); pushPixel(w - 1, y); }

  if (count === 0) return { r: 255, g: 255, b: 255 };
  return { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) };
}

function colorDistanceSq(r1:number,g1:number,b1:number, r2:number,g2:number,b2:number) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return dr*dr + dg*dg + db*db;
}

/**
 * removeBackgroundFromImage
 * @param sourceCanvas - canvas with original image drawn full-size
 * @param opts - control strength and parameters
 * @returns a canvas element with transparent background where background removed
 */
export async function removeBackgroundFromCanvas(
  sourceCanvas: HTMLCanvasElement,
  opts: Partial<RemoveOptions> = {}
): Promise<HTMLCanvasElement> {
  const options = { ...defaultOptions, ...opts };
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;

  // create contexts
  const srcCtx = sourceCanvas.getContext('2d');
  if (!srcCtx) throw new Error('Source canvas 2D context unavailable');

  const srcData = getImageDataSafe(srcCtx, w, h);
  const avg = avgColorFromEdges(srcData.data, w, h, options.sampleStep);

  // threshold depends on strength
  const threshold = options.baseThreshold + (options.maxThreshold - options.baseThreshold) * options.strength;
  const thresholdSq = threshold * threshold;

  // create mask canvas (single-channel drawn as grayscale)
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = w; maskCanvas.height = h;
  const maskCtx = maskCanvas.getContext('2d');
  if (!maskCtx) throw new Error('Mask canvas context unavailable');

  // create ImageData for mask
  const maskImage = maskCtx.createImageData(w, h);
  const maskBuf = maskImage.data;

  // build hard mask (255 = foreground, 0 = background)
  for (let i = 0; i < srcData.data.length; i += 4) {
    const r = srcData.data[i];
    const g = srcData.data[i + 1];
    const b = srcData.data[i + 2];

    const distSq = colorDistanceSq(r, g, b, avg.r, avg.g, avg.b);
    const isFg = distSq > thresholdSq ? 255 : 0;
    // write grayscale into mask RGBA
    const mi = i;
    maskBuf[mi] = isFg;
    maskBuf[mi + 1] = isFg;
    maskBuf[mi + 2] = isFg;
    maskBuf[mi + 3] = 255;
  }

  maskCtx.putImageData(maskImage, 0, 0);

  // Apply blur to mask for feathering using canvas filter (supported broadly)
  const featherPx = Math.round(options.blurPx * options.strength);
  const blurredMaskCanvas = document.createElement('canvas');
  blurredMaskCanvas.width = w; blurredMaskCanvas.height = h;
  const bctx = blurredMaskCanvas.getContext('2d');
  if (!bctx) throw new Error('Blur mask context unavailable');

  if (featherPx > 0) {
    bctx.filter = `blur(${featherPx}px)`;
  }
  // Draw mask into blurred canvas (this will blur the white/black mask)
  bctx.drawImage(maskCanvas, 0, 0);

  // Now create output canvas and set alpha from blurred mask
  const outCanvas = document.createElement('canvas');
  outCanvas.width = w; outCanvas.height = h;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) throw new Error('Output canvas context unavailable');

  // draw original image
  outCtx.drawImage(sourceCanvas, 0, 0);

  // extract blurred mask pixels (we'll use red channel as alpha source)
  const blurredMaskData = bctx.getImageData(0, 0, w, h).data;
  const outImageData = outCtx.getImageData(0, 0, w, h);
  const outBuf = outImageData.data;

  // Map mask to alpha. If strength is low, preserve some background by scaling alpha.
  const alphaScale = 1.0; // already modulated by threshold and blur

  for (let i = 0; i < outBuf.length; i += 4) {
    const maskVal = blurredMaskData[i]; // 0..255
    // scale alpha by maskVal and alphaScale
    const newAlpha = Math.round((maskVal / 255) * 255 * alphaScale);
    outBuf[i + 3] = newAlpha;
  }

  outCtx.putImageData(outImageData, 0, 0);
  return outCanvas;
}