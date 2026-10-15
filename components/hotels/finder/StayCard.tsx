'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useRef, useState } from 'react';
import { Heart, ChevronLeft, ChevronRight, Mountain, Car, Footprints, MapPin, Zap, Building2, ArrowRight } from 'lucide-react';
import { normalizeImages } from '@/lib/images';
import { formatPrice } from '@/lib/utils';
import type { StayFacts } from '@/lib/hotels/discover';

export type CardLabels = {
  shortlist: string; shortlisted: string; view: string; parking: string; toSquare: string; toTrail: string; straight: string;
  perNight: string; ask: string; open: string; instant: string; band: Record<string, string>; photo: string; prev: string; next: string;
};

const SIGNS: Record<string, string> = { budget: '₹', 'mid-range': '₹₹', upscale: '₹₹₹' };

export default function StayCard({ h, f, href, area, typeLabel, active, saved, onSave, onHover, labels: l }: {
  h: any; f: StayFacts; href: string; area: string; typeLabel: string; active: boolean; saved: boolean;
  onSave: () => void; onHover: (on: boolean) => void; labels: CardLabels;
}) {
  const photos = normalizeImages(h.images).slice(0, 6);
  const [i, setI] = useState(0);
  const strip = useRef<HTMLDivElement>(null);
  const go = (n: number) => {
    const el = strip.current; if (!el) return;
    const next = (n + photos.length) % photos.length;
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
  };
  const why = (h.highlights || [])[0] || h.short_description;
  const facts: { icon: typeof Mountain; text: string; title?: string }[] = [];
  if (f.view) facts.push({ icon: Mountain, text: l.view });
  if (f.kmSquare !== null && f.kmSquare <= 3) facts.push({ icon: Footprints, text: l.toSquare.replace('{km}', f.kmSquare.toFixed(1)), title: l.straight });
  if (f.kmTrail !== null && f.kmTrail <= 1.5) facts.push({ icon: MapPin, text: l.toTrail.replace('{km}', f.kmTrail.toFixed(1)), title: l.straight });
  if (f.parking) facts.push({ icon: Car, text: l.parking });

  return (
    <article id={'stay-' + h.id} className={'sf-card' + (active ? ' on' : '')} onMouseEnter={() => onHover(true)} onMouseLeave={() => onHover(false)}>
      <div className="sf-photos">
        {photos.length ? (
          <div ref={strip} className="sf-strip" onScroll={(e) => { const el = e.currentTarget; setI(Math.round(el.scrollLeft / el.clientWidth)); }}>
            {photos.map((p, n) => (
              <div key={p.url + n} className="sf-slide">
                <Image src={p.url} alt={p.alt || h.name} fill sizes="(max-width:768px) 92vw, 420px" loading={n === 0 ? undefined : 'lazy'} />
              </div>
            ))}
          </div>
        ) : (
          <div className="sf-nophoto" role="img" aria-label={h.name}><Building2 className="h-10 w-10" aria-hidden="true" /></div>
        )}
        {photos.length > 1 && (
          <>
            <button type="button" className="sf-arrow l" aria-label={l.prev} onClick={() => go(i - 1)}><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" className="sf-arrow r" aria-label={l.next} onClick={() => go(i + 1)}><ChevronRight className="h-4 w-4" /></button>
            <div className="sf-dots" aria-label={l.photo.replace('{i}', String(i + 1)).replace('{n}', String(photos.length))}>
              {photos.map((_, n) => <span key={n} className={n === i ? 'on' : ''} />)}
            </div>
          </>
        )}
        <button type="button" className={'sf-heart' + (saved ? ' on' : '')} aria-pressed={saved} aria-label={saved ? l.shortlisted : l.shortlist} onClick={onSave}>
          <Heart className="h-4 w-4" />
        </button>
        <span className="sf-price">
          {f.live ? <><b>{formatPrice(h.price_min)}</b> {l.perNight}</> : h.price_band ? <><b>{SIGNS[h.price_band]}</b> {l.band[h.price_band]}</> : null}
        </span>
        {f.live && <span className="sf-instant"><Zap className="h-3 w-3" />{l.instant}</span>}
      </div>
      <div className="sf-body">
        <p className="sf-meta">{area} · {typeLabel}</p>
        <h3><Link href={href}>{h.name}</Link></h3>
        {why && <p className="sf-why">{why}</p>}
        {facts.length > 0 && (
          <ul className="sf-facts">
            {facts.slice(0, 3).map((x) => <li key={x.text} title={x.title}><x.icon className="h-3.5 w-3.5" aria-hidden="true" />{x.text}</li>)}
          </ul>
        )}
        <div className="sf-actions">
          <button type="button" className={'sf-save' + (saved ? ' on' : '')} onClick={onSave} aria-pressed={saved}>
            <Heart className="h-4 w-4" />{saved ? l.shortlisted : l.shortlist}
          </button>
          <Link href={href} className="sf-open">{f.live ? l.open : l.ask} <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </div>
    </article>
  );
}
