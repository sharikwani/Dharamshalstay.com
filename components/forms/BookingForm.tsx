'use client';
import { useState, FormEvent } from 'react';
import { Send, Check, AlertCircle, CreditCard, Loader2, Building } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { getMinDate, getMinCheckoutDate, validateBookingDates, validateActivityDate, enforceCheckIn, enforceCheckOut, enforceActivityDate } from '@/lib/date-helpers';

interface BookingFormProps {
  category: 'hotel' | 'taxi' | 'trek' | 'paragliding';
  entityId?: string;
  entityName?: string;
  defaultAmount?: number;
  roomName?: string;
  commissionPct?: number;
  className?: string;
}

export default function BookingForm({ category, entityId, entityName, defaultAmount, roomName, commissionPct = 10, className = '' }: BookingFormProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'paying' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [bookingRef, setBookingRef] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [activityDate, setActivityDate] = useState('');
  const [dateError, setDateError] = useState('');
  const [amount, setAmount] = useState<number>(defaultAmount ?? 0);
  const [payMethod, setPayMethod] = useState('pay_at_hotel');

  const minDate = getMinDate();
  const minCheckout = getMinCheckoutDate(checkIn);
  const isHotel = category === 'hotel';
  const isTaxi = category === 'taxi';
  const needsDates = isHotel;
  const needsActivityDate = category === 'trek' || category === 'paragliding' || isTaxi;
  const hasDefaultAmount = typeof defaultAmount === 'number' && defaultAmount > 0;
  const finalAmount = hasDefaultAmount ? defaultAmount : amount;

  function handleCheckInChange(v: string) { const c = enforceCheckIn(v); setCheckIn(c); if (checkOut && checkOut <= c) setCheckOut(''); setDateError(''); }
  function handleCheckOutChange(v: string) { setCheckOut(enforceCheckOut(v, checkIn)); setDateError(''); }
  function handleActivityDateChange(v: string) { setActivityDate(enforceActivityDate(v)); setDateError(''); }

  function validateDates(): boolean {
    setDateError('');
    if (needsDates) { const v = validateBookingDates(checkIn, checkOut); if (!v.valid) { setDateError(v.error || ''); return false; } }
    if (needsActivityDate) {
      if (!activityDate) { setDateError(isTaxi ? 'Pickup date is required' : 'Activity date is required'); return false; }
      const v = validateActivityDate(activityDate); if (!v.valid) { setDateError(v.error || ''); return false; }
    }
    return true;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validateDates()) return;
    setStatus('loading'); setErrorMsg('');

    const fd = new FormData(e.currentTarget);

    // Get user_id if logged in
    let userId: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) userId = user.id;
    } catch {}

    const payload: Record<string, any> = {
      category,
      guest_name: fd.get('guest_name'),
      guest_email: fd.get('guest_email') || '',
      guest_phone: fd.get('guest_phone'),
      num_guests: Number(fd.get('num_guests')) || 1,
      special_requests: fd.get('special_requests') || '',
      amount: finalAmount,
      payment_method: payMethod,
      booking_source: 'website',
      commission_pct: commissionPct,
      user_id: userId,
      room_name: roomName || '',
    };

    if (isHotel) { payload.check_in = checkIn; payload.check_out = checkOut; payload.property_id = entityId || null; }
    else if (isTaxi) { payload.activity_date = activityDate; payload.taxi_route_id = entityId || null; payload.pickup_location = fd.get('pickup_location') || ''; payload.drop_location = fd.get('drop_location') || ''; payload.pickup_time = fd.get('pickup_time') || ''; payload.vehicle_type = fd.get('vehicle_type') || ''; }
    else if (category === 'trek') { payload.activity_date = activityDate; payload.trek_id = entityId || null; }
    else if (category === 'paragliding') { payload.activity_date = activityDate; payload.paragliding_id = entityId || null; }

    try {
      // Step 1: Create booking
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error || 'Booking failed'); setStatus('error'); return; }

      // Step 2: If pay online, redirect to Stripe
      if (payMethod === 'online' && finalAmount >= 100) {
        setStatus('paying');
        const checkoutRes = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId: data.booking_id,
            bookingRef: data.booking_ref,
            amount: finalAmount,
            guestName: fd.get('guest_name'),
            guestEmail: fd.get('guest_email') || '',
            hotelName: entityName || '',
            roomName: roomName || '',
            checkIn, checkOut,
          }),
        });
        const checkoutData = await checkoutRes.json();
        if (checkoutData.url) {
          window.location.href = checkoutData.url;
          return;
        } else {
          setErrorMsg('Payment setup failed. Your booking is saved -- pay later or contact us.');
          setBookingRef(data.booking_ref || '');
          setStatus('success');
          return;
        }
      }

      // Step 3: Non-payment booking success
      setBookingRef(data.booking_ref || '');
      setStatus('success');

      // Send confirmation email (non-blocking)
      if (data.booking_id) {
        fetch('/api/email/booking-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId: data.booking_id }),
        }).catch(() => {});
      }
    } catch {
      setErrorMsg('Network error. Please try again or WhatsApp us.');
      setStatus('error');
    }
  }

  if (status === 'success') return (
    <div className={'bg-green-50 border border-green-200 rounded-xl p-8 text-center ' + className}>
      <Check className="h-10 w-10 text-green-600 mx-auto mb-3" />
      <h3 className="text-xl font-heading font-bold text-slate-900 mb-1">Booking Submitted!</h3>
      {bookingRef && <p className="text-sm text-green-700 font-mono font-semibold mb-2">Ref: {bookingRef}</p>}
      <p className="text-sm text-slate-600">{"We'll confirm within 2 hours. Check your email or WhatsApp us."}</p>
    </div>
  );

  if (status === 'paying') return (
    <div className={'bg-blue-50 border border-blue-200 rounded-xl p-8 text-center ' + className}>
      <Loader2 className="h-8 w-8 text-brand-600 mx-auto mb-3 animate-spin" />
      <h3 className="text-lg font-heading font-bold text-slate-900 mb-1">Redirecting to Payment...</h3>
      <p className="text-sm text-slate-600">You will be redirected to the secure Stripe checkout page.</p>
    </div>
  );

  return (
    <div className={'bg-white border border-slate-200 rounded-xl p-6 shadow-sm ' + className}>
      <h3 className="text-lg font-heading font-bold text-slate-900 mb-1">
        {isHotel ? 'Book This Property' : isTaxi ? 'Book Taxi' : category === 'paragliding' ? 'Book Paragliding' : 'Book This Trek'}
      </h3>
      {entityName && <p className="text-sm text-brand-600 font-medium mb-4">{entityName}</p>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input name="guest_name" required placeholder="Full Name *" className="col-span-2 sm:col-span-1 w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
          <input name="guest_phone" type="tel" required placeholder="Phone *" className="col-span-2 sm:col-span-1 w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
        </div>
        <input name="guest_email" type="email" placeholder="Email (for confirmation)" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />

        {needsDates && (
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Check-in *</label>
              <input type="date" value={checkIn} onChange={e => handleCheckInChange(e.target.value)} onBlur={() => checkIn && setCheckIn(enforceCheckIn(checkIn))} min={minDate} required className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Check-out *</label>
              <input type="date" value={checkOut} onChange={e => handleCheckOutChange(e.target.value)} onBlur={() => checkOut && setCheckOut(enforceCheckOut(checkOut, checkIn))} min={minCheckout} required className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Guests</label>
              <select name="num_guests" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none">
                <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5+</option></select></div>
          </div>
        )}

        {needsActivityDate && (
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-slate-600 mb-1">{isTaxi ? 'Pickup Date *' : 'Activity Date *'}</label>
              <input type="date" value={activityDate} onChange={e => handleActivityDateChange(e.target.value)} min={minDate} required className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none" /></div>
            {isTaxi ? (
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Pickup Time</label>
                <input name="pickup_time" type="time" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none" /></div>
            ) : (
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Participants</label>
                <select name="num_guests" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none">
                  <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5+</option></select></div>
            )}
          </div>
        )}

        {isTaxi && (
          <div className="grid grid-cols-2 gap-3">
            <input name="pickup_location" placeholder="Pickup Location" className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none" />
            <input name="drop_location" placeholder="Drop Location" className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none" />
          </div>
        )}

        <textarea name="special_requests" rows={2} placeholder="Special requests or notes..." className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none resize-none" />

        {/* Payment method */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2">Payment Method</label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setPayMethod('online')}
              className={'flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border-2 transition-all ' + (payMethod === 'online' ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 text-slate-600 hover:border-slate-300')}>
              <CreditCard className="h-4 w-4" /> Pay Online
            </button>
            <button type="button" onClick={() => setPayMethod('pay_at_hotel')}
              className={'flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border-2 transition-all ' + (payMethod === 'pay_at_hotel' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:border-slate-300')}>
              <Building className="h-4 w-4" /> {isHotel ? 'Pay at Hotel' : 'Pay Later'}
            </button>
          </div>
        </div>

        {dateError && <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg"><AlertCircle className="h-4 w-4 shrink-0" />{dateError}</div>}
        {status === 'error' && <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg"><AlertCircle className="h-4 w-4 shrink-0" />{errorMsg}</div>}

        {hasDefaultAmount && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Amount</span>
            <span className="text-lg font-bold text-slate-900">{formatPrice(defaultAmount)}</span>
          </div>
        )}

        <button type="submit" disabled={status === 'loading'}
          className={'w-full font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60 text-white ' + (payMethod === 'online' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-500 hover:bg-orange-600')}>
          {status === 'loading' ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</> :
            payMethod === 'online' ? <><CreditCard className="h-4 w-4" /> Pay {hasDefaultAmount ? formatPrice(defaultAmount) : 'Now'}</> :
            <><Send className="h-4 w-4" /> Book Now</>}
        </button>

        {payMethod === 'online' && <p className="text-xs text-center text-slate-400">Secure payment via Stripe. Card, UPI, and netbanking accepted.</p>}
        {payMethod !== 'online' && <p className="text-xs text-center text-slate-400">Confirmation within 2 hours. No charges until confirmed.</p>}
      </form>
    </div>
  );
}
