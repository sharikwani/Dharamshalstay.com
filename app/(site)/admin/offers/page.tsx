// app/(site)/admin/offers/page.tsx
'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { BadgePercent, ChevronDown, ExternalLink, Loader2, MessageCircle, Plus, Search, Ticket, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import CodeResult, { type CodeCheck } from '@/components/offers/CodeResult';
import { cn } from '@/lib/utils';

type RoomPlans = { room: string; plans: string[] };
type Counts = { issued: number; expired: number; booked: number; redeemed: number; cancelled: number };
type OfferView = {
  id: string; property_id: string; property_name: string; property_slug: string | null; name: string; active: boolean; default_percent: number;
  plan_percents: Record<string, number>; valid_hours: number; code_prefix: string; up_to: number; rooms: RoomPlans[]; updated_at: string; counts: Counts;
};
type CodeView = {
  id: string; offer_id: string; code: string; phone: string; percent: number; booked_percent: number | null; state: string;
  issued_at: string; expires_at: string; offer_name: string; property_name: string; booking_ref: string | null; notes: string | null;
};

const STATES: { key: string; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'issued', label: 'Live' }, { key: 'booked', label: 'Booked' },
  { key: 'redeemed', label: 'Used' }, { key: 'expired', label: 'Expired' }, { key: 'cancelled', label: 'Cancelled' },
];
const STATE_LABEL: Record<string, string> = { issued: 'Live', expired: 'Expired', booked: 'Booked', redeemed: 'Used', cancelled: 'Cancelled' };
const STATE_STYLE: Record<string, string> = {
  issued: 'bg-sky-100 text-sky-800', expired: 'bg-slate-100 text-slate-600', booked: 'bg-violet-100 text-violet-800',
  redeemed: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-700',
};
const VALIDITY = [
  { h: 1, label: '1 hour' }, { h: 3, label: '3 hours' }, { h: 6, label: '6 hours' }, { h: 12, label: '12 hours' },
  { h: 24, label: '1 day' }, { h: 48, label: '2 days' }, { h: 72, label: '3 days' }, { h: 168, label: '7 days' },
];
const validityText = (h: number) => VALIDITY.find((v) => v.h === h)?.label || (h % 24 === 0 ? `${h / 24} days` : `${h} hours`);
const when = (s: string) => new Date(s).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const EMPTY: Counts = { issued: 0, expired: 0, booked: 0, redeemed: 0, cancelled: 0 };

/** "Panchvati Cottages" -> "PC", "Hotel Tibet" -> "HT", "Loopin" -> "LOO". */
function suggestPrefix(name: string): string {
  const words = name.toUpperCase().replace(/[^A-Z\s]/g, ' ').split(/\s+/).filter(Boolean);
  const initials = words.slice(0, 4).map((w) => w[0]).join('');
  return (initials.length >= 2 ? initials : (words[0] || '').slice(0, 3)).slice(0, 5);
}

async function api(path: string, init?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.error || 'Something went wrong'), { body: json });
  return json;
}

const input = 'mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm';

function Switch({ on, busy, onClick, label }: { on: boolean; busy?: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onClick} disabled={busy}
      className={cn('relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-50', on ? 'bg-green-600' : 'bg-slate-300')}>
      <span className={cn('inline-block h-5 w-5 rounded-full bg-white shadow transition-transform', on ? 'translate-x-6' : 'translate-x-1')} />
    </button>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: number | string; hint: string; tone: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={cn('text-2xl font-bold mt-1', tone)}>{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{hint}</p>
    </div>
  );
}

