'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, Plus, Pencil, Trash2, ArrowLeft, Save, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AdminGuides() {
  const router = useRouter();
  const [guides, setGuides] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function loadGuides() {
    const { data } = await supabase.from('guides').select('*').order('name');
    setGuides(data || []);
    setLoading(false);
  }

  useEffect(() => { supabase.auth.getUser().then(({ data: { user } }) => { if (!user) router.push('/admin/login'); else loadGuides(); }); }, [router]);

  async function handleSave() {
    const payload = { ...editing };
    if (typeof payload.languages === 'string') payload.languages = JSON.parse(payload.languages || '[]');
    if (typeof payload.specializations === 'string') payload.specializations = JSON.parse(payload.specializations || '[]');
    if (typeof payload.certifications === 'string') payload.certifications = JSON.parse(payload.certifications || '[]');

    if (payload.id && !payload.id.startsWith('new')) {
      await supabase.from('guides').update(payload).eq('id', payload.id);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      payload.created_by = user?.id; delete payload.id;
      await supabase.from('guides').insert(payload);
    }
    setEditing(null); loadGuides();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this guide?')) return;
    await supabase.from('guides').delete().eq('id', id);
    loadGuides();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/admin/dashboard" className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-800 mb-4"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold text-slate-900 flex items-center gap-2"><Users className="h-6 w-6 text-purple-500" /> Manage Guides</h1>
        <button onClick={() => setEditing({ id: 'new', name: '', phone: '', email: '', photo: '', bio: '', experience_years: 0, languages: '["Hindi","English"]', specializations: '["Triund","Kareri Lake"]', certifications: '[]', price_per_day: 0, status: 'active' })} className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-brand-700"><Plus className="h-4 w-4" /> Add Guide</button>
      </div>

      {editing && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-heading font-bold mb-4">{editing.id === 'new' ? 'New Guide' : 'Edit Guide'}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Full Name *</label><input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Phone *</label><input value={editing.phone} onChange={e => setEditing({ ...editing, phone: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Email</label><input value={editing.email || ''} onChange={e => setEditing({ ...editing, email: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Photo URL</label><input value={editing.photo || ''} onChange={e => setEditing({ ...editing, photo: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Experience (years)</label><input type="number" value={editing.experience_years} onChange={e => setEditing({ ...editing, experience_years: +e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Price/Day (₹)</label><input type="number" value={editing.price_per_day} onChange={e => setEditing({ ...editing, price_per_day: +e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Languages (JSON)</label><input value={editing.languages} onChange={e => setEditing({ ...editing, languages: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Specializations (JSON)</label><input value={editing.specializations} onChange={e => setEditing({ ...editing, specializations: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Status</label><select value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
          </div>
          <div className="mb-4"><label className="block text-xs font-medium text-slate-700 mb-1">Bio</label><textarea value={editing.bio || ''} onChange={e => setEditing({ ...editing, bio: e.target.value })} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none resize-none" /></div>
          <div className="flex gap-3">
            <button onClick={handleSave} className="flex items-center gap-1.5 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-700"><Save className="h-4 w-4" /> Save</button>
            <button onClick={() => setEditing(null)} className="text-sm text-slate-600">Cancel</button>
          </div>
        </div>
      )}

      {loading ? <p>Loading...</p> : guides.length === 0 ? <p className="text-slate-500">No guides yet. Add your first guide.</p> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {guides.map(g => (
            <div key={g.id} className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{g.name}</h3>
                  <p className="text-xs text-slate-500">{g.experience_years} yrs experience · ₹{g.price_per_day}/day</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${g.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{g.status}</span>
              </div>
              {g.bio && <p className="text-sm text-slate-600 line-clamp-2 mb-3">{g.bio}</p>}
              <div className="flex flex-wrap gap-1 mb-3">
                {(g.specializations || []).map((s: string) => <span key={s} className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded">{s}</span>)}
              </div>
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button onClick={() => setEditing({ ...g, languages: JSON.stringify(g.languages || []), specializations: JSON.stringify(g.specializations || []), certifications: JSON.stringify(g.certifications || []) })} className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                <button onClick={() => handleDelete(g.id)} className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
