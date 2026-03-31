'use client';
import { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, X, Calendar, Users, MapPin } from 'lucide-react';
import { HotelCard } from '@/components/ui/Cards';
import { formatPrice } from '@/lib/utils';

interface Props {
  hotels: any[];
  destinations: any[];
}

const TYPES = [
  { value: '', label: 'All Types' },
  { value: 'hotel', label: 'Hotels' },
  { value: 'homestay', label: 'Homestays' },
  { value: 'resort', label: 'Resorts' },
  { value: 'guesthouse', label: 'Guesthouses' },
  { value: 'hostel', label: 'Hostels' },
  { value: 'villa', label: 'Villas' },
];

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'newest', label: 'Newest First' },
];

function getTodayStr(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

function getTomorrowStr(from?: string): string {
  const d = from ? new Date(from) : new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function calcNights(ci: string, co: string): number {
  if (!ci || !co) return 0;
  return Math.max(0, Math.round((new Date(co).getTime() - new Date(ci).getTime()) / 86400000));
}

export default function HotelFilters({ hotels, destinations }: Props) {
  const [search, setSearch] = useState('');
  const [area, setArea] = useState('');
  const [type, setType] = useState('');
  const [sort, setSort] = useState('recommended');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 25000]);
  const [showFilters, setShowFilters] = useState(false);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('2');

  const maxPrice = useMemo(() => {
    const prices = hotels.map(h => h.price_min || 0).filter(p => p > 0);
    return prices.length ? Math.max(...prices) + 1000 : 25000;
  }, [hotels]);

  const nights = useMemo(() => calcNights(checkIn, checkOut), [checkIn, checkOut]);

  const filtered = useMemo(() => {
    let result = [...hotels];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(h =>
        (h.name || '').toLowerCase().includes(q) ||
        (h.address_line1 || '').toLowerCase().includes(q) ||
        (h.description || '').toLowerCase().includes(q) ||
        (h.city || '').toLowerCase().includes(q)
      );
    }
    if (area) result = result.filter(h => h.destination_slug === area);
    if (type) result = result.filter(h => h.type === type);
    result = result.filter(h => {
      const p = h.price_min || 0;
      if (p === 0) return true;
      return p >= priceRange[0] && p <= priceRange[1];
    });
    switch (sort) {
      case 'price_low': result.sort((a, b) => (a.price_min || 99999) - (b.price_min || 99999)); break;
      case 'price_high': result.sort((a, b) => (b.price_min || 0) - (a.price_min || 0)); break;
      case 'rating': result.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
      case 'newest': result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()); break;
      default: result.sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return (b.rating || 0) - (a.rating || 0);
      });
    }
    return result;
  }, [hotels, search, area, type, sort, priceRange]);

  const activeFilterCount = [area, type, priceRange[0] > 0 || priceRange[1] < maxPrice].filter(Boolean).length;

  function clearFilters() {
    setSearch(''); setArea(''); setType(''); setSort('recommended'); setPriceRange([0, maxPrice]);
  }

  function handleCheckInChange(v: string) {
    setCheckIn(v);
    if (checkOut && checkOut <= v) setCheckOut(getTomorrowStr(v));
  }

  return (
    <div>
      {/* Booking Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 shadow-sm -mt-14 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-1">
            <label className="text-xs font-medium text-slate-500 mb-1 block flex items-center gap-1"><MapPin className="h-3 w-3" /> Destination</label>
            <select value={area} onChange={e => setArea(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 bg-white">
              <option value="">All Areas</option>
              {destinations.map((d: any) => <option key={d.slug} value={d.slug}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block flex items-center gap-1"><Calendar className="h-3 w-3" /> Check-in</label>
            <input type="date" value={checkIn} onChange={e => handleCheckInChange(e.target.value)} min={getTodayStr()}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block flex items-center gap-1"><Calendar className="h-3 w-3" /> Check-out</label>
            <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} min={checkIn ? getTomorrowStr(checkIn) : getTomorrowStr()}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block flex items-center gap-1"><Users className="h-3 w-3" /> Guests</label>
            <select value={guests} onChange={e => setGuests(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm outline-none bg-white">
              <option value="1">1 Guest</option><option value="2">2 Guests</option><option value="3">3 Guests</option><option value="4">4 Guests</option><option value="5">5+ Guests</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={() => {}} className="w-full bg-brand-600 text-white py-2.5 px-4 rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors flex items-center justify-center gap-2">
              <Search className="h-4 w-4" /> Search
            </button>
          </div>
        </div>
        {nights > 0 && (
          <p className="text-xs text-brand-600 font-medium mt-2 text-center">
            {nights} {nights === 1 ? 'night' : 'nights'} stay {checkIn && checkOut && <span className="text-slate-400">({checkIn} to {checkOut})</span>}
          </p>
        )}
      </div>

      {/* Filter + sort bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by hotel name..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>}
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 shrink-0">
          <SlidersHorizontal className="h-4 w-4" /> Filters
          {activeFilterCount > 0 && <span className="bg-brand-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{activeFilterCount}</span>}
        </button>
        <select value={sort} onChange={e => setSort(e.target.value)}
          className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm outline-none text-slate-700 bg-white shrink-0">
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {showFilters && (
        <div className="bg-slate-50 rounded-xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Property Type</label>
            <select value={type} onChange={e => setType(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none bg-white">
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Max Price: {formatPrice(priceRange[1])}/night</label>
            <input type="range" min={0} max={maxPrice} step={500} value={priceRange[1]}
              onChange={e => setPriceRange([priceRange[0], Number(e.target.value)])} className="w-full accent-brand-600" />
          </div>
          {activeFilterCount > 0 && (
            <div className="flex items-end"><button onClick={clearFilters} className="text-sm text-red-500 hover:text-red-700 font-medium">Clear all</button></div>
          )}
        </div>
      )}

      {/* Area pills */}
      <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-2">
        <button onClick={() => setArea('')}
          className={'shrink-0 px-4 py-2 text-sm font-medium rounded-full transition-colors ' + (!area ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-blue-50')}>All</button>
        {destinations.map((d: any) => (
          <button key={d.slug} onClick={() => setArea(d.slug)}
            className={'shrink-0 px-4 py-2 text-sm font-medium rounded-full transition-colors ' + (area === d.slug ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-blue-50')}>{d.name}</button>
        ))}
      </div>

      <p className="text-sm text-slate-500 mb-4">
        {filtered.length} {filtered.length === 1 ? 'property' : 'properties'} found
        {search && <span> for &quot;{search}&quot;</span>}
        {nights > 0 && <span> &middot; {nights} {nights === 1 ? 'night' : 'nights'}</span>}
      </p>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-500 text-lg mb-3">No properties match your filters</p>
          <button onClick={clearFilters} className="text-brand-600 font-medium hover:text-brand-700">Clear filters</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((h: any) => <HotelCard key={h.id} hotel={h} nights={nights} />)}
        </div>
      )}
    </div>
  );
}
