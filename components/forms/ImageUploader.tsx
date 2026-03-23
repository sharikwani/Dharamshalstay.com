/**
 * components/forms/ImageUploader.tsx
 *
 * Handles image upload to Supabase Storage for property images.
 * Saves structured image objects: {url, alt, category, is_primary, sort_order}
 */
'use client';
import { useState, useRef } from 'react';
import { Upload, X, Star, Loader2, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export interface ImageEntry {
  url: string;
  alt: string;
  category: string;
  is_primary: boolean;
  sort_order: number;
}

const CATEGORIES = [
  { value: 'exterior', label: 'Exterior' },
  { value: 'room', label: 'Room' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'view', label: 'View' },
  { value: 'lobby', label: 'Lobby' },
  { value: 'pool', label: 'Pool' },
  { value: 'other', label: 'Other' },
];

const BUCKET = 'property-images';

interface Props {
  images: ImageEntry[];
  onChange: (images: ImageEntry[]) => void;
  userId?: string;
  propertySlug?: string;
}

export default function ImageUploader({ images, onChange, userId, propertySlug }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError('');

    const newImages: ImageEntry[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file
      if (!file.type.startsWith('image/')) {
        setError(`${file.name} is not an image file`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError(`${file.name} exceeds 5MB limit`);
        continue;
      }

      // Build path: property-images/userId/slug-or-temp/timestamp-filename
      const folder = userId || 'anonymous';
      const subfolder = propertySlug || 'temp';
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const path = `${folder}/${subfolder}/${safeName}`;

      const { data, error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        setError(`Failed to upload ${file.name}: ${uploadError.message}`);
        continue;
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);

      newImages.push({
        url: urlData.publicUrl,
        alt: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
        category: 'exterior',
        is_primary: images.length === 0 && i === 0,
        sort_order: images.length + i,
      });
    }

    if (newImages.length > 0) {
      onChange([...images, ...newImages]);
    }
    setUploading(false);

    // Reset file input
    if (fileRef.current) fileRef.current.value = '';
  }

  function handleAddUrl() {
    if (!urlValue.trim()) return;
    const url = urlValue.trim();
    // Basic URL validation
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setError('URL must start with http:// or https://');
      return;
    }
    onChange([...images, {
      url,
      alt: '',
      category: 'exterior',
      is_primary: images.length === 0,
      sort_order: images.length,
    }]);
    setUrlValue('');
    setShowUrlInput(false);
    setError('');
  }

  function handleRemove(idx: number) {
    const wasPrimary = images[idx]?.is_primary;
    const updated = images.filter((_, i) => i !== idx);
    // If removed image was primary, make first remaining image primary
    if (wasPrimary && updated.length > 0) {
      updated[0] = { ...updated[0], is_primary: true };
    }
    onChange(updated);
  }

  function handleSetPrimary(idx: number) {
    onChange(images.map((img, i) => ({ ...img, is_primary: i === idx })));
  }

  function handleUpdateField(idx: number, field: keyof ImageEntry, value: any) {
    const updated = [...images];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange(updated);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-heading font-bold text-slate-900">Property Photos</h3>
        <span className="text-xs text-slate-500">{images.length} photo{images.length !== 1 ? 's' : ''}</span>
      </div>

      <p className="text-sm text-slate-600">
        Upload photos of your property. Minimum 3 recommended. Use landscape photos (16:9) at least 1200px wide.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
          {error}
        </div>
      )}

      {/* Upload area */}
      <div className="flex gap-3">
        <label className={`flex-1 flex items-center justify-center gap-2 border-2 border-dashed rounded-xl py-4 cursor-pointer transition-colors ${
          uploading ? 'border-brand-300 bg-brand-50' : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50'
        }`}>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="sr-only"
            disabled={uploading}
          />
          {uploading ? (
            <><Loader2 className="h-5 w-5 text-brand-600 animate-spin" /><span className="text-sm text-brand-600 font-medium">Uploading...</span></>
          ) : (
            <><Upload className="h-5 w-5 text-slate-500" /><span className="text-sm text-slate-600 font-medium">Upload Photos</span></>
          )}
        </label>

        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-xl text-sm text-slate-600 hover:bg-slate-50"
        >
          <LinkIcon className="h-4 w-4" /> URL
        </button>
      </div>

      {/* URL input (optional) */}
      {showUrlInput && (
        <div className="flex gap-2">
          <input
            type="url"
            value={urlValue}
            onChange={e => setUrlValue(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddUrl(); } }}
          />
          <button type="button" onClick={handleAddUrl} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700">
            Add
          </button>
        </div>
      )}

      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {images.map((img, idx) => (
            <div key={idx} className={`border rounded-xl overflow-hidden ${img.is_primary ? 'border-brand-400 ring-2 ring-brand-100' : 'border-slate-200'}`}>
              {/* Preview */}
              <div className="relative aspect-[16/10] bg-slate-100">
                {img.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img.url} alt={img.alt || 'Property photo'} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
                {img.is_primary && (
                  <span className="absolute top-2 left-2 bg-brand-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Star className="h-3 w-3 fill-white" /> Primary
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Metadata */}
              <div className="p-3 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={img.alt || ''}
                    onChange={e => handleUpdateField(idx, 'alt', e.target.value)}
                    placeholder="Alt text (describe the photo)"
                    className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-xs outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <select
                    value={img.category || 'exterior'}
                    onChange={e => handleUpdateField(idx, 'category', e.target.value)}
                    className="px-2 py-1.5 border border-slate-200 rounded text-xs outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                {!img.is_primary && (
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(idx)}
                    className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                  >
                    Set as primary photo
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
          <ImageIcon className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No photos added yet. Upload at least 3 photos.</p>
        </div>
      )}

      <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
        Tip: Include exterior, rooms, bathroom, view, and common areas. Max 5MB per image.
      </p>
    </div>
  );
}
