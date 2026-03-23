'use client';
import { useState } from 'react';
import { Car, Search, MapPin, Clock, MessageCircle, Plane, Route as RouteIcon, Map } from 'lucide-react';
import { Breadcrumb, FAQSection } from '@/components/ui/Cards';
import BookingForm from '@/components/forms/BookingForm';
import { formatPrice, getWhatsAppLink, cn } from '@/lib/utils';
import { getMinDate, enforceActivityDate } from '@/lib/date-helpers';

const TRIP_TYPES = [
  { key: 'all', label: 'All Routes', icon: Car },
  { key: 'airport', label: 'Airport / Station', icon: Plane },
  { key: 'local', label: 'Local / Sightseeing', icon: Map },
  { key: 'outstation', label: 'Outstation', icon: RouteIcon },
] as const;

const FAQS = [
  { question: 'How do I book a taxi?', answer: 'Use the booking form, WhatsApp us, or call +91-98057-00665 with your pickup, drop, date, and time.' },
  { question: 'Are prices fixed?', answer: 'Shown prices are indicative. We confirm the exact fare before your trip. No hidden charges.' },
  { question: 'Can I book a round trip?', answer: 'Yes! Contact us for round-trip and multi-day packages at discounted rates.' },
  { question: 'What vehicles are available?', answer: 'Sedans (Swift Dzire), SUVs (Innova/Ertiga), Tempo Travellers, and luxury vehicles on request.' },
];

export default function TaxiSearch({ taxiRoutes }: { taxiRoutes: any[] }) {
  const [activeType, setActiveType] = useState('all');
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [date, setDate] = useState('');
  const minDate = getMinDate();

  // MOBILE FIX: clamp date on change and blur so mobile pickers can't select past dates
  function handleDateChange(val: string) {
    setDate(enforceActivityDate(val));
  }

  const filteredRoutes = activeType === 'all'
    ? taxiRoutes
    : taxiRoutes.filter(r => r.route_type === activeType || (activeType === 'local' && r.route_type === 'sightseeing'));

  const searchedRoutes = filteredRoutes.filter(r => {
    if (searchFrom && !r.from_location.toLowerCase().includes(searchFrom.toLowerCase())) return false;
    if (searchTo && !r.to_location.toLowerCase().includes(searchTo.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      {/* Search Bar */}
      <section className="bg-white border-b border-slate-200 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">From</label>
              <select value={searchFrom} onChange={e => setSearchFrom(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none">
                <option value="">Any Location</option>
                <option>Gaggal Airport</option><option>Pathankot Station</option><option>McLeod Ganj</option><option>Dharamshala</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">To</label>
              <select value={searchTo} onChange={e => setSearchTo(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none">
                <option value="">Any Destination</option>
                <option>McLeod Ganj</option><option>Dharamshala</option><option>Gaggal Airport</option><option>Manali</option><option>Delhi</option><option>Amritsar</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Date</label>
              <input type="date" value={date}
                onChange={e => handleDateChange(e.target.value)}
                onBlur={() => { if (date) setDate(enforceActivityDate(date)); }}
                min={minDate}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
          </div>
        </div>
      </section>

      {/* Type Tabs */}
      <section className="bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-2 py-3 overflow-x-auto scrollbar-hide">
          {TRIP_TYPES.map(t => (
            <button key={t.key} onClick={() => setActiveType(t.key)}
              className={cn('shrink-0 flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full transition-colors',
                activeType === t.key ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-blue-50')}>
              <t.icon className="h-3.5 w-3.5" />{t.label}
            </button>
          ))}
        </div>
      </section>

      {/* Routes + Booking */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <p className="text-sm text-slate-500 mb-4">{searchedRoutes.length} routes found</p>
              <div className="space-y-3">
                {searchedRoutes.map((r: any) => (
                  <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium px-2 py-0.5 bg-blue-50 text-brand-700 rounded-full capitalize">{r.route_type}</span>
                          <span className="text-xs text-slate-400">{r.distance_km} km . {r.duration}</span>
                        </div>
                        <h3 className="font-heading font-semibold text-slate-900 mb-1">{r.from_location} -> {r.to_location}</h3>
                        <p className="text-sm text-slate-600">{r.vehicle_name || r.vehicle_category} . Max {r.max_passengers} passengers</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xl font-bold text-slate-900">{formatPrice(r.price)}</p>
                        <a href={getWhatsAppLink(`Hi! I need a taxi from ${r.from_location} to ${r.to_location}`)} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-green-600 hover:text-green-700">
                          <MessageCircle className="h-3 w-3" /> Book via WhatsApp
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
                {searchedRoutes.length === 0 && (
                  <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                    <Car className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600">No routes match your search. Try different locations or contact us on WhatsApp.</p>
                  </div>
                )}
              </div>
            </div>
            <div>
              <div className="sticky top-40 space-y-4">
                <BookingForm category="taxi" entityName="Taxi Booking" />
                <a href={getWhatsAppLink('Hi! I need a taxi in Dharamshala.')} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-green-500 text-white py-3 rounded-xl font-medium hover:bg-green-600 w-full">
                  <MessageCircle className="h-4 w-4" /> WhatsApp for Custom Routes
                </a>
              </div>
            </div>
          </div>
          <div className="mt-12 max-w-3xl">
            <h2 className="text-2xl font-heading font-bold mb-4">Taxi FAQs</h2>
            <FAQSection faqs={FAQS} />
          </div>
        </div>
      </section>
    </>
  );
}
