'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  // One action at a time: the ref blocks a second click before React re-renders, the state disables the buttons.
  const [busy, setBusy] = useState(false);
  const acting = useRef(false);

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
    if (acting.current) return;
    acting.current = true; setBusy(true); setMsg('');
    try {
      const res = await authFetch('/api/admin/partners/' + id, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => null);
      if (!data) { setMsg('No clear answer from the server. Reload the page to see whether it was saved.'); return; }
      if (!res.ok) { setMsg(data.error); return; }
      // Saved, but the server could not send the fresh page data: load it separately.
      if (data.reload) { await load(); return; }
      setS(data);
    } catch {
      setMsg('Network problem. Reload the page to see whether it was saved.');
    } finally {
      acting.current = false; setBusy(false);
    }
  }

  if (!s) return <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8"><p className="text-slate-500">{msg || 'Loading...'}</p></div>;
  const p = s.profile;
  const owner = (d: any) => d.vehicle_id ? s.vehicles.find((v: any) => v.id === d.vehicle_id)?.registration_no : d.staff_id ? s.staff.find((m: any) => m.id === d.staff_id)?.full_name : '';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <AdminPageHeader title={p.legal_name || p.full_name || p.email} description={`${(p.partner_services?.length ? p.partner_services : [p.partner_type]).map((t: string) => t.charAt(0).toUpperCase() + t.slice(1)).join(' + ')} partner · ${String(p.partner_status || '').replace(/_/g, ' ')} · commission ${p.commission_pct != null ? p.commission_pct + '%' : 'per service (taxi 20%, trek and paragliding 25%)'}`} />
      {msg && <p className="bg-red-50 text-red-700 text-sm rounded-lg p-3 mb-4">{msg}</p>}

      <section className="bg-white border border-slate-200 rounded-xl p-5 mb-5 grid sm:grid-cols-2 gap-2 text-sm">
        <p><b>Email:</b> {p.email}</p><p><b>Phone:</b> {p.phone}</p>
        <p><b>Business:</b> {p.business_name || '—'}</p><p><b>PAN:</b> {p.pan_number || '—'}</p>
        <p><b>Registration no.:</b> {p.business_registration_no || '—'}</p>
        <p><b>Payout:</b> {p.payout_method === 'upi' ? `UPI ${p.payout_details?.upi_id}` : p.payout_method === 'bank' ? `A/c ${p.payout_details?.account_number} · ${p.payout_details?.ifsc}` : '—'} ({p.payout_details?.account_holder || '—'})</p>
        {s.missing.length > 0 && <p className="sm:col-span-2 text-amber-700"><b>Missing:</b> {s.missing.map((m: any) => m.label).join(', ')}</p>}
        <div className="sm:col-span-2 flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
          <b>Services:</b>
          {(['taxi', 'trek', 'paragliding'] as const).map((t) => {
            const list: string[] = p.partner_services?.length ? p.partner_services : [p.partner_type];
            const on = list.includes(t);
            return (
              <label key={t} className="inline-flex items-center gap-1.5">
                <input type="checkbox" checked={on} disabled={busy || (on && list.length === 1)}
                  onChange={() => act({ action: 'set_services', services: on ? list.filter((x) => x !== t) : [...list, t] })} />
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </label>
            );
          })}
        </div>
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
                <button disabled={busy} onClick={() => act({ action: 'approve_doc', document_id: d.id })} className="text-green-700 text-sm inline-flex items-center gap-1"><CheckCircle className="h-4 w-4" />Approve</button>
                <button disabled={busy} onClick={() => { const reason = window.prompt('Why is this document rejected? The partner will see this.'); if (reason) act({ action: 'reject_doc', document_id: d.id, reason }); }} className="text-red-600 text-sm inline-flex items-center gap-1"><XCircle className="h-4 w-4" />Reject</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {(s.vehicles.length > 0 || s.staff.length > 0) && (
        <section className="bg-white border border-slate-200 rounded-xl p-5 mb-5 text-sm">
          <h2 className="font-semibold mb-2">Fleet and team</h2>
          {s.vehicles.map((v: any) => <p key={v.id}>{v.registration_no || 'Number applied for'} · {v.make_model} · {v.vehicle_type}{v.fuel ? ' · ' + v.fuel : ''}{v.colour ? ' · ' + v.colour : ''} · {v.seats} seats{v.active === false ? ' · inactive' : ''}</p>)}
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
          <button disabled={busy} onClick={() => act({ action: 'verify' })} className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">Approve partner</button>
          {p.partner_status !== 'verified' && p.partner_status !== 'suspended' && p.partner_status !== 'rejected' && (
            <button disabled={busy} onClick={() => { const note = window.prompt('Approve before all documents are in? They can take bookings straight away. Write why (e.g. "Documents coming on WhatsApp"):'); if (note) act({ action: 'approve_early', note }); }} className="border border-green-700 text-green-800 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">Approve now, documents later</button>
          )}
          <button disabled={busy} onClick={() => act({ action: 'request_changes', note })} className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">Send back for changes</button>
          <button disabled={busy} onClick={() => act({ action: 'reject', note })} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">Reject</button>
          {p.partner_status === 'verified' && <button disabled={busy} onClick={() => act({ action: 'suspend', note })} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">Suspend</button>}
          {p.partner_status === 'suspended' && <button disabled={busy} onClick={() => act({ action: 'reinstate' })} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">Reinstate</button>}
        </div>
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <label className="text-sm">Commission %</label>
          <input type="number" min={0} max={100} step={0.5} defaultValue={p.commission_pct} id="commission" className="w-24 border border-slate-300 rounded px-2 py-1 text-sm" />
          <button disabled={busy} onClick={() => act({ action: 'set_commission', commission_pct: Number((document.getElementById('commission') as HTMLInputElement).value) })} className="text-sm text-brand-600 font-semibold">Save</button>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <label className="text-sm">WhatsApp number</label>
          <input type="text" defaultValue={p.whatsapp_number ? p.whatsapp_number.replace(/^91/, '') : p.phone || ''} id="wa-number" className="w-40 border border-slate-300 rounded px-2 py-1 text-sm" />
          <label className="text-sm flex items-center gap-1.5"><input type="checkbox" defaultChecked={!!p.whatsapp_alerts} id="wa-alerts" />Send booking alerts</label>
          <button disabled={busy} onClick={() => act({ action: 'set_whatsapp', whatsapp_number: (document.getElementById('wa-number') as HTMLInputElement).value, whatsapp_alerts: (document.getElementById('wa-alerts') as HTMLInputElement).checked })} className="text-sm text-brand-600 font-semibold">Save</button>
        </div>
      </section>
    </div>
  );
}
