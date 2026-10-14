'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';

// Where each numbered spot sits on the painting, in percent of its width and height.
const SPOTS = [[22.5, 70], [50, 76], [43, 91], [85, 66], [77, 50], [50, 17]];

/** The Kangra-style Gaddi painting with numbered spots that open a short note. */
export default function GaddiPainting({ src, alt, spots }: { src: string; alt: string; spots: { title: string; desc: string }[] }) {
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (open === null) return;
    const close = () => setOpen(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('click', close); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const tipPos = open === null ? null : { left: Math.min(78, Math.max(22, SPOTS[open][0])) + '%', top: Math.max(SPOTS[open][1], 34) + '%' };

  return (
    <figure className="frame rv" style={{ marginBlock: 0 }}>
      <div className="frame-in" id="gframe">
        <Image src={src} alt={alt} fill sizes="(max-width:1240px) 100vw, 1200px" />
        {spots.map((s, i) => (
          <button key={s.title} type="button" className="gspot" style={{ left: SPOTS[i][0] + '%', top: SPOTS[i][1] + '%' }}
            aria-expanded={open === i} aria-controls="gtip" aria-label={s.title}
            onClick={(e) => { e.stopPropagation(); setOpen(open === i ? null : i); }}>
            {i + 1}
          </button>
        ))}
        <div className="tip" id="gtip" role="status" hidden={open === null} style={tipPos || undefined}>
          {open !== null && <><b>{spots[open].title}</b>{spots[open].desc}</>}
        </div>
      </div>
    </figure>
  );
}
