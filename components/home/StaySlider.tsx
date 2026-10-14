'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, MapPin, Star } from 'lucide-react';
import type { StayPhoto } from '@/lib/home-helpers';

type Props = {
  index: number; lead: boolean; href: string; name: string; photos: StayPhoto[];
  typeLabel: string; area: string; altitude?: string; price?: string; perNight: string; from: string;
  rating?: number; desc?: string;
  labels: { photoOf: string; prev: string; next: string };
};

/** A featured stay whose own photos cross-fade on their own; hovering or focusing the card pauses it. */
export default function StaySlider(p: Props) {
  const [cur, setCur] = useState(0);
  // Photos hotlinked from other sites sometimes fail; drop those rather than show a broken frame.
  const [failed, setFailed] = useState<string[]>([]);
  const paused = useRef(false);
  const photos = p.photos.filter((ph) => !failed.includes(ph.url));
  const n = photos.length;
  const go = (i: number) => setCur(((i % n) + n) % n);

  useEffect(() => {
    if (n < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timer: ReturnType<typeof setInterval>;
    // Cards start on different beats so they don't all change at once.
    const start = setTimeout(() => {
      timer = setInterval(() => { if (!paused.current && !document.hidden) setCur((c) => (c + 1) % n); }, 4200);
    }, p.index * 700);
    return () => { clearTimeout(start); clearInterval(timer); };
  }, [n, p.index]);

  useEffect(() => { if (cur >= n && n > 0) setCur(0); }, [cur, n]);
  if (n === 0) return null;

  const label = (i: number) => p.labels.photoOf.replace('{i}', String(i + 1)).replace('{n}', String(n));

  return (
    <article className={'stay rv' + (p.lead ? ' lead' : '')}
      onMouseEnter={() => { paused.current = true; }} onMouseLeave={() => { paused.current = false; }}
      onFocus={() => { paused.current = true; }} onBlur={() => { paused.current = false; }}>
      <div className="ph">
        <div className="slides">
          {photos.map((ph, i) => (
            <Image key={ph.url} src={ph.url} alt={ph.alt} fill className={i === cur ? 'on' : ''}
              onError={() => setFailed((f) => [...f, ph.url])}
              sizes={p.lead ? '(max-width:960px) 100vw, 40vw' : '(max-width:560px) 100vw, (max-width:960px) 50vw, 28vw'} />
          ))}
        </div>
        <span className="chip">{p.typeLabel}</span>
        {n > 1 && (
          <>
            <span className="count" aria-hidden="true">{cur + 1} / {n}</span>
            <button type="button" className="sl-btn prev" aria-label={p.labels.prev} onClick={() => go(cur - 1)}><ArrowRight className="ico" /></button>
            <button type="button" className="sl-btn next" aria-label={p.labels.next} onClick={() => go(cur + 1)}><ArrowRight className="ico" /></button>
            <div className="dots">
              {photos.map((ph, i) => (
                <button key={ph.url} type="button" className={i === cur ? 'on' : ''} aria-label={label(i)} aria-current={i === cur} onClick={() => go(i)} />
              ))}
            </div>
          </>
        )}
      </div>
      <div className="bd">
        <div className="meta"><MapPin className="ico" style={{ width: 16, height: 16 }} aria-hidden="true" />{p.area}{p.altitude && <span className="alt">{p.altitude}</span>}</div>
        <h3><Link href={p.href}>{p.name}</Link></h3>
        {p.lead && p.desc && <p className="desc">{p.desc}</p>}
        <div className="row">
          {p.price ? <span className="price">{p.from} <b>{p.price}</b> {p.perNight}</span> : <span />}
          {p.rating ? <span className="rate"><Star aria-hidden="true" />{p.rating}</span> : null}
        </div>
      </div>
    </article>
  );
}
