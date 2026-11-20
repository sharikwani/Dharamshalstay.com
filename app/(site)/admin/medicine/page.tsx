'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Phone } from 'lucide-react';
import { authFetch, supabase } from '@/lib/supabase';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { MEDICINE_STATUSES, MEDICINE_STATUS_LABELS, PRESCRIPTION_RETENTION_DAYS, type MedicineStatus } from '@/lib/medicine/options';

const NEXT: Record<MedicineStatus, MedicineStatus[]> = {
  new: ['checking', 'doctor_confirmed', 'rejected'],
  checking: ['doctor_confirmed', 'rejected'],
  doctor_confirmed: ['delivered', 'rejected'],
  delivered: [],
  rejected: ['checking'],
};

/** Emergency medicine requests from /medicine-delivery-dharamshala: check, call the doctor, then hand to the chemist. */
export default function AdminMedicine() {
  const router = useRouter();
  const [status, setStatus] = useState<MedicineStatus>('new');
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState<Record<string, number>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await authFetch('/api/admin/medicine?status=' + status);
    const j = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setError(j.error || 'Could not load requests'); return; }
    setError(''); setRows(j.requests || []); setOpen(j.open || {});
  }, [status]);

  useEffect(() => { supabase.auth.getUser().then(({ data: { user } }) => { if (!user) router.push('/admin/login'); else load(); }); }, [router, load]);

  async function update(id: string, body: Record<string, unknown>) {
    const res = await authFetch('/api/admin/medicine', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...body }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setError(j.error || 'Could not update'); return; }
    await load();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <AdminPageHeader title="Medicine requests" description={`Emergency medicine requests. Check it is genuine, call the doctor to confirm the prescription, then send it to the partner chemist. Prescriptions are deleted after ${PRESCRIPTION_RETENTION_DAYS} days.`} />
      <div className="mb-5 flex flex-wrap gap-2">
        {MEDICINE_STATUSES.map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${status === s ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
            {MEDICINE_STATUS_LABELS[s]}{open[s] ? ` (${open[s]})` : ''}
          </button>
        ))}
      </div>
      {error && <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</p>}
      {loading ? <p>Loading...</p> : rows.length === 0 ? <p className="text-slate-500">No {MEDICINE_STATUS_LABELS[status].toLowerCase()} requests.</p> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((r) => <RequestCard key={r.id} r={r} update={update} />)}
        </div>
      )}
    </div>
  );
}

function RequestCard({ r, update }: { r: any; update: (id: string, body: Record<string, unknown>) => Promise<void> }) {
  const [note, setNote] = useState(r.admin_notes || '');
  const [busy, setBusy] = useState(false);
  const act = async (body: Record<string, unknown>) => { setBusy(true); await update(r.id, body); setBusy(false); };
  const when = new Date(r.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-slate-900">{r.patient_name}</p>
        <span className="text-xs text-slate-500">{when}</span>
      </div>
      <p className="mt-1 text-slate-700"><b>Area:</b> {r.area}{r.area === 'Other' && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800">Outside delivery area</span>}</p>
      <p className="text-slate-700"><b>Address:</b> {r.address}</p>
      <p className="mt-2 whitespace-pre-line text-slate-700"><b>Medicines:</b> {r.medicines}</p>
      <p className="mt-1 whitespace-pre-line text-slate-700"><b>Why urgent:</b> {r.urgency}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a href={`tel:+${r.phone}`} className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700"><Phone className="h-4 w-4" />Patient +{r.phone}</a>
        <a href={`tel:+${r.doctor_phone}`} className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700"><Phone className="h-4 w-4" />{r.doctor_name} +{r.doctor_phone}</a>
        {r.prescription_url
          ? <a href={r.prescription_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 font-semibold text-white"><FileText className="h-4 w-4" />View prescription</a>
          : <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-slate-500">Prescription deleted</span>}
      </div>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Notes: doctor confirmed at 4 pm, chemist informed..." className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none" />
      <div className="mt-2 flex flex-wrap gap-2">
        <button disabled={busy || note === (r.admin_notes || '')} onClick={() => act({ note })} className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 disabled:opacity-40">Save note</button>
        {NEXT[r.status as MedicineStatus]?.map((s) => (
          <button key={s} disabled={busy} onClick={() => act({ status: s, note })}
            className={`rounded-lg px-3 py-1.5 font-semibold text-white disabled:opacity-50 ${s === 'rejected' ? 'bg-red-600' : s === 'delivered' ? 'bg-green-600' : 'bg-brand-600'}`}>
            {MEDICINE_STATUS_LABELS[s]}
          </button>
        ))}
      </div>
    </div>
  );
}
