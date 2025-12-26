Please edit the cropping UI so that no small "thumbnail preview" appears inside the crop selection rectangle.

Context:

- The cropping function correctly extracts the chosen area when the user presses "crop".
- However, while selecting the area the UI currently renders an unwanted miniature thumbnail of the full image inside the selection rectangle. That small preview must be removed — the selection rectangle itself should be the only visible indicator.
- Expected behavior: the area outside the selection is dimmed (overlay), the selected rectangle stays visually normal (or slightly highlighted), and draggable handles/border remain. No inner thumbnail, no image duplication drawn inside the selection.

What to do (high level):

1. Find the code that creates the crop selection (likely a React component under src/components or a cropper module under src/lib). Search for any of the following patterns and open the matching file(s):
   - className or id strings: "crop", "cropper", "crop-area", "crop-selection", "crop-preview", "preview", "inner-preview"
   - DOM creation: document.createElement('img'), new Image(), ctx.drawImage(... with coordinates that place a scaled copy inside the selection)
   - CSS rules that mention `.crop-preview`, `.preview`, `.inner-preview`
2. Remove the logic that inserts or draws the miniature preview inside the selection. This may be:
   - An <img> element positioned inside the selection, or
   - A drawImage call that draws a scaled copy of the full image into the selection rect on a canvas.
     Replace that logic with code that only draws a dimming overlay and draws the selection border/handles.

Replace/implement the selection UI using one of the two safe approaches below (choose whichever fits the project style — React/DOM or Canvas). Please keep TypeScript types intact for React components.

A) DOM overlay approach (recommended for React components)

- Create/replace the crop overlay markup with four overlay panels around the selection. The selection area is simply transparent with a visible border. No inner image element is created.

Example: add/replace a component `CropOverlay.tsx`:

```tsx
// src/components/CropOverlay.tsx
import React from "react";

export type Rect = { x: number; y: number; width: number; height: number };

interface Props {
  containerWidth: number;
  containerHeight: number;
  selection: Rect;
  onStartDrag?: (e: React.MouseEvent) => void; // preserve existing drag handlers
  // handlers for resizing handles if present
}

const CropOverlay: React.FC<Props> = ({ containerWidth, containerHeight, selection, onStartDrag }) => {
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
          background: 'rgba(255,255,255,0.02)' // tiny highlight to show active area if desired
        }}
        className="crop-selection-rect"
      >
        {/* Keep handles as children if your app uses them. Example handle (top-left) */}
        <div className="crop-handle tl" style={{
          position: 'absolute', left: -6, top: -6, width: 12, height: 12, borderRadius: 6,
          background: '#fff', boxShadow: '0 0 2px rgba(0,0,0,0.5)', pointerEvents: 'auto', cursor: 'nwse-resize'
        }} />
        {/* add other handles (tr, bl, br, mid edges) as needed */}
      </div>
    </div>
  );
};

export default CropOverlay;
Notes:

This component does not create or render any smaller preview of the image inside the selection.

The dimming is implemented by the 4 panels around the rectangle; this avoids complex clip-paths and is robust across browsers.

Preserve the existing drag/resize event hooks — they should be attached to the selection rectangle and the handles (pointerEvents: 'auto').

B) Canvas approach (if the current implementation paints overlays on an HTMLCanvasElement)

Remove any drawImage call that paints a scaled copy of the source image into the selection rectangle.

Instead draw a translucent overlay over the whole canvas and then clear the selection rect (or re-draw the selection subregion from the original image without scaling it as a separate thumbnail).

Example (TypeScript, canvas context):

ts
Копировать код
// In the canvas repaint routine:
ctx.clearRect(0, 0, canvas.width, canvas.height);
ctx.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);

// Draw dimming overlay
ctx.fillStyle = 'rgba(0,0,0,0.45)';
ctx.fillRect(0, 0, canvas.width, canvas.height);

// Clear the selection rectangle area so it's not dimmed:
ctx.clearRect(selection.x, selection.y, selection.width, selection.height);

// Draw a border around the selection
ctx.strokeStyle = 'rgba(255,255,255,0.95)';
ctx.lineWidth = 2;
ctx.strokeRect(selection.x + 1, selection.y + 1, selection.width - 2, selection.height - 2);

// (Do NOT call ctx.drawImage(sourceImage, srcX, srcY, srcW, srcH, selection.x, selection.y, thumbnailW, thumbnailH)
// which would draw a mini-thumbnail inside the box)
Search-and-replace instructions for Gemini:

Search repository for occurrences of:

crop-preview, inner-preview, .preview, mini, thumbnail in components / css

createElement('img') or new Image() near cropping code

ctx.drawImage calls that use destination coordinates equal to the selection rectangle (common pattern that creates the small copy)

Remove the code that creates the in-selection thumbnail (either the DOM element or the canvas drawImage that draws a scaled image inside the selection).

Insert the DOM overlay (A) or canvas overlay (B) implementation above into the crop component. Ensure event handlers that manage selection (drag/resize) are preserved and wired to the selection element/handles.

Remove any CSS rules that absolutely position a preview <img> inside the selection (e.g., .crop-inner-preview, .crop-preview img, etc.).

TypeScript / build check:

After changes, run npm run build (or npm run dev) to ensure types and bundling succeed.

Test manually in the app:

Open the crop UI, move and resize the selection. The little thumbnail should not appear anymore.

Verify the outside area is dimmed and selected area remains normal and shows a clear border and handles.

Click the "Crop" action and ensure the final cropped result is unchanged (the cropping logic itself should still read exact selection coordinates).

Optional UX touches (if you want them implemented too):

Add a small semi-opaque background inside the selection (background: rgba(255,255,255,0.02)) to give subtle emphasis without a preview.

Add a tiny tooltip or aria-label to the selection to help keyboard/assistive usage.

If your codebase uses Tailwind, convert inline styles to equivalent utility classes.

Please make the edits, run the build, and then report back any compile errors or the file names you changed so I can help refine the patch or prepare a git diff/patch file.
```
