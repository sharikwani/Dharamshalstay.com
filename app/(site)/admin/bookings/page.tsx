'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, Phone, Mail, Check, X, RefreshCw, Plus, Clock, Users, ChevronRight, IndianRupee, ExternalLink, Search, Loader2 } from 'lucide-react';
import { authFetch, supabase } from '@/lib/supabase';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { formatPrice, formatDateTime, statusLabel, STATUS_COLORS, cn } from '@/lib/utils';

const CATEGORY: Record<string, { label: string; icon: string; tone: string }> = {
  hotel: { label: 'Hotel', icon: '🏨', tone: 'bg-sky-50 text-sky-800' },
  trek: { label: 'Trek', icon: '🥾', tone: 'bg-green-50 text-green-800' },
  taxi: { label: 'Taxi', icon: '🚕', tone: 'bg-yellow-50 text-yellow-800' },
  paragliding: { label: 'Paragliding', icon: '🪂', tone: 'bg-cyan-50 text-cyan-800' },
  guide: { label: 'Local guide', icon: '🧭', tone: 'bg-orange-50 text-orange-800' },
};
const OWED = ['pending', 'due', 'overdue'];

/** How long a booking has been waiting: minutes under an hour, hours under two days, then days. */
function waitingFor(createdAt: string): { text: string; late: boolean } {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000));
  const hours = Math.floor(minutes / 60);
  const text = minutes < 60 ? `${minutes}m` : hours < 48 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
  return { text, late: minutes >= 120 };
}

