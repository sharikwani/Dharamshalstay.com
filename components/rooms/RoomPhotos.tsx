// components/rooms/RoomPhotos.tsx
'use client';
import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { shrinkImage } from '@/lib/client-image';
import { LIMITS } from '@/lib/rooms/validate';

const BUCKET = 'property-images';
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;
const BAD_FILE = 'Photos must be JPEG, PNG or WebP, up to 5 MB.';
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

type Props = {
  images: string[];
  /** Remove/reorder: the full new list. */
  onChange: (images: string[]) => void;
  /** Finished uploads: the parent appends them to its current list (re-applying the cap). */
  onAdd: (urls: string[]) => void;
  onUploadingChange?: (uploading: boolean) => void;
  userId: string;
  folder: string;
};

/** Room-type photos: upload (shrunk first), remove, reorder. Up to LIMITS.images. */
export default function RoomPhotos({ images, onChange, onAdd, onUploadingChange, folder }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const max = LIMITS.images;

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setError('');
    const room = max - images.length;
    const ok = files.filter((f) => TYPES.includes(f.type) && f.size <= MAX_BYTES);
    let problem = ok.length < files.length ? BAD_FILE : '';
    if (ok.length > room) problem = `You can add ${room} more photo${room === 1 ? '' : 's'} (${max} max).`;
    const batch = ok.slice(0, Math.max(0, room));

    setUploading(true);
    onUploadingChange?.(true);
    const added: string[] = [];
    for (const file of batch) {
      try {
        const blob = await shrinkImage(file);
        const type = blob.type || file.type;
        const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${EXT[type] || 'jpg'}`;
        const { data, error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, blob, { cacheControl: '3600', upsert: false, contentType: type });
        if (upErr) { problem = `Could not upload ${file.name}: ${upErr.message}`; continue; }
        added.push(supabase.storage.from(BUCKET).getPublicUrl(data.path).data.publicUrl);
      } catch {
        problem = `Could not read ${file.name}. Try a different photo.`;
      }
    }
    if (added.length) onAdd(added);
    if (problem) setError(problem);
    setUploading(false);
    onUploadingChange?.(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  function move(i: number, by: -1 | 1) {
    const j = i + by;
    if (uploading || j < 0 || j >= images.length) return;
    const next = [...images];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">Photos</span>
        <span className="text-xs text-slate-500">{images.length} of {max}</span>
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {images.map((url, i) => (
          <div key={`${url}-${i}`} className="relative aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Room photo ${i + 1}`} className="w-full h-full object-cover" />
            <button type="button" aria-label="Remove photo" disabled={uploading} onClick={() => onChange(images.filter((_, k) => k !== i))}
              className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 disabled:opacity-40"><X className="h-3 w-3" /></button>
            <div className="absolute bottom-1 inset-x-1 flex justify-between">
              <button type="button" aria-label="Move photo left" disabled={uploading || i === 0} onClick={() => move(i, -1)}
                className="bg-white/90 rounded-full p-0.5 text-slate-700 disabled:opacity-0"><ChevronLeft className="h-3.5 w-3.5" /></button>
              <button type="button" aria-label="Move photo right" disabled={uploading || i === images.length - 1} onClick={() => move(i, 1)}
                className="bg-white/90 rounded-full p-0.5 text-slate-700 disabled:opacity-0"><ChevronRight className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        ))}
        {images.length < max && (
          <label className={`aspect-[4/3] flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded-lg text-xs cursor-pointer transition-colors ${
            uploading ? 'border-brand-300 bg-brand-50 text-brand-600' : 'border-slate-300 text-slate-500 hover:border-brand-400 hover:bg-slate-50'}`}>
            <input ref={fileRef} type="file" accept={TYPES.join(',')} multiple onChange={upload} disabled={uploading} className="sr-only" />
            {uploading ? <><Loader2 className="h-5 w-5 animate-spin" /> Uploading…</> : <><ImagePlus className="h-5 w-5" /> Add photos</>}
          </label>
        )}
      </div>
    </div>
  );
}
