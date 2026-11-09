'use client';
import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { Star, Check, AlertCircle } from 'lucide-react';

const WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

export default function RateForm({ token, partnerName, firstName, profile }: { token: string; partnerName: string; firstName: string; profile: string | null }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [name, setName] = useState(firstName);
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const [link, setLink] = useState<string | null>(profile);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!rating) { setError('Please tap the stars to choose a rating.'); setStatus('error'); return; }
    setStatus('sending'); setError('');
    try {
      const r = await fetch('/api/partner-reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, rating, name, body }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Could not save your rating. Please try again.');
      if (d.profile) setLink(d.profile);
      setStatus('done');
    } catch (err: any) { setError(err.message); setStatus('error'); }
  }

  if (status === 'done') {
    return (
      <div className="rounded-2xl bg-green-50 p-6 text-center">
        <Check className="mx-auto h-10 w-10 text-green-600" />
        <h2 className="mt-2 font-heading text-xl font-bold text-slate-900">Thank you{name ? ', ' + name : ''}!</h2>
        <p className="mt-1 text-slate-700">Your rating for {partnerName} is live. It helps other travellers choose well.</p>
        {link && <Link href={link} className="mt-4 inline-block font-semibold text-brand-700 underline">See {partnerName}&rsquo;s profile &rarr;</Link>}
      </div>
    );
  }

  const shown = hover || rating;
  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Your rating</p>
        <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Rating out of 5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`}
              onClick={() => { setRating(n); setStatus('idle'); }} onMouseEnter={() => setHover(n)} className="p-1">
              <Star className={`h-10 w-10 ${n <= shown ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
            </button>
          ))}
          <span className="ml-2 text-sm font-semibold text-slate-700">{WORDS[shown]}</span>
        </div>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Your name (shown with the review)</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none" />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">How was it? (optional)</span>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={1500} rows={4} placeholder="The driver, the car, timing, anything that stood out"
          className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none" />
      </label>
      {status === 'error' && <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600"><AlertCircle className="h-4 w-4 shrink-0" />{error}</p>}
      <button type="submit" disabled={status === 'sending'} className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
        {status === 'sending' ? 'Sending…' : 'Submit rating'}
      </button>
    </form>
  );
}
