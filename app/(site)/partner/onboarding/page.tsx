'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Circle, Upload, Trash2, Loader2, FileText, AlertCircle } from 'lucide-react';
import { supabase, authFetch } from '@/lib/supabase';
import { DOC_LABELS, type DocType } from '@/lib/partners/types';
import { MAX_UPLOAD_BYTES } from '@/lib/partners/validate';

type State = any;
const STATUS_TEXT: Record<string, string> = {
  onboarding: 'Finish the steps below. When everything is ticked, sign the agreement to send your account for approval.',
  changes_requested: 'We need a few fixes before we can approve you. See the note below, fix the items and sign again.',
  pending_verification: 'Thank you. Our team is checking your documents. We will email you when your account is approved, usually within 2 working days.',
  verified: 'Your account is approved.',
  suspended: 'Your account is suspended. Contact us to resolve this.',
  rejected: 'Your application was not approved.',
};
const PARTNER_DOCS: Record<string, DocType[]> = {
  taxi: ['aadhaar_front', 'aadhaar_back', 'pan'],
  paragliding: ['aadhaar_front', 'aadhaar_back', 'pan', 'tourism_registration'],
  trek: ['aadhaar_front', 'aadhaar_back', 'pan', 'tourism_registration'],
};
const VEHICLE_DOCS: DocType[] = ['vehicle_rc', 'vehicle_permit', 'vehicle_insurance'];
const field = 'w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500';

const FILE_TOO_BIG = 'File is too big. The limit is 4 MB.';

function DocRow({ t, staffId, vehicleId, label, d, editable, busy, onUpload, onDelete }: {
  t: DocType; staffId?: string; vehicleId?: string; label?: string; d: any; editable: boolean; busy: string;
  onUpload: (label: string, fd: FormData) => Promise<string | null>; onDelete: (id: string) => void;
}) {
  const [error, setError] = useState('');
  const needsExpiry = ['driving_licence', 'pilot_licence', 'vehicle_permit', 'vehicle_insurance'].includes(t);
  async function upload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget; // React clears currentTarget after an await
    const fd = new FormData(form);
    const file = fd.get('file');
    if (file instanceof File && file.size > MAX_UPLOAD_BYTES) { setError(FILE_TOO_BIG); return; }
    setError('');
    fd.set('doc_type', t);
    if (staffId) fd.set('staff_id', staffId);
    if (vehicleId) fd.set('vehicle_id', vehicleId);
    const err = await onUpload('doc:' + t + staffId + vehicleId, fd);
    if (err) setError(err); else form.reset();
  }
  const done = d && d.status !== 'rejected';
  return (
    <div className="border border-slate-200 rounded-lg p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          {done ? <CheckCircle className="h-5 w-5 text-green-600 shrink-0" /> : <Circle className="h-5 w-5 text-slate-300 shrink-0" />}
          <div>
            <p className="text-sm font-medium text-slate-800">{label || DOC_LABELS[t]}</p>
            {d && <p className="text-xs text-slate-500">{d.status === 'approved' ? 'Approved' : d.status === 'rejected' ? 'Rejected: ' + (d.rejection_reason || 'please upload again') : 'Uploaded, waiting for review'}{d.url && <> · <a href={d.url} target="_blank" rel="noreferrer" className="text-brand-600 underline">view</a></>}</p>}
            {t === 'aadhaar_front' && <p className="text-xs text-amber-700 mt-1">Upload a <b>masked Aadhaar</b> (first 8 digits hidden). You can download it from the UIDAI website.</p>}
          </div>
        </div>
        {d && editable && d.status !== 'approved' && (
          <button type="button" onClick={() => onDelete(d.id)} className="text-slate-400 hover:text-red-600" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
        )}
      </div>
      {editable && (!d || d.status !== 'approved') && (
        <form onSubmit={upload} className="mt-2 flex flex-col sm:flex-row gap-2 sm:items-center">
          <input type="file" name="file" required accept="image/jpeg,image/png,application/pdf" className="text-sm" onChange={() => setError('')} />
          {needsExpiry && <label className="text-xs text-slate-600 flex items-center gap-1">Valid until <input type="date" name="expires_on" className="border border-slate-300 rounded px-2 py-1 text-sm" /></label>}
          <button disabled={!!busy} className="inline-flex items-center gap-1.5 bg-brand-600 text-white text-sm px-3 py-1.5 rounded-lg disabled:opacity-50"><Upload className="h-4 w-4" />{d ? 'Replace' : 'Upload'}</button>
        </form>
      )}
      {error && <p className="mt-2 text-xs text-red-600 flex gap-1"><AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />{error}</p>}
    </div>
  );
}

