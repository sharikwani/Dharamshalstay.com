// app/(site)/admin/offers/page.tsx
'use client';
import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import CodeResult, { type CodeCheck } from '@/components/offers/CodeResult';
import { cn } from '@/lib/utils';

type RoomPlans = { room: string; plans: string[] };
type OfferView = {
  id: string; property_id: string; property_name: string; name: string; active: boolean; default_percent: number;
  plan_percents: Record<string, number>; valid_hours: number; code_prefix: string; up_to: number; rooms: RoomPlans[]; updated_at: string;
};
type CodeView = {
  id: string; code: string; phone: string; percent: number; booked_percent: number | null; state: string;
  issued_at: string; expires_at: string; offer_name: string; booking_ref: string | null; notes: string | null;
};

const STATES = ['all', 'issued', 'expired', 'booked', 'redeemed', 'cancelled'];
const STATE_STYLE: Record<string, string> = {
  issued: 'bg-sky-100 text-sky-800', expired: 'bg-slate-100 text-slate-600', booked: 'bg-violet-100 text-violet-800',
  redeemed: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-700',
};
const when = (s: string) => new Date(s).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

async function api(path: string, init?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.error || 'Something went wrong'), { body: json });
  return json;
}

function OfferCard({ offer, onChanged, onError }: { offer: OfferView; onChanged: () => void; onError: (m: string) => void }) {
  const [name, setName] = useState(offer.name);
  const [percent, setPercent] = useState(String(offer.default_percent));
  const [hours, setHours] = useState(String(offer.valid_hours));
  const [prefix, setPrefix] = useState(offer.code_prefix);
  const [plans, setPlans] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(offer.plan_percents).map(([k, v]) => [k, String(v)])));
  const [busy, setBusy] = useState(false);

  async function save(body: Record<string, unknown>) {
    setBusy(true); onError('');
    try { await api(`/api/admin/offers/${offer.id}`, { method: 'PATCH', body: JSON.stringify(body) }); onChanged(); }
    catch (e: any) { onError(e.message); } finally { setBusy(false); }
  }
  const known = new Set(offer.rooms.flatMap((r) => r.plans.map((p) => `${r.room}|${p}`)));
  const staleDropped = Object.keys(offer.plan_percents).some((k) => !known.has(k));
  const saveAll = () => save({
    name: name.trim(), default_percent: Number(percent), valid_hours: Number(hours), code_prefix: prefix.trim().toUpperCase(),
    plan_percents: Object.fromEntries(Object.entries(plans).filter(([k, v]) => known.has(k) && v.trim() !== '').map(([k, v]) => [k, Number(v)])),
  });
  const input = 'mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <p className="font-semibold text-slate-900">{offer.property_name}</p>
          {offer.active
            ? <p className="text-sm text-slate-500">Customers see: “Up to {offer.up_to}% off, only through this WhatsApp chat”</p>
            : <p className="text-sm text-slate-500">Currently Off – customers are not offered a code</p>}
        </div>
        <button onClick={() => save({ active: !offer.active })} disabled={busy}
          className={cn('px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50', offer.active ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-700')}>
          {offer.active ? 'On – tap to turn off' : 'Off – tap to turn on'}
        </button>
      </div>
      <div className="grid sm:grid-cols-5 gap-3 text-sm">
        <label className="sm:col-span-2">Name<input value={name} onChange={(e) => setName(e.target.value)} className={input} /></label>
        <label>Default %<input type="number" min={1} max={90} value={percent} onChange={(e) => setPercent(e.target.value)} className={input} /></label>
        <label>Code valid (hours)<input type="number" min={1} max={168} value={hours} onChange={(e) => setHours(e.target.value)} className={input} /></label>
        <label>Code prefix<input value={prefix} maxLength={5} onChange={(e) => setPrefix(e.target.value.toUpperCase())} className={cn(input, 'uppercase')} /></label>
      </div>
      {offer.rooms.some((r) => r.plans.length > 0) && (
        <div className="mt-4">
          <p className="text-sm font-medium text-slate-700 mb-1">% per rate plan (leave empty to use the default)</p>
          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            {offer.rooms.flatMap((r) => r.plans.map((p) => {
              const key = `${r.room}|${p}`;
              return (
                <label key={key} className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg px-3 py-1.5">
                  <span>{r.room} – {p}</span>
                  <input type="number" min={1} max={90} value={plans[key] ?? ''} placeholder={percent}
                    onChange={(e) => setPlans({ ...plans, [key]: e.target.value })} className="w-20 px-2 py-1 border border-slate-300 rounded" />
                </label>
              );
            }))}
          </div>
        </div>
      )}
      <button onClick={saveAll} disabled={busy} className="mt-4 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold disabled:opacity-50">
        {busy ? 'Saving…' : 'Save changes'}
      </button>
      {staleDropped && <p className="text-xs text-amber-700 mt-2">Removed percents for rooms or plans that no longer exist. Save to clear them.</p>}
      <p className="text-xs text-slate-500 mt-2">Changes apply to new codes straight away. Codes already sent keep working until they expire.</p>
    </div>
  );
}

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<OfferView[]>([]);
  const [codes, setCodes] = useState<CodeView[]>([]);
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([]);
  const [state, setState] = useState('all');
  const [offerFilter, setOfferFilter] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [entered, setEntered] = useState('');
  const [result, setResult] = useState<CodeCheck | null>(null);
  const [busy, setBusy] = useState(false);
  const [newProp, setNewProp] = useState('');
  const [newPrefix, setNewPrefix] = useState('');
  const [newPercent, setNewPercent] = useState('20');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const qs = new URLSearchParams();
      if (state !== 'all') qs.set('status', state);
      if (offerFilter) qs.set('offer_id', offerFilter);
      const d = await api(`/api/admin/offers?${qs.toString()}`);
      setOffers(d.offers); setCodes(d.codes); setProperties(d.properties);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, [state, offerFilter]);
  useEffect(() => { load(); }, [load]);

  async function codeAction(action: 'check' | 'redeem' | 'cancel') {
    const code = entered.trim();
    if (!code) return;
    if (action === 'cancel' && !confirm(`Cancel code ${code.toUpperCase()}? The customer can no longer use it.`)) return;
    setBusy(true); setError('');
    try {
      const d = await api('/api/admin/offers/codes', { method: 'POST', body: JSON.stringify({ action, code }) });
      setResult(action === 'cancel'
        ? (await api('/api/admin/offers/codes', { method: 'POST', body: JSON.stringify({ action: 'check', code }) })).result
        : d.result);
      if (action !== 'check') await load();
    } catch (e: any) {
      setError(e.message);
      if (e.body?.result) setResult(e.body.result);
    } finally { setBusy(false); }
  }

  async function createOffer() {
    if (creating) return;
    setCreating(true); setError('');
    try {
      await api('/api/admin/offers', { method: 'POST', body: JSON.stringify({ property_id: newProp, default_percent: Number(newPercent), valid_hours: 3, code_prefix: newPrefix.trim().toUpperCase() }) });
      setNewProp(''); setNewPrefix('');
      await load();
    } catch (e: any) { setError(e.message); } finally { setCreating(false); }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <AdminPageHeader title="WhatsApp offers" description="Discount codes the WhatsApp assistant gives out for a hotel. Customers only ever see “up to X% off”." />
      {error && <p className="mb-4 text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <section className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
        <h2 className="font-semibold text-slate-900 mb-2">Check a code</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input value={entered} onChange={(e) => { setEntered(e.target.value); setResult(null); }} placeholder="e.g. PNV-7K3Q9" aria-label="Offer code"
            className="px-3 py-2 border border-slate-300 rounded-lg uppercase w-48" />
          <button onClick={() => codeAction('check')} disabled={busy} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold disabled:opacity-50">Check</button>
          <button onClick={() => codeAction('redeem')} disabled={busy || !result?.valid} className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold disabled:opacity-50">Mark as used</button>
          <button onClick={() => codeAction('cancel')} disabled={busy} className="px-4 py-2 rounded-lg border border-red-300 text-red-700 text-sm font-semibold disabled:opacity-50">Cancel code</button>
          {busy && <Loader2 className="h-5 w-5 animate-spin text-slate-400" />}
        </div>
        {result && <div className="mt-3"><CodeResult r={result} /></div>}
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-slate-900 mb-2">Offers</h2>
        {loading ? <p className="text-slate-500 text-sm">Loading…</p> : (
          <div className="space-y-3">
            {offers.map((o) => <OfferCard key={o.id} offer={o} onChanged={load} onError={setError} />)}
            {offers.length === 0 && <p className="text-sm text-slate-500">No offers yet.</p>}
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-end gap-2 text-sm bg-white border border-dashed border-slate-300 rounded-xl p-3">
          <label>Hotel
            <select value={newProp} onChange={(e) => setNewProp(e.target.value)} className="mt-1 block px-3 py-2 border border-slate-300 rounded-lg max-w-xs">
              <option value="">Choose…</option>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label>Default %<input type="number" min={1} max={90} value={newPercent} onChange={(e) => setNewPercent(e.target.value)} className="mt-1 block w-20 px-3 py-2 border border-slate-300 rounded-lg" /></label>
          <label>Code prefix<input value={newPrefix} maxLength={5} onChange={(e) => setNewPrefix(e.target.value.toUpperCase())} placeholder="PNV" className="mt-1 block w-24 px-3 py-2 border border-slate-300 rounded-lg uppercase" /></label>
          <button onClick={createOffer} disabled={!newProp || !newPrefix || creating} className="px-4 py-2 rounded-lg bg-brand-600 text-white font-semibold disabled:opacity-50">Add offer (starts off)</button>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <h2 className="font-semibold text-slate-900 mr-2">Codes</h2>
          {STATES.map((s) => (
            <button key={s} onClick={() => setState(s)} className={cn('px-3 py-1 rounded-full text-sm capitalize', state === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700')}>{s}</button>
          ))}
          <select value={offerFilter} onChange={(e) => setOfferFilter(e.target.value)} className="ml-auto px-3 py-1.5 border border-slate-300 rounded-lg text-sm" aria-label="Filter by offer">
            <option value="">All offers</option>
            {offers.map((o) => <option key={o.id} value={o.id}>{o.property_name}</option>)}
          </select>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr><th className="p-2">Code</th><th className="p-2">State</th><th className="p-2">Offer</th><th className="p-2">Phone</th><th className="p-2">%</th><th className="p-2">Issued</th><th className="p-2">Expires</th><th className="p-2">Booking</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {codes.length === 0 && <tr><td colSpan={8} className="p-4 text-slate-500">No codes.</td></tr>}
              {codes.map((c) => (
                <tr key={c.id}>
                  <td className="p-2 font-mono"><button onClick={() => { setEntered(c.code); setResult(null); }} className="hover:underline">{c.code}</button></td>
                  <td className="p-2"><span className={cn('text-xs px-2 py-0.5 rounded-full capitalize', STATE_STYLE[c.state])}>{c.state}</span></td>
                  <td className="p-2">{c.offer_name}</td>
                  <td className="p-2">{c.phone}</td>
                  <td className="p-2">{c.booked_percent ?? c.percent}%</td>
                  <td className="p-2">{when(c.issued_at)}</td>
                  <td className="p-2">{c.state === 'booked' || c.state === 'redeemed' ? '—' : when(c.expires_at)}</td>
                  <td className="p-2 font-mono">{c.booking_ref || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
