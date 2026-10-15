'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, Ban, Check, Loader2, Link2, Trash2, Undo2 } from 'lucide-react';
import { authFetch } from '@/lib/supabase';
import { cn, telHref } from '@/lib/utils';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import type { AdminListingRequest, ListingAction } from '@/lib/listings/admin';

type Status = 'pending' | 'done' | 'rejected';
const TABS: { key: Status; label: string }[] = [{ key: 'pending', label: 'Waiting' }, { key: 'done', label: 'Done' }, { key: 'rejected', label: 'Rejected' }];
const when = (s: string) => new Date(s).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

async function api(path: string, init?: RequestInit) {
  const res = await authFetch(path, { ...init, headers: { 'Content-Type': 'application/json' } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Something went wrong');
  return json;
}

export default function ListingRequestsPage() {
  const [tab, setTab] = useState<Status>('pending');
  const [rows, setRows] = useState<AdminListingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setRows((await api('/api/admin/listing-requests?status=' + tab)).requests); }
    catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [tab]);
  useEffect(() => { load(); }, [load]);

  async function act(x: AdminListingRequest, action: ListingAction) {
    setBusy(x.id); setError(''); setNotice('');
    try {
      const r = await api('/api/admin/listing-requests/' + x.id, { method: 'PATCH', body: JSON.stringify({ action }) });
      setNotice((x.property?.name || 'Listing') + ': ' + r.result);
      if (tab === 'pending') setRows((list) => list.filter((y) => y.id !== x.id)); else load();
    } catch (e: any) { setError(e.message); }
    setBusy(null);
  }

  const button = 'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50';

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <AdminPageHeader title="Claims & removals" description="Hotel owners asking to manage their directory listing, or to have it taken down. 'From our WhatsApp link' means they opened the private link we sent to the hotel's own number. Those removals happen automatically and appear under Done." />

      <div className="flex gap-2 mb-4">
        {TABS.map((x) => (
          <button key={x.key} onClick={() => setTab(x.key)}
            className={cn('px-3 py-1.5 rounded-full text-sm font-medium', tab === x.key ? 'bg-slate-900 text-white' : 'bg-white border border-slate-300 text-slate-700')}>
            {x.label}
          </button>
        ))}
      </div>
      {error && <p className="mb-3 text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      {notice && <p className="mb-3 text-sm text-green-800 bg-green-50 px-3 py-2 rounded-lg">{notice}</p>}

      {loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-600" /></div>
      ) : rows.length === 0 ? (
        <p className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">Nothing here.</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((x) => {
            const p = x.property;
            const live = p?.status === 'published';
            return (
              <li key={x.id} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', x.kind === 'claim' ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-700')}>
                    {x.kind === 'claim' ? 'Claim' : 'Removal'}
                  </span>
                  {x.verified
                    ? <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700"><BadgeCheck className="h-3.5 w-3.5" />From our WhatsApp link</span>
                    : <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800">Not verified: call the hotel first</span>}
                  <span className="text-xs text-slate-500">{when(x.created_at)}</span>
                </div>
                <p className="font-semibold text-slate-900">
                  {p ? <Link href={'/hotels/' + p.slug} target="_blank" className="hover:underline">{p.name}</Link> : 'Deleted listing'}
                  {p && <span className={cn('ml-2 text-xs font-medium', live ? 'text-green-700' : 'text-slate-500')}>{live ? 'live' : 'not on the site'}</span>}
                </p>
                <p className="text-sm text-slate-700 mt-1">
                  {x.name}{x.role ? ' · ' + x.role : ''} · <a href={telHref(x.phone)} className="underline">{x.phone}</a>{x.email ? <> · <a href={'mailto:' + x.email} className="underline">{x.email}</a></> : null}
                </p>
                {x.message && <p className="text-sm text-slate-600 mt-2 whitespace-pre-line">{x.message}</p>}
                {p?.owner_email && <p className="text-xs text-slate-500 mt-2">Owner email on the listing: {p.owner_email}</p>}
                {x.admin_note && <p className="text-xs text-slate-500 mt-2">Note: {x.admin_note}</p>}

                <div className="flex flex-wrap gap-2 mt-4">
                  {tab === 'pending' && x.kind === 'claim' && x.email && (
                    <button disabled={busy === x.id} onClick={() => act(x, 'link_owner')} className={button + ' bg-brand-600 text-white hover:bg-brand-700'}>
                      <Link2 className="h-4 w-4" /> Give them the listing
                    </button>
                  )}
                  {tab === 'pending' && x.kind === 'removal' && live && (
                    <button disabled={busy === x.id} onClick={() => act(x, 'remove_listing')} className={button + ' bg-red-600 text-white hover:bg-red-700'}>
                      <Trash2 className="h-4 w-4" /> Take listing down
                    </button>
                  )}
                  {tab === 'pending' && (
                    <>
                      <button disabled={busy === x.id} onClick={() => act(x, 'mark_done')} className={button + ' border border-slate-300 text-slate-700 hover:bg-slate-50'}>
                        <Check className="h-4 w-4" /> Done
                      </button>
                      <button disabled={busy === x.id} onClick={() => act(x, 'reject')} className={button + ' border border-slate-300 text-slate-700 hover:bg-slate-50'}>
                        <Ban className="h-4 w-4" /> Reject
                      </button>
                    </>
                  )}
                  {tab === 'done' && x.kind === 'removal' && p && !live && (
                    <button disabled={busy === x.id} onClick={() => act(x, 'restore_listing')} className={button + ' border border-slate-300 text-slate-700 hover:bg-slate-50'}>
                      <Undo2 className="h-4 w-4" /> Put listing back
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
