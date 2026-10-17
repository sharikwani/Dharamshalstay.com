import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CalendarDays, MapPin, Phone, MessageCircle, Navigation, Clock, Users, BedDouble, Info } from 'lucide-react';
import { loadBookingPage, hotelPhoneVisible } from '@/lib/bookings/stay-details';
import { hasCoordinates, mapLinks } from '@/lib/location';
import { formatDate, formatPrice, getWhatsAppLink } from '@/lib/utils';
import { siteConfig } from '@/lib/config';
import PrintButton from './PrintButton';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store'; // always live data, never a cached Supabase read

// The URL carries the guest's private key: never send it to other sites.
export const metadata: Metadata = { title: 'Your booking', referrer: 'no-referrer', robots: { index: false, follow: false } };

const STATUS: Record<string, { label: string; tone: string }> = {
  pending: { label: 'Awaiting confirmation', tone: 'bg-amber-50 text-amber-800 border-amber-200' },
  confirmed: { label: 'Confirmed', tone: 'bg-green-50 text-green-800 border-green-200' },
  completed: { label: 'Completed', tone: 'bg-slate-50 text-slate-700 border-slate-200' },
  cancelled: { label: 'Cancelled', tone: 'bg-red-50 text-red-800 border-red-200' },
  failed: { label: 'Not booked', tone: 'bg-red-50 text-red-800 border-red-200' },
  no_show: { label: 'No-show', tone: 'bg-slate-50 text-slate-700 border-slate-200' },
};

const nights = (a?: string, b?: string) => (a && b ? Math.round((Date.parse(b) - Date.parse(a)) / 86400000) : 0);
const waNumber = (p: string) => p.replace(/\D/g, '');

