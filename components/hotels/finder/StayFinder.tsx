'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, Users, Sparkles, SlidersHorizontal, X, Map as MapIcon, List, Heart, MessageCircle, Check, Loader2, Search } from 'lucide-react';
import ValleyMap from './ValleyMap';
import StayCard from './StayCard';
import { matchScore, MOODS, BANDS, type Mood, type Answers, type SlimStay } from '@/lib/hotels/discover';
import { normalizeImages } from '@/lib/images';
import { getWhatsAppLink, formatPrice } from '@/lib/utils';
import { useT } from '@/lib/i18n/client';
import { fmt } from '@/lib/i18n/dict';
import { localizePath } from '@/lib/i18n/core';
import './finder.css';

const KEY = 'ds-shortlist';
const MAX_SHORT = 6;
const today = () => new Date().toISOString().split('T')[0];
const nextDay = (from?: string) => { const d = from ? new Date(from) : new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; };
const isDate = (s: string | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
const uuid = () => (crypto as any).randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => ((Math.random() * 16) | 0).toString(16));

export default function StayFinder({ hotels, destinations }: { hotels: SlimStay[]; destinations: { slug: string; name: string }[] }) {
  const { t, lang } = useT();
  const T = t.finder;
  const [moods, setMoods] = useState<Mood[]>([]);
  const [band, setBand] = useState<string>('any');
  const [areas, setAreas] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'best' | 'square' | 'budget'>('best');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(2);
  const [shortlist, setShortlist] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [panel, setPanel] = useState<null | 'more' | 'quiz' | 'compare' | 'ask'>(null);
  const [mobileMap, setMobileMap] = useState(false);
  const [answers, setAnswers] = useState<Answers>({ who: null, budget: null, matters: null });

  const facts = useMemo(() => new Map(hotels.map((h) => [h.id, h.facts])), [hotels]);
  const areaName = (slug: string) => destinations.find((d: any) => d.slug === slug)?.name || slug;
  const hrefFor = (h: any) => localizePath('/hotels/' + h.slug, lang) + (checkIn && checkOut ? `?check_in=${checkIn}&check_out=${checkOut}` : '');

  // Start from the homepage search (?destination=&check_in=&check_out=) and the visitor's saved shortlist.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const dest = q.get('destination');
    if (dest && destinations.some((d: any) => d.slug === dest)) setAreas([dest]);
    const ci = q.get('check_in'), co = q.get('check_out');
    if (isDate(ci) && ci >= today()) { setCheckIn(ci); if (isDate(co) && co > ci) setCheckOut(co); }
    try { const s = JSON.parse(localStorage.getItem(KEY) || '[]'); if (Array.isArray(s)) setShortlist(s.filter((id) => hotels.some((h) => h.id === id)).slice(0, MAX_SHORT)); } catch { /* storage blocked */ }
  }, [destinations, hotels]);
  useEffect(() => { document.body.style.overflow = panel ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [panel]);
  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPanel(null); };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [panel]);

  // The shortlist is stored only when the visitor changes it, never from the first (empty) render.
  const updateShortlist = (fn: (s: string[]) => string[]) => setShortlist((s) => {
    const next = fn(s);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage blocked */ }
    return next;
  });
  const save = (id: string) => updateShortlist((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= MAX_SHORT ? s : [...s, id]));

  const base = useMemo(() => {
    const q = query.trim().toLowerCase();
    return hotels.filter((h) => !q || [h.name, h.locality, h.address_line1].some((v) => (v || '').toLowerCase().includes(q)));
  }, [hotels, query]);
  const pass = (h: any, skip?: string) => {
    const f = facts.get(h.id)!;
    return (skip === 'mood' || moods.every((m) => f.moods.includes(m)))
      && (skip === 'band' || band === 'any' || h.price_band === band)
      && (!areas.length || areas.includes(h.destination_slug))
      && (!types.length || types.includes(h.type));
  };
  const list = useMemo(() => {
    const out = base.filter((h) => pass(h));
    if (sort === 'square') out.sort((a, b) => (facts.get(a.id)!.kmSquare ?? 99) - (facts.get(b.id)!.kmSquare ?? 99));
    if (sort === 'budget') { const r: Record<string, number> = { budget: 0, 'mid-range': 1, upscale: 2 }; out.sort((a, b) => (r[a.price_band || ''] ?? 1) - (r[b.price_band || ''] ?? 1)); }
    return out;
  }, [base, moods, band, areas, types, sort, facts]); // eslint-disable-line react-hooks/exhaustive-deps

  const moodCount = (m: Mood) => base.filter((h) => pass(h, 'mood') && moods.filter((x) => x !== m).concat(m).every((x) => facts.get(h.id)!.moods.includes(x))).length;
  const bandCount = (b: string) => base.filter((h) => pass(h, 'band') && (b === 'any' || h.price_band === b)).length;
  const extra = areas.length + types.length;
  const reset = () => { setMoods([]); setBand('any'); setAreas([]); setTypes([]); setQuery(''); };

  const mapStays = list.flatMap((h) => { const p = facts.get(h.id)!.pin; return p ? [{ id: h.id, name: h.name, lat: p.lat, lng: p.lng, band: h.price_band, live: facts.get(h.id)!.live }] : []; });
  const mapAreas = destinations.map((d: any) => {
    const pins = hotels.filter((h) => h.destination_slug === d.slug).map((h) => facts.get(h.id)!.pin).filter(Boolean) as { lat: number; lng: number }[];
    return pins.length ? { slug: d.slug, lat: pins.reduce((s, p) => s + p.lat, 0) / pins.length, lng: pins.reduce((s, p) => s + p.lng, 0) / pins.length } : null;
  }).filter(Boolean) as { slug: string; lat: number; lng: number }[];
  const pick = (id: string) => {
    setActive(id); setMobileMap(false);
    requestAnimationFrame(() => document.getElementById('stay-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };

  const saved = shortlist.map((id) => hotels.find((h) => h.id === id)).filter(Boolean) as any[];
  const quizTop = useMemo(() => {
    if (!answers.who || !answers.budget || !answers.matters) return [];
    return hotels.map((h, i) => ({ h, s: matchScore(h, facts.get(h.id)!, answers), i }))
      .sort((a, b) => b.s - a.s || a.i - b.i).slice(0, 3).map((x) => x.h);
  }, [answers, hotels, facts]);

  const cardLabels = { ...T.card, band: T.band };
  const nights = checkIn && checkOut ? Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000) : 0;

  return (
    <div className="sf">
      {/* trip bar */}
      <div className="sf-trip">
        <label><span><Calendar className="h-3.5 w-3.5" />{T.checkIn}</span>
          <input type="date" value={checkIn} min={today()} onChange={(e) => { const v = e.target.value; setCheckIn(v); if (checkOut && checkOut <= v) setCheckOut(nextDay(v)); }} />
        </label>
        <label><span><Calendar className="h-3.5 w-3.5" />{T.checkOut}</span>
          <input type="date" value={checkOut} min={checkIn ? nextDay(checkIn) : nextDay()} onChange={(e) => setCheckOut(e.target.value)} />
        </label>
        <label><span><Users className="h-3.5 w-3.5" />{T.guests}</span>
          <select value={guests} onChange={(e) => setGuests(Number(e.target.value))}>{[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{fmt(n === 1 ? T.guestOne : T.guestMany, { n })}</option>)}</select>
        </label>
        <button type="button" className="sf-quiz-btn" onClick={() => setPanel('quiz')}><Sparkles className="h-4 w-4" />{T.letUsPick}</button>
      </div>

      {/* moods */}
      <div className="sf-filters">
        <div className="sf-moods" role="group" aria-label={T.moodsLabel}>
          {MOODS.map((m) => {
            const n = moodCount(m), on = moods.includes(m);
            return (
              <button key={m} type="button" aria-pressed={on} disabled={!on && n === 0} onClick={() => setMoods(toggle(moods, m))} className={'sf-mood' + (on ? ' on' : '')}>
                <span aria-hidden="true">{T.moodIcon[m]}</span>{T.mood[m]}<small>{n}</small>
              </button>
            );
          })}
        </div>
        <div className="sf-row">
          <div className="sf-bands" role="group" aria-label={T.budget}>
            {['any', ...BANDS].map((b) => (
              <button key={b} type="button" aria-pressed={band === b} onClick={() => setBand(b)} className={band === b ? 'on' : ''}>
                {b === 'any' ? T.anyBudget : <><b>{T.sign[b]}</b> {T.band[b]}</>}<small>{bandCount(b)}</small>
              </button>
            ))}
          </div>
          <button type="button" className="sf-more" onClick={() => setPanel('more')}><SlidersHorizontal className="h-4 w-4" />{T.more}{extra > 0 && <i>{extra}</i>}</button>
          <label className="sf-sort"><span className="sr-only">{T.sortLabel}</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as any)}>
              <option value="best">{T.sort.best}</option><option value="square">{T.sort.square}</option><option value="budget">{T.sort.budget}</option>
            </select>
          </label>
        </div>
      </div>

      <div className="sf-head">
        <p><b>{fmt(list.length === 1 ? T.foundOne : T.foundMany, { n: list.length })}</b>{(moods.length || band !== 'any' || extra > 0 || query) ? <> · <button type="button" onClick={reset}>{T.reset}</button></> : null}</p>
        <button type="button" className="sf-maptoggle" onClick={() => setMobileMap(!mobileMap)}>{mobileMap ? <><List className="h-4 w-4" />{T.showList}</> : <><MapIcon className="h-4 w-4" />{T.showMap}</>}</button>
      </div>

      <div className={'sf-split' + (mobileMap ? ' map-open' : '')}>
        <div className="sf-list">
          <h2 className="sr-only">{fmt(list.length === 1 ? T.foundOne : T.foundMany, { n: list.length })}</h2>
          {list.length === 0 ? (
            <div className="sf-empty"><p>{T.none}</p><button type="button" onClick={reset}>{T.reset}</button></div>
          ) : list.map((h) => (
            <StayCard key={h.id} h={h} f={facts.get(h.id)!} href={hrefFor(h)} area={areaName(h.destination_slug)} typeLabel={t.common.propertyTypes[h.type] || h.type}
              active={active === h.id} saved={shortlist.includes(h.id)} onSave={() => save(h.id)} onHover={(on) => setActive(on ? h.id : null)} labels={cardLabels} />
          ))}
          <p className="sf-note">{T.note}</p>
        </div>
        <aside className="sf-mapcol">
          <ValleyMap stays={mapStays} areas={mapAreas} activeId={active} shortlist={shortlist} onHover={setActive} onPick={pick}
            onArea={(slug) => setAreas(toggle(areas, slug))} selectedAreas={areas}
            labels={{ ...T.map, areaLabel: areaName }} />
        </aside>
      </div>

      {/* shortlist bar */}
      {saved.length > 0 && (
        <div className="sf-bar" role="region" aria-label={T.shortlistTitle}>
          <div className="sf-bar-in">
            <div className="faces">
              {saved.slice(0, 4).map((h) => { const p = normalizeImages(h.images)[0]; return <span key={h.id}>{p ? <Image src={p.url} alt="" fill sizes="40px" /> : <Heart className="h-4 w-4" />}</span>; })}
              <b>{fmt(saved.length === 1 ? T.savedOne : T.savedMany, { n: saved.length })}</b>
            </div>
            <div className="acts">
              {saved.length >= 2 && <button type="button" className="ghost" onClick={() => setPanel('compare')}>{T.compare}</button>}
              <button type="button" className="go" onClick={() => setPanel('ask')}><MessageCircle className="h-4 w-4" />{fmt(T.getPrices, { n: saved.length })}</button>
            </div>
          </div>
        </div>
      )}

      {panel && (
        <div className="sf-modal" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) setPanel(null); }}>
          <div className={'sf-sheet ' + panel}>
            <button type="button" className="sf-close" aria-label={T.close} onClick={() => setPanel(null)}><X className="h-5 w-5" /></button>

            {panel === 'more' && (
              <div>
                <h2>{T.more}</h2>
                <div className="sf-search"><Search className="h-4 w-4" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={T.searchName} /></div>
                <h3>{T.area}</h3>
                <div className="sf-pills">{destinations.map((d: any) => <button key={d.slug} type="button" aria-pressed={areas.includes(d.slug)} onClick={() => setAreas(toggle(areas, d.slug))}>{d.name}</button>)}</div>
                <h3>{T.type}</h3>
                <div className="sf-pills">{['hotel', 'homestay', 'guesthouse', 'hostel', 'resort'].filter((v) => hotels.some((h) => h.type === v)).map((v) =>
                  <button key={v} type="button" aria-pressed={types.includes(v)} onClick={() => setTypes(toggle(types, v))}>{t.common.propertyTypes[v] || v}</button>)}</div>
                <div className="sf-sheet-foot"><button type="button" className="ghost" onClick={reset}>{T.reset}</button><button type="button" className="go" onClick={() => setPanel(null)}>{fmt(T.showN, { n: list.length })}</button></div>
              </div>
            )}

            {panel === 'quiz' && <Quiz T={T} answers={answers} setAnswers={setAnswers} top={quizTop} areaName={areaName} hrefFor={hrefFor}
              onShortlist={() => { updateShortlist((s) => Array.from(new Set([...s, ...quizTop.map((h) => h.id)])).slice(0, MAX_SHORT)); setPanel(null); }} />}

            {panel === 'compare' && <Compare T={T} stays={saved.slice(0, 3)} facts={facts} areaName={areaName} hrefFor={hrefFor} typeLabel={(v: string) => t.common.propertyTypes[v] || v} />}

            {panel === 'ask' && <Ask T={T} stays={saved} checkIn={checkIn} checkOut={checkOut} guests={guests} nights={nights}
              setCheckIn={setCheckIn} setCheckOut={setCheckOut} onRemove={save} />}
          </div>
        </div>
      )}
    </div>
  );
}

