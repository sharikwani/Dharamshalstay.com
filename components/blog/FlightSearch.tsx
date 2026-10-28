'use client';
import { useEffect, useRef } from 'react';
import { Plane } from 'lucide-react';
import type { Lang } from '@/lib/i18n/core';

/**
 * Flight search box (Aviasales via Travelpayouts, partner 591777). The widget script only loads when the box
 * scrolls near the screen, so it never slows the guide. Searches and bookings happen on Aviasales; we earn a
 * small partner commission at no cost to the reader.
 */
const WIDGET = 'https://tpemb.com/content?currency=inr&trs=591777&shmarker=796306&show_hotels=false&powered_by=true&locale=en&searchUrl=www.aviasales.com%2Fsearch&primary_override=%2332a8dd&color_button=%2332a8dd&color_icons=%2332a8dd&dark=%23262626&light=%23FFFFFF&secondary=%23FFFFFF&special=%23C4C4C4&color_focused=%2332a8dd&border_radius=0&plain=false&promo_id=7879&campaign_id=100';

/** Guides that get the box, and the airport each one flies to (from Delhi by default). */
export const FLIGHT_SEARCH: Record<string, { to: string; place: string; placeHi: string }> = {
  'kangra-airport-gaggal-guide': { to: 'DHM', place: 'Dharamshala (Kangra, Gaggal)', placeHi: 'धर्मशाला (कांगड़ा, गग्गल)' },
  'how-to-reach-dharamshala': { to: 'DHM', place: 'Dharamshala (Kangra, Gaggal)', placeHi: 'धर्मशाला (कांगड़ा, गग्गल)' },
  'how-to-reach-manali': { to: 'KUU', place: 'Kullu-Manali (Bhuntar)', placeHi: 'कुल्लू-मनाली (भुंतर)' },
  'how-to-reach-shimla': { to: 'SLV', place: 'Shimla (Jubbarhatti)', placeHi: 'शिमला (जुब्बड़हट्टी)' },
};

export default function FlightSearch({ slug, lang }: { slug: string; lang: Lang }) {
  const box = useRef<HTMLDivElement>(null);
  const cfg = FLIGHT_SEARCH[slug];

  useEffect(() => {
    const el = box.current;
    if (!el || !cfg) return;
    const load = () => {
      if (el.dataset.loaded) return;
      el.dataset.loaded = '1';
      const s = document.createElement('script');
      s.async = true;
      s.charset = 'utf-8';
      s.src = `${WIDGET}&origin=DEL&destination=${cfg.to}`;
      el.appendChild(s);
    };
    if (!('IntersectionObserver' in window)) { load(); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { load(); io.disconnect(); }
    }, { rootMargin: '400px' });
    io.observe(el);
    return () => io.disconnect();
  }, [cfg]);

  if (!cfg) return null;
  const hi = lang === 'hi';
  return (
    <section className="mt-10 rounded-2xl border border-slate-200 p-5 sm:p-6" aria-labelledby="flight-search-title">
      <h2 id="flight-search-title" className="flex items-center gap-2 font-heading font-bold text-xl text-slate-900 mb-1">
        <Plane className="h-5 w-5 text-brand-600" aria-hidden /> {hi ? `${cfg.placeHi} की फ्लाइट खोजें` : `Search flights to ${cfg.place}`}
      </h2>
      <p className="text-sm text-slate-600 mb-4">
        {hi
          ? 'दिल्ली से भरा हुआ है; कोई भी शहर चुन सकते हैं। दाम और बुकिंग हमारे पार्टनर Aviasales पर; आपसे कोई अतिरिक्त शुल्क नहीं।'
          : 'Delhi is filled in; change it to any city. Fares and booking are on our partner Aviasales, at no extra cost to you.'}
      </p>
      <div ref={box} className="min-h-[180px]" />
    </section>
  );
}
