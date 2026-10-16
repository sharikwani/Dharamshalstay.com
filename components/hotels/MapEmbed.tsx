'use client';
import { useState } from 'react';
import { MapPin } from 'lucide-react';

/** The map loads only when asked for: the embed is about 300 KB of script most visitors never use. */
export default function MapEmbed({ src, title, label }: { src: string; title: string; label: string }) {
  const [on, setOn] = useState(false);
  if (on) return <iframe src={src} title={title} className="w-full h-64 sm:h-80 border-0 block" referrerPolicy="no-referrer" />;
  return (
    <button type="button" onClick={() => setOn(true)} aria-label={title}
      className="relative w-full h-64 sm:h-80 block bg-[#e8eedf] overflow-hidden group">
      <svg aria-hidden="true" className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 200">
        <path d="M0 140 C80 120 120 160 200 130 S330 90 400 110" fill="none" stroke="#fff" strokeWidth="6" />
        <path d="M60 0 C90 60 70 120 110 200" fill="none" stroke="#fff" strokeWidth="4" />
        <path d="M260 0 C250 50 300 90 280 200" fill="none" stroke="#fff" strokeWidth="3" />
        <path d="M0 60 Q100 40 180 70 T400 50" fill="none" stroke="#cfe0c3" strokeWidth="2" />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <MapPin className="h-9 w-9 text-brand-600 drop-shadow" />
        <span className="bg-white shadow-md rounded-full px-4 py-2 text-sm font-semibold text-slate-800 group-hover:bg-brand-600 group-hover:text-white transition-colors">{label}</span>
      </span>
    </button>
  );
}
