// lib/reviews/resize.ts
/**
 * Browser-side photo shrinking for the review form. Vercel rejects request bodies over 4.5 MB, so
 * three 5 MB phone photos would never reach /api/reviews. Each photo is re-encoded at most 1600 px
 * on the long side (WebP, JPEG fallback) by the shared resizer in lib/client-image.ts.
 */
import { fitWithin, shrinkImage } from '@/lib/client-image';

export const MAX_EDGE = 1600;
export const MAX_REQUEST_PHOTO_BYTES = 4 * 1024 * 1024;
const QUALITY = 0.82;
const EXT: Record<string, string> = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };

export function scaledSize(width: number, height: number, max = MAX_EDGE): { width: number; height: number } {
  return fitWithin(width, height, max);
}

export function photosTooBig(sizes: number[]): boolean {
  return sizes.reduce((a, b) => a + b, 0) > MAX_REQUEST_PHOTO_BYTES;
}

/** Returns the original file when the browser cannot decode it or the result is not smaller. */
export async function shrinkPhoto(file: File): Promise<File> {
  if (typeof createImageBitmap !== 'function') return file;
  try {
    const blob = await shrinkImage(file, MAX_EDGE, QUALITY);
    if (blob === file || blob.size >= file.size || !EXT[blob.type]) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.' + EXT[blob.type], { type: blob.type });
  } catch {
    return file;
  }
}
