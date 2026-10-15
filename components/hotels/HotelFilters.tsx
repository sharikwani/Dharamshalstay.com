'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, SlidersHorizontal, X, Calendar, Users, MapPin, ArrowUpDown } from 'lucide-react';
import HotelListCard from '@/components/hotels/HotelListCard';
import { useT } from '@/lib/i18n/client';
import { fmt } from '@/lib/i18n/dict';
import { localizePath } from '@/lib/i18n/core';

interface Props {
  hotels: any[];
  destinations: any[];
}

const TYPES = ['hotel', 'homestay', 'resort', 'guesthouse', 'hostel', 'villa'];
const BANDS = ['budget', 'mid-range', 'upscale'];
const BAND_RANK: Record<string, number> = { budget: 1, 'mid-range': 2, upscale: 3 };
const SORTS = ['recommended', 'price_low', 'price_high', 'newest'];

// Popular amenities, matched loosely because listings word them differently ("Free Wi-Fi", "WiFi").
const AMENITIES: { key: string; re: RegExp }[] = [
  { key: 'wifi', re: /wi-?fi/i },
  { key: 'parking', re: /parking/i },
  { key: 'view', re: /mountain view|valley view|dhauladhar|mountain views/i },
  { key: 'restaurant', re: /restaurant|cafe|café/i },
  { key: 'roomService', re: /room service/i },
  { key: 'balcony', re: /balcony|terrace/i },
  { key: 'breakfast', re: /breakfast/i },
  { key: 'pool', re: /pool/i },
];
const GOOD_FOR: { key: string; re: RegExp }[] = [
  { key: 'couples', re: /couple|honeymoon/i },
  { key: 'families', re: /famil/i },
  { key: 'solo', re: /solo/i },
  { key: 'backpackers', re: /backpack|budget travel/i },
  { key: 'groups', re: /group|friends/i },
  { key: 'trekkers', re: /trek/i },
  { key: 'work', re: /remote|nomad|long stay|longer stay|business/i },
];

const today = () => new Date().toISOString().split('T')[0];
const nextDay = (from?: string) => { const d = from ? new Date(from) : new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; };
const nightsOf = (ci: string, co: string) => (!ci || !co ? 0 : Math.max(0, Math.round((new Date(co).getTime() - new Date(ci).getTime()) / 86400000)));
const isDate = (s: string | null) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
const toggle = (set: string[], v: string) => (set.includes(v) ? set.filter((x) => x !== v) : [...set, v]);

const Box = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <fieldset className="py-4 border-b border-slate-200 last:border-0">
    <legend className="text-sm font-semibold text-slate-900 mb-2.5">{title}</legend>
    <div className="space-y-1.5">{children}</div>
  </fieldset>
);
const Check = ({ checked, onChange, label, n }: { checked: boolean; onChange: () => void; label: string; n: number }) => (
  <label className={'flex items-center gap-2.5 text-sm cursor-pointer select-none ' + (n === 0 && !checked ? 'text-slate-400' : 'text-slate-700')}>
    <input type="checkbox" checked={checked} onChange={onChange} disabled={n === 0 && !checked} className="h-4 w-4 rounded border-slate-300 accent-brand-600" />
    <span className="flex-1">{label}</span><span className="text-xs text-slate-400 tabular-nums">{n}</span>
  </label>
);

