'use client';
import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Row = {
  id: string; to_phone: string; template: string; recipient_kind: string | null; status: string; error: string | null; created_at: string;
  property_name: string | null; booking_id: string | null; booking_ref: string | null; text: string | null; has_values: boolean; footer: string | null; buttons: string[];
};

const STATUS: Record<string, string> = {
  read: 'bg-sky-100 text-sky-800', delivered: 'bg-green-100 text-green-800', sent: 'bg-slate-100 text-slate-700',
  queued: 'bg-amber-100 text-amber-800', failed: 'bg-red-100 text-red-700',
};
const NAMES: Record<string, string> = {
  listing_enquiry_alert: 'Hotel enquiry alert', listing_claim_invite: 'Listing invite', partner_onboarding_reminder: 'Partner reminder',
  booking_new_partner: 'New booking (partner)', booking_new_partner_v2: 'New booking (partner)',
  booking_cancelled_partner: 'Booking cancelled (partner)', booking_cancelled_partner_v2: 'Booking cancelled (partner)',
  booking_confirmed_customer: 'Booking confirmed (guest)', booking_confirmed_customer_v2: 'Booking confirmed (guest)', booking_cancelled_customer: 'Booking cancelled (guest)',
};
const time = (s: string) => new Date(s).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
/** WhatsApp *bold* shown as bold. */
const bold = (t: string) => t.split(/(\*[^*\n]+\*)/g).map((p, i) => (p.startsWith('*') && p.endsWith('*') && p.length > 2 ? <b key={i}>{p.slice(1, -1)}</b> : p));

/** Every WhatsApp template we sent (booking alerts, hotel enquiry alerts, invites), each one openable to read in full. */
export default function WhatsAppSent({ api }: { api: (path: string) => Promise<any> }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  const [open, setOpen] = useState<Row | null>(null);
  const load = useCallback(() => { setRows(null); api('/api/admin/whatsapp/sent?q=' + encodeURIComponent(q)).then((j) => setRows(j.rows)).catch((e) => setErr(e.message)); }, [api, q]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex gap-2 mb-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by phone number" className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
        <button onClick={load} aria-label="Refresh" className="px-3 py-2 rounded-lg border border-slate-300"><RefreshCw className="h-4 w-4" /></button>
      </div>
      {err && <p className="text-sm text-red-700">{err}</p>}
      {!rows ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : !rows.length ? <p className="text-sm text-slate-500">No messages sent yet.</p> : (
        <ul className="divide-y divide-slate-100">
          {rows.map((r) => (
            <li key={r.id}>
              <button onClick={() => setOpen(r)} className="w-full text-left py-3 px-2 hover:bg-slate-50 rounded-lg flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-xs text-slate-500 w-28 shrink-0">{time(r.created_at)}</span>
                <span className="font-semibold text-slate-900">{NAMES[r.template] || r.template}</span>
                <span className="text-sm text-slate-600">to +{r.to_phone}{r.property_name ? ` · ${r.property_name}` : ''}{r.booking_ref ? ` · ${r.booking_ref}` : ''}</span>
                <span className={cn('ml-auto text-[11px] px-2 py-0.5 rounded-full font-medium', STATUS[r.status] || STATUS.sent)}>{r.status}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
          <div className="bg-white w-full max-w-lg h-full overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h2 className="font-heading font-bold text-lg text-slate-900">{NAMES[open.template] || open.template}</h2>
                <p className="text-sm text-slate-600">To <a href={`https://wa.me/${open.to_phone}`} className="font-semibold text-slate-800">+{open.to_phone}</a> · {time(open.created_at)}</p>
                <p className="text-sm text-slate-600">
                  {open.property_name && <>Hotel: {open.property_name} </>}
                  {open.booking_id && <a href={`/admin/bookings/${open.booking_id}`} className="text-brand-700 underline">Booking {open.booking_ref || ''}</a>}
                </p>
              </div>
              <button onClick={() => setOpen(null)} aria-label="Close" className="p-2 rounded-lg hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <p className="mb-3 text-xs"><span className={cn('px-2 py-0.5 rounded-full font-medium', STATUS[open.status] || STATUS.sent)}>{open.status}</span>{open.error && <span className="ml-2 text-red-700">{open.error}</span>}</p>
            <div className="rounded-2xl bg-[#e5ddd5] p-4">
              <div className="rounded-xl bg-white p-3 shadow-sm text-sm text-slate-900 whitespace-pre-wrap">
                {open.text ? bold(open.text) : <span className="text-slate-500">Template text not available.</span>}
                {open.footer && <p className="mt-2 text-xs text-slate-500">{open.footer}</p>}
              </div>
              {open.buttons.map((b) => <div key={b} className="mt-1 rounded-xl bg-white py-2 text-center text-sm font-medium text-sky-700 shadow-sm">{b}</div>)}
            </div>
            {open.text && !open.has_values && <p className="mt-3 text-xs text-slate-500">Sent before we kept the filled-in details, so the numbered blanks show where the hotel, dates or booking went.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
