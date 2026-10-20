'use client';
import { useState, useRef, FormEvent } from 'react';
import { Send, Check, AlertCircle } from 'lucide-react';
import { getMinDate, getMinCheckoutDate, enforceCheckIn, enforceCheckOut } from '@/lib/date-helpers';
import { useT } from '@/lib/i18n/client';
import { newClientId } from '@/lib/client-id';

export default function InquiryForm({ type, propertyId, trekId, paraglidingId, contextNote, title, subtitle, className = '', withDates, groupSizes, messagePlaceholder, hideOffers, submitLabel, successTitle, successNote }: {
  type: 'hotel' | 'taxi' | 'trek' | 'paragliding' | 'general'; propertyId?: string; trekId?: string; paraglidingId?: string;
  /** Prepended to the message so the team knows what the enquiry is about (e.g. a directory hotel with no DB id). */
  contextNote?: string;
  title?: string; subtitle?: string; className?: string;
  /** Ask for dates on a general enquiry (event packages, groups, monthly stays). */
  withDates?: boolean;
  /** Party sizes to offer instead of the default 1-5 (e.g. groups). */
  groupSizes?: { value: number; label: string }[];
  messagePlaceholder?: string;
  /** Hotel owners and businesses: no "travel offers" sign-up. */
  hideOffers?: boolean;
  submitLabel?: string; successTitle?: string; successNote?: string;
}) {
  const { t, lang } = useT();
  const f = t.form;
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  // One id per form: a retried submit (lost response, double click) cannot save the enquiry twice.
  // After an error, editing any field makes it a new enquiry with a new id (the edited one is a different request).
  const inquiryId = useRef('');
  const failed = useRef(false);
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
    e.preventDefault();
    if (status === 'loading') return;
    setStatus('loading');
    if (!inquiryId.current) inquiryId.current = newClientId();
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/inquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: inquiryId.current, type, name: fd.get('name'), email: fd.get('email'), phone: fd.get('phone'), message: contextNote ? '[' + contextNote + '] ' + (fd.get('message') || '') : fd.get('message'), check_in: checkIn || undefined, check_out: checkOut || undefined, guests: fd.get('guests') ? Number(fd.get('guests')) : undefined, property_id: propertyId, trek_id: trekId, paragliding_id: paraglidingId, pickup_location: fd.get('pickup_location') || undefined, drop_location: fd.get('drop_location') || undefined, marketing_consent: !hideOffers && fd.get('offers') === 'on' && !!fd.get('email'), lang }) });
      if (!res.ok) throw new Error(); setStatus('success');
    } catch { failed.current = true; setStatus('error'); }
  }
  if (status === 'success') return <div className={`bg-green-50 border border-green-200 rounded-xl p-8 text-center ${className}`}><Check className="h-8 w-8 text-green-600 mx-auto mb-3" /><h3 className="text-lg font-heading font-bold text-slate-900 mb-1">{successTitle || f.inquirySent}</h3><p className="text-sm text-slate-600">{successNote || f.inquirySentNote}</p></div>;
  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-6 ${className}`}>
      <h3 className="text-lg font-heading font-bold text-slate-900 mb-1">{title || f.sendInquiry}</h3>
      <p className="text-sm text-slate-500 mb-5">{subtitle || f.replyWithin}</p>
      <form onSubmit={handleSubmit} onChange={() => { if (failed.current) { failed.current = false; inquiryId.current = ''; } }} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input name="name" required placeholder={f.fullName} className="col-span-2 sm:col-span-1 w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
          <input name="phone" type="tel" required placeholder={f.phone} className="col-span-2 sm:col-span-1 w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
        </div>
        <input name="email" type="email" placeholder={f.email} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
        {!hideOffers && <label className="flex items-start gap-2 text-xs text-slate-600 leading-snug">
          <input type="checkbox" name="offers" className="mt-0.5 h-4 w-4 rounded border-slate-300" />
          <span>{lang === 'hi' ? 'मुझे ईमेल पर यात्रा सुझाव, त्योहार ऑफ़र और डील भेजें (हफ़्ते में अधिकतम एक)। कभी भी अनसब्सक्राइब कर सकते हैं।' : 'Email me travel ideas, festival offers and deals (at most once a week). Unsubscribe any time.'}</span>
        </label>}
        {(withDates || type === 'hotel' || type === 'trek' || type === 'paragliding') && (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">{f.checkInDate}</label>
              <input type="date" value={checkIn}
                onChange={e => handleCheckInChange(e.target.value)}
                onBlur={() => { if (checkIn) setCheckIn(enforceCheckIn(checkIn)); }}
                min={minDate}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">{t.search.checkOut}</label>
              <input type="date" value={checkOut}
                onChange={e => handleCheckOutChange(e.target.value)}
                onBlur={() => { if (checkOut) setCheckOut(enforceCheckOut(checkOut, checkIn)); }}
                min={checkIn ? minCheckout : minDate}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
            <select name="guests" className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none">
              {groupSizes ? groupSizes.map((g) => <option key={g.value} value={g.value}>{g.label}</option>) : <><option value="2">{f.twoGuests}</option><option value="1">1</option><option value="3">3</option><option value="4">4</option><option value="5">5+</option></>}
            </select>
          </div>
        )}
        {type === 'taxi' && (
          <div className="grid grid-cols-2 gap-3">
            <input name="pickup_location" placeholder={t.search.pickup} className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            <input name="drop_location" placeholder={t.search.drop} className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
          </div>
        )}
        <textarea name="message" rows={3} placeholder={messagePlaceholder || f.yourPlans} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none" />
        {status === 'error' && <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg"><AlertCircle className="h-4 w-4" /> {f.somethingWrong}</div>}
        <button type="submit" disabled={status === 'loading'} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
          {status === 'loading' ? f.sending : <><Send className="h-4 w-4" /> {submitLabel || f.sendInquiry}</>}
        </button>
        <p className="text-xs text-center text-slate-400">{f.dataSecure}</p>
      </form>
    </div>
  );
}
