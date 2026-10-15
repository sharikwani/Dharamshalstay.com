'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Send } from 'lucide-react';
import { authFetch } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import type { OutreachRow } from '@/lib/listings/outreach';

async function api(path: string, init?: RequestInit) {
  const res = await authFetch(path, { ...init, headers: { 'Content-Type': 'application/json' } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Something went wrong');
  return json;
}

const PREVIEW = `Hello from Dharamshala Stay 🙏

*{hotel}* is listed in our free guide to places to stay in Dharamshala and McLeod Ganj: {page}

Is everything correct? Claim your listing for free to update your photos, rooms and contact details, and get direct bookings with no listing fee.

If you would rather not be listed, tap *Remove listing* and it will be taken down straight away.

[Claim listing]  [Remove listing]`;

const STATUS_TONE: Record<string, string> = {
  sent: 'bg-sky-50 text-sky-800', delivered: 'bg-green-50 text-green-800', read: 'bg-green-100 text-green-900',
  failed: 'bg-red-50 text-red-700', queued: 'bg-slate-100 text-slate-600',
};

export default function ListingOutreachPage() {
  const [rows, setRows] = useState<OutreachRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [log, setLog] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setRows((await api('/api/admin/listing-outreach')).rows); } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const ready = rows.filter((r) => !r.blocked);

  async function send(ids?: string[]) {
    const n = ids ? ids.length : ready.length;
    if (!window.confirm(`Send the WhatsApp message to ${n} hotel${n === 1 ? '' : 's'} now? This cannot be undone.`)) return;
    setSending(true); setError(''); setLog([]);
    try {
      for (let round = 0; round < 20; round++) {
        const r = await api('/api/admin/listing-outreach', { method: 'POST', body: JSON.stringify(ids ? { ids } : {}) });
        setLog((l) => [...l, ...r.results.map((x: any) => (x.ok ? '✓ ' : '✗ ') + x.name + (x.error ? ' -- ' + x.error : ''))]);
        if (!r.remaining || !r.results.length) break;
      }
    } catch (e: any) { setError(e.message); }
    setSending(false);
    load();
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <AdminPageHeader title="Owner outreach" description="WhatsApp each directory hotel once to say it is listed, with private links to claim the listing or have it removed. Sent from the business number with the listing_claim_invite template, which Meta must approve first. Replies arrive in WhatsApp chats; claims and removals in Claims & removals." />

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div>
          {error && <p className="mb-3 text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <button disabled={sending || loading || ready.length === 0} onClick={() => send()}
              className="flex items-center gap-2 bg-green-700 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-800 disabled:opacity-50">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send to all {ready.length} ready
            </button>
            <span className="text-sm text-slate-500">{rows.length} live directory listings</span>
          </div>
          {log.length > 0 && <pre className="mb-4 text-xs bg-slate-900 text-slate-100 rounded-lg p-3 whitespace-pre-wrap">{log.join('\n')}</pre>}

          {loading ? (
            <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-600" /></div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {rows.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                  <div className="flex-1 min-w-[180px]">
                    <Link href={'/hotels/' + r.slug} target="_blank" className="font-medium text-slate-900 hover:underline">{r.name}</Link>
                    <p className="text-xs text-slate-500">{r.phone || 'no phone'}</p>
                  </div>
                  {r.last && (
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_TONE[r.last.status] || STATUS_TONE.queued)} title={r.last.error || ''}>
                      {r.last.status} · {new Date(r.last.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                  {r.blocked ? (
                    <span className="text-xs text-slate-500">{r.blocked}</span>
                  ) : (
                    <button disabled={sending} onClick={() => send([r.id])} className="text-xs font-semibold text-green-700 hover:underline disabled:opacity-50">Send</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-6 self-start">
          <p className="text-sm font-semibold text-slate-700 mb-2">The message</p>
          <pre className="text-sm bg-[#e7ffdb] text-slate-800 rounded-xl p-4 whitespace-pre-wrap font-sans">{PREVIEW}</pre>
          <p className="text-xs text-slate-500 mt-2">Each hotel gets its own private claim and removal links. A removal through them takes the listing down at once.</p>
        </aside>
      </div>
    </div>
  );
}
