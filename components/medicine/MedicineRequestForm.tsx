'use client';
import { useState } from 'react';
import { CheckCircle2, FileText } from 'lucide-react';
import { MEDICINE_AREAS, PRESCRIPTION_MAX_BYTES } from '@/lib/medicine/options';

/** Emergency medicine request; the owner checks it and confirms the prescription with the doctor before delivery. */
export default function MedicineRequestForm() {
  const [f, setF] = useState({ patient_name: '', phone: '', area: '', address: '', medicines: '', urgency: '', doctor_name: '', doctor_phone: '', website: '' });
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const input = 'mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:ring-2 focus:ring-brand-500';
  const label = 'block text-sm font-semibold text-slate-800';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!file) { setError('Please add a photo or PDF of the doctor prescription.'); return; }
    if (file.size > PRESCRIPTION_MAX_BYTES) { setError('The prescription file must be 4 MB or smaller.'); return; }
    if (!consent) { setError('Please agree that we may call your doctor to confirm the prescription.'); return; }
    setBusy(true);
    try {
      const body = new FormData();
      Object.entries(f).forEach(([k, v]) => body.append(k, v));
      body.append('consent', String(consent));
      body.append('prescription', file);
      const res = await fetch('/api/medicine', { method: 'POST', body });
      if (res.status === 413) throw new Error('The prescription file is too large. Please send a smaller photo (under 4 MB).');
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Could not send your request. Please try again or WhatsApp us.');
      setDone(true);
      (window as any).gtag?.('event', 'generate_lead', { lead_type: 'medicine_delivery' });
    } catch (err: any) { setError(err.message); }
    setBusy(false);
  }

  if (done) return (
    <div className="rounded-2xl bg-green-50 p-6 text-center">
      <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
      <p className="mt-2 text-lg font-semibold text-slate-900">Request received. We will call you shortly.</p>
      <p className="mt-1 text-slate-600">We first call your doctor to confirm the prescription, then the chemist sends the medicines. Keep your phone near you. If the patient gets worse or it is life-threatening, call <a href="tel:108" className="font-semibold underline">108</a> now.</p>
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-5">
      <input type="text" name="website" value={f.website} onChange={set('website')} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>Patient name<input required className={input} value={f.patient_name} onChange={set('patient_name')} autoComplete="name" /></label>
        <label className={label}>Your mobile number<input required className={input} type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} placeholder="98765 43210" autoComplete="tel" /></label>
      </div>
      <label className={label}>Area
        <select required className={input} value={f.area} onChange={set('area')}>
          <option value="">Choose your area</option>
          {MEDICINE_AREAS.map((a) => <option key={a} value={a}>{a === 'Other' ? 'Somewhere else (we will check)' : a}</option>)}
        </select>
      </label>
      <label className={label}>Full address or landmark<textarea required className={input} rows={2} minLength={10} maxLength={300} value={f.address} onChange={set('address')} placeholder="House, road, nearest landmark" /></label>
      <label className={label}>Medicines you need<span className="block text-xs font-normal text-slate-500">Name, strength and how many, as written on the prescription.</span>
        <textarea required className={input} rows={3} minLength={3} maxLength={1000} value={f.medicines} onChange={set('medicines')} /></label>
      <label className={label}>Why is it urgent?<textarea required className={input} rows={2} minLength={10} maxLength={600} value={f.urgency} onChange={set('urgency')} placeholder="e.g. inhaler finished, patient cannot travel" /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>Doctor name<input required className={input} value={f.doctor_name} onChange={set('doctor_name')} /></label>
        <label className={label}>Doctor or clinic mobile<input required className={input} type="tel" inputMode="tel" value={f.doctor_phone} onChange={set('doctor_phone')} /></label>
      </div>
      <div>
        <p className={label}>Doctor prescription</p>
        <label className="mt-2 flex cursor-pointer items-center gap-4 rounded-2xl border-2 border-dashed border-slate-300 p-4 hover:border-brand-500">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><FileText className="h-7 w-7" /></span>
          <span className="text-sm text-slate-700"><span className="font-semibold text-brand-700">{file ? file.name : 'Add the prescription'}</span><br />Clear photo (JPG, PNG) or PDF, up to 4 MB. Doctor name, date and signature must be readable.</span>
          <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </label>
      </div>
      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
        <span>The details are true. Dharamshala Stay may call my doctor to confirm this prescription and share it with its licensed partner chemist. The prescription is kept privately and deleted after 30 days.</span>
      </label>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button disabled={busy} className="w-full rounded-xl bg-brand-700 px-6 py-4 text-lg font-semibold text-white disabled:opacity-60">{busy ? 'Sending…' : 'Send emergency request'}</button>
    </form>
  );
}
