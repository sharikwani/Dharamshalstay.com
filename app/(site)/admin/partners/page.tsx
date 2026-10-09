'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase, authFetch } from '@/lib/supabase';
import { AdminPageHeader } from '@/components/admin/AdminShell';

const FILTERS: Record<string, string> = {
  pending_verification: 'Waiting for you', changes_requested: 'Sent back', onboarding: 'Still filling in', verified: 'Approved', suspended: 'Suspended', rejected: 'Rejected', all: 'Everyone',
};
const TYPE: Record<string, string> = { paragliding: 'Paragliding', taxi: 'Taxi', trek: 'Trek' };

export default function AdminPartners() {
  const router = useRouter();
  const [filter, setFilter] = useState('pending_verification');
  const [rows, setRows] = useState<any[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/admin/login'); return; }
      setRows(null);
      const res = await authFetch('/api/admin/partners?status=' + filter);
      const data = await res.json();
      if (!res.ok) { setError(data.error); setRows([]); return; }
      setRows(data.partners);
    })();
  }, [filter, router]);

  return (
    <div>
      <AdminPageHeader title="Partners" description="Paragliding, taxi and trek partners. Check their documents and agreement, then approve them so they can take bookings." />
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(FILTERS).map(([k, v]) => (
          <button key={k} onClick={() => setFilter(k)} className={'px-3 py-1.5 rounded-full text-sm ' + (filter === k ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700')}>{v}</button>
        ))}
      </div>
      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      {!rows ? <p className="text-slate-500 text-sm">Loading…</p> : rows.length === 0 ? <p className="text-slate-500 text-sm">Nobody here.</p> : (
        <div className="bg-white border border-slate-200 rounded-xl divide-y">
          {rows.map((p) => (
            <Link key={p.id} href={'/admin/partners/' + p.id} className="flex items-center justify-between p-4 hover:bg-slate-50">
              <div>
                <p className="font-semibold text-slate-900">{p.legal_name || p.full_name || p.email}</p>
                <p className="text-xs text-slate-500">{TYPE[p.partner_type]} · {p.business_name || '—'} · {p.email} · {p.phone || ''}</p>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p className="font-medium text-slate-700">{FILTERS[p.partner_status] || p.partner_status}</p>
                {p.submitted_at && <p>Submitted {new Date(p.submitted_at).toLocaleDateString('en-IN')}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
