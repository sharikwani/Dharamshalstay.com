'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Phone, Mail, MessageCircle } from 'lucide-react';
import { authFetch } from '@/lib/supabase';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { AssignFields, EMPTY_ASSIGN, EMPTY_PAYMENT, INPUT, LABEL, PaymentFields, paymentBody, type AssignValue, type OptionPartner, type PaymentValue } from '@/components/admin/BookingFields';
import { waLink, bookingShareText } from '@/lib/whatsapp';
import { ACTIVITY_CATEGORIES, type ActivityCategory } from '@/lib/manual-booking';
import { formatPrice, statusLabel, STATUS_COLORS, cn } from '@/lib/utils';

const CARD = 'bg-white border border-slate-200 rounded-xl p-5 mb-5';
const H2 = 'font-semibold text-slate-900 mb-3';
const BTN = 'px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50';
const CATEGORY_LABEL: Record<string, string> = { hotel: 'Hotel', taxi: 'Taxi', trek: 'Trek', paragliding: 'Paragliding', guide: 'Local guide' };

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  if (v == null || v === '') return null;
  return <div className="flex gap-3 text-sm py-1"><span className="w-32 shrink-0 text-slate-500">{k}</span><span className="text-slate-900 min-w-0 break-words">{v}</span></div>;
}

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [b, setB] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [panel, setPanel] = useState<'' | 'payment' | 'assign' | 'cancel'>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notify, setNotify] = useState(true);

  const [payment, setPayment] = useState<PaymentValue>(EMPTY_PAYMENT);
  const [assign, setAssign] = useState<AssignValue>(EMPTY_ASSIGN);
  const [partners, setPartners] = useState<OptionPartner[]>([]);
  const [optsLoading, setOptsLoading] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    let cancelled = false;
    authFetch(`/api/admin/bookings/${id}`)
      .then(async (r) => ({ ok: r.ok, body: await r.json().catch(() => ({})) }))
      .then(({ ok, body }) => {
        if (cancelled) return;
        if (!ok) setLoadError(body.error || 'Could not load the booking.'); else setB(body.booking);
      })
      .catch(() => { if (!cancelled) setLoadError('Could not load the booking.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  function open(p: 'payment' | 'assign' | 'cancel') {
    setError(''); setReason(''); setPanel(p);
    if (p === 'payment') {
      setNotify(true);
      // Website bookings have no collected_by; if they were paid online they must not be shown as unpaid
      const paidToUs = b.collected_by === 'platform'
        || (!b.collected_by && (['paid', 'partially_paid'].includes(b.payment_status) || b.payment_method === 'online'));
      setPayment({
        ...EMPTY_PAYMENT,
        choice: paidToUs ? 'platform_paid' : b.collected_by === 'partner' ? 'partner_collects' : 'unpaid',
        amount: b.paid_amount != null ? String(b.paid_amount) : '',
        channel: ['upi', 'bank', 'cash', 'card', 'stripe'].includes(b.payment_channel) ? b.payment_channel : b.payment_method === 'online' ? 'stripe' : 'upi',
        reference: b.payment_reference || '',
      });
    } else {
      setNotify(true);
    }
    if (p === 'assign') {
      setAssign({ partner_id: b.partner_id || '', staff_id: b.staff_id || '', vehicle_id: b.vehicle_id || '' });
      setOptsLoading(true);
      authFetch(`/api/admin/booking-options?type=${b.category}`)
        .then(async (r) => ({ ok: r.ok, body: await r.json().catch(() => ({})) }))
        .then(({ ok, body }) => { if (ok) setPartners(body.partners || []); else setError(body.error || 'Could not load partners.'); })
        .catch(() => setError('Could not load partners.'))
        .finally(() => setOptsLoading(false));
    }
  }

  async function patch(payload: Record<string, any>) {
    setSaving(true); setError('');
    try {
      const res = await authFetch(`/api/admin/bookings/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || 'Could not save the change.'); return; }
      setB(data.booking); setPanel('');
    } catch {
      setError('Could not save the change. Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8"><p className="text-slate-500">Loading...</p></div>;
  if (loadError || !b) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Link href="/admin/bookings" className="text-sm text-brand-600 hover:underline flex items-center gap-1 mb-4"><ArrowLeft className="h-4 w-4" /> All bookings</Link>
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{loadError || 'Booking not found.'}</p>
      </div>
    );
  }

  const cancelled = b.status === 'cancelled';
  const isActivity = (ACTIVITY_CATEGORIES as readonly string[]).includes(b.category);
  const canReassign = isActivity && !cancelled && b.commission_status !== 'paid';
  const pc = b.partner_contact as { name: string; email: string | null; phone: string | null } | null;
  const partnerLink = pc ? waLink(pc.phone, bookingShareText(b as any, 'partner')) : null;
  const customerLink = waLink(b.guest_phone, bookingShareText(b as any, 'customer'));
  const assignedTo = pc?.name || (isActivity ? 'Unassigned' : '');

  const errorBox = error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-3">{error}</p>;
  const notifyBox = (label: string) => (
    <label className="flex items-center gap-2 text-sm text-slate-700 mt-3"><input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> {label}</label>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/admin/bookings" className="text-sm text-brand-600 hover:underline flex items-center gap-1 mb-4"><ArrowLeft className="h-4 w-4" /> All bookings</Link>
      <AdminPageHeader title={`Booking ${b.booking_ref}`} description={`${CATEGORY_LABEL[b.category] || b.category} · created ${new Date(b.created_at).toLocaleDateString('en-IN')}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_COLORS[b.status])}>{statusLabel(b.status)}</span>
            {b.booking_source === 'admin' && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">Created by admin</span>}
            {b.price_overridden && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">manual price</span>}
          </div>
        } />

      <section className={CARD}>
        <h2 className={H2}>What</h2>
        <Row k="Booked" v={b.item_name} />
        <Row k="When" v={b.date_text} />
        <Row k="People" v={b.num_guests} />
        <Row k="Notes" v={b.special_requests} />
        {cancelled && <Row k="Cancelled because" v={b.cancelled_reason} />}
      </section>

      <section className={CARD}>
        <h2 className={H2}>Customer</h2>
        <Row k="Name" v={b.guest_name} />
        <Row k="Phone" v={<a href={`tel:${b.guest_phone}`} className="inline-flex items-center gap-1 text-brand-600 hover:underline"><Phone className="h-3.5 w-3.5" />{b.guest_phone}</a>} />
        <Row k="Email" v={b.guest_email && <a href={`mailto:${b.guest_email}`} className="inline-flex items-center gap-1 text-brand-600 hover:underline"><Mail className="h-3.5 w-3.5" />{b.guest_email}</a>} />
      </section>

      <section className={CARD}>
        <h2 className={H2}>Price and payment</h2>
        <Row k="Amount" v={<span className="font-bold">{formatPrice(Number(b.amount))}{b.price_overridden && b.list_amount != null && <span className="ml-2 font-normal text-slate-400 line-through">{formatPrice(Number(b.list_amount))}</span>}</span>} />
        {b.price_overridden && <Row k="Price reason" v={b.price_override_reason} />}
        <Row k="Commission" v={b.commission_amount != null ? `${formatPrice(Number(b.commission_amount))} (${Number(b.commission_pct)}%)` : null} />
        <Row k="Partner share" v={b.partner_share_amount != null ? formatPrice(Number(b.partner_share_amount)) : null} />
        <Row k="Payment" v={b.payment_text} />
        <Row k="Received" v={b.paid_amount != null ? formatPrice(Number(b.paid_amount)) : null} />
        <Row k="Method" v={b.payment_channel && String(b.payment_channel).toUpperCase()} />
        <Row k="Reference" v={b.payment_reference} />
        <Row k="Commission status" v={b.commission_status && statusLabel(b.commission_status)} />
        {!cancelled && panel !== 'payment' && <button onClick={() => open('payment')} className={cn(BTN, 'mt-3 border border-slate-300 text-slate-700 hover:bg-slate-50')}>Change payment</button>}
        {panel === 'payment' && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <PaymentFields value={payment} onChange={setPayment} finalAmount={Number(b.amount)} />
            {notifyBox('Notify the customer by email (if they have an email)')}
            {errorBox}
            <div className="flex gap-2 mt-3">
              <button disabled={saving} onClick={() => patch({ action: 'payment', ...paymentBody(payment, Number(b.amount)), notify })} className={cn(BTN, 'bg-brand-600 text-white hover:bg-brand-700')}>{saving ? 'Saving...' : 'Save payment'}</button>
              <button disabled={saving} onClick={() => setPanel('')} className={cn(BTN, 'border border-slate-300 text-slate-700')}>Close</button>
            </div>
          </div>
        )}
      </section>

      <section className={CARD}>
        <h2 className={H2}>Assigned to</h2>
        <Row k={b.category === 'hotel' ? 'Hotel' : b.category === 'guide' ? 'Guide' : 'Partner'} v={assignedTo} />
        <Row k="Contact" v={pc && [pc.phone, pc.email].filter(Boolean).join(' · ')} />
        <Row k="Details" v={b.assignee_text} />
        {canReassign && panel !== 'assign' && <button onClick={() => open('assign')} className={cn(BTN, 'mt-3 border border-slate-300 text-slate-700 hover:bg-slate-50')}>Change</button>}
        {isActivity && !cancelled && b.commission_status === 'paid' && <p className="text-xs text-slate-500 mt-2">Commission is already settled, so this booking cannot be reassigned.</p>}
        {panel === 'assign' && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            {optsLoading ? <p className="text-sm text-slate-500">Loading...</p> : <AssignFields category={b.category as ActivityCategory} partners={partners} value={assign} onChange={setAssign} />}
            {notifyBox('Notify the partner by email')}
            {errorBox}
            <div className="flex gap-2 mt-3">
              <button disabled={saving || optsLoading} onClick={() => patch({ action: 'assign', partner_id: assign.partner_id || null, staff_id: assign.staff_id || null, vehicle_id: b.category === 'taxi' ? assign.vehicle_id || null : null, notify })} className={cn(BTN, 'bg-brand-600 text-white hover:bg-brand-700')}>{saving ? 'Saving...' : 'Save assignment'}</button>
              <button disabled={saving} onClick={() => setPanel('')} className={cn(BTN, 'border border-slate-300 text-slate-700')}>Close</button>
            </div>
          </div>
        )}
      </section>

      {!cancelled && (
        <section className={CARD}>
          <h2 className={H2}>Actions</h2>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2">
            {partnerLink && <a href={partnerLink} target="_blank" rel="noopener noreferrer" className={cn(BTN, 'inline-flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700')}><MessageCircle className="h-4 w-4" /> Send on WhatsApp to partner</a>}
            {customerLink && <a href={customerLink} target="_blank" rel="noopener noreferrer" className={cn(BTN, 'inline-flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700')}><MessageCircle className="h-4 w-4" /> Send on WhatsApp to customer</a>}
            {panel !== 'cancel' && <button onClick={() => open('cancel')} className={cn(BTN, 'border border-red-300 text-red-600 hover:bg-red-50')}>Cancel booking</button>}
          </div>
          {panel === 'cancel' && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <label className={LABEL}>Reason for cancelling</label>
              <input className={INPUT} value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
              {notifyBox('Notify the customer and partner by email')}
              {errorBox}
              <div className="flex gap-2 mt-3">
                <button disabled={saving || reason.trim().length < 3} onClick={() => patch({ action: 'cancel', reason: reason.trim(), notify })} className={cn(BTN, 'bg-red-600 text-white hover:bg-red-700')}>{saving ? 'Cancelling...' : 'Confirm cancellation'}</button>
                <button disabled={saving} onClick={() => { setPanel(''); setReason(''); }} className={cn(BTN, 'border border-slate-300 text-slate-700')}>Keep booking</button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
