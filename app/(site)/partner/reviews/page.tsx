'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BadgeCheck, Loader2, Star } from 'lucide-react';
import { supabase, authFetch } from '@/lib/supabase';
import type { PartnerReview } from '@/lib/reviews/store';

export default function PartnerReviewsPage() {
  const router = useRouter();
  const [reviews, setReviews] = useState<PartnerReview[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/partner/login'); return; }
      try {
        const res = await authFetch('/api/partner/reviews');
        const json = await res.json().catch(() => ({}));
        if (!res.ok) setError(json.error || 'Could not load reviews');
        else setReviews(json.reviews || []);
      } catch { setError('Could not load reviews'); }
      setLoading(false);
    }
    load();
  }, [router]);

  async function reply(x: PartnerReview) {
    const text = (drafts[x.id] ?? x.partner_reply ?? '').trim();
    setBusy(x.id); setError(''); setSaved(null);
    try {
      const res = await authFetch('/api/partner/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_id: x.id, reply: text }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) setError(json.error || 'Could not save your reply');
      else {
        setReviews((list) => list.map((r) => (r.id === x.id ? { ...r, partner_reply: text || null } : r)));
        setDrafts((d) => { const n = { ...d }; delete n[x.id]; return n; });
        setSaved(x.id);
      }
    } catch { setError('Could not save your reply'); }
    setBusy(null);
  }

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/partner/dashboard" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-brand-600 mb-4"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
      <h1 className="text-2xl font-heading font-bold text-slate-900">Guest reviews</h1>
      <p className="text-slate-600 text-sm mb-6">Approved reviews of your properties. You can add one public reply to each; saving again replaces it.</p>
      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>}

      {!error && reviews.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Star className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600">No approved reviews yet.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {reviews.map((x) => {
            const draft = (drafts[x.id] ?? x.partner_reply ?? '').trim();
            const changed = drafts[x.id] !== undefined && draft !== (x.partner_reply ?? '');
            // An empty box removes an existing reply.
            const removing = changed && draft === '' && !!x.partner_reply;
            const valid = removing || (draft.length >= 2 && draft.length <= 1000);
            return (
              <li key={x.id} className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-brand-700 mb-1">{x.property_name}</p>
                <p className="flex items-center gap-1 mb-1">
                  {Array.from({ length: x.rating }, (_, i) => <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
                  <span className="ml-2 font-semibold text-slate-900">{x.title}</span>
                </p>
                <p className="text-sm text-slate-700 whitespace-pre-line mb-2">{x.body}</p>
                <p className="text-xs text-slate-500 mb-3 flex flex-wrap gap-x-3">
                  <span>{x.name}</span><span>stayed {x.stay_month}</span>
                  {x.verified_stay && <span className="inline-flex items-center gap-1 text-green-700 font-medium"><BadgeCheck className="h-3.5 w-3.5" />Verified stay</span>}
                </p>
                {x.owner_reply && <p className="text-sm bg-slate-50 rounded-lg px-3 py-2 mb-3"><strong>Dharamshala Stay replied:</strong> {x.owner_reply}</p>}
                <label htmlFor={`reply-${x.id}`} className="block text-xs font-medium text-slate-600 mb-1">Your public reply (2-1000 characters)</label>
                <div className="flex gap-2">
                  <textarea id={`reply-${x.id}`} rows={2} maxLength={1000} value={drafts[x.id] ?? x.partner_reply ?? ''}
                    onChange={(e) => { setSaved(null); setDrafts((d) => ({ ...d, [x.id]: e.target.value })); }}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                  <button disabled={busy === x.id || !changed || !valid} onClick={() => reply(x)}
                    className="self-start flex items-center gap-1 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
                    {busy === x.id && <Loader2 className="h-4 w-4 animate-spin" />}{removing ? 'Remove reply' : 'Save'}
                  </button>
                </div>
                {saved === x.id && <p className="text-sm text-green-700 mt-2">{x.partner_reply ? 'Saved. Your reply now shows on the hotel page.' : 'Your reply has been removed.'}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