function Quiz({ T, answers, setAnswers, top, onShortlist, areaName, hrefFor }: any) {
  const steps: { key: keyof Answers; opts: string[] }[] = [
    { key: 'who', opts: ['couple', 'family', 'solo', 'friends'] },
    { key: 'budget', opts: ['budget', 'mid-range', 'upscale', 'any'] },
    { key: 'matters', opts: ['view', 'quiet', 'cafes', 'triund', 'social'] },
  ];
  const step = steps.findIndex((s) => !answers[s.key]);
  return (
    <div>
      <p className="sf-kicker"><Sparkles className="h-4 w-4" />{T.letUsPick}</p>
      {step >= 0 ? (
        <>
          <h2>{T.quiz[steps[step].key]}</h2>
          <div className="sf-steps">{steps.map((s, i) => <i key={s.key} className={i <= step ? 'on' : ''} />)}</div>
          <div className="sf-choices">
            {steps[step].opts.map((o) => (
              <button key={o} type="button" onClick={() => setAnswers({ ...answers, [steps[step].key]: o as any })}>
                <span aria-hidden="true">{T.quizIcon[o]}</span>{T.quizOpt[o]}
              </button>
            ))}
          </div>
          {step > 0 && <button type="button" className="sf-back" onClick={() => setAnswers({ ...answers, [steps[step - 1].key]: null })}>{T.back}</button>}
        </>
      ) : (
        <>
          <h2>{T.quizDone}</h2>
          <ol className="sf-top">
            {top.map((h: any, i: number) => { const p = normalizeImages(h.images)[0]; return (
              <li key={h.id}>
                <span className="n">{i + 1}</span>
                <span className="ph">{p && <Image src={p.url} alt={p.alt || h.name} fill sizes="96px" />}</span>
                <span className="tx"><b><Link href={hrefFor(h)}>{h.name}</Link></b><small>{areaName(h.destination_slug)}</small>{(h.highlights || [])[0] && <em>{h.highlights[0]}</em>}</span>
              </li>
            ); })}
          </ol>
          <div className="sf-sheet-foot">
            <button type="button" className="ghost" onClick={() => setAnswers({ who: null, budget: null, matters: null })}>{T.again}</button>
            <button type="button" className="go" onClick={onShortlist}><Heart className="h-4 w-4" />{T.shortlistThese}</button>
          </div>
        </>
      )}
    </div>
  );
}

