'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Phone, ShoppingBag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPrice, statusLabel, STATUS_COLORS, cn } from '@/lib/utils';

export default function PartnerBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/partner/login'); return; }
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
