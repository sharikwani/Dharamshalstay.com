'use client';
import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { GUIDE_AREAS, GUIDE_LANGUAGES, GUIDE_SPECIALITIES } from '@/lib/guides/options';

/** Local guide sign-up; the owner checks the guide and approves the profile before it appears on /local-guides. */
export default function GuideSignupForm() {
  const [f, setF] = useState({ name: '', phone: '', whatsapp: '', email: '', experience_years: '', price_per_day: '', other_languages: '', bio: '', hp_registration_no: '', website: '' });
  const [languages, setLanguages] = useState<string[]>(['Hindi', 'English']);
  const [specs, setSpecs] = useState<string[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>, v: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setter((a) => (e.target.checked ? [...a, v] : a.filter((y) => y !== v)));
  const input = 'mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:ring-2 focus:ring-brand-500';
  const label = 'block text-sm font-semibold text-slate-800';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const res = await fetch('/api/guides', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, languages, specializations: specs, areas, consent }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Could not send your sign-up');
      setDone(true);
    } catch (err: any) { setError(err.message); }
    setBusy(false);
  }

  if (done) return (
    <div className="rounded-2xl bg-green-50 p-6 text-center">
      <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
      <p className="mt-2 text-lg font-semibold text-slate-900">Thank you! Your guide profile has been sent for review.</p>
      <p className="mt-1 text-slate-600">Our team will call you on WhatsApp, check your ID and any registration certificate, and ask for a profile photo. Your profile goes live once approved.</p>
    </div>
  );

  const checks = (items: readonly string[], value: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => (
    <div className="mt-2 grid gap-2 sm:grid-cols-2">
      {items.map((x) => (
        <label key={x} className="flex items-center gap-2 text-sm font-normal text-slate-700">
          <input type="checkbox" checked={value.includes(x)} onChange={toggle(setter, x)} />{x}
        </label>
      ))}
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-5">
      <input type="text" name="website" value={f.website} onChange={set('website')} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden />
      <label className={label}>Full name<input required className={input} value={f.name} onChange={set('name')} autoComplete="name" /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>Mobile number<input required className={input} type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} placeholder="98765 43210" /></label>
        <label className={label}>WhatsApp (if different)<input className={input} type="tel" inputMode="tel" value={f.whatsapp} onChange={set('whatsapp')} /></label>
      </div>
      <label className={label}>Email (optional)<input className={input} type="email" value={f.email} onChange={set('email')} autoComplete="email" /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>Years of guiding experience<input required className={input} type="number" min={0} max={60} value={f.experience_years} onChange={set('experience_years')} /></label>
        <label className={label}>Your day rate (₹, for a full day)<input required className={input} type="number" min={300} value={f.price_per_day} onChange={set('price_per_day')} placeholder="e.g. 2000" /></label>
      </div>
      <fieldset><legend className={label}>What do you guide?</legend>{checks(GUIDE_SPECIALITIES, specs, setSpecs)}</fieldset>
      <fieldset><legend className={label}>Where do you guide?</legend>{checks(GUIDE_AREAS, areas, setAreas)}</fieldset>
      <fieldset><legend className={label}>Languages you guide in</legend>{checks(GUIDE_LANGUAGES, languages, setLanguages)}</fieldset>
      <label className={label}>Other languages (optional)<input className={input} value={f.other_languages} onChange={set('other_languages')} placeholder="e.g. Japanese, Korean" /></label>
      <label className={label}>About you<span className="block text-xs font-normal text-slate-500">Where you are from, how long you have guided here, the walks or treks you know best. Travellers read this before booking.</span>
        <textarea required className={input} rows={5} minLength={80} maxLength={1500} value={f.bio} onChange={set('bio')} /></label>
      <label className={label}>HP Tourism guide registration number (if you have one)
        <span className="block text-xs font-normal text-slate-500">We will ask to see the certificate before showing a &quot;Registered with HP Tourism&quot; badge.</span>
        <input className={input} value={f.hp_registration_no} onChange={set('hp_registration_no')} /></label>
      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
        <span>The details are correct. Dharamshala Stay may show my profile (not my phone number or email) on its website. Bookings come through Dharamshala Stay, which keeps a 15% commission on each guide booking. I hold any licence or permission the law requires for the tours and treks I lead.</span>
      </label>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button disabled={busy} className="w-full rounded-xl bg-brand-700 px-6 py-4 text-lg font-semibold text-white disabled:opacity-60">{busy ? 'Sending…' : 'Send my guide profile for review'}</button>
    </form>
  );
}
