'use client';
import { useEffect, useState } from 'react';
import { CheckCircle2, FileText, Lock, MapPin, Pill, Stethoscope, Upload, User } from 'lucide-react';
import { MEDICINE_AREAS, PRESCRIPTION_MAX_BYTES } from '@/lib/medicine/options';

const input = 'mt-1.5 w-full rounded-xl border border-emerald-900/15 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/15';
const label = 'block text-sm font-semibold text-slate-800';

function Section({ icon: Icon, title, hint, children }: { icon: typeof User; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-t border-dashed border-emerald-900/15 pt-6 first:border-0 first:pt-0">
      <legend className="flex items-center gap-2 text-base font-bold text-emerald-950">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Icon className="h-4 w-4" aria-hidden /></span>
        {title}
      </legend>
      {hint && <p className="mt-1 pl-10 text-sm text-slate-600">{hint}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </fieldset>
  );
}

/** Emergency medicine request, styled as a prescription pad; the owner confirms the prescription with the doctor before delivery. */
export default function MedicineRequestForm() {
  const [f, setF] = useState({ patient_name: '', phone: '', area: '', address: '', medicines: '', urgency: '', doctor_name: '', doctor_phone: '', website: '' });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) { setPreview(''); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!f.area) { setError('Please choose your area.'); return; }
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

  return (
    <div id="request" className="scroll-mt-24 overflow-hidden rounded-[28px] border border-emerald-900/10 bg-[#f6fbf8] shadow-[0_24px_60px_-28px_rgba(6,78,59,0.45)]">
      <div className="flex items-center gap-4 bg-emerald-800 px-6 py-5 text-white sm:px-8">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 font-serif text-2xl font-bold italic text-emerald-100" aria-hidden>R<span className="text-base">x</span></span>
        <div>
          <h2 className="font-heading text-xl font-bold sm:text-2xl">Emergency medicine request</h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-emerald-100"><Lock className="h-3.5 w-3.5" aria-hidden />Private. Only our team sees your prescription, and it is deleted after 30 days.</p>
        </div>
      </div>

      {done ? (
        <div className="px-6 py-12 text-center sm:px-10">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" aria-hidden />
          <p className="mt-3 font-heading text-2xl font-bold text-emerald-950">Request received</p>
          <p className="mx-auto mt-2 max-w-md text-slate-700">We will call you shortly. First we confirm the prescription with your doctor, then the chemist sends the medicines. Keep your phone close.</p>
          <p className="mx-auto mt-4 max-w-md rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">If the patient gets worse, call <a href="tel:108" className="font-bold underline">108</a> now.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-6 px-6 py-7 sm:px-8 sm:py-8">
          <input type="text" name="website" value={f.website} onChange={set('website')} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden />

          <Section icon={User} title="Patient">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={label}>Patient name<input required className={input} value={f.patient_name} onChange={set('patient_name')} autoComplete="name" /></label>
              <label className={label}>Your mobile number<input required className={input} type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} placeholder="98765 43210" autoComplete="tel" /></label>
            </div>
          </Section>

          <Section icon={MapPin} title="Where to deliver">
            <div role="radiogroup" aria-label="Area" className="flex flex-wrap gap-2">
              {MEDICINE_AREAS.map((a) => {
                const on = f.area === a;
                return (
                  <button key={a} type="button" role="radio" aria-checked={on} onClick={() => setF((x) => ({ ...x, area: a }))}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-600/25 ${on ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-emerald-900/15 bg-white text-slate-700 hover:border-emerald-600'}`}>
                    {a === 'Other' ? 'Somewhere else' : a}
                  </button>
                );
              })}
            </div>
            {f.area === 'Other' && <p className="text-sm text-amber-800">We will check whether the chemist can reach you and tell you on the phone.</p>}
            <label className={label}>Full address or landmark<textarea required className={input} rows={2} minLength={10} maxLength={300} value={f.address} onChange={set('address')} placeholder="House, road, nearest landmark" /></label>
          </Section>

          <Section icon={Pill} title="Medicines" hint="Write them as on the prescription: name, strength and how many.">
            <label className={label}>Medicines you need<textarea required className={input} rows={3} minLength={3} maxLength={1000} value={f.medicines} onChange={set('medicines')} placeholder="e.g. Salbutamol inhaler 100 mcg, 1" /></label>
            <label className={label}>Why is it urgent?<textarea required className={input} rows={2} minLength={10} maxLength={600} value={f.urgency} onChange={set('urgency')} placeholder="e.g. inhaler finished, patient cannot travel" /></label>
          </Section>

          <Section icon={Stethoscope} title="Doctor" hint="We call the doctor or clinic to confirm the prescription before anything is delivered.">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={label}>Doctor name<input required className={input} value={f.doctor_name} onChange={set('doctor_name')} /></label>
              <label className={label}>Doctor or clinic mobile<input required className={input} type="tel" inputMode="tel" value={f.doctor_phone} onChange={set('doctor_phone')} /></label>
            </div>
          </Section>

          <Section icon={FileText} title="Prescription">
            <label className={`flex cursor-pointer items-center gap-4 rounded-2xl border-2 border-dashed p-4 transition focus-within:ring-4 focus-within:ring-emerald-600/20 ${file ? 'border-emerald-600 bg-emerald-50' : 'border-emerald-900/20 bg-white hover:border-emerald-600'}`}>
              {preview
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={preview} alt="Your prescription" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                : <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">{file ? <FileText className="h-8 w-8" aria-hidden /> : <Upload className="h-8 w-8" aria-hidden />}</span>}
              <span className="min-w-0 text-sm text-slate-700">
                <span className="block truncate font-semibold text-emerald-800">{file ? file.name : 'Add a photo or PDF'}</span>
                {file ? 'Tap to change it.' : 'Up to 4 MB. The doctor name, date and signature must be readable.'}
              </span>
              <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
          </Section>

          <label className="flex items-start gap-3 rounded-2xl bg-white p-4 text-sm text-slate-700 ring-1 ring-emerald-900/10">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-700" />
            <span>The details are true. Dharamshala Stay may call my doctor to confirm this prescription and share it with its licensed partner chemist for this order.</span>
          </label>

          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</p>}
          <button disabled={busy} className="w-full rounded-2xl bg-emerald-700 px-6 py-4 text-lg font-bold text-white shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-600/30 disabled:opacity-60">
            {busy ? 'Sending…' : 'Send emergency request'}
          </button>
          <p className="text-center text-xs text-slate-500">You pay only when the medicines arrive, by UPI or cash.</p>
        </form>
      )}
    </div>
  );
}
