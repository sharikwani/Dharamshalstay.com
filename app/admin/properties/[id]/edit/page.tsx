'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, Trash2, Plus, X, LinkIcon, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { slugify, formatPrice } from '@/lib/utils';

export default function AdminEditPropertyPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/admin/login'); return; }
      const profile = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profile.data?.role !== 'admin') { router.push('/admin/login'); return; }
      const { data } = await supabase.from('properties').select('*').eq('id', params.id).single();
      if (!data) { router.push('/admin/properties'); return; }
      setForm(data);
      setLoading(false);
    }
    load();
  }, [params.id, router]);

  const u = (key: string, val: any) => setForm((p: any) => ({ ...p, [key]: val }));

  function updateRoom(idx: number, key: string, val: any) {
    const rooms = [...(form.rooms || [])];
    rooms[idx] = { ...rooms[idx], [key]: val };
    u('rooms', rooms);
  }

  function updateRatePlan(roomIdx: number, rpIdx: number, key: string, val: any) {
    const rooms = [...(form.rooms || [])];
    const rps = [...(rooms[roomIdx].rate_plans || [])];
    rps[rpIdx] = { ...rps[rpIdx], [key]: val };
    rooms[roomIdx] = { ...rooms[roomIdx], rate_plans: rps };
    u('rooms', rooms);
  }

  function addRoomImage(roomIdx: number, url: string) {
    if (!url.trim().startsWith('http')) return;
    const rooms = [...(form.rooms || [])];
    rooms[roomIdx] = { ...rooms[roomIdx], images: [...(rooms[roomIdx].images || []), url.trim()] };
    u('rooms', rooms);
  }

  function removeRoomImage(roomIdx: number, imgIdx: number) {
    const rooms = [...(form.rooms || [])];
    rooms[roomIdx] = { ...rooms[roomIdx], images: (rooms[roomIdx].images || []).filter((_: any, i: number) => i !== imgIdx) };
    u('rooms', rooms);
  }

  function addPropertyImage(url: string) {
    if (!url.trim().startsWith('http')) return;
    u('images', [...(form.images || []), { url: url.trim(), alt: '', category: 'exterior', is_primary: !(form.images?.length), sort_order: form.images?.length || 0 }]);
  }

  async function handleSave() {
    setSaving(true); setError(''); setSuccess('');
    const slug = slugify(form.name || 'property');
    const allP: number[] = [];
    (form.rooms || []).forEach((r: any) => {
      if (r.base_price > 0) allP.push(r.base_price);
      (r.rate_plans || []).forEach((rp: any) => { if (rp.price > 0) allP.push(rp.price); });
    });
    const payload = { ...form, slug, updated_at: new Date().toISOString(), price_min: allP.length ? Math.min(...allP) : 0, price_max: allP.length ? Math.max(...allP) : 0 };
    delete payload.created_at;
    const { error: e } = await supabase.from('properties').update(payload).eq('id', params.id);
    setSaving(false);
    if (e) setError('Error: ' + e.message);
    else setSuccess('Saved successfully!');
  }

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="h-8 w-8 text-brand-600 animate-spin" /></div>;

  const Input = ({ label, field, type = 'text', placeholder = '' }: any) => (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input type={type} value={form[field] ?? ''} onChange={e => u(field, type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value)}
        placeholder={placeholder} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/admin/properties" className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-800 mb-4"><ArrowLeft className="h-4 w-4" /> All Properties</Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900">Edit: {form.name}</h1>
          <p className="text-sm text-slate-500">Status: <span className="font-medium capitalize">{form.status?.replace(/_/g, ' ')}</span></p>
        </div>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-brand-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-brand-700 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg mb-4 flex items-center gap-2"><Check className="h-4 w-4" />{success}</div>}

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="font-heading font-bold text-lg">Basic Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Property Name" field="name" />
            <div className="grid grid-cols-3 gap-2">
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
                <select value={form.type || 'hotel'} onChange={e => u('type', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none">
                  <option value="hotel">Hotel</option><option value="homestay">Homestay</option><option value="resort">Resort</option><option value="guesthouse">Guesthouse</option><option value="villa">Villa</option></select></div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Stars</label>
                <select value={form.star_rating || ''} onChange={e => u('star_rating', Number(e.target.value) || null)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none">
                  <option value="">N/A</option>{[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}</select></div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Area</label>
                <select value={form.destination_slug || ''} onChange={e => u('destination_slug', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none">
                  <option value="dharamshala">Dharamshala</option><option value="mcleod-ganj">McLeod Ganj</option><option value="bhagsu">Bhagsu</option><option value="dharamkot">Dharamkot</option><option value="naddi">Naddi</option></select></div>
            </div>
          </div>
          <Input label="Short Description" field="short_description" />
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
            <textarea value={form.description || ''} onChange={e => u('description', e.target.value)} rows={4} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none resize-y" /></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Input label="Address" field="address_line1" />
            <Input label="City" field="city" />
            <Input label="Pincode" field="pincode" />
            <Input label="Landmark" field="landmark" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Input label="Rating" field="rating" type="number" />
            <Input label="Reviews" field="review_count" type="number" />
            <Input label="Check-in" field="check_in_time" />
            <Input label="Check-out" field="check_out_time" />
          </div>
        </div>

        {/* SEO */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <h2 className="font-heading font-bold text-lg">SEO</h2>
          <Input label="Meta Title" field="meta_title" placeholder="Leave blank for auto-generated" />
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Meta Description</label>
            <textarea value={form.meta_description || ''} onChange={e => u('meta_description', e.target.value)} rows={2} placeholder="Leave blank for auto-generated" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none resize-none" /></div>
        </div>

        {/* Rooms */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-bold text-lg">Rooms ({form.rooms?.length || 0})</h2>
            <button onClick={() => u('rooms', [...(form.rooms || []), { name: 'New Room', bed_type: 'Double', max_occupancy: 3, base_price: 0, meal_plan: 'ep', amenities: [], images: [], rate_plans: [], is_active: true }])}
              className="text-sm text-brand-600 flex items-center gap-1"><Plus className="h-4 w-4" /> Add Room</button>
          </div>

          {(form.rooms || []).map((room: any, idx: number) => (
            <div key={idx} className="border border-slate-200 rounded-xl p-5 mb-4 last:mb-0">
              <div className="flex items-center justify-between mb-3">
                <input value={room.name || ''} onChange={e => updateRoom(idx, 'name', e.target.value)}
                  className="font-bold text-lg border-b-2 border-transparent hover:border-brand-300 focus:border-brand-500 outline-none flex-1" />
                <button onClick={() => u('rooms', form.rooms.filter((_: any, i: number) => i !== idx))} className="text-red-500 ml-3"><Trash2 className="h-4 w-4" /></button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <div><label className="text-xs text-slate-500">Bed Type</label><input value={room.bed_type || ''} onChange={e => updateRoom(idx, 'bed_type', e.target.value)} className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded text-sm outline-none" /></div>
                <div><label className="text-xs text-slate-500">Size</label><input value={room.room_size || ''} onChange={e => updateRoom(idx, 'room_size', e.target.value)} className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded text-sm outline-none" /></div>
                <div><label className="text-xs text-slate-500">Max Guests</label><input type="number" value={room.max_occupancy || ''} onChange={e => updateRoom(idx, 'max_occupancy', Number(e.target.value) || 0)} className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded text-sm outline-none" /></div>
                <div><label className="text-xs text-slate-500">Base Price</label><input type="number" value={room.base_price || ''} onChange={e => updateRoom(idx, 'base_price', Number(e.target.value) || 0)} className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded text-sm outline-none" /></div>
              </div>

              <div><label className="text-xs text-slate-500">Description</label>
                <textarea value={room.description || ''} onChange={e => updateRoom(idx, 'description', e.target.value)} rows={2} className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded text-sm outline-none resize-y" /></div>

              {/* Rate Plans */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-700">Rate Plans ({room.rate_plans?.length || 0})</p>
                  <button onClick={() => {
                    const rooms = [...form.rooms];
                    rooms[idx] = { ...rooms[idx], rate_plans: [...(rooms[idx].rate_plans || []), { name: '', meal_plan: 'ep', price: 0, cancellation: 'Free cancellation', includes: [] }] };
                    u('rooms', rooms);
                  }} className="text-xs text-brand-600 flex items-center gap-0.5"><Plus className="h-3 w-3" /> Add</button>
                </div>
                {(room.rate_plans || []).map((rp: any, rpi: number) => (
                  <div key={rpi} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 mb-1.5">
                    <input value={rp.name || ''} onChange={e => updateRatePlan(idx, rpi, 'name', e.target.value)} placeholder="Plan name" className="flex-1 px-2 py-1 border border-slate-200 rounded text-xs outline-none" />
                    <select value={rp.meal_plan || 'ep'} onChange={e => updateRatePlan(idx, rpi, 'meal_plan', e.target.value)} className="px-2 py-1 border border-slate-200 rounded text-xs outline-none">
                      <option value="ep">Room Only</option><option value="cp">Breakfast</option><option value="map">B+D</option><option value="ap">All Meals</option>
                    </select>
                    <input type="number" value={rp.price || ''} onChange={e => updateRatePlan(idx, rpi, 'price', Number(e.target.value) || 0)} placeholder="Price" className="w-20 px-2 py-1 border border-slate-200 rounded text-xs outline-none" />
                    <input value={rp.cancellation || ''} onChange={e => updateRatePlan(idx, rpi, 'cancellation', e.target.value)} placeholder="Cancellation" className="w-28 px-2 py-1 border border-slate-200 rounded text-xs outline-none" />
                    <button onClick={() => { const rooms = [...form.rooms]; rooms[idx] = { ...rooms[idx], rate_plans: rooms[idx].rate_plans.filter((_: any, i: number) => i !== rpi) }; u('rooms', rooms); }}
                      className="text-red-400 hover:text-red-600"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>

              {/* Room Images */}
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-700">Room Photos ({room.images?.length || 0})</p>
                  <RoomImageAdder onAdd={(url) => addRoomImage(idx, url)} />
                </div>
                {room.images?.length > 0 && (
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {room.images.map((img: any, ii: number) => {
                      const src = typeof img === 'string' ? img : img?.url;
                      return src ? (
                        <div key={ii} className="relative shrink-0 w-20 h-14 rounded overflow-hidden bg-slate-100 group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt="" className="w-full h-full object-cover" />
                          <button onClick={() => removeRoomImage(idx, ii)} className="absolute top-0 right-0 bg-red-500 text-white text-[8px] w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100">x</button>
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Property Images */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-bold text-lg">Property Photos ({form.images?.length || 0})</h2>
            <PropertyImageAdder onAdd={addPropertyImage} />
          </div>
          {form.images?.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {form.images.map((img: any, i: number) => (
                <div key={i} className="relative aspect-[4/3] rounded-lg overflow-hidden bg-slate-100 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url || img} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => u('images', form.images.filter((_: any, ii: number) => ii !== i))}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100">x</button>
                  {i === 0 && <span className="absolute top-1 left-1 bg-brand-600 text-white text-[9px] px-1.5 py-0.5 rounded">Primary</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Amenities */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-heading font-bold text-lg mb-3">Amenities</h2>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {(form.amenities || []).map((a: string, i: number) => (
              <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full flex items-center gap-1">
                {a}<button onClick={() => u('amenities', form.amenities.filter((_: any, ii: number) => ii !== i))} className="text-blue-400 hover:text-red-500 ml-0.5">x</button>
              </span>
            ))}
          </div>
          <AmenityAdder onAdd={(a) => u('amenities', [...(form.amenities || []), a])} />
        </div>

        {/* Bottom save */}
        <div className="flex justify-end gap-3 pt-4">
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand-700 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save All Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// Small helper components
function RoomImageAdder({ onAdd }: { onAdd: (url: string) => void }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  if (!open) return <button onClick={() => setOpen(true)} className="text-xs text-brand-600 flex items-center gap-0.5"><LinkIcon className="h-3 w-3" /> Add URL</button>;
  return (
    <div className="flex gap-1">
      <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." onKeyDown={e => { if (e.key === 'Enter') { onAdd(url); setUrl(''); setOpen(false); } }}
        className="px-2 py-1 border border-slate-300 rounded text-xs outline-none w-48" autoFocus />
      <button onClick={() => { onAdd(url); setUrl(''); setOpen(false); }} className="px-2 py-1 bg-brand-600 text-white rounded text-xs">Add</button>
      <button onClick={() => { setOpen(false); setUrl(''); }} className="text-xs text-slate-400">X</button>
    </div>
  );
}

function PropertyImageAdder({ onAdd }: { onAdd: (url: string) => void }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  if (!open) return <button onClick={() => setOpen(true)} className="text-sm text-brand-600 flex items-center gap-1"><LinkIcon className="h-4 w-4" /> Add URL</button>;
  return (
    <div className="flex gap-2">
      <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." onKeyDown={e => { if (e.key === 'Enter') { onAdd(url); setUrl(''); setOpen(false); } }}
        className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none w-64" autoFocus />
      <button onClick={() => { onAdd(url); setUrl(''); setOpen(false); }} className="px-3 py-2 bg-brand-600 text-white rounded-lg text-sm">Add</button>
      <button onClick={() => { setOpen(false); setUrl(''); }} className="text-slate-400 px-2">X</button>
    </div>
  );
}

function AmenityAdder({ onAdd }: { onAdd: (a: string) => void }) {
  const [val, setVal] = useState('');
  return (
    <div className="flex gap-2">
      <input value={val} onChange={e => setVal(e.target.value)} placeholder="Add amenity..." onKeyDown={e => { if (e.key === 'Enter' && val.trim()) { onAdd(val.trim()); setVal(''); } }}
        className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none flex-1" />
      <button onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal(''); } }} className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200">Add</button>
    </div>
  );
}
