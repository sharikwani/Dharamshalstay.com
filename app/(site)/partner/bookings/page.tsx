'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Phone, ShoppingBag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPrice, statusLabel, STATUS_COLORS, cn } from '@/lib/utils';

/** WhatsApp alert settings for activity partners (works after verification too). Hidden if it cannot load. */
function WhatsAppAlertsCard({ token }: { token: string }) {
  const [loaded, setLoaded] = useState(false);
  const [number, setNumber] = useState('');
  const [alerts, setAlerts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/partner/whatsapp', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        setNumber(String(d.whatsapp_number || d.phone || '').replace(/^91(?=\d{10}$)/, ''));
        setAlerts(!!d.whatsapp_alerts);
        setLoaded(true);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [token]);

  async function save() {
    setSaving(true); setMsg(null);
    try {
      const res = await fetch('/api/partner/whatsapp', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp_number: number.trim(), whatsapp_alerts: alerts }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setMsg({ ok: false, text: d.error || 'Could not save.' });
      else {
        setNumber(String(d.whatsapp_number || number).replace(/^91(?=\d{10}$)/, ''));
        setMsg({ ok: true, text: d.whatsapp_alerts ? 'Saved. New bookings will come to you on WhatsApp.' : 'Saved. WhatsApp alerts are off.' });
      }
    } catch { setMsg({ ok: false, text: 'Could not save. Please check your connection.' }); }
    setSaving(false);
  }

  if (!loaded) return null;
  return (
    <section className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
      <h2 className="font-semibold text-slate-900 mb-1">WhatsApp alerts</h2>
      <p className="text-sm text-slate-600 mb-3">Get new and cancelled bookings on WhatsApp, with Accept / Can&apos;t do it buttons.</p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={alerts} onChange={(e) => setAlerts(e.target.checked)} /> Send me new bookings on WhatsApp
        </label>
        <input
          type="tel" inputMode="numeric" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="10-digit mobile number"
          aria-label="WhatsApp number" className="w-48 px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
        />
        <button onClick={save} disabled={saving} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
      {msg && <p className={cn('text-sm mt-2', msg.ok ? 'text-green-700' : 'text-red-600')}>{msg.text}</p>}
    </section>
  );
}

export default function PartnerBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/partner/login'); return; }
      setToken(session.access_token);
      try {
        const res = await fetch('/api/partner/bookings', { headers: { Authorization: `Bearer ${session.access_token}` } });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) setError(json.error || 'Could not load bookings');
        else setBookings(json.bookings || []);
      } catch { setError('Could not load bookings'); }
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/partner/dashboard" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-brand-600 mb-4"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
      <h1 className="text-2xl font-heading font-bold text-slate-900">Your bookings</h1>
      <p className="text-slate-600 text-sm mb-6">Bookings Dharamshala Stay has assigned to you.</p>

      {token && <WhatsAppAlertsCard token={token} />}

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>}

      {!error && bookings.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <ShoppingBag className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600">No bookings yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <div key={b.id} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-mono text-sm font-semibold text-brand-600">{b.booking_ref}</span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 capitalize">{b.category}</span>
                <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_COLORS[b.status])}>{statusLabel(b.status)}</span>
                {b.partner_response === 'accepted' && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">You accepted</span>}
                {b.partner_response === 'declined' && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">You declined</span>}
              </div>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{b.item_name}</p>
                  <p className="text-sm text-slate-600">{b.date_text} · {b.num_guests} {b.num_guests === 1 ? 'person' : 'people'}</p>
                  {b.assignee_text && <p className="text-sm text-slate-500">Assigned: {b.assignee_text}</p>}
                </div>
                <p className="text-lg font-bold text-slate-900 shrink-0">{formatPrice(b.amount)}</p>
              </div>
              <p className="text-sm text-slate-700 mt-2">
                {b.collected_by === 'partner' ? `You collect from customer — commission due Rs.${Number(b.commission_amount || 0).toLocaleString('en-IN')}`
                  : b.collected_by === 'platform' ? `Paid to Dharamshala Stay — your share Rs.${Number(b.partner_share_amount || 0).toLocaleString('en-IN')}`
                  : 'Payment pending'}
              </p>
              <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <span className="text-slate-900">{b.guest_name}</span>
                {b.guest_phone && (
                  <a href={`tel:${b.guest_phone}`} className="inline-flex items-center gap-1.5 text-brand-600 font-medium py-1">
                    <Phone className="h-4 w-4" /> {b.guest_phone}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
