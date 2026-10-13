'use client';
import { useEffect, useState } from 'react';
import { CheckCircle, Loader2, Star, X } from 'lucide-react';
import { useT } from '@/lib/i18n/client';
import { fmt } from '@/lib/i18n/dict';
import { cn } from '@/lib/utils';
import { todayIST } from '@/lib/bookings/timing';
import { photosTooBig, shrinkPhoto } from '@/lib/reviews/resize';
import { CATEGORIES, MAX_PHOTOS, TRIP_TYPES, type Category } from '@/lib/reviews/types';

function StarPicker({ label, value, onChange, required }: { label: string; value: number; onChange: (n: number) => void; required?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-700">{label}</span>
      <span className="flex" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={n + '/5'}
            onClick={() => onChange(value === n && !required ? 0 : n)} className="p-0.5">
            <Star className={cn('h-6 w-6', n <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} />
          </button>
        ))}
      </span>
    </div>
  );
}

export default function ReviewForm({ propertyId, hotelName, onClose }: { propertyId: string; hotelName: string; onClose: () => void }) {
  const { t } = useT();
  const r = t.reviews;
  const f = r.form;
  const [rating, setRating] = useState(0);
  const [cats, setCats] = useState<Record<Category, number>>({ cleanliness: 0, location: 0, staff: 0, value: 0 });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const maxMonth = todayIST().slice(0, 7);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    if (!rating) { setError(f.pickRating); return; }
    const data = new FormData(e.currentTarget);
    const files = data.getAll('photos').filter((x): x is File => x instanceof File && x.size > 0);
    if (files.length > MAX_PHOTOS) { setError(f.tooManyPhotos); return; }
    setSending(true);
    try {
      const shrunk = await Promise.all(files.map(shrinkPhoto));
      if (photosTooBig(shrunk.map((x) => x.size))) { setError(f.photosTooBig); return; }
      data.delete('photos');
      shrunk.forEach((x) => data.append('photos', x));
      data.set('property_id', propertyId);
      data.set('rating', String(rating));
      for (const c of CATEGORIES) data.set('rating_' + c, cats[c] ? String(cats[c]) : '');
      const res = await fetch('/api/reviews', { method: 'POST', body: data });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setError(d.error || f.failed);
      else setDone(true);
    } catch {
      setError(f.failed);
    } finally {
      setSending(false);
    }
  }

  const input = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-brand-500';
  const label = 'block text-sm font-medium text-slate-700 mb-1';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="review-form-title" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <h2 id="review-form-title" className="text-lg font-heading font-bold text-slate-900">{fmt(f.title, { name: hotelName })}</h2>
          <button type="button" onClick={onClose} aria-label={f.close} className="p-1 text-slate-500 hover:text-slate-800"><X className="h-5 w-5" /></button>
        </div>

        {done ? (
          <div className="text-center py-6">
            <CheckCircle className="h-10 w-10 text-green-600 mx-auto mb-3" />
            <p className="text-slate-800 font-medium mb-4">{f.thanks}</p>
            <button type="button" onClick={onClose} className="bg-brand-600 text-white px-5 py-2 rounded-lg text-sm font-semibold">{f.close}</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-3 space-y-2">
              <StarPicker label={f.overall} value={rating} onChange={setRating} required />
              <p className="text-xs text-slate-500 pt-1">{f.details}</p>
              {CATEGORIES.map((c) => (
                <StarPicker key={c} label={r.categories[c]} value={cats[c]} onChange={(n) => setCats((p) => ({ ...p, [c]: n }))} />
              ))}
            </div>
            <label className="block"><span className={label}>{f.name}</span>
              <input name="name" required minLength={2} maxLength={60} autoComplete="name" className={input} /></label>
            <label className="block"><span className={label}>{f.phone}</span>
              <input name="phone" type="tel" required inputMode="tel" autoComplete="tel" className={input} />
              <span className="block text-xs text-slate-500 mt-1">{f.phoneHint}</span></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className={label}>{f.month}</span>
                <input name="stay_month" type="month" required max={maxMonth} placeholder="YYYY-MM" className={input} /></label>
              <label className="block"><span className={label}>{f.trip}</span>
                <select name="trip_type" required defaultValue="" className={input}>
                  <option value="" disabled>{f.choose}</option>
                  {TRIP_TYPES.map((k) => <option key={k} value={k}>{r.trips[k]}</option>)}
                </select></label>
            </div>
            <label className="block"><span className={label}>{f.reviewTitle}</span>
              <input name="title" required minLength={5} maxLength={100} className={input} /></label>
            <label className="block"><span className={label}>{f.body}</span>
              <textarea name="body" required minLength={30} maxLength={2000} rows={5} className={input} />
              <span className="block text-xs text-slate-500 mt-1">{f.bodyHint}</span></label>
            <label className="block"><span className={label}>{f.photos}</span>
              <input name="photos" type="file" multiple accept="image/jpeg,image/png,image/webp" className="block w-full text-sm" />
              <span className="block text-xs text-slate-500 mt-1">{f.photosHint}</span></label>
            {/* Honeypot: hidden from people; bots fill it and are silently ignored by the API. */}
            <div className="hidden" aria-hidden="true">
              <label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
            </div>
            {error && <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg" role="alert">{error}</p>}
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 text-sm">{f.cancel}</button>
              <button type="submit" disabled={sending} className="flex items-center gap-2 bg-brand-600 text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
                {sending && <Loader2 className="h-4 w-4 animate-spin" />}{sending ? f.sending : f.submit}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
