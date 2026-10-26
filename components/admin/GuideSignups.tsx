'use client';
import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, Check, X } from 'lucide-react';
import { authFetch } from '@/lib/supabase';

/** Guide sign-ups from /local-guides/register waiting for the owner: approve (goes live), reject, and set the badges. */
export default function GuideSignups({ onChange }: { onChange: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    const res = await authFetch('/api/admin/guides?status=pending');
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setError(j.error || 'Could not load sign-ups'); return; }
    setError(''); setRows(j.guides || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function act(id: string, body: Record<string, unknown>) {
    setBusy(id);
    const res = await authFetch('/api/admin/guides', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...body }) });
    const j = await res.json().catch(() => ({}));
    setBusy('');
    if (!res.ok) { setError(j.error || 'Could not update'); return; }
    await load(); onChange();
  }

  if (error) return <p className="mb-6 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</p>;
  if (!rows.length) return null;
  return (
    <section className="mb-8 rounded-xl border-2 border-amber-300 bg-amber-50/50 p-5">
      <h2 className="font-heading text-lg font-bold text-slate-900">Waiting for approval ({rows.length})</h2>
      <p className="mb-4 text-sm text-slate-600">Call the guide and check their ID before approving. Tick &quot;HP Tourism registered&quot; only after seeing the certificate.</p>
      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((g) => (
          <GuideCard key={g.id} g={g} busy={busy === g.id} act={act} />
        ))}
      </div>
    </section>
  );
}

function GuideCard({ g, busy, act }: { g: any; busy: boolean; act: (id: string, body: Record<string, unknown>) => void }) {
  const [verified, setVerified] = useState(false);
  const [hp, setHp] = useState(false);
  const list = (v: unknown) => (Array.isArray(v) ? v.join(', ') : '');
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
      {g.photo_preview
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={g.photo_preview} alt={`Photo sent by ${g.name}`} className="mb-3 aspect-square w-40 rounded-xl object-cover" />
        : <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-red-700">No photo: ask the guide to send one before approving.</p>}
      <p className="font-semibold text-slate-900">{g.name} <span className="font-normal text-slate-500">· {g.experience_years} yrs · ₹{g.price_per_day}/day</span></p>
      <p className="text-slate-600">+{g.phone}{g.whatsapp ? ` · WhatsApp +${g.whatsapp}` : ''}{g.email ? ` · ${g.email}` : ''}</p>
      <p className="mt-1 text-slate-600"><b>Guides:</b> {list(g.specializations)}</p>
      <p className="text-slate-600"><b>Areas:</b> {list(g.areas)} · <b>Languages:</b> {list(g.languages)}</p>
      <p className="text-slate-600"><b>HP Tourism no.:</b> {g.hp_registration_no || 'not given'}</p>
      {g.bio && <p className="mt-2 whitespace-pre-line text-slate-700">{g.bio}</p>}
      <div className="mt-3 flex flex-wrap gap-4">
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} /><BadgeCheck className="h-4 w-4 text-green-600" />Verified by us</label>
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={hp} onChange={(e) => setHp(e.target.checked)} disabled={!g.hp_registration_no} />HP Tourism registered (certificate seen)</label>
      </div>
      <div className="mt-3 flex gap-2">
        <button disabled={busy} onClick={() => act(g.id, { action: 'approve', verified, hp_registration_verified: hp })} className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 font-semibold text-white disabled:opacity-50"><Check className="h-4 w-4" />Approve and publish</button>
        <button disabled={busy} onClick={() => act(g.id, { action: 'reject' })} className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 disabled:opacity-50"><X className="h-4 w-4" />Reject</button>
      </div>
    </div>
  );
}
