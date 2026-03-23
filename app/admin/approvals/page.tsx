'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, Eye, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AdminApprovals() {
  const router = useRouter();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending_review');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/admin/login'); return; }
      const query = filter === 'all'
        ? supabase.from('properties').select('*').order('created_at', { ascending: false })
        : supabase.from('properties').select('*').eq('status', filter).order('submitted_at', { ascending: false });
      const { data } = await query;
      setProperties(data || []);
      setLoading(false);
    }
    load();
  }, [filter, router]);

  const statusColors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700', pending_review: 'bg-amber-100 text-amber-700', changes_requested: 'bg-orange-100 text-orange-700',
    approved: 'bg-blue-100 text-blue-700', published: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700', suspended: 'bg-red-100 text-red-700',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/admin/dashboard" className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-800 mb-4"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
      <h1 className="text-2xl font-heading font-bold text-slate-900 mb-6">Property Submissions</h1>

      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
        {['pending_review', 'changes_requested', 'published', 'rejected', 'all'].map(f => (
          <button key={f} onClick={() => { setFilter(f); setLoading(true); }} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${filter === f ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {f === 'all' ? 'All' : f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      {loading ? <p className="text-slate-500">Loading...</p> : properties.length === 0 ? <p className="text-slate-500">No properties found.</p> : (
        <div className="space-y-3">
          {properties.map(p => (
            <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-slate-900 truncate">{p.name || 'Untitled'}</h3>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[p.status]}`}>{p.status?.replace(/_/g, ' ')}</span>
                </div>
                <p className="text-xs text-slate-500 capitalize">{p.type} · {p.destination_slug?.replace(/-/g, ' ')} · {p.city}</p>
                {p.submitted_at && <p className="text-xs text-slate-400 mt-1">Submitted: {new Date(p.submitted_at).toLocaleDateString()}</p>}
              </div>
              <Link href={`/admin/approvals/${p.id}`} className="shrink-0 flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 px-3 py-1.5 border border-brand-200 rounded-lg">
                <Eye className="h-3.5 w-3.5" /> Review
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