export default function HotelFilters({ hotels, destinations }: Props) {
  const { t, lang } = useT();
  const f = t.filters;
  const L = f.list;
  const [search, setSearch] = useState('');
  const [areas, setAreas] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [bands, setBands] = useState<string[]>([]);
  const [amen, setAmen] = useState<string[]>([]);
  const [good, setGood] = useState<string[]>([]);
  const [liveOnly, setLiveOnly] = useState(false);
  const [sort, setSort] = useState('recommended');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('2');
  const [drawer, setDrawer] = useState(false);
  const results = useRef<HTMLDivElement>(null);

  // The homepage search sends ?destination=&check_in=&check_out= along; start from them.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const dest = q.get('destination');
    if (dest && destinations.some((d: any) => d.slug === dest)) setAreas([dest]);
    const ci = q.get('check_in'), co = q.get('check_out');
    if (isDate(ci) && ci! >= today()) { setCheckIn(ci!); if (isDate(co) && co! > ci!) setCheckOut(co!); }
  }, [destinations]);

  useEffect(() => {
    document.body.style.overflow = drawer ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawer]);

  const nights = nightsOf(checkIn, checkOut);
  const matchAny = (h: any, list: { key: string; re: RegExp }[], keys: string[], field: string) =>
    keys.every((k) => { const re = list.find((x) => x.key === k)!.re; return (h[field] || []).some((v: string) => re.test(v)); });

  // Everything except the facet being counted, so each count says what ticking it would give.
  const base = useMemo(() => {
    const q = search.trim().toLowerCase();
    return hotels.filter((h) => !q || [h.name, h.locality, h.address_line1, h.landmark].some((v) => (v || '').toLowerCase().includes(q)));
  }, [hotels, search]);
  const pass = (h: any, skip?: string) =>
    (skip === 'area' || !areas.length || areas.includes(h.destination_slug))
    && (skip === 'type' || !types.length || types.includes(h.type))
    && (skip === 'band' || !bands.length || bands.includes(h.price_band))
    && (skip === 'amen' || matchAny(h, AMENITIES, amen, 'amenities'))
    && (skip === 'good' || matchAny(h, GOOD_FOR, good, 'good_for'))
    && (skip === 'live' || !liveOnly || (h.listing_type !== 'directory' && h.price_min > 0));

  const filtered = useMemo(() => {
    const out = base.filter((h) => pass(h));
    const price = (h: any) => (h.price_min > 0 ? h.price_min : (BAND_RANK[h.price_band] || 2) * 3000);
    switch (sort) {
      case 'price_low': out.sort((a, b) => price(a) - price(b)); break;
      case 'price_high': out.sort((a, b) => price(b) - price(a)); break;
      case 'newest': out.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()); break;
      default: break; // the server's order: partners with live rates first, then featured, then the rest
    }
    return out;
  }, [base, areas, types, bands, amen, good, liveOnly, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  const count = (skip: string, test: (h: any) => boolean) => base.filter((h) => pass(h, skip) && test(h)).length;
  const activeCount = areas.length + types.length + bands.length + amen.length + good.length + (liveOnly ? 1 : 0);
  const clearAll = () => { setAreas([]); setTypes([]); setBands([]); setAmen([]); setGood([]); setLiveOnly(false); setSearch(''); };
  const areaName = (slug: string) => destinations.find((d: any) => d.slug === slug)?.name || slug;
  const hotelHref = (h: any) => localizePath('/hotels/' + h.slug, lang) + (checkIn && checkOut ? `?check_in=${checkIn}&check_out=${checkOut}` : '');

  const chips = [
    ...areas.map((v) => ({ label: areaName(v), off: () => setAreas(toggle(areas, v)) })),
    ...types.map((v) => ({ label: t.common.propertyTypes[v] || v, off: () => setTypes(toggle(types, v)) })),
    ...bands.map((v) => ({ label: L.band[v], off: () => setBands(toggle(bands, v)) })),
    ...amen.map((v) => ({ label: L.amenity[v], off: () => setAmen(toggle(amen, v)) })),
    ...good.map((v) => ({ label: L.good[v], off: () => setGood(toggle(good, v)) })),
    ...(liveOnly ? [{ label: L.liveOnly, off: () => setLiveOnly(false) }] : []),
  ];

  const filters = (
    <div>
      <div className="relative py-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={f.searchName} aria-label={f.searchName}
          className="w-full pl-9 pr-8 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500" />
        {search && <button type="button" onClick={() => setSearch('')} aria-label={f.clearAll} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>}
      </div>
      <Box title={L.instantTitle}>
        <Check checked={liveOnly} onChange={() => setLiveOnly(!liveOnly)} label={L.liveOnly} n={count('live', (h) => h.listing_type !== 'directory' && h.price_min > 0)} />
      </Box>
      <Box title={L.area}>
        {destinations.map((d: any) => <Check key={d.slug} checked={areas.includes(d.slug)} onChange={() => setAreas(toggle(areas, d.slug))} label={d.name} n={count('area', (h) => h.destination_slug === d.slug)} />)}
      </Box>
      <Box title={L.budget}>
        {BANDS.map((b) => <Check key={b} checked={bands.includes(b)} onChange={() => setBands(toggle(bands, b))} label={L.band[b]} n={count('band', (h) => h.price_band === b)} />)}
      </Box>
      <Box title={f.propertyType}>
        {TYPES.map((v) => ({ v, n: count('type', (h) => h.type === v) })).filter((x) => x.n > 0 || types.includes(x.v)).map(({ v, n }) =>
          <Check key={v} checked={types.includes(v)} onChange={() => setTypes(toggle(types, v))} label={t.common.propertyTypes[v] || v} n={n} />)}
      </Box>
      <Box title={L.amenities}>
        {AMENITIES.map((a) => ({ a, n: count('amen', (h) => (h.amenities || []).some((x: string) => a.re.test(x))) })).filter((x) => x.n > 0 || amen.includes(x.a.key)).map(({ a, n }) =>
          <Check key={a.key} checked={amen.includes(a.key)} onChange={() => setAmen(toggle(amen, a.key))} label={L.amenity[a.key]} n={n} />)}
      </Box>
      <Box title={L.goodFor}>
        {GOOD_FOR.map((g) => ({ g, n: count('good', (h) => (h.good_for || []).some((x: string) => g.re.test(x))) })).filter((x) => x.n > 0 || good.includes(x.g.key)).map(({ g, n }) =>
          <Check key={g.key} checked={good.includes(g.key)} onChange={() => setGood(toggle(good, g.key))} label={L.good[g.key]} n={n} />)}
      </Box>
    </div>
  );

  return (
    <div>
      {/* Search box, overlapping the header like the big booking sites */}
      <form className="bg-white rounded-2xl shadow-[0_20px_50px_-24px_rgba(15,33,56,.55)] ring-1 ring-slate-200 grid grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_0.9fr_auto] -mt-12 relative z-10 overflow-hidden"
        onSubmit={(e) => { e.preventDefault(); results.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
        <label className="col-span-2 lg:col-span-1 px-4 py-3 border-b lg:border-b-0 lg:border-r border-slate-200 hover:bg-slate-50 cursor-pointer">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1"><MapPin className="h-3 w-3" />{t.search.destination}</span>
          <select value={areas.length === 1 ? areas[0] : ''} onChange={(e) => setAreas(e.target.value ? [e.target.value] : [])} className="w-full mt-0.5 text-base font-semibold text-slate-900 bg-transparent outline-none cursor-pointer">
            <option value="">{L.allOfDharamshala}</option>
            {destinations.map((d: any) => <option key={d.slug} value={d.slug}>{d.name}</option>)}
          </select>
        </label>
        <label className="px-4 py-3 border-r border-b lg:border-b-0 border-slate-200 hover:bg-slate-50 cursor-pointer">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1"><Calendar className="h-3 w-3" />{t.search.checkIn}</span>
          <input type="date" value={checkIn} min={today()} onChange={(e) => { const v = e.target.value; setCheckIn(v); if (checkOut && checkOut <= v) setCheckOut(nextDay(v)); }}
            className="w-full mt-0.5 text-[15px] font-semibold text-slate-900 bg-transparent outline-none" />
        </label>
        <label className="px-4 py-3 border-b lg:border-b-0 lg:border-r border-slate-200 hover:bg-slate-50 cursor-pointer">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1"><Calendar className="h-3 w-3" />{t.search.checkOut}</span>
          <input type="date" value={checkOut} min={checkIn ? nextDay(checkIn) : nextDay()} onChange={(e) => setCheckOut(e.target.value)}
            className="w-full mt-0.5 text-[15px] font-semibold text-slate-900 bg-transparent outline-none" />
        </label>
        <label className="px-4 py-3 border-r lg:border-r border-slate-200 hover:bg-slate-50 cursor-pointer">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1"><Users className="h-3 w-3" />{f.guests}</span>
          <select value={guests} onChange={(e) => setGuests(e.target.value)} className="w-full mt-0.5 text-[15px] font-semibold text-slate-900 bg-transparent outline-none cursor-pointer">
            {f.guestOptions.map((g, i) => <option key={g} value={String(i + 1)}>{g}</option>)}
          </select>
        </label>
        <div className="p-2.5 flex items-stretch">
          <button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white px-7 rounded-xl text-base font-bold tracking-wide flex items-center justify-center gap-2 min-h-[48px]">
            <Search className="h-4 w-4" />{t.search.search}
          </button>
        </div>
      </form>
      {nights > 0 && <p className="text-xs text-brand-700 font-medium mt-2 text-center">{nights} {nights === 1 ? f.night : f.nights} {f.stay} · {checkIn} {f.to} {checkOut}</p>}

      <div ref={results} className="grid lg:grid-cols-[270px_minmax(0,1fr)] gap-6 mt-8 scroll-mt-24">
        {/* sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 bg-white rounded-2xl ring-1 ring-slate-200 px-4 max-h-[calc(100vh-7rem)] overflow-y-auto">
            <div className="flex items-center justify-between pt-4">
              <h2 className="font-heading font-bold text-slate-900">{f.filters}</h2>
              {activeCount > 0 && <button type="button" onClick={clearAll} className="text-sm text-brand-600 font-medium hover:underline">{f.clearAll}</button>}
            </div>
            {filters}
          </div>
        </aside>

        <div className="min-w-0">
          {/* sort tabs */}
          <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-1.5 flex items-center gap-1 overflow-x-auto scrollbar-hide">
            <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 px-3 shrink-0"><ArrowUpDown className="h-3.5 w-3.5" />{L.sortBy}</span>
            {SORTS.map((o) => (
              <button key={o} type="button" onClick={() => setSort(o)} aria-pressed={sort === o}
                className={'shrink-0 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ' + (sort === o ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100')}>
                {f.sort[o]}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-4">
            <p className="text-sm text-slate-700 font-medium mr-1">{fmt(filtered.length === 1 ? f.foundOne : f.foundMany, { n: filtered.length })}</p>
            {chips.map((c) => (
              <button key={c.label} type="button" onClick={c.off} className="inline-flex items-center gap-1 text-xs font-medium bg-brand-50 text-brand-800 ring-1 ring-brand-200 rounded-full pl-2.5 pr-1.5 py-1 hover:bg-brand-100">
                {c.label}<X className="h-3.5 w-3.5" />
              </button>
            ))}
            {chips.length > 1 && <button type="button" onClick={clearAll} className="text-xs text-slate-500 hover:text-slate-700 underline">{f.clearAll}</button>}
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl ring-1 ring-slate-200 mt-4">
              <p className="text-slate-500 text-lg mb-3">{f.noMatch}</p>
              <button type="button" onClick={clearAll} className="text-brand-600 font-medium hover:text-brand-700">{f.clearFilters}</button>
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              {filtered.map((h: any) => (
                <HotelListCard key={h.id} hotel={h} href={hotelHref(h)} nights={nights}
                  typeLabel={t.common.propertyTypes[h.type] || h.type} areaLabel={areaName(h.destination_slug)} labels={L.card} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* phones: filter button and full-screen sheet */}
      <button type="button" onClick={() => setDrawer(true)}
        className="lg:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-40 inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-full shadow-xl text-sm font-semibold">
        <SlidersHorizontal className="h-4 w-4" />{f.filters}{activeCount > 0 && <span className="bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{activeCount}</span>}
      </button>
      {drawer && (
        <div className="lg:hidden fixed inset-0 z-[70] bg-white flex flex-col" role="dialog" aria-modal="true" aria-label={f.filters}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <h2 className="font-heading font-bold text-slate-900">{f.filters}</h2>
            <button type="button" onClick={() => setDrawer(false)} aria-label="Close" className="p-2 -mr-2 text-slate-500"><X className="h-5 w-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-4">{filters}</div>
          <div className="p-3 border-t border-slate-200 flex gap-3">
            <button type="button" onClick={clearAll} className="px-4 py-3 rounded-xl text-sm font-semibold text-slate-700 ring-1 ring-slate-300">{f.clearAll}</button>
            <button type="button" onClick={() => setDrawer(false)} className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-orange-600 text-white">{fmt(L.show, { n: filtered.length })}</button>
          </div>
        </div>
      )}
    </div>
  );
}
