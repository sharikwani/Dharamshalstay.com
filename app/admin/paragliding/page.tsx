'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Wind, Plus, Pencil, Trash2, ArrowLeft, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPrice, slugify } from '@/lib/utils';

export default function AdminParagliding() {
  const router = useRouter();
  const [packages, setPackages] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function loadPkgs() {
    const { data } = await supabase.from('paragliding_packages').select('*').order('name');
    setPackages(data || []);
    setLoading(false);
  }

  useEffect(() => { supabase.auth.getUser().then(({ data: { user } }) => { if (!user) router.push('/admin/login'); else loadPkgs(); }); }, [router]);

  async function handleSave() {
    const payload = { ...editing, slug: slugify(editing.name) };
    if (payload.id && !payload.id.startsWith('new')) {
      await supabase.from('paragliding_packages').update(payload).eq('id', payload.id);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      payload.created_by = user?.id; delete payload.id;
      await supabase.from('paragliding_packages').insert(payload);
    }
    setEditing(null); loadPkgs();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this package?')) return;
    await supabase.from('paragliding_packages').delete().eq('id', id);
    loadPkgs();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/admin/dashboard" className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-800 mb-4"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold text-slate-900 flex items-center gap-2"><Wind className="h-6 w-6 text-sky-500" /> Manage Paragliding</h1>
        <button onClick={() => setEditing({ id: 'new', name: '', destination: 'Bir Billing', package_type: 'tandem', duration: '', altitude: '', short_description: '', description: '', price_per_person: 0, status: 'draft', featured: false, is_sponsored: false, commission_pct: 15, images: '[]', includes: '[]', excludes: '[]' })} className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-brand-700"><Plus className="h-4 w-4" /> Add Package</button>
      </div>

      {editing && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-heading font-bold mb-4">{editing.id === 'new' ? 'New Package' : 'Edit Package'}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div className="col-span-2"><label className="block text-xs font-medium text-slate-700 mb-1">Name *</label><input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Destination</label><select value={editing.destination} onChange={e => setEditing({ ...editing, destination: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"><option>Bir Billing</option><option>Dharamshala</option></select></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Type</label><select value={editing.package_type} onChange={e => setEditing({ ...editing, package_type: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"><option value="tandem">Tandem</option><option value="solo">Solo</option><option value="course">Course</option><option value="scenic">Scenic</option><option value="acrobatic">Acrobatic</option></select></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Duration</label><input value={editing.duration || ''} onChange={e => setEditing({ ...editing, duration: e.target.value })} placeholder="e.g. 15-25 min" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Altitude</label><input value={editing.altitude || ''} onChange={e => setEditing({ ...editing, altitude: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Price/Person (₹)</label><input type="number" value={editing.price_per_person} onChange={e => setEditing({ ...editing, price_per_person: +e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Commission %</label><input type="number" value={editing.commission_pct} onChange={e => setEditing({ ...editing, commission_pct: +e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Status</label><select value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></div>
          </div>
          <div className="mb-4"><label className="block text-xs font-medium text-slate-700 mb-1">Short Description</label><textarea value={editing.short_description || ''} onChange={e => setEditing({ ...editing, short_description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none resize-none" /></div>
          <div className="mb-4"><label className="block text-xs font-medium text-slate-700 mb-1">Full Description</label><textarea value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} rows={4} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none resize-none" /></div>
          <div className="flex items-center gap-4 mb-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.featured} onChange={e => setEditing({ ...editing, featured: e.target.checked })} /> Featured</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.is_sponsored} onChange={e => setEditing({ ...editing, is_sponsored: e.target.checked })} /> Sponsored</label>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} className="flex items-center gap-1.5 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-700"><Save className="h-4 w-4" /> Save</button>
            <button onClick={() => setEditing(null)} className="text-sm text-slate-600">Cancel</button>
          </div>
        </div>
      )}

      {loading ? <p>Loading...</p> : packages.length === 0 ? <p className="text-slate-500">No paragliding packages yet.</p> : (
        <div className="space-y-3">
          {packages.map(p => (
            <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">{p.name}</h3>
                <p className="text-xs text-slate-500">{p.destination} · {p.package_type} · {formatPrice(p.price_per_person)}/person · <span className={`font-medium ${p.status === 'published' ? 'text-green-600' : 'text-slate-500'}`}>{p.status}</span></p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing({ ...p })} className="text-slate-500 hover:text-brand-600"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => handleDelete(p.id)} className="text-slate-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