/** The settings for one hotel's offer, opened from its row. */
function OfferEditor({ offer, onSaved, onClose, onError }: { offer: OfferView; onSaved: () => void; onClose: () => void; onError: (m: string) => void }) {
  const [name, setName] = useState(offer.name);
  const [percent, setPercent] = useState(String(offer.default_percent));
  const [hours, setHours] = useState(offer.valid_hours);
  const [prefix, setPrefix] = useState(offer.code_prefix);
  const [plans, setPlans] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(offer.plan_percents).map(([k, v]) => [k, String(v)])));
  const [busy, setBusy] = useState(false);
  const known = new Set(offer.rooms.flatMap((r) => r.plans.map((p) => `${r.room}|${p}`)));
  const staleDropped = Object.keys(offer.plan_percents).some((k) => !known.has(k));
  const hasPlans = offer.rooms.some((r) => r.plans.length > 0);
  const customPlans = Object.values(plans).filter((v) => v.trim() !== '').length;
  const hourOptions = VALIDITY.some((v) => v.h === hours) ? VALIDITY : [...VALIDITY, { h: hours, label: validityText(hours) }];

  async function save() {
    setBusy(true); onError('');
    try {
      await api(`/api/admin/offers/${offer.id}`, {
        method: 'PATCH', body: JSON.stringify({
          name: name.trim(), default_percent: Number(percent), valid_hours: hours, code_prefix: prefix.trim().toUpperCase(),
          plan_percents: Object.fromEntries(Object.entries(plans).filter(([k, v]) => known.has(k) && v.trim() !== '').map(([k, v]) => [k, Number(v)])),
        }),
      });
      onSaved(); onClose();
    } catch (e: any) { onError(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="border-t border-slate-200 bg-slate-50/70 p-4 rounded-b-xl">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-medium text-slate-700">Discount
          <div className="relative">
            <input type="number" min={1} max={90} value={percent} onChange={(e) => setPercent(e.target.value)} className={cn(input, 'pr-8')} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 text-slate-400 text-sm">%</span>
          </div>
        </label>
        <label className="text-sm font-medium text-slate-700">Each code lasts
          <select value={hours} onChange={(e) => setHours(Number(e.target.value))} className={input}>
            {hourOptions.map((v) => <option key={v.h} value={v.h}>{v.label}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">Code starts with
          <input value={prefix} maxLength={5} onChange={(e) => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} className={cn(input, 'uppercase font-mono')} />
          <span className="block text-xs font-normal text-slate-500 mt-1">Guests get codes like <span className="font-mono">{prefix || 'ABC'}-7K3Q9</span></span>
        </label>
      </div>

      {hasPlans && (
        <details className="mt-4 bg-white border border-slate-200 rounded-lg" open={customPlans > 0}>
          <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-slate-700">
            Different discount for some room plans {customPlans > 0 && <span className="text-brand-700">({customPlans} set)</span>}
          </summary>
          <div className="px-3 pb-3">
            <p className="text-xs text-slate-500 mb-2">Leave a box empty to use the main discount ({percent || '–'}%).</p>
            <div className="grid sm:grid-cols-2 gap-2 text-sm">
              {offer.rooms.flatMap((r) => r.plans.map((p) => {
                const key = `${r.room}|${p}`;
                return (
                  <label key={key} className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg px-3 py-1.5">
                    <span className="text-slate-700">{r.room} – {p}</span>
                    <input type="number" min={1} max={90} value={plans[key] ?? ''} placeholder={percent} aria-label={`${r.room} ${p} percent`}
                      onChange={(e) => setPlans({ ...plans, [key]: e.target.value })} className="w-20 px-2 py-1 border border-slate-300 rounded" />
                  </label>
                );
              }))}
            </div>
          </div>
        </details>
      )}

      <details className="mt-3">
        <summary className="cursor-pointer select-none text-xs text-slate-500">Internal name</summary>
        <input value={name} onChange={(e) => setName(e.target.value)} className={cn(input, 'max-w-md')} aria-label="Internal name" />
      </details>

      {staleDropped && <p className="text-xs text-amber-700 mt-2">Some room plans in this offer no longer exist. Saving removes them.</p>}
      <div className="flex flex-wrap items-center gap-2 mt-4">
        <button onClick={save} disabled={busy} className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold disabled:opacity-50">
          {busy ? 'Saving…' : 'Save changes'}
        </button>
        <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium">Cancel</button>
        <p className="text-xs text-slate-500">New codes use these settings straight away. Codes already given out keep their own discount until they expire.</p>
      </div>
    </div>
  );
}

function NewOffer({ properties, offers, onCreated, onClose, onError }: {
  properties: { id: string; name: string }[]; offers: OfferView[]; onCreated: () => void; onClose: () => void; onError: (m: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [prop, setProp] = useState<{ id: string; name: string } | null>(null);
  const [percent, setPercent] = useState('20');
  const [hours, setHours] = useState(3);
  const [prefix, setPrefix] = useState('');
  const [busy, setBusy] = useState(false);
  const hasOffer = useMemo(() => new Set(offers.map((o) => o.property_id)), [offers]);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return properties.filter((p) => !q || p.name.toLowerCase().includes(q)).slice(0, 8);
  }, [properties, query]);

  function pick(p: { id: string; name: string }) { setProp(p); setPrefix(suggestPrefix(p.name)); setQuery(''); }

  async function create() {
    if (!prop || busy) return;
    setBusy(true); onError('');
    try {
      await api('/api/admin/offers', { method: 'POST', body: JSON.stringify({ property_id: prop.id, default_percent: Number(percent), valid_hours: hours, code_prefix: prefix }) });
      onCreated();
    } catch (e: any) { onError(e.message); } finally { setBusy(false); }
  }

  return (
    <section className="bg-white border-2 border-brand-200 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-slate-900">New offer</h2>
        <button onClick={onClose} aria-label="Close" className="p-1 rounded hover:bg-slate-100"><X className="h-4 w-4 text-slate-500" /></button>
      </div>

      <p className="text-sm font-medium text-slate-700">1. Which hotel?</p>
      {prop ? (
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="px-3 py-2 rounded-lg bg-brand-50 text-brand-800 text-sm font-medium">{prop.name}</span>
          <button onClick={() => setProp(null)} className="text-sm text-slate-600 underline">Change</button>
          {hasOffer.has(prop.id) && <span className="text-xs text-amber-700">This hotel already has an offer. You can add another, but only one can be on at a time.</span>}
        </div>
      ) : (
        <div className="mt-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type a hotel name" aria-label="Search hotels"
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <ul className="mt-1 border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-64 overflow-auto">
            {matches.map((p) => (
              <li key={p.id}>
                <button onClick={() => pick(p)} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center justify-between gap-2">
                  <span>{p.name}</span>
                  {hasOffer.has(p.id) && <span className="text-xs text-slate-500">has an offer</span>}
                </button>
              </li>
            ))}
            {matches.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">No hotel matches.</li>}
          </ul>
        </div>
      )}

      {prop && (
        <>
          <p className="text-sm font-medium text-slate-700 mt-4">2. The offer</p>
          <div className="grid gap-3 sm:grid-cols-3 mt-1 max-w-2xl">
            <label className="text-sm text-slate-700">Discount
              <div className="relative">
                <input type="number" min={1} max={90} value={percent} onChange={(e) => setPercent(e.target.value)} className={cn(input, 'pr-8')} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 text-slate-400 text-sm">%</span>
              </div>
            </label>
            <label className="text-sm text-slate-700">Each code lasts
              <select value={hours} onChange={(e) => setHours(Number(e.target.value))} className={input}>
                {VALIDITY.map((v) => <option key={v.h} value={v.h}>{v.label}</option>)}
              </select>
            </label>
            <label className="text-sm text-slate-700">Code starts with
              <input value={prefix} maxLength={5} onChange={(e) => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} className={cn(input, 'uppercase font-mono')} />
            </label>
          </div>
          <p className="text-xs text-slate-500 mt-2">Guests will get codes like <span className="font-mono">{prefix || 'ABC'}-7K3Q9</span>. The offer is saved switched off, so nothing goes to guests until you turn it on.</p>
          <button onClick={create} disabled={busy || prefix.length < 2 || !percent} className="mt-3 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold disabled:opacity-50">
            {busy ? 'Saving…' : 'Create offer'}
          </button>
        </>
      )}
    </section>
  );
}

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<OfferView[]>([]);
  const [codes, setCodes] = useState<CodeView[]>([]);
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([]);
  const [view, setView] = useState<'hotels' | 'codes'>('hotels');
  const [state, setState] = useState('all');
  const [offerFilter, setOfferFilter] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [codesLoading, setCodesLoading] = useState(false);
  const [entered, setEntered] = useState('');
  const [result, setResult] = useState<CodeCheck | null>(null);
  const [usedNow, setUsedNow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const checkRef = useRef<HTMLInputElement>(null);

  const seq = useRef(0);
  const load = useCallback(async () => {
    const mine = ++seq.current; // a slower answer for a filter we already left must not overwrite this one
    setCodesLoading(true);
    try {
      const qs = new URLSearchParams();
      if (state !== 'all') qs.set('status', state);
      if (offerFilter) qs.set('offer_id', offerFilter);
      const d = await api(`/api/admin/offers?${qs.toString()}`);
      if (mine !== seq.current) return;
      setOffers(d.offers); setCodes(d.codes); setProperties(d.properties);
    } catch (e: any) { if (mine === seq.current) setError(e.message); } finally { if (mine === seq.current) { setLoading(false); setCodesLoading(false); } }
  }, [state, offerFilter]);
  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => offers.reduce((t, o) => {
    const c = o.counts || EMPTY;
    return { issued: t.issued + c.issued, booked: t.booked + c.booked, redeemed: t.redeemed + c.redeemed, all: t.all + c.issued + c.expired + c.booked + c.redeemed + c.cancelled };
  }, { issued: 0, booked: 0, redeemed: 0, all: 0 }), [offers]);
  const filterCounts: Counts = useMemo(() => {
    const list = offerFilter ? offers.filter((o) => o.id === offerFilter) : offers;
    return list.reduce((t, o) => {
      const c = o.counts || EMPTY;
      return { issued: t.issued + c.issued, expired: t.expired + c.expired, booked: t.booked + c.booked, redeemed: t.redeemed + c.redeemed, cancelled: t.cancelled + c.cancelled };
    }, { ...EMPTY });
  }, [offers, offerFilter]);
  const shownCodes = useMemo(() => {
    const q = search.trim().toUpperCase().replace(/\s/g, '');
    if (!q) return codes;
    return codes.filter((c) => c.code.replace('-', '').includes(q.replace('-', '')) || c.phone.replace(/\D/g, '').includes(q.replace(/\D/g, '') || '§'));
  }, [codes, search]);
  const onCount = offers.filter((o) => o.active).length;

  async function toggle(o: OfferView) {
    setToggling(o.id); setError('');
    try { await api(`/api/admin/offers/${o.id}`, { method: 'PATCH', body: JSON.stringify({ active: !o.active }) }); await load(); }
    catch (e: any) { setError(e.message); } finally { setToggling(null); }
  }

  function showCodes(offerId: string) { setOfferFilter(offerId); setState('all'); setSearch(''); setView('codes'); }

  function pickCode(code: string) {
    setEntered(code); setResult(null); setUsedNow(false);
    checkRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    checkRef.current?.focus();
  }

  async function codeAction(action: 'check' | 'redeem' | 'cancel') {
    const code = entered.trim();
    if (!code) return;
    setBusy(true); setError('');
    try {
      if (action === 'cancel') {
        // Look first: a code on a paid booking means the guest already paid the discounted price.
        const now: CodeCheck = (await api('/api/admin/offers/codes', { method: 'POST', body: JSON.stringify({ action: 'check', code }) })).result;
        const paid = now?.status === 'booked' && now.path === 'paid_booking' && now.valid;
        const question = paid
          ? `This code is linked to paid booking ${now.booking_ref || ''}; the guest paid the discounted price. Cancel anyway?`
          : `Cancel code ${code.toUpperCase()}? The customer can no longer use it.`;
        if (!confirm(question)) { setResult(now); setUsedNow(false); return; }
      }
      const d = await api('/api/admin/offers/codes', { method: 'POST', body: JSON.stringify({ action, code }) });
      setResult(action === 'cancel'
        ? (await api('/api/admin/offers/codes', { method: 'POST', body: JSON.stringify({ action: 'check', code }) })).result
        : d.result);
      setUsedNow(action === 'redeem');
      if (action !== 'check') await load();
    } catch (e: any) {
      setError(e.message);
      setResult(e.body?.result ?? null); setUsedNow(false);
    } finally { setBusy(false); }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <AdminPageHeader
        title="Offers & discount codes"
        description="Turn on a discount for a hotel and our WhatsApp assistant gives each guest who asks a personal code. Guests only see “up to X% off”."
        action={!adding && (
          <button onClick={() => { setAdding(true); setView('hotels'); }} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700">
            <Plus className="h-4 w-4" /> New offer
          </button>
        )}
      />
      {error && <p className="mb-4 text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg flex items-start justify-between gap-2">{error}<button onClick={() => setError('')} aria-label="Dismiss"><X className="h-4 w-4" /></button></p>}

      <ol className="grid sm:grid-cols-3 gap-2 mb-6 text-sm">
        {[
          { icon: BadgePercent, t: 'Turn an offer on', d: 'Pick a hotel, set the discount, flip the switch.' },
          { icon: MessageCircle, t: 'Guest gets a code', d: 'Our WhatsApp assistant sends a personal code, e.g. PC-7K3Q9.' },
          { icon: Ticket, t: 'Code is used', d: 'The guest books online with it, or shows it at the hotel and you mark it used.' },
        ].map((s, i) => (
          <li key={s.t} className="flex gap-3 bg-white border border-slate-200 rounded-xl p-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700"><s.icon className="h-4 w-4" /></span>
            <span><span className="font-semibold text-slate-900">{i + 1}. {s.t}</span><span className="block text-slate-500 text-xs mt-0.5">{s.d}</span></span>
          </li>
        ))}
      </ol>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat label="Offers on" value={loading ? '–' : `${onCount} of ${offers.length}`} hint="hotels giving out codes now" tone="text-green-700" />
        <Stat label="Live codes" value={loading ? '–' : totals.issued} hint="sent and not expired yet" tone="text-sky-700" />
        <Stat label="Booked" value={loading ? '–' : totals.booked} hint="used for a booking" tone="text-violet-700" />
        <Stat label="Used at hotel" value={loading ? '–' : totals.redeemed} hint="marked used at check-in" tone="text-slate-900" />
      </div>

      <section className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
        <h2 className="font-semibold text-slate-900">Check a code</h2>
        <p className="text-xs text-slate-500 mb-2">A guest or hotel sent you a code? Type it to see if it is valid, then mark it used or cancel it.</p>
        <div className="flex flex-wrap items-center gap-2">
          <input ref={checkRef} value={entered} onChange={(e) => { setEntered(e.target.value); setResult(null); setUsedNow(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') codeAction('check'); }} placeholder="e.g. PNV-7K3Q9" aria-label="Offer code"
            className="px-3 py-2 border border-slate-300 rounded-lg uppercase font-mono w-48" />
          <button onClick={() => codeAction('check')} disabled={busy || !entered.trim()} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold disabled:opacity-50">Check</button>
          <button onClick={() => codeAction('redeem')} disabled={busy || !result?.valid} className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold disabled:opacity-50">Mark as used</button>
          <button onClick={() => codeAction('cancel')} disabled={busy || !entered.trim()} className="px-4 py-2 rounded-lg border border-red-300 text-red-700 text-sm font-semibold disabled:opacity-50">Cancel code</button>
          {busy && <Loader2 className="h-5 w-5 animate-spin text-slate-400" />}
        </div>
        {result && <div className="mt-3"><CodeResult r={result} justUsed={usedNow} /></div>}
      </section>

      {adding && (
        <NewOffer properties={properties} offers={offers} onError={setError} onClose={() => setAdding(false)}
          onCreated={async () => { setAdding(false); setView('hotels'); await load(); }} />
      )}

      <div role="tablist" className="flex gap-1 border-b border-slate-200 mb-4">
        {([['hotels', `Hotels with offers (${offers.length})`], ['codes', `Codes (${totals.all})`]] as const).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={view === k} onClick={() => setView(k)}
            className={cn('px-4 py-2 text-sm font-semibold border-b-2 -mb-px', view === k ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800')}>
            {label}
          </button>
        ))}
      </div>

      {view === 'hotels' && (
        loading ? <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-600" /></div> : (
          <div className="space-y-3">
            {offers.length === 0 && (
              <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center">
                <p className="text-slate-600">No offers yet.</p>
                <button onClick={() => setAdding(true)} className="mt-3 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold">Create the first offer</button>
              </div>
            )}
            {offers.map((o) => {
              const c = o.counts || EMPTY;
              const open = editing === o.id;
              const custom = Object.keys(o.plan_percents || {}).length;
              return (
                <div key={o.id} className={cn('bg-white border rounded-xl', o.active ? 'border-green-300' : 'border-slate-200')}>
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-3 sm:w-28 shrink-0">
                      <Switch on={o.active} busy={toggling === o.id} onClick={() => toggle(o)} label={`${o.property_name} offer ${o.active ? 'on' : 'off'}`} />
                      <span className={cn('text-xs font-bold uppercase', o.active ? 'text-green-700' : 'text-slate-500')}>{o.active ? 'On' : 'Off'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                        {o.property_name || 'Deleted hotel'}
                        {o.property_slug && <Link href={`/hotels/${o.property_slug}`} target="_blank" aria-label="Open hotel page" className="text-slate-400 hover:text-slate-700"><ExternalLink className="h-3.5 w-3.5" /></Link>}
                      </p>
                      <p className="text-sm text-slate-600">
                        <span className="font-semibold text-brand-700">{o.up_to > o.default_percent ? `${o.default_percent}–${o.up_to}%` : `${o.default_percent}%`} off</span>
                        {' · '}codes last {validityText(o.valid_hours)}{' · '}<span className="font-mono">{o.code_prefix}-xxxxx</span>
                        {custom > 0 && <span className="text-slate-500"> · {custom} room plan{custom === 1 ? '' : 's'} differ</span>}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {o.active ? 'Guests asking on WhatsApp are offered a code now.' : 'Off: guests are not offered a code.'}
                      </p>
                    </div>
                    <button onClick={() => showCodes(o.id)} className="flex flex-wrap gap-1.5 text-xs text-left" title="See this hotel’s codes">
                      <span className="px-2 py-1 rounded-full bg-sky-50 text-sky-800">{c.issued} live</span>
                      <span className="px-2 py-1 rounded-full bg-violet-50 text-violet-800">{c.booked} booked</span>
                      <span className="px-2 py-1 rounded-full bg-green-50 text-green-800">{c.redeemed} used</span>
                    </button>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => showCodes(o.id)} className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50">Codes</button>
                      <button onClick={() => setEditing(open ? null : o.id)} aria-expanded={open}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50">
                        Edit <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
                      </button>
                    </div>
                  </div>
                  {open && <OfferEditor key={o.updated_at} offer={o} onSaved={load} onClose={() => setEditing(null)} onError={setError} />}
                </div>
              );
            })}
            {offers.length > 0 && !adding && (
              <button onClick={() => setAdding(true)} className="w-full flex items-center justify-center gap-1.5 border border-dashed border-slate-300 rounded-xl py-3 text-sm text-slate-600 hover:bg-white">
                <Plus className="h-4 w-4" /> Add an offer for another hotel
              </button>
            )}
          </div>
        )
      )}

      {view === 'codes' && (
        <section>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <select value={offerFilter} onChange={(e) => setOfferFilter(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" aria-label="Hotel">
              <option value="">All hotels</option>
              {offers.map((o) => <option key={o.id} value={o.id}>{o.property_name}{o.active ? '' : ' (off)'}</option>)}
            </select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a code or phone" aria-label="Find a code or phone"
                className="pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm w-56" />
            </div>
            {codesLoading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {STATES.map((s) => {
              const n = s.key === 'all' ? Object.values(filterCounts).reduce((a, b) => a + b, 0) : filterCounts[s.key as keyof Counts];
              return (
                <button key={s.key} onClick={() => setState(s.key)}
                  className={cn('px-3 py-1 rounded-full text-sm', state === s.key ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50')}>
                  {s.label} <span className={state === s.key ? 'text-slate-300' : 'text-slate-400'}>{n}</span>
                </button>
              );
            })}
          </div>
          <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr><th className="p-3">Code</th><th className="p-3">Hotel</th><th className="p-3">Status</th><th className="p-3">Guest phone</th><th className="p-3">Discount</th><th className="p-3">Sent</th><th className="p-3">Expires</th><th className="p-3">Booking</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shownCodes.length === 0 && (
                  <tr><td colSpan={8} className="p-6 text-center text-slate-500">
                    {search ? 'No code matches that search.' : offers.some((o) => o.active) ? 'No codes here yet.' : 'No codes yet. Codes appear here once an offer is on and guests ask on WhatsApp.'}
                  </td></tr>
                )}
                {shownCodes.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono"><button onClick={() => pickCode(c.code)} className="text-brand-700 hover:underline" title="Check this code">{c.code}</button></td>
                    <td className="p-3">{c.property_name || c.offer_name}</td>
                    <td className="p-3"><span className={cn('text-xs px-2 py-0.5 rounded-full', STATE_STYLE[c.state])}>{STATE_LABEL[c.state] || c.state}</span></td>
                    <td className="p-3 whitespace-nowrap">{c.phone}</td>
                    <td className="p-3">{c.booked_percent ?? c.percent}%</td>
                    <td className="p-3 whitespace-nowrap">{when(c.issued_at)}</td>
                    <td className="p-3 whitespace-nowrap">{c.state === 'booked' || c.state === 'redeemed' ? '—' : when(c.expires_at)}</td>
                    <td className="p-3 font-mono">{c.booking_ref || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {codes.length >= 200 && <p className="text-xs text-slate-500 mt-2">Showing the latest 200. Pick a hotel or status to narrow it down.</p>}
        </section>
      )}
    </div>
  );
}
