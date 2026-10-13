'use client';
import { useState } from 'react';
import { BadgeCheck, Loader2, MessageSquare, Pencil, Star } from 'lucide-react';
import { useT } from '@/lib/i18n/client';
import { fmt } from '@/lib/i18n/dict';
import { cn } from '@/lib/utils';
import { monthLabel } from '@/lib/reviews/summary';
import { CATEGORIES, type PublicReview, type ReviewBundle } from '@/lib/reviews/types';
import ReviewForm from './ReviewForm';

function Stars({ value, size = 'h-4 w-4' }: { value: number; size?: string }) {
  return (
    <span className="inline-flex" aria-label={value + '/5'}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn(size, n <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} />
      ))}
    </span>
  );
}

function Reply({ label, text }: { label: string; text: string }) {
  return (
    <div className="mt-3 ml-3 pl-3 border-l-2 border-brand-200">
      <p className="text-xs font-semibold text-brand-800 flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" />{label}</p>
      <p className="text-sm text-slate-700 whitespace-pre-line">{text}</p>
    </div>
  );
}

/** Approved reviews, rating summary, guest photos and the "Write a review" modal. */
export default function HotelReviews({ propertyId, hotelName, initial }: { propertyId: string; hotelName: string; initial: ReviewBundle }) {
  const { t, lang } = useT();
  const r = t.reviews;
  const s = initial.summary;
  const [reviews, setReviews] = useState<PublicReview[]>(initial.reviews);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const photos = reviews.flatMap((x) => x.photos.map((url) => ({ url, alt: x.title }))).slice(0, 12);

  async function loadMore() {
    setLoading(true);
    try {
      const res = await fetch('/api/reviews?property_id=' + encodeURIComponent(propertyId) + '&page=' + (page + 1));
      const d = await res.json().catch(() => null);
      if (res.ok && d) {
        setReviews((prev) => prev.concat((d.reviews as PublicReview[]).filter((x) => !prev.some((p) => p.id === x.id))));
        setPage(page + 1);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="reviews" className="mb-10 scroll-mt-24">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-heading font-bold text-slate-900">{r.heading}</h2>
        <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-700">
          <Pencil className="h-4 w-4" /> {r.write}
        </button>
      </div>

      {s.count === 0 ? (
        <p className="text-sm text-slate-600 bg-slate-50 rounded-xl px-4 py-3 mb-6">{r.none}</p>
      ) : (
        <div className="grid sm:grid-cols-[180px_1fr] gap-5 bg-slate-50 rounded-2xl p-5 mb-6">
          <div>
            <p className="text-4xl font-bold text-slate-900">{s.average.toFixed(1)}<span className="text-base font-normal text-slate-500"> / 5</span></p>
            <Stars value={s.average} />
            <p className="text-xs text-slate-500 mt-1">{s.count === 1 ? r.basedOnOne : fmt(r.basedOn, { n: s.count })}</p>
          </div>
          <div className="space-y-2">
            {CATEGORIES.filter((c) => s.categories[c] !== null).map((c) => (
              <div key={c} className="flex items-center gap-3 text-sm">
                <span className="w-36 shrink-0 text-slate-700">{r.categories[c]}</span>
                <span className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <span className="block h-full bg-green-600 rounded-full" style={{ width: (s.categories[c]! / 5) * 100 + '%' }} />
                </span>
                <span className="w-8 text-right font-medium text-slate-800">{s.categories[c]!.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {photos.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-800 mb-2">{r.photos}</h3>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {photos.map((p) => (
              <a key={p.url} href={p.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.alt} loading="lazy" className="h-24 w-32 object-cover rounded-lg" />
              </a>
            ))}
          </div>
        </div>
      )}

      <ul className="space-y-4">
        {reviews.map((x) => (
          <li key={x.id} className="border border-slate-200 rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Stars value={x.rating} size="h-3.5 w-3.5" />
              <span className="font-semibold text-slate-900">{x.title}</span>
            </div>
            <p className="text-xs text-slate-500 mb-2 flex flex-wrap items-center gap-x-2">
              <span>{x.name}</span>
              <span>· {fmt(r.stayed, { month: monthLabel(x.stay_month, lang) })}</span>
              <span>· {r.trips[x.trip_type] || x.trip_type}</span>
              {x.verified_stay && <span className="inline-flex items-center gap-1 text-green-700 font-medium"><BadgeCheck className="h-3.5 w-3.5" />{r.verified}</span>}
            </p>
            <p className="text-sm text-slate-700 whitespace-pre-line">{x.body}</p>
            {x.owner_reply && <Reply label={r.ownerReply} text={x.owner_reply} />}
            {x.partner_reply && <Reply label={r.partnerReply} text={x.partner_reply} />}
          </li>
        ))}
      </ul>

      {reviews.length < initial.total && (
        <button type="button" onClick={loadMore} disabled={loading}
          className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}{r.showMore}
        </button>
      )}

      {open && <ReviewForm propertyId={propertyId} hotelName={hotelName} onClose={() => setOpen(false)} />}
    </section>
  );
}
