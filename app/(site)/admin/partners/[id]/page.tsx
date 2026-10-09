'use client';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { supabase, authFetch } from '@/lib/supabase';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { DOC_LABELS } from '@/lib/partners/types';

export default function AdminPartnerDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [s, setS] = useState<any>(null);
  const [msg, setMsg] = useState('');
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/admin/login'); return; }
    const res = await authFetch('/api/admin/partners/' + id);
    const data = await res.json();
    if (!res.ok) { setMsg(data.error); return; }
    setS(data);
  }, [id, router]);
  useEffect(() => { load(); }, [load]);

  async function act(body: Record<string, unknown>) {
    setMsg('');
    const res = await authFetch('/api/admin/partners/' + id, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) { setMsg(data.error); return; }
    setS(data);
  }

  if (!s) return <p className="text-sm text-slate-500">{msg || 'Loading…'}</p>;
  const p = s.profile;
  const owner = (d: any) => d.vehicle_id ? s.vehicles.find((v: any) => v.id === d.vehicle_id)?.registration_no : d.staff_id ? s.staff.find((m: any) => m.id === d.staff_id)?.full_name : '';

  return (
    <div className="max-w-4xl">
      <AdminPageHeader title={p.legal_name || p.full_name || p.email} description={`${p.partner_type} partner · status: ${p.partner_status} · commission ${p.commission_pct}%`} />
      {msg && <p className="bg-red-50 text-red-700 text-sm rounded-lg p-3 mb-4">{msg}</p>}

      <section className="bg-white border border-slate-200 rounded-xl p-5 mb-5 grid sm:grid-cols-2 gap-2 text-sm">
        <p><b>Email:</b> {p.email}</p><p><b>Phone:</b> {p.phone}</p>
        <p><b>Business:</b> {p.business_name || '—'}</p><p><b>PAN:</b> {p.pan_number || '—'}</p>
        <p><b>Registration no.:</b> {p.business_registration_no || '—'}</p>
        <p><b>Payout:</b> {p.payout_method === 'upi' ? `UPI ${p.payout_details?.upi_id}` : p.payout_method === 'bank' ? `A/c ${p.payout_details?.account_number} · ${p.payout_details?.ifsc}` : '—'} ({p.payout_details?.account_holder || '—'})</p>
        {s.missing.length > 0 && <p className="sm:col-span-2 text-amber-700"><b>Missing:</b> {s.missing.map((m: any) => m.label).join(', ')}</p>}
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
        <h2 className="font-semibold mb-3">Documents</h2>
        {s.documents.length === 0 && <p className="text-sm text-slate-500">None uploaded.</p>}
        <div className="space-y-2">
          {s.documents.map((d: any) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 border border-slate-100 rounded-lg p-3">
              <div className="text-sm">
                <p className="font-medium">{DOC_LABELS[d.doc_type as keyof typeof DOC_LABELS]}{owner(d) ? ` — ${owner(d)}` : ''}</p>
                <p className="text-xs text-slate-500">{d.status}{d.expires_on ? ` · valid until ${d.expires_on}` : ''}{d.rejection_reason ? ` · ${d.rejection_reason}` : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                {d.url && <a href={d.url} target="_blank" rel="noreferrer" className="text-brand-600 text-sm inline-flex items-center gap-1">Open <ExternalLink className="h-3.5 w-3.5" /></a>}
                <button onClick={() => act({ action: 'approve_doc', document_id: d.id })} className="text-green-700 text-sm inline-flex items-center gap-1"><CheckCircle className="h-4 w-4" />Approve</button>
                <button onClick={() => { const reason = window.prompt('Why is this document rejected? The partner will see this.'); if (reason) act({ action: 'reject_doc', document_id: d.id, reason }); }} className="text-red-600 text-sm inline-flex items-center gap-1"><XCircle className="h-4 w-4" />Reject</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {(s.vehicles.length > 0 || s.staff.length > 0) && (
        <section className="bg-white border border-slate-200 rounded-xl p-5 mb-5 text-sm">
          <h2 className="font-semibold mb-2">Fleet and team</h2>
          {s.vehicles.map((v: any) => <p key={v.id}>{v.registration_no} · {v.make_model} · {v.vehicle_type} · {v.seats} seats</p>)}
          {s.staff.map((m: any) => <p key={m.id}>{m.role}: {m.full_name} · {m.phone}{m.licence_no ? ` · licence ${m.licence_no}` : ''}</p>)}
        </section>
      )}

      <section className="bg-white border border-slate-200 rounded-xl p-5 mb-5 text-sm">
        <h2 className="font-semibold mb-2">Agreement</h2>
        {s.agreements.length === 0 ? <p className="text-slate-500">Not signed yet.</p> : s.agreements.map((a: any) => (
          <p key={a.id}>Version {a.version}, signed by <b>{a.signed_name}</b> on {new Date(a.signed_at).toLocaleString('en-IN')} from IP {a.ip}{a.url && <> · <a href={a.url} target="_blank" rel="noreferrer" className="text-brand-600 underline">PDF</a></>}<br /><span className="text-xs text-slate-400 break-all">SHA-256 {a.body_sha256}</span></p>
        ))}
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <h2 className="font-semibold">Decision</h2>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note to the partner (required to send back, reject or suspend)" className="w-full border border-slate-300 rounded-lg p-2 text-sm" rows={3} />
        <div className="flex flex-wrap gap-2">
          <button onClick={() => act({ action: 'verify' })} className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">Approve partner</button>
          <button onClick={() => act({ action: 'request_changes', note })} className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-semibold">Send back for changes</button>
          <button onClick={() => act({ action: 'reject', note })} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">Reject</button>
          {p.partner_status === 'verified' && <button onClick={() => act({ action: 'suspend', note })} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-semibold">Suspend</button>}
          {p.partner_status === 'suspended' && <button onClick={() => act({ action: 'reinstate' })} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-semibold">Reinstate</button>}
        </div>
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <label className="text-sm">Commission %</label>
          <input type="number" min={0} max={100} step={0.5} defaultValue={p.commission_pct} id="commission" className="w-24 border border-slate-300 rounded px-2 py-1 text-sm" />
          <button onClick={() => act({ action: 'set_commission', commission_pct: Number((document.getElementById('commission') as HTMLInputElement).value) })} className="text-sm text-brand-600 font-semibold">Save</button>
        </div>
      </section>
    </div>
  );
}
