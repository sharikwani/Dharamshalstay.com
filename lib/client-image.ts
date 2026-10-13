// lib/client-image.ts
// Browser-side photo shrinking before upload. fitWithin is pure (tested); shrinkImage needs a browser.

/** Scale (w, h) down so neither side exceeds max, keeping the aspect ratio. Never scales up. */
export function fitWithin(w: number, h: number, max: number): { width: number; height: number } {
  if (w <= max && h <= max) return { width: w, height: h };
  const scale = max / Math.max(w, h);
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

const SMALL_ENOUGH = 300 * 1024;

type AnyCanvas = OffscreenCanvas | HTMLCanvasElement;

function makeCanvas(width: number, height: number): AnyCanvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  return c;
}

async function encode(canvas: AnyCanvas, type: string, quality: number): Promise<Blob | null> {
  if ('convertToBlob' in canvas) {
    try { return await canvas.convertToBlob({ type, quality }); } catch { return null; }
  }
  return new Promise((resolve) => (canvas as HTMLCanvasElement).toBlob((b) => resolve(b), type, quality));
}

/** Resize a photo to fit within max px and re-encode as WebP (JPEG if WebP is unsupported). */
export async function shrinkImage(file: File, max = 1600, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    if (file.size < SMALL_ENOUGH && bitmap.width <= max && bitmap.height <= max) return file;
    const { width, height } = fitWithin(bitmap.width, bitmap.height, max);
    const canvas = makeCanvas(width, height);
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const webp = await encode(canvas, 'image/webp', quality);
    if (webp && webp.type === 'image/webp') return webp;
    return (await encode(canvas, 'image/jpeg', quality)) ?? file;
  } finally {
    bitmap.close();
  }
}
