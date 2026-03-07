'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Car, Plus, Pencil, Trash2, ArrowLeft, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';

const EMPTY_ROUTE = { from_location: '', to_location: '', route_type: 'airport', vehicle_category: 'sedan', vehicle_name: '', max_passengers: 4, price: 0, price_type: 'fixed', distance_km: 0, duration: '', description: '', includes: '[]', excludes: '[]', status: 'active' };

export default function AdminTaxis() {
  const router = useRouter();
  const [routes, setRoutes] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function loadRoutes() {
    const { data } = await supabase.from('taxi_routes').select('*').order('route_type').order('from_location');
    setRoutes(data || []);
    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/admin/login'); return; }
      loadRoutes();
    });
  }, [router]);

  async function handleSave() {
    const payload = { ...editing };
    if (typeof payload.includes === 'string') payload.includes = JSON.parse(payload.includes || '[]');
    if (typeof payload.excludes === 'string') payload.excludes = JSON.parse(payload.excludes || '[]');

    if (payload.id) {
      await supabase.from('taxi_routes').update(payload).eq('id', payload.id);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      payload.created_by = user?.id;
      delete payload.id;
      await supabase.from('taxi_routes').insert(payload);
    }
    setEditing(null);
    loadRoutes();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this route?')) return;
    await supabase.from('taxi_routes').delete().eq('id', id);
    loadRoutes();
  }

  async function toggleStatus(id: string, current: string) {
    const newStatus = current === 'active' ? 'inactive' : 'active';
    await supabase.from('taxi_routes').update({ status: newStatus }).eq('id', id);
    loadRoutes();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/admin/dashboard" className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-800 mb-4"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold text-slate-900 flex items-center gap-2"><Car className="h-6 w-6 text-blue-500" /> Manage Taxi Routes</h1>
        <button onClick={() => setEditing({ ...EMPTY_ROUTE })} className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-brand-700"><Plus className="h-4 w-4" /> Add Route</button>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-heading font-bold text-slate-900 mb-4">{editing.id ? 'Edit Route' : 'New Route'}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div><label className="block text-xs font-medium text-slate-700 mb-1">From *</label><input value={editing.from_location} onChange={e => setEditing({ ...editing, from_location: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">To *</label><input value={editing.to_location} onChange={e => setEditing({ ...editing, to_location: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Type</label><select value={editing.route_type} onChange={e => setEditing({ ...editing, route_type: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"><option value="airport">Airport</option><option value="local">Local</option><option value="outstation">Outstation</option><option value="sightseeing">Sightseeing</option></select></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Vehicle Category</label><select value={editing.vehicle_category} onChange={e => setEditing({ ...editing, vehicle_category: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"><option value="sedan">Sedan</option><option value="suv">SUV</option><option value="innova">Innova</option><option value="tempo">Tempo Traveller</option><option value="bus">Bus</option></select></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Vehicle Name</label><input value={editing.vehicle_name} onChange={e => setEditing({ ...editing, vehicle_name: e.target.value })} placeholder="e.g. Swift Dzire" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Max Passengers</label><input type="number" value={editing.max_passengers} onChange={e => setEditing({ ...editing, max_passengers: +e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Price (₹) *</label><input type="number" value={editing.price} onChange={e => setEditing({ ...editing, price: +e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Distance (km)</label><input type="number" value={editing.distance_km} onChange={e => setEditing({ ...editing, distance_km: +e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Duration</label><input value={editing.duration} onChange={e => setEditing({ ...editing, duration: e.target.value })} placeholder="e.g. 2.5 hrs" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} className="flex items-center gap-1.5 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-700"><Save className="h-4 w-4" /> Save</button>
            <button onClick={() => setEditing(null)} className="text-sm text-slate-600 hover:text-slate-800">Cancel</button>
          </div>
        </div>
      )}

      {/* Routes table */}
      {loading ? <p>Loading...</p> : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 border-b border-slate-200 text-left">
              <th className="px-4 py-3 font-semibold text-slate-700">Route</th><th className="px-4 py-3 font-semibold text-slate-700">Type</th><th className="px-4 py-3 font-semibold text-slate-700">Vehicle</th><th className="px-4 py-3 font-semibold text-slate-700">Price</th><th className="px-4 py-3 font-semibold text-slate-700">Status</th><th className="px-4 py-3"></th>
            </tr></thead>
            <tbody>
              {routes.map(r => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.from_location} → {r.to_location}</td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{r.route_type}</td>
                  <td className="px-4 py-3 text-slate-600">{r.vehicle_name || r.vehicle_category}</td>
                  <td className="px-4 py-3 font-semibold">{formatPrice(r.price)}</td>
                  <td className="px-4 py-3"><button onClick={() => toggleStatus(r.id, r.status)} className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{r.status}</button></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => setEditing({ ...r, includes: JSON.stringify(r.includes || []), excludes: JSON.stringify(r.excludes || []) })} className="text-slate-500 hover:text-brand-600"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(r.id)} className="text-slate-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
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

