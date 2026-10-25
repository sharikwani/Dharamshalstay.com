'use client';
import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

const FEATURES = ['All types of luggage accepted', 'Pick-up and drop available', 'Hourly storage', 'Overnight and multi-day storage', 'CCTV / locked room', 'Open early and late'];

/** Sign-up for the luggage storage directory; the owner approves it before it appears. */
export default function ServiceSignupForm() {
  const [f, setF] = useState({ name: '', owner_name: '', phone: '', whatsapp: '', email: '', area: '', address: '', maps_url: '', price_text: '', hours: '', description: '', website: '' });
  const [features, setFeatures] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const input = 'w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500';
  const label = 'block text-sm font-semibold text-slate-800';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const res = await fetch('/api/services', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, features, consent }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Could not send your sign-up');
      setDone(true);
    } catch (err: any) { setError(err.message); }
    setBusy(false);
  }

  if (done) return (
    <div className="rounded-2xl bg-green-50 p-6 text-center">
      <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
      <p className="mt-2 text-lg font-semibold text-slate-900">Thank you! Your listing has been sent for review.</p>
      <p className="mt-1 text-slate-600">Our team will check the details and may call you. It goes live once approved.</p>
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-4">
      <input type="text" name="website" value={f.website} onChange={set('website')} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden />
      <label className={label}>Business name<input required className={input} value={f.name} onChange={set('name')} placeholder="e.g. Makkar Luggage Storage" /></label>
      <label className={label}>Your name<input required className={input} value={f.owner_name} onChange={set('owner_name')} autoComplete="name" /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>Mobile number<input required className={input} type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} placeholder="98765 43210" /></label>
        <label className={label}>WhatsApp (if different)<input className={input} type="tel" inputMode="tel" value={f.whatsapp} onChange={set('whatsapp')} /></label>
      </div>
      <label className={label}>Email (optional)<input className={input} type="email" value={f.email} onChange={set('email')} autoComplete="email" /></label>
      <label className={label}>Area<input required className={input} value={f.area} onChange={set('area')} placeholder="e.g. Kandi, Dharamshala or Main Square, McLeod Ganj" /></label>
      <label className={label}>Address or landmark (optional)<input className={input} value={f.address} onChange={set('address')} /></label>
      <label className={label}>Google Maps link (optional)<input className={input} type="url" value={f.maps_url} onChange={set('maps_url')} placeholder="https://maps.app.goo.gl/..." /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>Price<input required className={input} value={f.price_text} onChange={set('price_text')} placeholder="e.g. Rs 80-100 per bag per day" /></label>
        <label className={label}>Opening hours (optional)<input className={input} value={f.hours} onChange={set('hours')} placeholder="e.g. 7 am to 10 pm daily" /></label>
      </div>
      <fieldset>
        <legend className={label}>Services</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {FEATURES.map((x) => (
            <label key={x} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={features.includes(x)} onChange={(e) => setFeatures((a) => e.target.checked ? [...a, x] : a.filter((y) => y !== x))} />{x}
            </label>
          ))}
        </div>
      </fieldset>
      <label className={label}>About your service (optional)<textarea className={input} rows={3} value={f.description} onChange={set('description')} maxLength={1000} /></label>
      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
        The details are correct, and Dharamshala Stay may show them, including my phone number, on its website.
      </label>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button disabled={busy} className="w-full rounded-xl bg-brand-700 px-6 py-4 text-lg font-semibold text-white disabled:opacity-60">{busy ? 'Sending…' : 'Send my listing for review'}</button>
    </form>
  );
}
