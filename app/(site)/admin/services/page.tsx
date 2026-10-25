'use client';
import { useCallback, useEffect, useState } from 'react';
import { Check, Ban, EyeOff, Loader2 } from 'lucide-react';
import { authFetch } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { AdminPageHeader } from '@/components/admin/AdminShell';

type Status = 'pending' | 'published' | 'rejected' | 'hidden';
const TABS: { key: Status; label: string }[] = [{ key: 'pending', label: 'Waiting' }, { key: 'published', label: 'Live' }, { key: 'rejected', label: 'Rejected' }, { key: 'hidden', label: 'Hidden' }];

async function api(path: string, init?: RequestInit) {
  const res = await authFetch(path, { ...init, headers: { 'Content-Type': 'application/json' } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Something went wrong');
  return json;
}

/** Luggage storage (local services) sign-ups: approve to show them on /luggage-storage. */
export default function AdminServicesPage() {
  const [tab, setTab] = useState<Status>('pending');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setRows((await api('/api/admin/services?status=' + tab)).services); } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [tab]);
  useEffect(() => { load(); }, [load]);

  async function act(id: string, action: 'approve' | 'reject' | 'hide') {
    setBusy(id); setError('');
    try { await api('/api/admin/services', { method: 'PATCH', body: JSON.stringify({ id, action }) }); await load(); } catch (e: any) { setError(e.message); }
    setBusy(null);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <AdminPageHeader title="Local services" description="Luggage storage businesses that signed up on /luggage-storage/list-your-service. Approve to show them on the site." />
      <div className="mb-4 flex gap-1 rounded-lg bg-slate-100 p-1 text-sm w-fit">
        {TABS.map((t) => <button key={t.key} onClick={() => setTab(t.key)} className={cn('rounded-md px-3 py-1.5 font-medium', tab === t.key ? 'bg-white shadow-sm' : 'text-slate-600')}>{t.label}</button>)}
      </div>
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {loading ? <Loader2 className="h-6 w-6 animate-spin text-slate-400" /> : rows.length === 0 ? <p className="text-slate-500">Nothing here.</p> : (
        <div className="space-y-3">
          {rows.map((s) => (
            <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{s.name} <span className="font-normal text-slate-500">· {s.area}</span></p>
                  <p className="text-sm text-slate-600">{s.owner_name} · +{s.phone}{s.email ? ' · ' + s.email : ''}</p>
                  <p className="text-sm text-slate-700 mt-1">{s.price_text}{s.hours ? ' · ' + s.hours : ''}</p>
                  {s.features?.length > 0 && <p className="text-xs text-slate-500 mt-1">{s.features.join(' · ')}</p>}
                  {s.description && <p className="text-sm text-slate-600 mt-1">{s.description}</p>}
                </div>
                <div className="flex gap-2">
                  {s.status !== 'published' && <button disabled={busy === s.id} onClick={() => act(s.id, 'approve')} className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white"><Check className="h-4 w-4" />Approve</button>}
                  {s.status === 'pending' && <button disabled={busy === s.id} onClick={() => act(s.id, 'reject')} className="inline-flex items-center gap-1 rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-800"><Ban className="h-4 w-4" />Reject</button>}
                  {s.status === 'published' && <button disabled={busy === s.id} onClick={() => act(s.id, 'hide')} className="inline-flex items-center gap-1 rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-800"><EyeOff className="h-4 w-4" />Hide</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
