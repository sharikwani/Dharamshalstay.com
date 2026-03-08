'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Building, Mountain, Car, Wind } from 'lucide-react';
import { getMinDate, getMinCheckoutDate, enforceCheckIn, enforceCheckOut, enforceActivityDate } from '@/lib/date-helpers';

const TABS = [
  { key: 'hotels', icon: Building, label: 'Hotels', href: '/hotels' },
  { key: 'treks', icon: Mountain, label: 'Treks', href: '/treks' },
  { key: 'paragliding', icon: Wind, label: 'Paragliding', href: '/paragliding' },
  { key: 'taxi', icon: Car, label: 'Taxi', href: '/taxi' },
] as const;

export default function HeroSearch() {
  const router = useRouter();
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
    router.push(qs ? `${tab.href}?${qs}` : tab.href);
  }

  return (
    <div className="bg-white rounded-xl shadow-2xl max-w-4xl overflow-hidden">
      <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-hide">
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.key ? 'border-brand-600 text-brand-600 bg-blue-50/50' : 'border-transparent text-slate-600 hover:text-brand-600'
            }`}>
            <tab.icon className="h-4 w-4" />{tab.label}
          </button>
        ))}
      </div>
      <div className="p-4 sm:p-5">
        {activeTab === 'hotels' && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Destination</label>
              <select value={destination} onChange={e => setDestination(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none">
                <option value="">All Destinations</option>
                <option value="dharamshala">Dharamshala</option>
                <option value="mcleod-ganj">McLeod Ganj</option>
                <option value="bhagsu">Bhagsu</option>
                <option value="dharamkot">Dharamkot</option>
                <option value="naddi">Naddi</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Check-in</label>
              <input type="date" value={checkIn}
                onChange={e => handleCheckInChange(e.target.value)}
                onBlur={() => { if (checkIn) setCheckIn(enforceCheckIn(checkIn)); }}
                min={minDate}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Check-out</label>
              <input type="date" value={checkOut}
                onChange={e => handleCheckOutChange(e.target.value)}
                onBlur={() => { if (checkOut) setCheckOut(enforceCheckOut(checkOut, checkIn)); }}
                min={checkIn ? minCheckout : minDate}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
            <div className="sm:self-end">
              <button onClick={handleSearch}
                className="flex items-center justify-center gap-2 bg-brand-600 text-white px-8 py-2.5 rounded-lg font-semibold hover:bg-brand-700 transition-colors text-sm h-[42px] w-full sm:w-auto">
                <Search className="h-4 w-4" /> Search
              </button>
            </div>
          </div>
        )}

        {activeTab === 'taxi' && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Pickup</label>
              <select value={pickup} onChange={e => setPickup(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none">
                <option value="">Select Pickup</option>
                <option>Gaggal Airport</option><option>Pathankot Station</option><option>McLeod Ganj</option>
                <option>Dharamshala Bus Stand</option><option>Chandigarh</option><option>Delhi</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Drop</label>
              <select value={drop} onChange={e => setDrop(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none">
                <option value="">Select Drop</option>
                <option>McLeod Ganj</option><option>Dharamshala</option><option>Gaggal Airport</option>
                <option>Pathankot Station</option><option>Manali</option><option>Delhi</option><option>Amritsar</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Pickup Date</label>
              <input type="date" value={activityDate}
                onChange={e => handleActivityDateChange(e.target.value)}
                onBlur={() => { if (activityDate) setActivityDate(enforceActivityDate(activityDate)); }}
                min={minDate}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
            <div className="sm:self-end">
              <button onClick={handleSearch}
                className="flex items-center justify-center gap-2 bg-brand-600 text-white px-8 py-2.5 rounded-lg font-semibold hover:bg-brand-700 text-sm h-[42px] w-full sm:w-auto">
                <Search className="h-4 w-4" /> Search
              </button>
            </div>
          </div>
        )}

        {(activeTab === 'treks' || activeTab === 'paragliding') && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">
                {activeTab === 'treks' ? 'Trek' : 'Package'}
              </label>
              <select className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none">
                <option value="">All {activeTab === 'treks' ? 'Treks' : 'Packages'}</option>
                {activeTab === 'treks' ? (
                  <><option>Triund Trek</option><option>Kareri Lake Trek</option><option>Indrahar Pass</option></>
                ) : (
                  <><option>Tandem Flight</option><option>Solo Course</option><option>Scenic Flight</option></>
                )}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Date</label>
              <input type="date" value={activityDate}
                onChange={e => handleActivityDateChange(e.target.value)}
                onBlur={() => { if (activityDate) setActivityDate(enforceActivityDate(activityDate)); }}
                min={minDate}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">People</label>
              <select className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none">
                <option>1 Person</option><option>2 People</option><option>3 People</option><option>4 People</option><option>5+ People</option>
              </select>
            </div>
            <div className="sm:self-end">
              <button onClick={handleSearch}
                className="flex items-center justify-center gap-2 bg-brand-600 text-white px-8 py-2.5 rounded-lg font-semibold hover:bg-brand-700 text-sm h-[42px] w-full sm:w-auto">
                <Search className="h-4 w-4" /> Search
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
