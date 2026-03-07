'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building, ArrowLeft, Eye, Pencil, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';

export default function AdminProperties() {
  const router = useRouter();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('published');

  async function load() {
    setLoading(true);
    const query = filter === 'all'
      ? supabase.from('properties').select('*').order('updated_at', { ascending: false })
      : supabase.from('properties').select('*').eq('status', filter).order('updated_at', { ascending: false });
    const { data } = await query;
    setProperties(data || []);
    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/admin/login');
      else load();
    });
  }, [filter, router]);

  async function toggleFeatured(id: string, current: boolean) {
    await supabase.from('properties').update({ featured: !current }).eq('id', id);
    load();
  }

  async function toggleSuspend(id: string, current: string) {
    const newStatus = current === 'suspended' ? 'published' : 'suspended';
    await supabase.from('properties').update({ status: newStatus }).eq('id', id);
    load();
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700', pending_review: 'bg-amber-100 text-amber-700',
    changes_requested: 'bg-orange-100 text-orange-700', approved: 'bg-blue-100 text-blue-700',
    published: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700',
    suspended: 'bg-red-100 text-red-700',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/admin/dashboard" className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-800 mb-4"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
      <h1 className="text-2xl font-heading font-bold text-slate-900 mb-6 flex items-center gap-2"><Building className="h-6 w-6 text-brand-500" /> All Properties</h1>

      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
        {['published', 'pending_review', 'changes_requested', 'suspended', 'rejected', 'all'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${filter === f ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {f === 'all' ? 'All' : f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      {loading ? <p>Loading...</p> : properties.length === 0 ? <p className="text-slate-500">No properties found.</p> : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 border-b text-left">
              <th className="px-4 py-3 font-semibold text-slate-700">Property</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Type</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Area</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Price</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Featured</th>
              <th className="px-4 py-3"></th>
            </tr></thead>
            <tbody>
              {properties.map(p => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3"><p className="font-medium text-slate-900 truncate max-w-[200px]">{p.name || 'Untitled'}</p><p className="text-xs text-slate-500">{p.city}</p></td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{p.type}</td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{p.destination_slug?.replace(/-/g, ' ')}</td>
                  <td className="px-4 py-3 text-slate-900 font-medium">{p.price_min ? formatPrice(p.price_min) : '—'}</td>
                  <td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[p.status]}`}>{p.status?.replace(/_/g, ' ')}</span></td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleFeatured(p.id, p.featured)} className="text-slate-400 hover:text-amber-500">
                      {p.featured ? <ToggleRight className="h-5 w-5 text-amber-500" /> : <ToggleLeft className="h-5 w-5" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link href={`/admin/approvals/${p.id}`} className="text-brand-600 hover:text-brand-700"><Pencil className="h-4 w-4" /></Link>
                      {p.status === 'published' && p.slug && <Link href={`/hotels/${p.slug}`} target="_blank" className="text-green-600 hover:text-green-700"><Eye className="h-4 w-4" /></Link>}
                      {(p.status === 'published' || p.status === 'suspended') && (
                        <button onClick={() => toggleSuspend(p.id, p.status)} className={p.status === 'suspended' ? 'text-green-600 hover:text-green-700 text-xs font-medium' : 'text-red-500 hover:text-red-700 text-xs font-medium'}>
                          {p.status === 'suspended' ? 'Restore' : 'Suspend'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
