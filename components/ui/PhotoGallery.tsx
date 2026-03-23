'use client';
import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';

interface GalleryImage {
  url: string;
  alt?: string;
  category?: string;
}

interface Props {
  images: GalleryImage[];
  hotelName: string;
}

export default function PhotoGallery({ images, hotelName }: Props) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const open = useCallback((idx: number) => {
    setCurrentIndex(idx);
    setLightboxOpen(true);
    document.body.style.overflow = 'hidden';
  }, []);

  const close = useCallback(() => {
    setLightboxOpen(false);
    document.body.style.overflow = '';
  }, []);

  const prev = useCallback(() => setCurrentIndex(i => (i - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setCurrentIndex(i => (i + 1) % images.length), [images.length]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxOpen, close, prev, next]);

  if (!images.length) return null;

  return (
    <>
      {/* Main gallery grid */}
      <div className="rounded-2xl overflow-hidden">
        {images.length === 1 ? (
          <div className="relative h-[300px] md:h-[450px] cursor-pointer group" onClick={() => open(0)}>
            <Image src={images[0].url} alt={images[0].alt || hotelName} fill className="object-cover" priority sizes="100vw" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            <button className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm text-slate-800 text-sm font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Maximize2 className="h-4 w-4" /> View Photo
            </button>
          </div>
        ) : images.length <= 3 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 h-[300px] md:h-[450px]">
            <div className="relative cursor-pointer group" onClick={() => open(0)}>
              <Image src={images[0].url} alt={images[0].alt || hotelName} fill className="object-cover" priority sizes="(max-width:768px) 100vw, 50vw" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            </div>
            <div className="hidden md:grid grid-rows-2 gap-1.5">
              {images.slice(1, 3).map((img, i) => (
                <div key={i} className="relative cursor-pointer group" onClick={() => open(i + 1)}>
                  <Image src={img.url} alt={img.alt || hotelName} fill className="object-cover" sizes="50vw" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-4 grid-rows-2 gap-1.5 h-[300px] md:h-[450px]">
            {/* Main large image */}
            <div className="col-span-2 row-span-2 relative cursor-pointer group" onClick={() => open(0)}>
              <Image src={images[0].url} alt={images[0].alt || hotelName} fill className="object-cover" priority sizes="50vw" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            </div>
            {/* 4 smaller images */}
            {images.slice(1, 5).map((img, i) => (
              <div key={i} className="relative cursor-pointer group" onClick={() => open(i + 1)}>
                <Image src={img.url} alt={img.alt || hotelName} fill className="object-cover" sizes="25vw" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                {i === 3 && images.length > 5 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">+{images.length - 5} more</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* View all photos button */}
        {images.length > 1 && (
          <button onClick={() => open(0)}
            className="mt-2 w-full flex items-center justify-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 py-2 bg-brand-50 rounded-xl hover:bg-brand-100 transition-colors">
            <Maximize2 className="h-4 w-4" /> View all {images.length} photos
          </button>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" onClick={close}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 text-white" onClick={e => e.stopPropagation()}>
            <div>
              <p className="font-semibold">{hotelName}</p>
              <p className="text-sm text-white/60">{currentIndex + 1} / {images.length}{images[currentIndex]?.category ? ' - ' + images[currentIndex].category : ''}</p>
            </div>
            <button onClick={close} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Image */}
          <div className="flex-1 flex items-center justify-center px-4 relative" onClick={e => e.stopPropagation()}>
            <div className="relative w-full max-w-5xl aspect-[16/10]">
              <Image
                src={images[currentIndex].url}
                alt={images[currentIndex].alt || hotelName}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            </div>

            {/* Nav arrows */}
            {images.length > 1 && (
              <>
                <button onClick={prev} className="absolute left-2 md:left-6 p-2 md:p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                  <ChevronLeft className="h-6 w-6 text-white" />
                </button>
                <button onClick={next} className="absolute right-2 md:right-6 p-2 md:p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                  <ChevronRight className="h-6 w-6 text-white" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="px-4 py-3 overflow-x-auto" onClick={e => e.stopPropagation()}>
              <div className="flex gap-2 justify-center">
                {images.map((img, i) => (
                  <button key={i} onClick={() => setCurrentIndex(i)}
                    className={'shrink-0 w-16 h-12 md:w-20 md:h-14 rounded-lg overflow-hidden border-2 transition-all ' +
                      (i === currentIndex ? 'border-white opacity-100 scale-105' : 'border-transparent opacity-50 hover:opacity-80')}>
                    <Image src={img.url} alt="" width={80} height={56} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/* Room-specific mini gallery */
export function RoomGallery({ images, roomName }: { images: any[]; roomName: string }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const normalizedImages = images
    .map((img: any) => typeof img === 'string' ? { url: img, alt: roomName } : { url: img?.url || '', alt: img?.alt || roomName })
    .filter((img: any) => img.url);

  if (!normalizedImages.length) return null;

  return (
    <>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {normalizedImages.slice(0, 5).map((img, i) => (
          <button key={i} onClick={() => { setCurrentIndex(i); setLightboxOpen(true); document.body.style.overflow = 'hidden'; }}
            className="shrink-0 w-20 h-16 md:w-24 md:h-18 rounded-lg overflow-hidden bg-slate-100 hover:opacity-90 transition-opacity relative">
            <Image src={img.url} alt={img.alt} fill className="object-cover" sizes="96px" />
            {i === 4 && normalizedImages.length > 5 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white text-xs font-bold">+{normalizedImages.length - 5}</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" onClick={() => { setLightboxOpen(false); document.body.style.overflow = ''; }}>
          <div className="flex items-center justify-between px-4 py-3 text-white" onClick={e => e.stopPropagation()}>
            <p className="text-sm text-white/60">{roomName} - {currentIndex + 1}/{normalizedImages.length}</p>
            <button onClick={() => { setLightboxOpen(false); document.body.style.overflow = ''; }} className="p-2 hover:bg-white/10 rounded-lg"><X className="h-5 w-5" /></button>
          </div>
          <div className="flex-1 flex items-center justify-center px-4 relative" onClick={e => e.stopPropagation()}>
            <div className="relative w-full max-w-4xl aspect-[16/10]">
              <Image src={normalizedImages[currentIndex].url} alt={normalizedImages[currentIndex].alt} fill className="object-contain" sizes="100vw" />
            </div>
            {normalizedImages.length > 1 && (
              <>
                <button onClick={() => setCurrentIndex(i => (i - 1 + normalizedImages.length) % normalizedImages.length)} className="absolute left-4 p-2 bg-white/10 hover:bg-white/20 rounded-full"><ChevronLeft className="h-5 w-5 text-white" /></button>
                <button onClick={() => setCurrentIndex(i => (i + 1) % normalizedImages.length)} className="absolute right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full"><ChevronRight className="h-5 w-5 text-white" /></button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
