'use client';
import { useState, FormEvent, useEffect } from 'react';
import { Send, Check, AlertCircle } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { getMinDate, getMinCheckoutDate, validateBookingDates, validateActivityDate, enforceCheckIn, enforceCheckOut, enforceActivityDate } from '@/lib/date-helpers';

interface BookingFormProps {
  category: 'hotel' | 'taxi' | 'trek' | 'paragliding';
  entityId?: string;
  entityName?: string;
  defaultAmount?: number;
  commissionPct?: number;
  className?: string;
}

export default function BookingForm({ category, entityId, entityName, defaultAmount, commissionPct = 10, className = '' }: BookingFormProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [bookingRef, setBookingRef] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [activityDate, setActivityDate] = useState('');
  const [dateError, setDateError] = useState('');
  const [amount, setAmount] = useState<number>(defaultAmount ?? 0);

  const minDate = getMinDate();
  const minCheckout = getMinCheckoutDate(checkIn);
  const isHotel = category === 'hotel';
  const isTaxi = category === 'taxi';
  const needsDates = isHotel;
  const needsActivityDate = category === 'trek' || category === 'paragliding' || isTaxi;
  const hasDefaultAmount = typeof defaultAmount === 'number' && defaultAmount > 0;

  // ===== MOBILE FIX: enforce valid dates on every change =====
  function handleCheckInChange(value: string) {
    const clamped = enforceCheckIn(value);
    setCheckIn(clamped);
    // If check-out is now invalid, clear it
    if (checkOut && checkOut <= clamped) setCheckOut('');
    setDateError('');
  }

  function handleCheckOutChange(value: string) {
    const clamped = enforceCheckOut(value, checkIn);
    setCheckOut(clamped);
    setDateError('');
  }

  function handleActivityDateChange(value: string) {
    const clamped = enforceActivityDate(value);
    setActivityDate(clamped);
    setDateError('');
  }

  // Re-enforce on blur (catches edge cases with programmatic date pickers)
  function handleCheckInBlur() {
    if (checkIn) setCheckIn(enforceCheckIn(checkIn));
  }
  function handleCheckOutBlur() {
    if (checkOut) setCheckOut(enforceCheckOut(checkOut, checkIn));
  }
  function handleActivityDateBlur() {
    if (activityDate) setActivityDate(enforceActivityDate(activityDate));
  }

  function validateDates(): boolean {
    setDateError('');
    if (needsDates) {
      const v = validateBookingDates(checkIn, checkOut);
      if (!v.valid) { setDateError(v.error || ''); return false; }
    }
    if (needsActivityDate) {
      if (!activityDate) { setDateError(isTaxi ? 'Pickup date is required' : 'Activity date is required'); return false; }
      const v = validateActivityDate(activityDate);
      if (!v.valid) { setDateError(v.error || ''); return false; }
    }
    return true;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validateDates()) return;
    setStatus('loading'); setErrorMsg('');

    const fd = new FormData(e.currentTarget);
    const finalAmount = hasDefaultAmount ? defaultAmount : (Number(fd.get('amount')) || amount || 0);

    const payload: Record<string, any> = {
      category,
      guest_name: fd.get('guest_name'),
      guest_email: fd.get('guest_email') || '',
      guest_phone: fd.get('guest_phone'),
      num_guests: Number(fd.get('num_guests')) || 1,
      special_requests: fd.get('special_requests') || '',
      amount: finalAmount,
      payment_method: fd.get('payment_method') || 'offline',
      booking_source: 'website',
      commission_pct: commissionPct,
    };

    if (isHotel) {
      payload.check_in = checkIn;
      payload.check_out = checkOut;
      payload.property_id = entityId || null;
    } else if (isTaxi) {
      payload.activity_date = activityDate;
      payload.taxi_route_id = entityId || null;
      payload.pickup_location = fd.get('pickup_location') || '';
      payload.drop_location = fd.get('drop_location') || '';
      payload.pickup_time = fd.get('pickup_time') || '';
      payload.vehicle_type = fd.get('vehicle_type') || '';
    } else if (category === 'trek') {
      payload.activity_date = activityDate;
      payload.trek_id = entityId || null;
    } else if (category === 'paragliding') {
      payload.activity_date = activityDate;
      payload.paragliding_id = entityId || null;
    }

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error || 'Booking failed'); setStatus('error'); return; }
      setBookingRef(data.booking_ref || '');
      setStatus('success');
    } catch {
      setErrorMsg('Network error. Please try again or WhatsApp us.');
      setStatus('error');
    }
  }

  if (status === 'success') return (
    <div className={`bg-green-50 border border-green-200 rounded-xl p-8 text-center ${className}`}>
      <Check className="h-10 w-10 text-green-600 mx-auto mb-3" />
      <h3 className="text-xl font-heading font-bold text-slate-900 mb-1">Booking Submitted!</h3>
      {bookingRef && <p className="text-sm text-green-700 font-mono font-semibold mb-2">Ref: {bookingRef}</p>}
      <p className="text-sm text-slate-600">We'll confirm within 2 hours. You can also reach us on WhatsApp.</p>
    </div>
  );

  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-6 shadow-sm ${className}`}>
      <h3 className="text-lg font-heading font-bold text-slate-900 mb-1">
        {isHotel ? 'Book This Property' : isTaxi ? 'Book Taxi' : category === 'paragliding' ? 'Book Paragliding' : 'Book This Trek'}
      </h3>
      {entityName && <p className="text-sm text-brand-600 font-medium mb-4">{entityName}</p>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input name="guest_name" required placeholder="Full Name *" className="col-span-2 sm:col-span-1 w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
          <input name="guest_phone" type="tel" required placeholder="Phone *" className="col-span-2 sm:col-span-1 w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
        </div>
        <input name="guest_email" type="email" placeholder="Email" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />

        {/* Hotel dates — MOBILE FIX: onChange clamps + onBlur re-validates */}
        {needsDates && (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Check-in *</label>
              <input type="date" value={checkIn}
                onChange={e => handleCheckInChange(e.target.value)}
                onBlur={handleCheckInBlur}
                min={minDate} required
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Check-out *</label>
              <input type="date" value={checkOut}
                onChange={e => handleCheckOutChange(e.target.value)}
                onBlur={handleCheckOutBlur}
                min={minCheckout} required
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Guests</label>
              <select name="num_guests" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none">
                <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5+</option>
              </select>
            </div>
          </div>
        )}

        {/* Activity date — MOBILE FIX: same enforcement */}
        {needsActivityDate && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{isTaxi ? 'Pickup Date *' : 'Activity Date *'}</label>
              <input type="date" value={activityDate}
                onChange={e => handleActivityDateChange(e.target.value)}
                onBlur={handleActivityDateBlur}
                min={minDate} required
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
            {isTaxi ? (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Pickup Time</label>
                <input name="pickup_time" type="time" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Participants</label>
                <select name="num_guests" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none">
                  <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5+</option>
                </select>
              </div>
            )}
          </div>
        )}

        {isTaxi && (
          <div className="grid grid-cols-2 gap-3">
            <input name="pickup_location" placeholder="Pickup Location" className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none" />
            <input name="drop_location" placeholder="Drop Location" className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none" />
          </div>
        )}

        {!hasDefaultAmount && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Estimated Amount (₹)</label>
            <input name="amount" type="number" min="0" value={amount || ''} onChange={e => setAmount(Number(e.target.value))}
              placeholder="Enter amount if known"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            <p className="text-[10px] text-slate-400 mt-0.5">Leave blank if unsure — we'll confirm the exact price.</p>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Payment Preference</label>
          <select name="payment_method" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none">
            <option value="pay_at_hotel">{isHotel ? 'Pay at Hotel' : 'Pay on Arrival'}</option>
            <option value="offline">Pay Offline (Bank Transfer)</option>
          </select>
        </div>

        <textarea name="special_requests" rows={2} placeholder="Special requests or notes..." className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none resize-none" />

        {dateError && <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg"><AlertCircle className="h-4 w-4 shrink-0" />{dateError}</div>}
        {status === 'error' && <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg"><AlertCircle className="h-4 w-4 shrink-0" />{errorMsg}</div>}

        {hasDefaultAmount && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Starting from</span>
            <span className="text-lg font-bold text-slate-900">{formatPrice(defaultAmount)}</span>
          </div>
        )}

        <button type="submit" disabled={status === 'loading'}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
          {status === 'loading' ? 'Submitting...' : <><Send className="h-4 w-4" /> Book Now</>}
        </button>
        <p className="text-xs text-center text-slate-400">Confirmation within 2 hours. No charges until confirmed.</p>
      </form>
    </div>
  );
}
