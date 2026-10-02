'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Building, Mountain, Car, Wind } from 'lucide-react';
import { getMinDate, getMinCheckoutDate, enforceCheckIn, enforceCheckOut, enforceActivityDate } from '@/lib/date-helpers';
import { useT } from '@/lib/i18n/client';

const TABS = [
  { key: 'hotels', icon: Building, href: '/hotels' },
  { key: 'treks', icon: Mountain, href: '/treks' },
  { key: 'paragliding', icon: Wind, href: '/paragliding' },
  { key: 'taxi', icon: Car, href: '/taxi' },
] as const;

// Values stay English (they match route names in the database); labels are translated.
const PICKUPS = ['Gaggal Airport', 'Pathankot Railway Station', 'Chakki Bank Railway Station', 'Amb Andaura Railway Station', 'Kangra Railway Station', 'Dharamshala', 'Delhi', 'Chandigarh', 'Amritsar'];
const DROPS = ['Dharamshala', 'McLeod Ganj', 'Bir Billing', 'Palampur', 'Manali', 'Dalhousie', 'Delhi', 'Chandigarh', 'Amritsar'];

export default function HeroSearch() {
  const router = useRouter();
  const { t, href } = useT();
  const s = t.search;
  const place = (p: string) => t.taxiPlaces[p] || p;
  const [activeTab, setActiveTab] = useState<string>('hotels');
  const [destination, setDestination] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [activityDate, setActivityDate] = useState('');
  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');

  const minDate = getMinDate();
  const minCheckout = getMinCheckoutDate(checkIn);

  // MOBILE FIX: clamp values on change
  function handleCheckInChange(val: string) {
    const clamped = enforceCheckIn(val);
    setCheckIn(clamped);
    if (checkOut && checkOut <= clamped) setCheckOut('');
  }
  function handleCheckOutChange(val: string) {
    setCheckOut(enforceCheckOut(val, checkIn));
  }
  function handleActivityDateChange(val: string) {
    setActivityDate(enforceActivityDate(val));
  }

  function handleSearch() {
    const tab = TABS.find(t => t.key === activeTab);
    if (!tab) return;
    const params = new URLSearchParams();
    if (activeTab === 'hotels') {
      if (destination) params.set('destination', destination);
      if (checkIn) params.set('check_in', checkIn);
      if (checkOut) params.set('check_out', checkOut);
    } else if (activeTab === 'taxi') {
      if (pickup) params.set('from', pickup);
      if (drop) params.set('to', drop);
      if (activityDate) params.set('date', activityDate);
    } else {
      if (activityDate) params.set('date', activityDate);
    }
    const qs = params.toString();
    router.push(qs ? `${href(tab.href)}?${qs}` : href(tab.href));
  }

  return (
    <div className="bg-white rounded-xl shadow-2xl max-w-4xl overflow-hidden">
      <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-hide">
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.key ? 'border-brand-600 text-brand-600 bg-blue-50/50' : 'border-transparent text-slate-600 hover:text-brand-600'
            }`}>
            <tab.icon className="h-4 w-4" />{s.tabs[tab.key]}
          </button>
        ))}
      </div>
      <div className="p-4 sm:p-5">
        {activeTab === 'hotels' && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">{s.destination}</label>
              <select value={destination} onChange={e => setDestination(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none">
                <option value="">{s.allDestinations}</option>
                {['dharamshala', 'mcleod-ganj', 'bhagsu', 'dharamkot', 'naddi'].map((d) => <option key={d} value={d}>{t.places[d]}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">{s.checkIn}</label>
              <input type="date" value={checkIn}
                onChange={e => handleCheckInChange(e.target.value)}
                onBlur={() => { if (checkIn) setCheckIn(enforceCheckIn(checkIn)); }}
                min={minDate}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">{s.checkOut}</label>
              <input type="date" value={checkOut}
                onChange={e => handleCheckOutChange(e.target.value)}
                onBlur={() => { if (checkOut) setCheckOut(enforceCheckOut(checkOut, checkIn)); }}
                min={checkIn ? minCheckout : minDate}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
            <div className="sm:self-end">
              <button onClick={handleSearch}
                className="flex items-center justify-center gap-2 bg-brand-600 text-white px-8 py-2.5 rounded-lg font-semibold hover:bg-brand-700 transition-colors text-sm h-[42px] w-full sm:w-auto">
                <Search className="h-4 w-4" /> {s.search}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'taxi' && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">{s.pickup}</label>
              <select value={pickup} onChange={e => setPickup(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none">
                <option value="">{s.selectPickup}</option>
                {PICKUPS.map((p) => <option key={p} value={p}>{place(p)}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">{s.drop}</label>
              <select value={drop} onChange={e => setDrop(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none">
                <option value="">{s.selectDrop}</option>
                {DROPS.map((p) => <option key={p} value={p}>{place(p)}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">{s.pickupDate}</label>
              <input type="date" value={activityDate}
                onChange={e => handleActivityDateChange(e.target.value)}
                onBlur={() => { if (activityDate) setActivityDate(enforceActivityDate(activityDate)); }}
                min={minDate}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
            <div className="sm:self-end">
              <button onClick={handleSearch}
                className="flex items-center justify-center gap-2 bg-brand-600 text-white px-8 py-2.5 rounded-lg font-semibold hover:bg-brand-700 text-sm h-[42px] w-full sm:w-auto">
                <Search className="h-4 w-4" /> {s.search}
              </button>
            </div>
          </div>
        )}

        {(activeTab === 'treks' || activeTab === 'paragliding') && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">
                {activeTab === 'treks' ? s.trek : s.pkg}
              </label>
              <select className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none">
                <option value="">{activeTab === 'treks' ? s.allTreks : s.allPackages}</option>
                {(activeTab === 'treks' ? s.trekOptions : s.pkgOptions).map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">{s.date}</label>
              <input type="date" value={activityDate}
                onChange={e => handleActivityDateChange(e.target.value)}
                onBlur={() => { if (activityDate) setActivityDate(enforceActivityDate(activityDate)); }}
                min={minDate}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">{s.people}</label>
              <select className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none">
                {s.peopleOptions.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="sm:self-end">
              <button onClick={handleSearch}
                className="flex items-center justify-center gap-2 bg-brand-600 text-white px-8 py-2.5 rounded-lg font-semibold hover:bg-brand-700 text-sm h-[42px] w-full sm:w-auto">
                <Search className="h-4 w-4" /> {s.search}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
