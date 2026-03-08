'use client';
import { useState, FormEvent } from 'react';
import { Send, Check, AlertCircle } from 'lucide-react';
import { getMinDate, getMinCheckoutDate, enforceCheckIn, enforceCheckOut } from '@/lib/date-helpers';

export default function InquiryForm({ type, propertyId, trekId, paraglidingId, title = 'Send an Inquiry', subtitle = "We'll get back within 2 hours.", className = '' }: {
  type: 'hotel' | 'taxi' | 'trek' | 'paragliding' | 'general'; propertyId?: string; trekId?: string; paraglidingId?: string; title?: string; subtitle?: string; className?: string;
}) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const minDate = getMinDate();
  const minCheckout = getMinCheckoutDate(checkIn);

  // MOBILE FIX: enforce valid dates on change
  function handleCheckInChange(val: string) {
    const clamped = enforceCheckIn(val);
    setCheckIn(clamped);
    if (checkOut && checkOut <= clamped) setCheckOut('');
  }
  function handleCheckOutChange(val: string) {
    setCheckOut(enforceCheckOut(val, checkIn));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setStatus('loading');
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/inquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, name: fd.get('name'), email: fd.get('email'), phone: fd.get('phone'), message: fd.get('message'), check_in: checkIn || undefined, check_out: checkOut || undefined, guests: fd.get('guests') ? Number(fd.get('guests')) : undefined, property_id: propertyId, trek_id: trekId, paragliding_id: paraglidingId, pickup_location: fd.get('pickup_location') || undefined, drop_location: fd.get('drop_location') || undefined }) });
      if (!res.ok) throw new Error(); setStatus('success');
    } catch { setStatus('error'); }
  }
  if (status === 'success') return <div className={`bg-green-50 border border-green-200 rounded-xl p-8 text-center ${className}`}><Check className="h-8 w-8 text-green-600 mx-auto mb-3" /><h3 className="text-lg font-heading font-bold text-slate-900 mb-1">Inquiry Sent!</h3><p className="text-sm text-slate-600">We'll reply within 2 hours. You can also reach us on WhatsApp.</p></div>;
  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-6 ${className}`}>
      <h3 className="text-lg font-heading font-bold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 mb-5">{subtitle}</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input name="name" required placeholder="Full Name *" className="col-span-2 sm:col-span-1 w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
          <input name="phone" type="tel" required placeholder="Phone *" className="col-span-2 sm:col-span-1 w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
        </div>
        <input name="email" type="email" placeholder="Email" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
        {(type === 'hotel' || type === 'trek' || type === 'paragliding') && (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Check-in / Date</label>
              <input type="date" value={checkIn}
                onChange={e => handleCheckInChange(e.target.value)}
                onBlur={() => { if (checkIn) setCheckIn(enforceCheckIn(checkIn)); }}
                min={minDate}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Check-out</label>
              <input type="date" value={checkOut}
                onChange={e => handleCheckOutChange(e.target.value)}
                onBlur={() => { if (checkOut) setCheckOut(enforceCheckOut(checkOut, checkIn)); }}
                min={checkIn ? minCheckout : minDate}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
            <select name="guests" className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none">
              <option value="2">2 Guests</option><option value="1">1</option><option value="3">3</option><option value="4">4</option><option value="5">5+</option>
            </select>
          </div>
        )}
        {type === 'taxi' && (
          <div className="grid grid-cols-2 gap-3">
            <input name="pickup_location" placeholder="Pickup" className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            <input name="drop_location" placeholder="Drop" className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
          </div>
        )}
        <textarea name="message" rows={3} placeholder="Tell us about your plans..." className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none" />
        {status === 'error' && <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg"><AlertCircle className="h-4 w-4" /> Something went wrong. Try WhatsApp instead.</div>}
        <button type="submit" disabled={status === 'loading'} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
          {status === 'loading' ? 'Sending...' : <><Send className="h-4 w-4" /> Send Inquiry</>}
        </button>
        <p className="text-xs text-center text-slate-400">We respond within 2 hours. Your data is secure.</p>
      </form>
    </div>
  );
}