export default async function BookingPage({ params, searchParams }: { params: { ref: string }; searchParams: { k?: string } }) {
  const page = await loadBookingPage(decodeURIComponent(params.ref), searchParams.k);
  if (!page) notFound();
  const { booking: b, stay } = page;
  const status = STATUS[b.status] || STATUS.pending;
  const n = nights(b.check_in, b.check_out);
  const pinned = stay && hasCoordinates(stay);
  const map = pinned ? mapLinks(stay!.latitude!, stay!.longitude!) : null;
  const closed = ['cancelled', 'failed', 'no_show'].includes(b.status);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 print:py-0">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-sm text-slate-500">Booking reference</p>
          <h1 className="font-mono text-2xl sm:text-3xl font-bold text-brand-700">{b.booking_ref}</h1>
          <p className="text-slate-600 mt-1">Hi {b.guest_name?.split(' ')[0]}, here is your itinerary.</p>
        </div>
        <span className={'shrink-0 text-sm font-semibold px-3 py-1.5 rounded-full border ' + status.tone}>{status.label}</span>
      </div>

      {stay && (
        <section className="rounded-2xl border border-slate-200 mb-6 overflow-hidden">
          <div className="p-5 sm:p-6">
            <h2 className="text-xl font-heading font-bold text-slate-900 mb-4">{stay.name}</h2>
            <dl className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="flex gap-3"><CalendarDays className="h-5 w-5 text-brand-500 shrink-0" />
                <div><dt className="text-slate-500">Check-in</dt><dd className="font-semibold text-slate-900">{b.check_in ? formatDate(b.check_in) : '-'}{stay.checkInTime ? ', from ' + stay.checkInTime : ''}</dd></div></div>
              <div className="flex gap-3"><CalendarDays className="h-5 w-5 text-brand-500 shrink-0" />
                <div><dt className="text-slate-500">Check-out</dt><dd className="font-semibold text-slate-900">{b.check_out ? formatDate(b.check_out) : '-'}{stay.checkOutTime ? ', by ' + stay.checkOutTime : ''}</dd></div></div>
              {b.room_name && <div className="flex gap-3"><BedDouble className="h-5 w-5 text-brand-500 shrink-0" />
                <div><dt className="text-slate-500">Room</dt><dd className="font-semibold text-slate-900">{b.room_name}</dd></div></div>}
              <div className="flex gap-3"><Users className="h-5 w-5 text-brand-500 shrink-0" />
                <div><dt className="text-slate-500">Guests{n > 0 ? ' · nights' : ''}</dt><dd className="font-semibold text-slate-900">{b.num_guests}{n > 0 ? ' · ' + n : ''}</dd></div></div>
              {b.amount > 0 && <div className="flex gap-3"><Clock className="h-5 w-5 text-brand-500 shrink-0" />
                <div><dt className="text-slate-500">Amount</dt><dd className="font-semibold text-slate-900">{formatPrice(b.amount)} <span className="font-normal text-slate-500">({b.payment_status === 'paid' ? 'paid' : b.payment_method === 'pay_at_hotel' ? 'pay at the hotel' : 'payment ' + b.payment_status})</span></dd></div></div>}
            </dl>
          </div>

          {map && (
            <iframe src={map.embed} title={'Map showing ' + stay.name} className="w-full h-60 border-0 block print:hidden" loading="lazy" referrerPolicy="no-referrer" />
          )}

          <div className="p-5 sm:p-6 bg-slate-50 space-y-4">
            <p className="flex items-start gap-2 text-slate-800"><MapPin className="h-5 w-5 text-brand-500 shrink-0 mt-0.5" />
              <span>{stay.address}{stay.landmark ? <><br /><span className="text-sm text-slate-600">Landmark: {stay.landmark}</span></> : null}</span></p>

            {stay.phone ? (
              <p className="flex items-center gap-2 text-slate-800"><Phone className="h-5 w-5 text-brand-500 shrink-0" />
                <span>Hotel phone: <a href={'tel:' + stay.phone} className="font-semibold text-brand-700 underline">{stay.phone}</a></span></p>
            ) : !closed && (
              <p className="flex items-start gap-2 text-sm text-slate-600"><Info className="h-4 w-4 shrink-0 mt-0.5" />
                {hotelPhoneVisible(b) ? 'Our team will share the hotel\'s phone number with you shortly.' : 'The hotel\'s phone number appears here as soon as your booking is confirmed.'}</p>
            )}

            <div className="flex flex-wrap gap-2 print:hidden">
              {map && (
                <a href={map.directions} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-700">
                  <Navigation className="h-4 w-4" /> Directions
                </a>
              )}
              <a href={stay.mapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 border border-slate-300 bg-white text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-100">
                <MapPin className="h-4 w-4" /> Open in Google Maps
              </a>
              {stay.phone && (
                <a href={'tel:' + stay.phone} className="inline-flex items-center gap-1.5 border border-slate-300 bg-white text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-100">
                  <Phone className="h-4 w-4" /> Call hotel
                </a>
              )}
              {stay.whatsapp && /^\+?91[6-9]\d{9}$/.test(stay.whatsapp.replace(/[\s-]/g, '')) && (
                <a href={'https://wa.me/' + waNumber(stay.whatsapp)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 border border-slate-300 bg-white text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-100">
                  <MessageCircle className="h-4 w-4" /> WhatsApp hotel
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {b.special_requests && (
        <section className="rounded-2xl border border-slate-200 p-5 mb-6 text-sm">
          <h2 className="font-semibold text-slate-900 mb-1">Your requests</h2>
          <p className="text-slate-600 whitespace-pre-line">{b.special_requests}</p>
        </section>
      )}

      <section className="rounded-2xl bg-brand-50 p-5 text-sm text-brand-900 mb-6">
        <p className="font-semibold mb-1">At the hotel</p>
        <p>Show this page or your booking reference <span className="font-mono font-semibold">{b.booking_ref}</span> at reception, with a photo ID for every adult guest.</p>
      </section>

      <div className="flex flex-wrap gap-3 print:hidden">
        <PrintButton />
        <a href={getWhatsAppLink('Hi! Question about my booking ' + b.booking_ref + '.')} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-green-700 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-green-800 text-sm">
          <MessageCircle className="h-4 w-4" /> Help from Dharamshala Stay
        </a>
      </div>
      <p className="text-xs text-slate-400 mt-6">Keep this link private: anyone with it can see your booking. Questions? Call <a href={'tel:' + siteConfig.phone} className="text-brand-600">{siteConfig.phone}</a></p>
    </div>
  );
}