export default function PartnerOnboarding() {
  const router = useRouter();
  const [s, setS] = useState<State | null>(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/partner/login'); return; }
    const res = await authFetch('/api/partner/onboarding');
    if (res.status === 403) { router.push('/partner/dashboard'); return; }
    const data = await res.json();
    if (!res.ok) { setMsg({ ok: false, text: data.error }); return; }
    if (data.profile.partner_status === 'verified') { router.push('/partner/dashboard'); return; }
    setS(data);
  }, [router]);
  useEffect(() => { load(); }, [load]);

  async function call(label: string, url: string, init: RequestInit) {
    setBusy(label); setMsg(null);
    try {
      const res = await authFetch(url, init);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg({ ok: false, text: data.error || 'Something went wrong' }); return false; }
      await load(); return true;
    } finally { setBusy(''); }
  }
  // Returns an error message, or null on success.
  async function uploadDoc(label: string, fd: FormData): Promise<string | null> {
    setBusy(label); setMsg(null);
    try {
      const res = await authFetch('/api/partner/documents', { method: 'POST', body: fd });
      let data: any = null;
      try { data = await res.json(); } catch { /* not JSON, e.g. platform 413 */ }
      if (!res.ok) {
        if (data && data.error) return data.error;
        return res.status === 413 ? FILE_TOO_BIG : 'Upload failed, please try again.';
      }
      await load(); return null;
    } catch { return 'Upload failed, please try again.'; }
    finally { setBusy(''); }
  }
  const json = (method: string, body: unknown): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  if (!s) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-600" />{msg && <p className="ml-3 text-red-600 text-sm">{msg.text}</p>}</div>;

  const p = s.profile;
  const editable = ['onboarding', 'changes_requested'].includes(p.partner_status);
  const docFor = (t: DocType, staffId?: string, vehicleId?: string) =>
    s.documents.find((d: any) => d.doc_type === t && (d.staff_id || undefined) === staffId && (d.vehicle_id || undefined) === vehicleId);
  const rowProps = { editable, busy, onUpload: uploadDoc, onDelete: (id: string) => { call('del' + id, '/api/partner/documents/' + id, { method: 'DELETE' }); } };

  async function saveDetails(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget).entries());
    await call('details', '/api/partner/profile', json('PATCH', fd));
  }
  async function addStaff(e: FormEvent<HTMLFormElement>, role: string) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = Object.fromEntries(new FormData(form).entries());
    if (await call('staff', '/api/partner/staff', json('POST', { ...fd, role }))) form.reset();
  }
  async function addVehicle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = Object.fromEntries(new FormData(form).entries());
    if (await call('vehicle', '/api/partner/vehicles', json('POST', { ...fd, seats: Number(fd.seats) }))) form.reset();
  }
  async function sign(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await call('sign', '/api/partner/agreement', json('POST', { signed_name: fd.get('signed_name'), accepted: fd.get('accepted') === 'on' }));
  }

  const staffRole = p.partner_type === 'taxi' ? 'driver' : p.partner_type === 'paragliding' ? 'pilot' : null;
  const licence: DocType | null = staffRole === 'driver' ? 'driving_licence' : staffRole === 'pilot' ? 'pilot_licence' : null;
  const pd = p.payout_details || {};

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-heading font-bold text-slate-900">Set up your partner account</h1>
        <p className="text-slate-600 mt-1">{STATUS_TEXT[p.partner_status]}</p>
        {p.verification_note && <p className="mt-3 bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded-lg p-3">Note from our team: {p.verification_note}</p>}
        {msg && <p className={'mt-3 text-sm rounded-lg p-3 flex gap-2 ' + (msg.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700')}><AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />{msg.text}</p>}
        {editable && s.missing.length > 0 && (
          <div className="mt-4 bg-slate-50 rounded-lg p-4">
            <p className="text-sm font-semibold text-slate-800 mb-1">Still to do</p>
            <ul className="text-sm text-slate-600 list-disc pl-5">{s.missing.map((m: any) => <li key={m.key}>{m.label}</li>)}</ul>
          </div>
        )}
      </div>

      <section>
        <h2 className="text-lg font-heading font-semibold mb-3">1. Your details and payout account</h2>
        <form onSubmit={saveDetails} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-sm">Full legal name (as on PAN) *<input name="legal_name" defaultValue={p.legal_name || ''} required disabled={!editable} className={field} /></label>
          <label className="text-sm">Business name<input name="business_name" defaultValue={p.business_name || ''} disabled={!editable} className={field} /></label>
          <label className="text-sm">Phone *<input name="phone" defaultValue={p.phone || ''} required disabled={!editable} className={field} /></label>
          <label className="text-sm">PAN number *<input name="pan_number" defaultValue={p.pan_number || ''} required disabled={!editable} className={field} placeholder="ABCDE1234F" /></label>
          <label className="text-sm sm:col-span-2">Tourism / business registration number<input name="business_registration_no" defaultValue={p.business_registration_no || ''} disabled={!editable} className={field} /></label>
          <label className="text-sm">Get paid by *
            <select name="payout_method" defaultValue={p.payout_method || 'upi'} disabled={!editable} className={field}><option value="upi">UPI</option><option value="bank">Bank transfer</option></select>
          </label>
          <label className="text-sm">Account holder name *<input name="account_holder" defaultValue={pd.account_holder || ''} required disabled={!editable} className={field} /></label>
          <label className="text-sm">UPI ID (if UPI)<input name="upi_id" defaultValue={pd.upi_id || ''} disabled={!editable} className={field} placeholder="name@bank" /></label>
          <label className="text-sm">Bank account number (if bank)<input name="account_number" defaultValue={pd.account_number || ''} disabled={!editable} className={field} /></label>
          <label className="text-sm">IFSC (if bank)<input name="ifsc" defaultValue={pd.ifsc || ''} disabled={!editable} className={field} placeholder="SBIN0001234" /></label>
          {editable && <div className="sm:col-span-2"><button disabled={!!busy} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">{busy === 'details' ? 'Saving…' : 'Save details'}</button></div>}
        </form>
      </section>

      <section>
        <h2 className="text-lg font-heading font-semibold mb-1">2. Identity and business documents</h2>
        <p className="text-sm text-slate-500 mb-3">JPG, PNG or PDF, up to 4 MB each. Only our verification team can see these files.</p>
        <p className="text-xs text-slate-500 mb-3">We use these documents only to verify you as a partner and meet legal requirements. They are kept while you are a partner and for 3 years after, then deleted. To correct or delete your data, email hello@dharamshalastay.com.</p>
        <div className="space-y-2">{PARTNER_DOCS[p.partner_type].map((t) => <DocRow key={t} t={t} d={docFor(t)} {...rowProps} />)}</div>
      </section>

      {p.partner_type === 'taxi' && (
        <section>
          <h2 className="text-lg font-heading font-semibold mb-3">3. Vehicles</h2>
          {s.vehicles.map((v: any) => (
            <div key={v.id} className="border border-slate-200 rounded-xl p-4 mb-3 space-y-2">
              <div className="flex justify-between"><p className="font-semibold">{v.registration_no} · {v.make_model} · {v.seats} seats</p>
                {editable && <button onClick={() => call('dv' + v.id, '/api/partner/vehicles/' + v.id, { method: 'DELETE' })} className="text-slate-400 hover:text-red-600" aria-label="Remove vehicle"><Trash2 className="h-4 w-4" /></button>}</div>
              {VEHICLE_DOCS.map((t) => <DocRow key={t} t={t} vehicleId={v.id} d={docFor(t, undefined, v.id)} {...rowProps} />)}
            </div>
          ))}
          {editable && (
            <form onSubmit={addVehicle} className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
              <label className="text-sm">Type<select name="vehicle_type" className={field}><option value="sedan">Sedan</option><option value="suv">SUV</option><option value="innova">Innova</option><option value="tempo">Tempo Traveller</option><option value="bus">Bus</option></select></label>
              <label className="text-sm">Model<input name="make_model" required className={field} placeholder="Toyota Innova Crysta" /></label>
              <label className="text-sm">Number<input name="registration_no" required className={field} placeholder="HP39A1234" /></label>
              <label className="text-sm">Seats<input name="seats" type="number" min={1} max={60} required className={field} /></label>
              <button disabled={!!busy} className="col-span-2 sm:col-span-4 bg-slate-900 text-white rounded-lg py-2 text-sm font-semibold">Add vehicle</button>
            </form>
          )}
        </section>
      )}

      {staffRole && licence && (
        <section>
          <h2 className="text-lg font-heading font-semibold mb-3">{p.partner_type === 'taxi' ? '4. Drivers' : '3. Pilots'}</h2>
          {s.staff.filter((m: any) => m.role === staffRole).map((m: any) => (
            <div key={m.id} className="border border-slate-200 rounded-xl p-4 mb-3 space-y-2">
              <div className="flex justify-between"><p className="font-semibold">{m.full_name} · {m.phone}</p>
                {editable && <button onClick={() => call('ds' + m.id, '/api/partner/staff/' + m.id, { method: 'DELETE' })} className="text-slate-400 hover:text-red-600" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>}</div>
              <DocRow t={licence} staffId={m.id} d={docFor(licence, m.id)} {...rowProps} label={`${DOC_LABELS[licence]} for ${m.full_name}`} />
            </div>
          ))}
          {editable && (
            <form onSubmit={(e) => addStaff(e, staffRole)} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
              <label className="text-sm">Full name<input name="full_name" required className={field} /></label>
              <label className="text-sm">Phone<input name="phone" required className={field} /></label>
              <label className="text-sm">Licence number<input name="licence_no" className={field} /></label>
              <button disabled={!!busy} className="sm:col-span-3 bg-slate-900 text-white rounded-lg py-2 text-sm font-semibold">Add {staffRole}</button>
            </form>
          )}
        </section>
      )}

      <section>
        <h2 className="text-lg font-heading font-semibold mb-3">Partner agreement</h2>
        <div className="border border-slate-200 rounded-xl p-4 max-h-80 overflow-y-auto whitespace-pre-line text-sm text-slate-700 bg-white">{s.agreement.body}</div>
        {s.agreements[0] && <p className="text-sm text-slate-600 mt-2 flex items-center gap-1.5"><FileText className="h-4 w-4" />Signed by {s.agreements[0].signed_name} on {new Date(s.agreements[0].signed_at).toLocaleString('en-IN')}{s.agreements[0].url && <> · <a href={s.agreements[0].url} className="text-brand-600 underline" target="_blank" rel="noreferrer">download PDF</a></>}</p>}
        {editable && (
          <form onSubmit={sign} className="mt-3 space-y-3">
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="accepted" required className="mt-1" />I have read and agree to the Dharamshala Stay Partner Agreement, including the 20% commission on every booking, online or cash.</label>
            <label className="text-sm block">Type your full legal name to sign<input name="signed_name" required className={field} placeholder={p.legal_name || ''} /></label>
            <button disabled={!!busy || !s.readyToSign} className="bg-green-700 text-white px-5 py-2.5 rounded-lg font-semibold disabled:opacity-50">{busy === 'sign' ? 'Signing…' : 'Sign and submit for approval'}</button>
            {!s.readyToSign && <p className="text-xs text-slate-500">Complete everything in "Still to do" first.</p>}
          </form>
        )}
      </section>
    </div>
  );
}
