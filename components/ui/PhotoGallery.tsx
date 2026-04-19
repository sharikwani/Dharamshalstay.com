'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
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
      <div className="rounded-2xl overflow-hidden">
        {images.length === 1 ? (
          <div className="relative h-[300px] md:h-[450px] cursor-pointer group" onClick={() => open(0)}>
            <Image src={images[0].url} alt={images[0].alt || hotelName} fill className="object-cover" priority sizes="100vw" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          </div>
        ) : images.length <= 3 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 h-[300px] md:h-[450px]">
            <div className="relative cursor-pointer group" onClick={() => open(0)}>
              <Image src={images[0].url} alt={images[0].alt || hotelName} fill className="object-cover" priority sizes="(max-width:768px) 100vw, 50vw" />
            </div>
            <div className="hidden md:grid grid-rows-2 gap-1.5">
              {images.slice(1, 3).map((img, i) => (
                <div key={i} className="relative cursor-pointer group" onClick={() => open(i + 1)}>
                  <Image src={img.url} alt={img.alt || hotelName} fill className="object-cover" sizes="50vw" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-4 grid-rows-2 gap-1.5 h-[300px] md:h-[450px]">
            <div className="col-span-2 row-span-2 relative cursor-pointer group" onClick={() => open(0)}>
              <Image src={images[0].url} alt={images[0].alt || hotelName} fill className="object-cover" priority sizes="50vw" />
            </div>
            {images.slice(1, 5).map((img, i) => (
              <div key={i} className="relative cursor-pointer group" onClick={() => open(i + 1)}>
                <Image src={img.url} alt={img.alt || hotelName} fill className="object-cover" sizes="25vw" />
                {i === 3 && images.length > 5 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">+{images.length - 5} more</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {images.length > 1 && (
          <button onClick={() => open(0)}
            className="mt-2 w-full flex items-center justify-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 py-2 bg-brand-50 rounded-xl hover:bg-brand-100 transition-colors">
            <Maximize2 className="h-4 w-4" /> View all {images.length} photos
          </button>
        )}
      </div>

      {lightboxOpen && (
        <Lightbox
          images={images}
          currentIndex={currentIndex}
          setCurrentIndex={setCurrentIndex}
          title={hotelName}
          onClose={close}
          onPrev={prev}
          onNext={next}
        />
      )}
    </>
  );
}

/* Shared Lightbox Component */
function Lightbox({ images, currentIndex, setCurrentIndex, title, onClose, onPrev, onNext }: {
  images: { url: string; alt?: string; category?: string }[];
  currentIndex: number;
  setCurrentIndex: (i: number) => void;
  title: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between px-4 py-3 text-white" onClick={e => e.stopPropagation()}>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-white/60">{currentIndex + 1} / {images.length}</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 relative" onClick={e => e.stopPropagation()}>
        <div className="relative w-full max-w-5xl aspect-[16/10]">
          <Image src={images[currentIndex].url} alt={images[currentIndex].alt || title} fill className="object-contain" sizes="100vw" priority />
        </div>
        {images.length > 1 && (
          <>
            <button onClick={onPrev} className="absolute left-2 md:left-6 p-2 md:p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
              <ChevronLeft className="h-6 w-6 text-white" />
            </button>
            <button onClick={onNext} className="absolute right-2 md:right-6 p-2 md:p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
              <ChevronRight className="h-6 w-6 text-white" />
            </button>
          </>
        )}
      </div>

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
  );
}

/* Room-specific image gallery - horizontal scroll with larger images + lightbox */
export function RoomGallery({ images, roomName }: { images: any[]; roomName: string }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const normalizedImages = images
    .map((img: any) => typeof img === 'string' ? { url: img, alt: roomName } : { url: img?.url || '', alt: img?.alt || roomName })
    .filter((img: any) => img.url);

  if (!normalizedImages.length) return null;

  function openLightbox(idx: number) {
    setCurrentIndex(idx);
    setLightboxOpen(true);
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    setLightboxOpen(false);
    document.body.style.overflow = '';
  }

  function scrollLeft() {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: -240, behavior: 'smooth' });
  }
  function scrollRight() {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: 240, behavior: 'smooth' });
  }

  return (
    <>
      {/* Scrollable image strip */}
      <div className="relative group/scroll">
        {/* Left arrow */}
        {normalizedImages.length > 2 && (
          <button onClick={scrollLeft}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 hover:bg-white shadow-md rounded-full flex items-center justify-center opacity-0 group-hover/scroll:opacity-100 transition-opacity">
            <ChevronLeft className="h-4 w-4 text-slate-700" />
          </button>
        )}

        <div ref={scrollRef}
          className="flex gap-2 overflow-x-auto scroll-smooth scrollbar-hide py-1 px-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {normalizedImages.map((img, i) => (
            <button key={i} onClick={() => openLightbox(i)}
              className="shrink-0 w-36 h-24 sm:w-44 sm:h-28 md:w-48 md:h-32 rounded-xl overflow-hidden bg-slate-100 hover:ring-2 hover:ring-brand-400 transition-all relative group/img">
              <Image src={img.url} alt={img.alt} fill className="object-cover" sizes="192px" />
              <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors" />
              {/* Image count badge on last visible */}
              {i === normalizedImages.length - 1 && normalizedImages.length > 3 && (
                <div className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Maximize2 className="h-2.5 w-2.5" /> {normalizedImages.length}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Right arrow */}
        {normalizedImages.length > 2 && (
          <button onClick={scrollRight}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 hover:bg-white shadow-md rounded-full flex items-center justify-center opacity-0 group-hover/scroll:opacity-100 transition-opacity">
            <ChevronRight className="h-4 w-4 text-slate-700" />
          </button>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <Lightbox
          images={normalizedImages}
          currentIndex={currentIndex}
          setCurrentIndex={setCurrentIndex}
          title={roomName}
          onClose={closeLightbox}
          onPrev={() => setCurrentIndex(i => (i - 1 + normalizedImages.length) % normalizedImages.length)}
          onNext={() => setCurrentIndex(i => (i + 1) % normalizedImages.length)}
        />
      )}
    </>
  );
}
