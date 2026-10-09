'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, Wind, Car, Mountain, Users } from 'lucide-react';
import { supabase, authFetch } from '@/lib/supabase';
import { AdminPageHeader } from '@/components/admin/AdminShell';

const FILTERS: Record<string, string> = {
  pending_verification: 'Waiting for you', changes_requested: 'Sent back', onboarding: 'Still filling in', verified: 'Approved', suspended: 'Suspended', rejected: 'Rejected', all: 'Everyone',
};
const STATUS_COLORS: Record<string, string> = {
  pending_verification: 'bg-amber-100 text-amber-800',
  changes_requested: 'bg-orange-100 text-orange-800',
  onboarding: 'bg-slate-100 text-slate-700',
  verified: 'bg-green-100 text-green-800',
  suspended: 'bg-red-100 text-red-800',
  rejected: 'bg-red-100 text-red-800',
};
const TYPE: Record<string, { label: string; icon: any; tone: string }> = {
  paragliding: { label: 'Paragliding', icon: Wind, tone: 'bg-cyan-500' },
  taxi: { label: 'Taxi', icon: Car, tone: 'bg-yellow-500' },
  trek: { label: 'Trek', icon: Mountain, tone: 'bg-green-600' },
};

export default function AdminPartners() {
  const router = useRouter();
  const [filter, setFilter] = useState('pending_verification');
  const [rows, setRows] = useState<any[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/admin/login'); return; }
      setRows(null); setError('');
      const res = await authFetch('/api/admin/partners?status=' + filter);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || 'Could not load partners.'); setRows([]); return; }
      setRows(data.partners);
    })();
  }, [filter, router]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <AdminPageHeader title="Partners" description="Paragliding, taxi and trek businesses that signed up. Open one to check their documents and agreement, then approve them so they can take bookings." />

      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
        {Object.entries(FILTERS).map(([k, v]) => (
          <button key={k} onClick={() => setFilter(k)} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${filter === k ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {v}
          </button>
        ))}
      </div>

      {error && <p className="bg-red-50 text-red-700 text-sm rounded-lg p-3 mb-4">{error}</p>}

      {!rows ? <p className="text-slate-500">Loading...</p> : rows.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-10 text-center">
          <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-600 font-medium">No partners here yet.</p>
          <p className="text-sm text-slate-400 mt-1">New sign-ups from the "Become a Partner" page appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((p) => {
            const t = TYPE[p.partner_type] || { label: p.partner_type, icon: Users, tone: 'bg-slate-400' };
            const Icon = t.icon;
            return (
              <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-white ${t.tone}`}><Icon className="h-5 w-5" /></span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-slate-900 truncate">{p.legal_name || p.full_name || p.email}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[p.partner_status] || 'bg-slate-100 text-slate-700'}`}>{FILTERS[p.partner_status] || p.partner_status}</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{t.label} · {p.business_name || 'No business name'} · {p.email}{p.phone ? ' · ' + p.phone : ''}</p>
                    {p.submitted_at && <p className="text-xs text-slate-400 mt-1">Submitted: {new Date(p.submitted_at).toLocaleDateString('en-IN')}</p>}
                  </div>
                </div>
                <Link href={`/admin/partners/${p.id}`} className="shrink-0 flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 px-3 py-1.5 border border-brand-200 rounded-lg">
                  <Eye className="h-3.5 w-3.5" /> Review
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
