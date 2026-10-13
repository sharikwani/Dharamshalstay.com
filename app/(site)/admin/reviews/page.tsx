'use client';
import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, Ban, Check, EyeOff, Loader2, Star } from 'lucide-react';
import { authFetch } from '@/lib/supabase';
import { cn, telHref } from '@/lib/utils';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import type { AdminReview } from '@/lib/reviews/store';
import type { ReviewStatus } from '@/lib/reviews/types';

const TABS: { key: ReviewStatus; label: string }[] = [
  { key: 'pending', label: 'Waiting' }, { key: 'approved', label: 'Live' }, { key: 'hidden', label: 'Hidden' }, { key: 'rejected', label: 'Rejected' },
];
const when = (s: string) => new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

async function api(path: string, init?: RequestInit) {
  const res = await authFetch(path, { ...init, headers: { 'Content-Type': 'application/json' } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Something went wrong');
  return json;
}

export default function AdminReviewsPage() {
  const [tab, setTab] = useState<ReviewStatus>('pending');
  const [rows, setRows] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setRows((await api('/api/admin/reviews?status=' + tab)).reviews); }
    catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [tab]);
  useEffect(() => { load(); }, [load]);

  async function moderate(id: string, status: 'approved' | 'rejected' | 'hidden') {
    setBusy(id); setError('');
    try {
      await api('/api/admin/reviews/' + id, { method: 'PATCH', body: JSON.stringify({ status }) });
      setRows((list) => list.filter((x) => x.id !== id));
    } catch (e: any) { setError(e.message); }
    setBusy(null);
  }

  // Saving an empty box removes the reply.
  async function saveReply(x: AdminReview) {
    const owner_reply = (drafts[x.id] ?? x.owner_reply ?? '').trim();
    setBusy(x.id); setError('');
    try {
      await api('/api/admin/reviews/' + x.id, { method: 'PATCH', body: JSON.stringify({ owner_reply }) });
      setRows((list) => list.map((r) => (r.id === x.id ? { ...r, owner_reply: owner_reply || null } : r)));
      setDrafts((d) => { const n = { ...d }; delete n[x.id]; return n; });
    } catch (e: any) { setError(e.message); }
    setBusy(null);
  }

  const button = 'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50';

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <AdminPageHeader title="Guest reviews" description="New reviews wait here until you approve them. Only approved reviews show on hotel pages and in Google. The phone number is private: use it to check the guest really stayed." />

      <div className="flex gap-2 mb-4">
        {TABS.map((x) => (
          <button key={x.key} onClick={() => setTab(x.key)}
            className={cn('px-3 py-1.5 rounded-full text-sm font-medium', tab === x.key ? 'bg-slate-900 text-white' : 'bg-white border border-slate-300 text-slate-700')}>
            {x.label}
          </button>
        ))}
      </div>
      {error && <p className="mb-3 text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      {loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-600" /></div>
      ) : rows.length === 0 ? (
        <p className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">Nothing here.</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((x) => (
            <li key={x.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <a href={'/hotels/' + x.property_slug} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700 hover:underline">{x.property_name}</a>
                <span className="text-xs text-slate-500">{when(x.created_at)}</span>
              </div>
              <p className="flex items-center gap-1 text-amber-500 mb-1">
                {Array.from({ length: x.rating }, (_, i) => <Star key={i} className="h-4 w-4 fill-amber-400" />)}
                <span className="ml-2 font-semibold text-slate-900">{x.title}</span>
              </p>
              <p className="text-sm text-slate-700 whitespace-pre-line mb-2">{x.body}</p>
              <p className="text-xs text-slate-500 mb-3 flex flex-wrap gap-x-3">
                <span>{x.name}</span>
                <a href={telHref(x.phone)} className="underline">{x.phone}</a>
                <span>stayed {x.stay_month}</span>
                <span>{x.trip_type}</span>
                {x.verified_stay && <span className="inline-flex items-center gap-1 text-green-700 font-medium"><BadgeCheck className="h-3.5 w-3.5" />Verified stay</span>}
              </p>
              {x.photo_urls.length > 0 && (
                <div className="flex gap-2 mb-3">
                  {x.photo_urls.map((u, i) => u ? (
                    <a key={u} href={u} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={u} alt="Guest photo" className="h-20 w-28 object-cover rounded-lg border border-slate-200" />
                    </a>
                  ) : (
                    <span key={'missing-' + i} className="h-20 w-28 rounded-lg border border-dashed border-slate-300 text-xs text-slate-400 flex items-center justify-center text-center px-1">Photo unavailable</span>
                  ))}
                </div>
              )}
              {x.partner_reply && <p className="text-sm bg-slate-50 rounded-lg px-3 py-2 mb-3"><strong>Property replied:</strong> {x.partner_reply}</p>}

              <div className="flex flex-wrap gap-2 mb-3">
                {x.status !== 'approved' && (
                  <button disabled={busy === x.id} onClick={() => moderate(x.id, 'approved')} className={cn(button, 'bg-green-600 text-white')}><Check className="h-4 w-4" />Approve</button>
                )}
                {x.status === 'pending' && (
                  <button disabled={busy === x.id} onClick={() => moderate(x.id, 'rejected')} className={cn(button, 'bg-red-600 text-white')}><Ban className="h-4 w-4" />Reject</button>
                )}
                {x.status === 'approved' && (
                  <button disabled={busy === x.id} onClick={() => moderate(x.id, 'hidden')} className={cn(button, 'bg-slate-700 text-white')}><EyeOff className="h-4 w-4" />Hide</button>
                )}
              </div>

              <label className="block text-xs font-medium text-slate-600 mb-1">Reply as Dharamshala Stay (shown under the review)</label>
              <div className="flex gap-2">
                <textarea rows={2} value={drafts[x.id] ?? x.owner_reply ?? ''} onChange={(e) => setDrafts((d) => ({ ...d, [x.id]: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                {(() => {
                  const draft = drafts[x.id];
                  const removing = draft !== undefined && !draft.trim() && !!x.owner_reply;
                  return (
                    <button disabled={busy === x.id || !(draft?.trim() || removing)} onClick={() => saveReply(x)}
                      className={cn(button, removing ? 'bg-red-600 text-white self-start' : 'bg-brand-600 text-white self-start')}>
                      {removing ? 'Remove reply' : 'Save reply'}
                    </button>
                  );
                })()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
