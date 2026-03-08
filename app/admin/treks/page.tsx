'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mountain, Plus, Pencil, Trash2, ArrowLeft, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPrice, slugify } from '@/lib/utils';

export default function AdminTreks() {
  const router = useRouter();
  const [treks, setTreks] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function loadTreks() {
    const { data } = await supabase.from('treks').select('*').order('name');
    setTreks(data || []);
    setLoading(false);
  }

  useEffect(() => { supabase.auth.getUser().then(({ data: { user } }) => { if (!user) router.push('/admin/login'); else loadTreks(); }); }, [router]);

  async function handleSave() {
    const payload = { ...editing, slug: slugify(editing.name), itinerary: typeof editing.itinerary === 'string' ? JSON.parse(editing.itinerary || '[]') : editing.itinerary };
    if (payload.id && !payload.id.startsWith('new')) {
      await supabase.from('treks').update(payload).eq('id', payload.id);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      payload.created_by = user?.id; delete payload.id;
      await supabase.from('treks').insert(payload);
    }
    setEditing(null); loadTreks();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this trek?')) return;
    await supabase.from('treks').delete().eq('id', id);
    loadTreks();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/admin/dashboard" className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-800 mb-4"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold text-slate-900 flex items-center gap-2"><Mountain className="h-6 w-6 text-green-500" /> Manage Treks</h1>
        <button onClick={() => setEditing({ id: 'new', name: '', destination_slug: 'dharamkot', difficulty: 'moderate', duration: '', distance: '', max_altitude: '', best_season: '', price_per_person: 0, short_description: '', description: '', itinerary: '[]', includes: [], excludes: [], things_to_carry: [], images: [], featured: false, status: 'draft', meta_title: '', meta_description: '' })} className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-brand-700"><Plus className="h-4 w-4" /> Add Trek</button>
      </div>

      {editing && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-heading font-bold mb-4">{editing.id === 'new' ? 'New Trek' : 'Edit Trek'}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div className="col-span-2"><label className="block text-xs font-medium text-slate-700 mb-1">Name *</label><input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Destination</label><select value={editing.destination_slug} onChange={e => setEditing({ ...editing, destination_slug: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"><option value="dharamshala">Dharamshala</option><option value="mcleod-ganj">McLeod Ganj</option><option value="dharamkot">Dharamkot</option><option value="bhagsu">Bhagsu</option></select></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Difficulty</label><select value={editing.difficulty} onChange={e => setEditing({ ...editing, difficulty: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"><option value="easy">Easy</option><option value="moderate">Moderate</option><option value="hard">Hard</option><option value="expert">Expert</option></select></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Duration</label><input value={editing.duration} onChange={e => setEditing({ ...editing, duration: e.target.value })} placeholder="e.g. 1-2 Days" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Distance</label><input value={editing.distance} onChange={e => setEditing({ ...editing, distance: e.target.value })} placeholder="e.g. 9 km" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Max Altitude</label><input value={editing.max_altitude} onChange={e => setEditing({ ...editing, max_altitude: e.target.value })} placeholder="e.g. 2828 m" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Best Season</label><input value={editing.best_season} onChange={e => setEditing({ ...editing, best_season: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Price/Person (₹)</label><input type="number" value={editing.price_per_person} onChange={e => setEditing({ ...editing, price_per_person: +e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Status</label><select value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></div>
          </div>
          <div className="mb-4"><label className="block text-xs font-medium text-slate-700 mb-1">Short Description</label><textarea value={editing.short_description} onChange={e => setEditing({ ...editing, short_description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none resize-none" /></div>
          <div className="mb-4"><label className="block text-xs font-medium text-slate-700 mb-1">Full Description</label><textarea value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} rows={4} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none resize-none" /></div>
          <div className="flex gap-3">
            <button onClick={handleSave} className="flex items-center gap-1.5 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-700"><Save className="h-4 w-4" /> Save</button>
            <button onClick={() => setEditing(null)} className="text-sm text-slate-600 hover:text-slate-800">Cancel</button>
          </div>
        </div>
      )}

      {loading ? <p>Loading...</p> : (
        <div className="space-y-3">
          {treks.map(t => (
            <div key={t.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">{t.name}</h3>
                <p className="text-xs text-slate-500 capitalize">{t.difficulty} · {t.duration} · {formatPrice(t.price_per_person)}/person · <span className={`font-medium ${t.status === 'published' ? 'text-green-600' : 'text-slate-500'}`}>{t.status}</span></p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing({ ...t, itinerary: JSON.stringify(t.itinerary || []) })} className="text-slate-500 hover:text-brand-600"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => handleDelete(t.id)} className="text-slate-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
