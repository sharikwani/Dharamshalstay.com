'use client';
/**
 * A story's photos: the cover in the header and the rest in a grid. Tapping any photo opens a full-screen
 * viewer you can swipe or scroll through (arrows and keyboard too), closed with X, Esc or a tap outside.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react';

const Ctx = createContext<(i: number) => void>(() => {});

export default function StoryGallery({ photos, title, children }: { photos: string[]; title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <Ctx.Provider value={setOpen}>
      {children}
      {open !== null && <Viewer photos={photos} title={title} start={open} onClose={() => setOpen(null)} />}
    </Ctx.Provider>
  );
}

/** The header cover: the whole photo is a button that opens the viewer, with a "View photos" pill. */
export function CoverButton({ title, count }: { title: string; count: number }) {
  const open = useContext(Ctx);
  return (
    <button type="button" onClick={() => open(0)} aria-label={`View the photos of ${title}`} className="absolute inset-0 cursor-zoom-in focus:outline-none">
      <span className="absolute bottom-3 right-3 z-20 hidden items-center gap-1.5 rounded-full sm:inline-flex bg-black/45 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur hover:bg-black/60 sm:bottom-6 sm:right-6">
        <Expand className="h-3.5 w-3.5" />{count > 1 ? `View all ${count} photos` : 'View photo'}
      </span>
    </button>
  );
}

/** The photos after the cover, in a grid. */
export function PhotoGrid({ photos, title }: { photos: string[]; title: string }) {
  const open = useContext(Ctx);
  const rest = photos.slice(1);
  if (!rest.length) return null;
  return (
    <div className={'grid gap-3 ' + (rest.length === 1 ? 'grid-cols-1' : rest.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3')}>
      {rest.map((src, i) => (
        <button key={src} type="button" onClick={() => open(i + 1)} aria-label={`Open photo ${i + 2} of ${photos.length}`}
          className="group relative block aspect-[4/3] overflow-hidden rounded-2xl bg-brand-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-300">
          <Image src={src} alt={`${title}, photo ${i + 2}`} fill sizes="(max-width:640px) 50vw, 33vw" className="object-cover transition duration-500 group-hover:scale-105" />
        </button>
      ))}
    </div>
  );
}

function Viewer({ photos, title, start, onClose }: { photos: string[]; title: string; start: number; onClose: () => void }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(start);

  const go = useCallback((i: number) => {
    const el = track.current;
    if (!el) return;
    const n = Math.max(0, Math.min(photos.length - 1, i));
    el.scrollTo({ left: n * el.clientWidth, behavior: 'smooth' });
  }, [photos.length]);

  // Open on the photo that was tapped, lock the page behind, and listen for keys.
  useEffect(() => {
    const el = track.current;
    if (el) el.scrollLeft = start * el.clientWidth;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [start]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(index + 1);
      else if (e.key === 'ArrowLeft') go(index - 1);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [index, go, onClose]);

  const onScroll = () => {
    const el = track.current;
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  const arrow = 'absolute top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur transition hover:bg-white/25 disabled:opacity-0 sm:block';
  return (
    <div role="dialog" aria-modal="true" aria-label={`Photos: ${title}`} className="fixed inset-0 z-[100] flex flex-col bg-black/95">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm tabular-nums text-white/80">{index + 1} / {photos.length}</span>
        <button type="button" onClick={onClose} className="rounded-full bg-white/10 p-2 hover:bg-white/25" aria-label="Close" autoFocus><X className="h-6 w-6" /></button>
      </div>

      <div className="relative min-h-0 flex-1">
        <div ref={track} onScroll={onScroll} className="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {photos.map((src, i) => (
            // A tap on the dark space around the photo closes the viewer; a tap on the photo does not.
            <div key={src} className="relative flex h-full w-full flex-none snap-center items-center justify-center p-2 sm:p-8" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
              <div className="relative h-full w-full" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
                <Image src={src} alt={`${title}, photo ${i + 1}`} fill sizes="100vw" className="object-contain" priority={Math.abs(i - start) <= 1} />
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => go(index - 1)} disabled={index === 0} className={arrow + ' left-4'} aria-label="Previous photo"><ChevronLeft className="h-6 w-6" /></button>
        <button type="button" onClick={() => go(index + 1)} disabled={index === photos.length - 1} className={arrow + ' right-4'} aria-label="Next photo"><ChevronRight className="h-6 w-6" /></button>
      </div>

      {photos.length > 1 && (
        <div className="flex justify-center gap-2 overflow-x-auto px-4 py-3">
          {photos.map((src, i) => (
            <button key={src} type="button" onClick={() => go(i)} aria-label={`Photo ${i + 1}`} aria-current={i === index}
              className={'relative h-14 w-14 flex-none overflow-hidden rounded-lg ring-2 transition ' + (i === index ? 'ring-white' : 'opacity-50 ring-transparent hover:opacity-80')}>
              <Image src={src} alt="" fill sizes="56px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
