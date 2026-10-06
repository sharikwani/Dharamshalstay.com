'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Car, MessageCircle, Plane, Route as RouteIcon, Map, ChevronRight } from 'lucide-react';
import { FAQSection } from '@/components/ui/Cards';
import BookingForm from '@/components/forms/BookingForm';
import { formatPrice, getWhatsAppLink, cn } from '@/lib/utils';
import { getMinDate, enforceActivityDate } from '@/lib/date-helpers';
import { useT } from '@/lib/i18n/client';
import { fmt } from '@/lib/i18n/dict';
import { taxiRouteSlug } from '@/lib/taxi-slug';
import { localizeUnits } from '@/lib/i18n/units';

const TRIP_TYPES = [
  { key: 'all', icon: Car },
  { key: 'airport', icon: Plane },
  { key: 'local', icon: Map },
  { key: 'outstation', icon: RouteIcon },
] as const;

export default function TaxiSearch({ taxiRoutes }: { taxiRoutes: any[] }) {
  const { t, href, lang } = useT();
  const x = t.taxi;
  const place = (p: string) => t.taxiPlaces[p] || p;
  const [activeType, setActiveType] = useState('all');
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [date, setDate] = useState('');
  const minDate = getMinDate();

  // Options come from the live routes, so routes added in the admin panel show up automatically.
  const froms = useMemo(() => Array.from(new Set(taxiRoutes.map((r) => r.from_location))).sort(), [taxiRoutes]);
  const tos = useMemo(() => Array.from(new Set(taxiRoutes.map((r) => r.to_location))).sort(), [taxiRoutes]);

  const filteredRoutes = activeType === 'all'
    ? taxiRoutes
    : taxiRoutes.filter(r => r.route_type === activeType || (activeType === 'local' && r.route_type === 'sightseeing'));

  const searchedRoutes = filteredRoutes.filter(r => {
    if (searchFrom && r.from_location !== searchFrom) return false;
    if (searchTo && r.to_location !== searchTo) return false;
    return true;
  });

  return (
    <>
      <section className="bg-white border-b border-slate-200 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">{x.from}</label>
              <select value={searchFrom} onChange={e => setSearchFrom(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none">
                <option value="">{x.anyLocation}</option>
                {froms.map((p) => <option key={p} value={p}>{place(p)}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">{x.to}</label>
              <select value={searchTo} onChange={e => setSearchTo(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none">
                <option value="">{x.anyDestination}</option>
                {tos.map((p) => <option key={p} value={p}>{place(p)}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">{t.search.date}</label>
              <input type="date" value={date}
                onChange={e => setDate(enforceActivityDate(e.target.value))}
                onBlur={() => { if (date) setDate(enforceActivityDate(date)); }}
                min={minDate}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-2 py-3 overflow-x-auto scrollbar-hide">
          {TRIP_TYPES.map(tt => (
            <button key={tt.key} onClick={() => setActiveType(tt.key)}
              className={cn('shrink-0 flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full transition-colors',
                activeType === tt.key ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-brand-50')}>
              <tt.icon className="h-3.5 w-3.5" />{x.types[tt.key]}
            </button>
          ))}
        </div>
      </section>

      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <p className="text-sm text-slate-500 mb-4">{fmt(x.found, { n: searchedRoutes.length })}</p>
              <div className="space-y-3">
                {searchedRoutes.map((r: any) => (
                  <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium px-2 py-0.5 bg-brand-50 text-brand-700 rounded-full">{x.types[r.route_type] || x.types.local}</span>
                          <span className="text-xs text-slate-400">{r.distance_km} km · {localizeUnits(r.duration, lang)}</span>
                        </div>
                        <Link href={href('/taxi/' + taxiRouteSlug(r.from_location, r.to_location))} className="font-heading font-semibold text-slate-900 mb-1 hover:text-brand-600 flex items-center gap-1">
                          {place(r.from_location)} → {place(r.to_location)} <ChevronRight className="h-4 w-4" />
                        </Link>
                        <p className="text-sm text-slate-600">{r.vehicle_name || r.vehicle_category} · {fmt(x.maxPassengers, { n: r.max_passengers })}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xl font-bold text-slate-900">{formatPrice(r.price)}</p>
                        <a href={getWhatsAppLink(fmt(x.whatsappRoute, { from: r.from_location, to: r.to_location }))} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-green-600 hover:text-green-700">
                          <MessageCircle className="h-3 w-3" /> {x.bookWhatsApp}
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
                {searchedRoutes.length === 0 && (
                  <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                    <Car className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600">{x.noMatch}</p>
                  </div>
                )}
              </div>
            </div>
            <div>
              <div className="sticky top-40 space-y-4">
                <BookingForm category="taxi" entityName="Taxi Booking" />
                <a href={getWhatsAppLink(x.whatsappGeneral)} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-green-700 text-white py-3 rounded-xl font-medium hover:bg-green-800 w-full">
                  <MessageCircle className="h-4 w-4" /> {x.customRoutes}
                </a>
              </div>
            </div>
          </div>
          <div className="mt-12 max-w-3xl">
            <h2 className="text-2xl font-heading font-bold mb-4">{x.faqTitle}</h2>
            <FAQSection faqs={x.faqs} />
          </div>
        </div>
      </section>
    </>
  );
}