async function patch(id: string, body: Record<string, unknown>) {
  const res = await authFetch(`/api/admin/bookings/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

export default function AdminBookings() {
  const router = useRouter();
  const [all, setAll] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [commFilter, setCommFilter] = useState('all');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [sure, setSure] = useState<string | null>(null);
  const [notices, setNotices] = useState<Record<string, { ok: boolean; text: string }>>({});

  const seq = useRef(0);
  const load = useCallback(async () => {
    const mine = ++seq.current;
    setLoading(true); setLoadError('');
    try {
      const res = await authFetch('/api/admin/bookings');
      if (res.status === 401 || res.status === 403) { router.push('/admin/login'); return; }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not load bookings.');
      if (mine === seq.current) setAll(data.bookings || []);
    } catch (e: any) { if (mine === seq.current) setLoadError(e.message); }
    if (mine === seq.current) setLoading(false);
  }, [router]);
  useEffect(() => { load(); }, [load]);

  const words = q.trim().toLowerCase();
  const bookings = all.filter((b) =>
    (catFilter === 'all' || b.category === catFilter) && (statusFilter === 'all' || b.status === statusFilter)
    && (commFilter === 'all' || b.commission_status === commFilter)
    && (!words || [b.booking_ref, b.guest_name, b.guest_phone, b.guest_email, b.item_name].join(' ').toLowerCase().includes(words)));

  async function run(id: string, action: 'confirm' | 'commission_paid' | 'complete') {
    setBusy(id + action); setSure(null);
    let notice: { ok: boolean; text: string };
    try {
      if (action === 'complete') {
        const { error } = await supabase.from('bookings').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', id).eq('status', 'confirmed');
        if (error) throw new Error('Could not mark it completed.');
        notice = { ok: true, text: 'Marked as completed.' };
      } else {
        const data = await patch(id, { action });
        notice = action === 'confirm'
          ? { ok: true, text: data.already ? 'This booking was already confirmed.' : 'Confirmed: the customer was notified by email and WhatsApp.' }
          : { ok: true, text: 'Commission marked as paid.' };
      }
    } catch (e: any) { notice = { ok: false, text: e.message }; }
    setNotices((prev) => ({ ...prev, [id]: notice }));
    setBusy(null);
    load();
  }

  // Stats from all bookings (not the filtered list).
  const totalAmount = all.reduce((s, b) => s + Number(b.amount || 0), 0);
  const totalCommission = all.filter((b) => b.commission_status !== 'not_applicable' && b.status !== 'cancelled').reduce((s, b) => s + Number(b.commission_amount || 0), 0);
  const pendingCommission = all.filter((b) => OWED.includes(b.commission_status) && b.status !== 'cancelled').reduce((s, b) => s + Number(b.commission_amount || 0), 0);
  const waiting = all.filter((b) => b.status === 'pending').length;

  const btn = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-60';
  const select = 'px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none bg-white';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <AdminPageHeader title="Bookings" description="Every booking, from the website or made here. Tap a booking to see everything about it."
        action={<div className="flex items-center gap-4">
          <button onClick={load} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-800"><RefreshCw className="h-4 w-4" /> Refresh</button>
          <Link href="/admin/bookings/new" className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700"><Plus className="h-4 w-4" /> New booking</Link>
        </div>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          ['Waiting for you', String(waiting), 'text-amber-600'],
          ['Total value', formatPrice(totalAmount), 'text-slate-900'],
          ['Commission earned', formatPrice(totalCommission), 'text-green-600'],
          ['Commission to collect', formatPrice(pendingCommission), 'text-amber-600'],
        ].map(([k, v, tone]) => (
          <div key={k} className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 uppercase">{k}</p>
            <p className={cn('text-2xl font-heading font-bold', tone)}>{v}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-6">
        <label className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, ref, hotel or trek" className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" />
        </label>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className={select} aria-label="Category">
          <option value="all">All types</option>{Object.entries(CATEGORY).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={select} aria-label="Status">
          <option value="all">Any status</option><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
        </select>
        <select value={commFilter} onChange={(e) => setCommFilter(e.target.value)} className={select} aria-label="Commission">
          <option value="all">Any commission</option><option value="pending">Pending</option><option value="due">Due</option><option value="overdue">Overdue</option><option value="paid">Paid</option>
        </select>
        {bookings.length !== all.length && <p className="text-xs text-slate-500 self-center">Showing {bookings.length} of {all.length}</p>}
      </div>

      {loadError && <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{loadError}</p>}
      {loading && !all.length ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-brand-600" /></div>
        : bookings.length === 0 ? <p className="text-slate-500">No bookings match.</p> : (
        <div className="space-y-3">
          {bookings.map((b) => {
            const c = CATEGORY[b.category] || { label: b.category, icon: '📋', tone: 'bg-slate-50 text-slate-700' };
            const href = `/admin/bookings/${b.id}`;
            const owed = OWED.includes(b.commission_status) && Number(b.commission_amount) > 0 && b.status !== 'cancelled';
            const w = b.status === 'pending' && b.created_at ? waitingFor(b.created_at) : null;
            return (
              <div key={b.id} role="link" tabIndex={0}
                onClick={(e) => { if (!(e.target as HTMLElement).closest('a,button')) router.push(href); }}
                onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) router.push(href); }}
                className={cn('group cursor-pointer bg-white border rounded-xl p-5 transition hover:border-brand-300 hover:shadow-md', b.status === 'pending' ? 'border-amber-300' : 'border-slate-200')}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    {/* What was booked, first and biggest */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', c.tone)}>{c.icon} {c.label}</span>
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_COLORS[b.status])}>{statusLabel(b.status)}</span>
                      {w && <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1', w.late ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600')}><Clock className="h-3 w-3" /> Waiting {w.text}</span>}
                      {b.booking_source === 'admin' && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Made by admin</span>}
                      {b.offer_code && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">Offer {b.offer_code} ({b.offer_percent}%)</span>}
                    </div>
                    <h3 className="mt-2 text-lg font-semibold text-slate-900 group-hover:text-brand-700">{b.item_name || c.label}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                      {b.date_text && <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{b.date_text}</span>}
                      {b.num_guests > 0 && <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{b.num_guests} {b.num_guests === 1 ? 'person' : 'people'}</span>}
                      {b.item_href && <a href={b.item_href} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-brand-600 hover:underline"><ExternalLink className="h-3.5 w-3.5" />View {c.label.toLowerCase()} page</a>}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                      <span className="font-medium text-slate-800">{b.guest_name}</span>
                      <a href={`tel:${b.guest_phone}`} className="inline-flex items-center gap-1 hover:text-brand-600"><Phone className="h-3.5 w-3.5" />{b.guest_phone}</a>
                      {b.guest_email && <a href={`mailto:${b.guest_email}`} className="inline-flex items-center gap-1 hover:text-brand-600"><Mail className="h-3.5 w-3.5" />{b.guest_email}</a>}
                      <span className="font-mono text-xs text-slate-400">{b.booking_ref} · {formatDateTime(b.created_at)}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-slate-900">{formatPrice(Number(b.amount))}</p>
                    <p className="text-xs text-slate-500">{b.payment_text}</p>
                    {Number(b.commission_amount) > 0 && (
                      <p className="mt-1 text-xs text-slate-500">Commission {formatPrice(Number(b.commission_amount))}
                        <span className={cn('ml-1 font-medium px-1.5 py-0.5 rounded text-[10px]', STATUS_COLORS[b.commission_status])}>{statusLabel(b.commission_status)}</span>
                      </p>
                    )}
                  </div>
                </div>

                {b.special_requests && <p className="mt-3 text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg">{b.special_requests}</p>}

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                  {b.status === 'pending' && (
                    <button disabled={!!busy} onClick={() => run(b.id, 'confirm')} className={cn(btn, 'bg-green-600 text-white hover:bg-green-700')}>
                      {busy === b.id + 'confirm' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Confirm
                    </button>
                  )}
                  {b.status === 'confirmed' && (
                    <button disabled={!!busy} onClick={() => run(b.id, 'complete')} className={cn(btn, 'bg-emerald-600 text-white hover:bg-emerald-700')}>{busy === b.id + 'complete' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Mark completed</button>
                  )}
                  {['pending', 'confirmed'].includes(b.status) && (
                    <Link href={`${href}?action=cancel`} className={cn(btn, 'border border-red-300 text-red-600 hover:bg-red-50')}><X className="h-4 w-4" />Cancel</Link>
                  )}
                  {owed && (sure === b.id ? (
                    <span className="inline-flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5 text-sm text-amber-900">
                      Received {formatPrice(Number(b.commission_amount))} from the {b.category === 'hotel' ? 'hotel' : 'partner'}?
                      <button disabled={!!busy} onClick={() => run(b.id, 'commission_paid')} className="rounded-md bg-amber-500 px-2.5 py-1 font-semibold text-white">{busy === b.id + 'commission_paid' ? 'Saving…' : 'Yes, paid'}</button>
                      <button onClick={() => setSure(null)} className="rounded-md bg-white px-2.5 py-1 font-semibold text-slate-700">No</button>
                    </span>
                  ) : (
                    <button disabled={!!busy} onClick={() => setSure(b.id)} className={cn(btn, 'bg-amber-500 text-white hover:bg-amber-600')}><IndianRupee className="h-4 w-4" />Mark commission paid</button>
                  ))}
                  <Link href={href} className={cn(btn, 'ml-auto text-brand-600 hover:bg-brand-50')}>Details<ChevronRight className="h-4 w-4" /></Link>
                </div>
                {notices[b.id] && <p className={cn('text-sm mt-2 px-3 py-1.5 rounded-lg border', notices[b.id].ok ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200')}>{notices[b.id].text}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
