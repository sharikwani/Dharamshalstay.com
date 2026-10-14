'use client';
import { useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Building, Mountain, Car, Wind, ShieldCheck, MessageCircle } from 'lucide-react';
import { getMinDate, getMinCheckoutDate, enforceCheckIn, enforceCheckOut, enforceActivityDate } from '@/lib/date-helpers';
import { useT } from '@/lib/i18n/client';

const TABS = [
  { key: 'hotels', icon: Building, href: '/hotels' },
  { key: 'treks', icon: Mountain, href: '/treks' },
  { key: 'paragliding', icon: Wind, href: '/paragliding' },
  { key: 'taxi', icon: Car, href: '/taxi' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

// Values stay English (they match route names in the database); labels are translated.
const PICKUPS = ['Gaggal Airport', 'Pathankot Railway Station', 'Chakki Bank Railway Station', 'Amb Andaura Railway Station', 'Kangra Railway Station', 'Dharamshala', 'Delhi', 'Chandigarh', 'Amritsar'];
const DROPS = ['Dharamshala', 'McLeod Ganj', 'Bir Billing', 'Palampur', 'Manali', 'Dalhousie', 'Delhi', 'Chandigarh', 'Amritsar'];
const DESTINATIONS = ['dharamshala', 'mcleod-ganj', 'bhagsu', 'dharamkot', 'naddi'];

// Styled by .book .field in components/home/home.css.
const INPUT = '';

function Field({ id, label, full, children }: { id: string; label: string; full?: boolean; children: ReactNode }) {
  return (
    <div className={'field' + (full ? ' full' : '')}>
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}

export default function HeroSearch() {
  const router = useRouter();
  const { t, href } = useT();
  const s = t.search;
  const v = t.home.v2;
  const place = (p: string) => t.taxiPlaces[p] || p;
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [activeTab, setActiveTab] = useState<TabKey>('hotels');
  const [destination, setDestination] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [activityDate, setActivityDate] = useState('');
  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');
  const [trek, setTrek] = useState('');
  const [pkg, setPkg] = useState('');
  const [people, setPeople] = useState('1');

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

  /** WAI-ARIA tabs: arrows move between tabs, Home/End jump to the ends. */
  function handleTabKey(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const last = TABS.length - 1;
    const next = e.key === 'ArrowRight' ? (i === last ? 0 : i + 1)
      : e.key === 'ArrowLeft' ? (i === 0 ? last : i - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : -1;
    if (next < 0) return;
    e.preventDefault();
    setActiveTab(TABS[next].key);
    tabRefs.current[next]?.focus();
  }

  function handleSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const params = new URLSearchParams();
    let path: string = TABS.find((x) => x.key === activeTab)!.href;
    let hash = '';

    if (activeTab === 'hotels') {
      if (destination) params.set('destination', destination);
      if (checkIn) params.set('check_in', checkIn);
      if (checkOut) params.set('check_out', checkOut);
    } else if (activeTab === 'taxi') {
      if (pickup) params.set('from', pickup);
      if (drop) params.set('to', drop);
      if (activityDate) params.set('date', activityDate);
    } else if (activeTab === 'paragliding' || trek) {
      // A chosen trek or the paragliding page: prefill its booking form and jump to it.
      // (No trek picked = the trek list, which has no form to fill.)
      if (trek && activeTab === 'treks') path = '/treks/' + trek;
      if (activeTab === 'paragliding' && pkg) params.set('package', pkg);
      if (activityDate) params.set('date', activityDate);
      if (people !== '1') params.set('people', people);
      hash = '#book';
    }

    const qs = params.toString();
    // With #book the booking form scrolls itself into view once it has prefilled;
    // the router's own scroll-to-top would otherwise win.
    router.push(href(path) + (qs ? '?' + qs : '') + hash, hash ? { scroll: false } : undefined);
  }

  const dateField = (label: string, full?: boolean) => (
    <Field id={id('date')} label={label} full={full}>
      <input id={id('date')} type="date" value={activityDate}
        onChange={(e) => handleActivityDateChange(e.target.value)}
        onBlur={() => { if (activityDate) setActivityDate(enforceActivityDate(activityDate)); }}
        min={minDate} className={INPUT} />
    </Field>
  );

  return (
    <div className="book">
      <div className="book-h"><p>{v.panelTitle}</p><span>{v.panelNote}</span></div>
      <div role="tablist" aria-label={s.search} className="tabs">
        {TABS.map((tab, i) => {
          const selected = activeTab === tab.key;
          return (
            <button key={tab.key} type="button" role="tab" id={id('tab-' + tab.key)}
              ref={(el) => { tabRefs.current[i] = el; }}
              aria-selected={selected} aria-controls={id('panel')} tabIndex={selected ? 0 : -1}
              onClick={() => setActiveTab(tab.key)} onKeyDown={(e) => handleTabKey(e, i)}
              className="tab">
              <tab.icon className="h-5 w-5" aria-hidden="true" />{s.tabs[tab.key]}
            </button>
          );
        })}
      </div>

      <form id={id('panel')} role="tabpanel" aria-labelledby={id('tab-' + activeTab)} onSubmit={handleSearch}>
        <div className="fields">
        {activeTab === 'hotels' && (
          <>
            <Field id={id('destination')} label={s.destination} full>
              <select id={id('destination')} value={destination} onChange={(e) => setDestination(e.target.value)} className={INPUT}>
                <option value="">{s.allDestinations}</option>
                {DESTINATIONS.map((d) => <option key={d} value={d}>{t.places[d]}</option>)}
              </select>
            </Field>
            <Field id={id('check-in')} label={s.checkIn}>
              <input id={id('check-in')} type="date" value={checkIn}
                onChange={(e) => handleCheckInChange(e.target.value)}
                onBlur={() => { if (checkIn) setCheckIn(enforceCheckIn(checkIn)); }}
                min={minDate} className={INPUT} />
            </Field>
            <Field id={id('check-out')} label={s.checkOut}>
              <input id={id('check-out')} type="date" value={checkOut}
                onChange={(e) => handleCheckOutChange(e.target.value)}
                onBlur={() => { if (checkOut) setCheckOut(enforceCheckOut(checkOut, checkIn)); }}
                min={checkIn ? minCheckout : minDate} className={INPUT} />
            </Field>
          </>
        )}

        {activeTab === 'taxi' && (
          <>
            <Field id={id('pickup')} label={s.pickup}>
              <select id={id('pickup')} value={pickup} onChange={(e) => setPickup(e.target.value)} className={INPUT}>
                <option value="">{s.selectPickup}</option>
                {PICKUPS.map((p) => <option key={p} value={p}>{place(p)}</option>)}
              </select>
            </Field>
            <Field id={id('drop')} label={s.drop}>
              <select id={id('drop')} value={drop} onChange={(e) => setDrop(e.target.value)} className={INPUT}>
                <option value="">{s.selectDrop}</option>
                {DROPS.map((p) => <option key={p} value={p}>{place(p)}</option>)}
              </select>
            </Field>
            {dateField(s.pickupDate, true)}
          </>
        )}

        {(activeTab === 'treks' || activeTab === 'paragliding') && (
          <>
            {activeTab === 'treks' ? (
              <Field id={id('trek')} label={s.trek} full>
                <select id={id('trek')} value={trek} onChange={(e) => setTrek(e.target.value)} className={INPUT}>
                  <option value="">{s.allTreks}</option>
                  {Object.entries(s.trekOptions).map(([slug, label]) => <option key={slug} value={slug}>{label}</option>)}
                </select>
              </Field>
            ) : (
              <Field id={id('package')} label={s.pkg} full>
                <select id={id('package')} value={pkg} onChange={(e) => setPkg(e.target.value)} className={INPUT}>
                  <option value="">{s.allPackages}</option>
                  {Object.entries(s.pkgOptions).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
              </Field>
            )}
            {dateField(s.date)}
            <Field id={id('people')} label={s.people}>
              <select id={id('people')} value={people} onChange={(e) => setPeople(e.target.value)} className={INPUT}>
                {s.peopleOptions.map((label, i) => <option key={label} value={String(i + 1)}>{label}</option>)}
              </select>
            </Field>
          </>
        )}

        </div>
        <button type="submit" className="btn btn-sf">
          <Search className="h-5 w-5" aria-hidden="true" /> {s.search}
        </button>
        <div className="book-note">
          <span><ShieldCheck aria-hidden="true" />{v.panelChecked}</span>
          <span><MessageCircle aria-hidden="true" />{v.panelHelp}</span>
        </div>
      </form>
    </div>
  );
}
