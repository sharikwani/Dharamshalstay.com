'use client';
import { useState } from 'react';
import { Minus, Plus, Ticket } from 'lucide-react';
import { ticketPrice, type TicketType } from '@/data/parties';
import { siteConfig } from '@/lib/config';

const inr = (n: number) => '₹' + n.toLocaleString('en-IN');

/** Pick tickets, then pay online (Razorpay); the ticket card arrives by email and WhatsApp once paid. */
export default function TicketForm({ party, types, onSale, discountPct = 0 }: { party: string; types: TicketType[]; onSale: boolean; discountPct?: number }) {
  const [type, setType] = useState(types[0]?.id || '');
  const [qty, setQty] = useState(1);
  const [f, setF] = useState({ name: '', email: '', phone: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!onSale) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-[#f2c46d]/60 bg-white/5 p-6 text-center">
        <Ticket className="mx-auto h-8 w-8 text-[#f2c46d]" />
        <p className="mt-2 text-lg font-semibold text-white">Tickets open soon</p>
        <p className="mt-1 text-sm text-white/75">Prices and timings are being finalised. WhatsApp us to be told first when bookings open.</p>
        <a href={`https://wa.me/${siteConfig.whatsapp}?text=${encodeURIComponent('Hi, please tell me when New Year party tickets at Panchvati Cottages open.')}`} target="_blank" rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-green-600 px-5 py-2.5 font-semibold text-white hover:bg-green-700">Tell me when tickets open</a>
      </div>
    );
  }

  const t = types.find((x) => x.id === type)!;
  const total = t ? ticketPrice(t.price, discountPct) * qty : 0;
  const saved = t ? (t.price - ticketPrice(t.price, discountPct)) * qty : 0;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const input = 'w-full rounded-xl border border-white/20 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-[#f2c46d]';

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const res = await fetch('/api/party-tickets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ party, ticketType: type, qty, ...f }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.url) throw new Error(j.error || 'Could not start payment');
      window.location.href = j.url;
    } catch (err: any) { setError(err.message); setBusy(false); }
  }

  return (
    <form onSubmit={pay} className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-semibold text-white/80">Choose your ticket</legend>
        {discountPct > 0 && <p className="rounded-lg bg-[#f2c46d] px-3 py-1.5 text-center text-sm font-bold text-[#120a26]">{discountPct}% off every ticket when you book online</p>}
        {types.map((x) => (
          <label key={x.id} className={'flex cursor-pointer items-start justify-between gap-3 rounded-xl border-2 p-3 ' + (type === x.id ? 'border-[#f2c46d] bg-white/10' : 'border-white/15')}>
            <span className="flex gap-3">
              <input type="radio" name="ticket" value={x.id} checked={type === x.id} onChange={() => setType(x.id)} className="mt-1 accent-[#f2c46d]" />
              <span><span className="block font-semibold text-white">{x.name}</span>
                <span className="block text-sm text-white/70">Admits {x.admits}{x.includes ? ' · ' + x.includes : ''}</span></span>
            </span>
            <span className="whitespace-nowrap text-right">
              {discountPct > 0 && <s className="block text-sm text-white/50">{inr(x.price)}</s>}
              <span className="font-bold text-[#f2c46d]">{inr(ticketPrice(x.price, discountPct))}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
        <span className="font-semibold text-white">Tickets</span>
        <span className="flex items-center gap-3">
          <button type="button" aria-label="Fewer tickets" onClick={() => setQty((n) => Math.max(1, n - 1))} className="rounded-full bg-white/15 p-1.5 text-white"><Minus className="h-4 w-4" /></button>
          <span className="w-6 text-center text-lg font-bold text-white">{qty}</span>
          <button type="button" aria-label="More tickets" onClick={() => setQty((n) => Math.min(10, n + 1))} className="rounded-full bg-white/15 p-1.5 text-white"><Plus className="h-4 w-4" /></button>
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <input className={input} required placeholder="Full name" autoComplete="name" value={f.name} onChange={set('name')} />
        <input className={input} required type="email" placeholder="Email" autoComplete="email" value={f.email} onChange={set('email')} />
        <input className={input} required type="tel" inputMode="tel" placeholder="Mobile (WhatsApp)" autoComplete="tel" value={f.phone} onChange={set('phone')} />
      </div>
      {saved > 0 && <p className="text-center text-sm font-semibold text-green-300">You save {inr(saved)} with the {discountPct}% online discount</p>}
      {error && <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-200">{error}</p>}
      <button disabled={busy} className="w-full rounded-xl bg-[#f2c46d] px-6 py-4 text-lg font-bold text-[#120a26] hover:bg-[#f6d48e] disabled:opacity-60">
        {busy ? 'Opening secure payment…' : `Pay ${inr(total)} and get your ticket`}
      </button>
      <p className="text-center text-xs text-white/60">Secure payment by Razorpay. Your ticket card comes to your email and WhatsApp right after payment.</p>
    </form>
  );
}