function Compare({ T, stays, facts, areaName, hrefFor, typeLabel }: any) {
  const rows: { label: string; v: (h: any) => React.ReactNode }[] = [
    { label: T.cmp.area, v: (h) => areaName(h.destination_slug) },
    { label: T.cmp.type, v: (h) => typeLabel(h.type) },
    { label: T.cmp.price, v: (h) => (facts.get(h.id).live ? formatPrice(h.price_min) + ' ' + T.card.perNight : h.price_band ? T.sign[h.price_band] + ' ' + T.band[h.price_band] : '—') },
    { label: T.cmp.square, v: (h) => (facts.get(h.id).kmSquare !== null ? facts.get(h.id).kmSquare.toFixed(1) + ' km' : '—') },
    { label: T.cmp.trail, v: (h) => (facts.get(h.id).kmTrail !== null ? facts.get(h.id).kmTrail.toFixed(1) + ' km' : '—') },
    ...(['view', 'quiet', 'cafes', 'triund', 'social', 'family'] as Mood[]).map((m) => ({ label: T.mood[m], v: (h: any) => (facts.get(h.id).moods.includes(m) ? <Check className="h-4 w-4 text-emerald-600 mx-auto" /> : <span className="text-slate-300">—</span>) })),
    { label: T.cmp.parking, v: (h) => (facts.get(h.id).parking ? <Check className="h-4 w-4 text-emerald-600 mx-auto" /> : <span className="text-slate-300">—</span>) },
  ];
  return (
    <div>
      <h2>{T.compare}</h2>
      <div className="sf-cmp" style={{ ['--n' as string]: stays.length }}>
        <div />
        {stays.map((h: any) => { const p = normalizeImages(h.images)[0]; return (
          <div key={h.id} className="hd"><span className="ph">{p && <Image src={p.url} alt={p.alt || h.name} fill sizes="200px" />}</span><Link href={hrefFor(h)}>{h.name}</Link></div>
        ); })}
        {rows.map((r) => [<div key={r.label} className="lb">{r.label}</div>, ...stays.map((h: any) => <div key={r.label + h.id} className="cl">{r.v(h)}</div>)])}
        <div className="lb">{T.cmp.why}</div>
        {stays.map((h: any) => <div key={'w' + h.id} className="cl why">{(h.highlights || []).slice(0, 2).join(' · ')}</div>)}
      </div>
      <p className="sf-note">{T.card.straight}</p>
    </div>
  );
}

function Ask({ T, stays, checkIn, checkOut, guests, nights, setCheckIn, setCheckOut, onRemove }: any) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [msg, setMsg] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const ids = useRef<Record<string, string>>({});
  const list = stays.map((h: any) => h.name).join(', ');
  const wa = getWhatsAppLink(fmt(T.ask.waText, { list, dates: checkIn && checkOut ? `${checkIn} → ${checkOut}` : T.ask.flexible, guests }));

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    try {
      for (const h of stays) {
        ids.current[h.id] ||= uuid();
        const res = await fetch('/api/inquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          id: ids.current[h.id], type: 'hotel', name, phone, property_id: h.id, guests,
          check_in: checkIn || undefined, check_out: checkOut || undefined,
          message: `[Shortlist enquiry for ${stays.length}: ${list}] ${msg}`.trim(),
        }) });
        if (!res.ok) throw new Error(String(res.status));
      }
      setState('done');
    } catch { setState('error'); }
  }

  if (state === 'done') return (
    <div className="sf-done">
      <span className="ok"><Check className="h-7 w-7" /></span>
      <h2>{T.ask.doneTitle}</h2>
      <p>{fmt(T.ask.doneText, { n: stays.length })}</p>
      <a href={wa} target="_blank" rel="noopener noreferrer" className="go"><MessageCircle className="h-4 w-4" />{T.ask.waNow}</a>
    </div>
  );
  return (
    <form onSubmit={send}>
      <h2>{fmt(T.getPrices, { n: stays.length })}</h2>
      <p className="sf-lede">{T.ask.lede}</p>
      <ul className="sf-asklist">{stays.map((h: any) => <li key={h.id}>{h.name}<button type="button" aria-label={T.ask.remove} onClick={() => onRemove(h.id)}><X className="h-3.5 w-3.5" /></button></li>)}</ul>
      <div className="sf-grid2">
        <label>{T.checkIn}<input type="date" value={checkIn} min={today()} onChange={(e) => { const v = e.target.value; setCheckIn(v); if (checkOut && checkOut <= v) setCheckOut(nextDay(v)); }} /></label>
        <label>{T.checkOut}<input type="date" value={checkOut} min={checkIn ? nextDay(checkIn) : nextDay()} onChange={(e) => setCheckOut(e.target.value)} /></label>
        <label>{T.ask.name}<input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
        <label>{T.ask.phone}<input required type="tel" minLength={10} value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="+91" /></label>
      </div>
      <label className="sf-full">{T.ask.note}<textarea rows={2} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={T.ask.notePh} /></label>
      {nights > 0 && <p className="sf-note">{fmt(T.ask.nights, { n: nights, guests })}</p>}
      {state === 'error' && <p className="sf-err">{T.ask.error}</p>}
      <div className="sf-sheet-foot">
        <a href={wa} target="_blank" rel="noopener noreferrer" className="ghost"><MessageCircle className="h-4 w-4" />{T.ask.wa}</a>
        <button type="submit" className="go" disabled={state === 'sending'}>{state === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}{T.ask.send}</button>
      </div>
      <p className="sf-note">{T.ask.privacy}</p>
    </form>
  );
}
