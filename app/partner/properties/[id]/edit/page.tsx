'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Building, MapPin, Bed, Camera, Shield, ChevronRight, ChevronLeft, Save, Send, Check, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PROPERTY_AMENITIES, ROOM_AMENITIES, BATHROOM_AMENITIES, FOOD_OPTIONS, ID_TYPES } from '@/types';
import { slugify } from '@/lib/utils';

const STEPS = [
  { id: 'basic', label: 'Basic Info', icon: Building },
  { id: 'location', label: 'Location', icon: MapPin },
  { id: 'rooms', label: 'Rooms & Pricing', icon: Bed },
  { id: 'amenities', label: 'Amenities', icon: Check },
  { id: 'photos', label: 'Photos', icon: Camera },
  { id: 'policies', label: 'Policies', icon: Shield },
];

export default function EditPropertyPage() {
  const router = useRouter();
  const params = useParams();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/partner/login'); return; }
      const { data } = await supabase.from('properties').select('*').eq('id', params.id).eq('owner_id', user.id).single();
      if (!data) { router.push('/partner/dashboard'); return; }
      setForm(data);
      setLoading(false);
    }
    load();
  }, [params.id, router]);

  const update = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));
  const toggleArray = (key: string, val: string) => {
    const arr = form[key] || [];
    update(key, arr.includes(val) ? arr.filter((v: string) => v !== val) : [...arr, val]);
  };

  const addRoom = () => update('rooms', [...(form.rooms || []), { name: '', description: '', bed_type: 'Double', room_size: '', max_adults: 2, max_children: 1, max_occupancy: 3, base_price: 0, meal_plan: 'ep', amenities: [], total_inventory: 1, is_active: true }]);
  const updateRoom = (idx: number, key: string, val: any) => {
    const rooms = [...(form.rooms || [])];
    rooms[idx] = { ...rooms[idx], [key]: val };
    update('rooms', rooms);
  };
  const removeRoom = (idx: number) => update('rooms', (form.rooms || []).filter((_: any, i: number) => i !== idx));

  async function handleSave(submitForReview = false) {
    setSaving(true);
    const slug = slugify(form.name || 'untitled');
    const rooms = form.rooms || [];
    const prices = rooms.map((r: any) => r.base_price || 0).filter((p: number) => p > 0);
    const payload: Record<string, any> = {
      ...form,
      slug,
      price_min: prices.length ? Math.min(...prices) : 0,
      price_max: prices.length ? Math.max(...prices) : 0,
      updated_at: new Date().toISOString(),
    };
    if (submitForReview) {
      payload.status = 'pending_review';
      payload.submitted_at = new Date().toISOString();
      payload.admin_notes = null;
      payload.rejection_reason = null;
    }
    // Remove fields that shouldn't be updated
    delete payload.created_at;
    delete payload.reviewed_by;
    delete payload.reviewed_at;

    const { error } = await supabase.from('properties').update(payload).eq('id', params.id);
    setSaving(false);
    if (error) { alert('Error saving: ' + error.message); return; }
    router.push('/partner/dashboard');
  }

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><p>Loading property...</p></div>;

  const canEdit = form.status === 'draft' || form.status === 'changes_requested';

  const Input = ({ label, name, type = 'text', required = false, placeholder = '' }: any) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label} {required && <span className="text-red-500">*</span>}</label>
      <input type={type} value={form[name] || ''} onChange={e => update(name, type === 'number' ? Number(e.target.value) : e.target.value)} required={required} placeholder={placeholder} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
    </div>
  );

  const Checkbox = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) => (
    <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${checked ? 'bg-brand-50 border-brand-300 text-brand-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${checked ? 'bg-brand-600 border-brand-600' : 'border-slate-300'}`}>{checked && <Check className="h-3 w-3 text-white" />}</div>
      {label}
    </label>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <button onClick={() => router.push('/partner/dashboard')} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-800 mb-4"><ArrowLeft className="h-4 w-4" /> Back to Dashboard</button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900">Edit Property</h1>
          <p className="text-sm text-slate-500 capitalize">{form.name} · Status: <span className="font-medium">{form.status?.replace(/_/g, ' ')}</span></p>
        </div>
      </div>

      {form.status === 'changes_requested' && form.admin_notes && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-semibold text-orange-800 mb-1">Changes Requested by Admin:</p>
          <p className="text-sm text-orange-700">{form.admin_notes}</p>
        </div>
      )}

      {!canEdit && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-amber-800">This property is currently <strong>{form.status?.replace(/_/g, ' ')}</strong> and cannot be edited. Please contact support if you need changes.</p>
        </div>
      )}

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto scrollbar-hide">
        {STEPS.map((s, i) => (
          <button key={s.id} onClick={() => setStep(i)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${i === step ? 'bg-brand-600 text-white' : i < step ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-100'}`}>
            <s.icon className="h-4 w-4" />{s.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        {/* STEP 0: Basic Info */}
        {step === 0 && (
          <div className="space-y-5">
            <h2 className="text-lg font-heading font-bold text-slate-900 mb-4">Basic Information</h2>
            <Input label="Property Name" name="name" required />
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Type *</label><select value={form.type || 'hotel'} onChange={e => update('type', e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none"><option value="hotel">Hotel</option><option value="homestay">Homestay</option><option value="hostel">Hostel</option><option value="guesthouse">Guesthouse</option><option value="resort">Resort</option><option value="villa">Villa</option><option value="camp">Camp</option></select></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Star Rating</label><select value={form.star_rating || ''} onChange={e => update('star_rating', Number(e.target.value) || null)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none"><option value="">N/A</option>{[1,2,3,4,5].map(n => <option key={n} value={n}>{n} Star</option>)}</select></div>
            </div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Short Description</label><textarea value={form.short_description || ''} onChange={e => update('short_description', e.target.value)} rows={2} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none resize-none" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Full Description</label><textarea value={form.description || ''} onChange={e => update('description', e.target.value)} rows={5} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none resize-none" /></div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Total Rooms" name="total_rooms" type="number" />
              <Input label="Year Established" name="year_established" type="number" />
            </div>
            <h3 className="text-md font-semibold text-slate-800 pt-4">Contact Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Contact Name" name="contact_name" required />
              <Input label="Contact Phone" name="contact_phone" required />
              <Input label="Contact Email" name="contact_email" type="email" />
              <Input label="WhatsApp" name="contact_whatsapp" />
            </div>
          </div>
        )}

        {/* STEP 1: Location */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-heading font-bold mb-4">Location</h2>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Destination *</label><select value={form.destination_slug || ''} onChange={e => update('destination_slug', e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none"><option value="">Select</option><option value="dharamshala">Dharamshala</option><option value="mcleod-ganj">McLeod Ganj</option><option value="bhagsu">Bhagsu</option><option value="dharamkot">Dharamkot</option><option value="naddi">Naddi</option></select></div>
            <Input label="Address Line 1" name="address_line1" required />
            <Input label="Address Line 2" name="address_line2" />
            <div className="grid grid-cols-3 gap-4"><Input label="City" name="city" required /><Input label="State" name="state" /><Input label="Pincode" name="pincode" /></div>
            <Input label="Landmark" name="landmark" />
            <div className="grid grid-cols-2 gap-4"><Input label="Distance from Bus Stand" name="distance_from_bus_stand" /><Input label="Distance from Airport" name="distance_from_airport" /></div>
            <div className="grid grid-cols-2 gap-4"><Input label="Latitude" name="latitude" type="number" /><Input label="Longitude" name="longitude" type="number" /></div>
          </div>
        )}

        {/* STEP 2: Rooms */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-heading font-bold mb-4">Rooms & Pricing</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Check-in</label><input type="time" value={form.check_in_time || '14:00'} onChange={e => update('check_in_time', e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Check-out</label><input type="time" value={form.check_out_time || '11:00'} onChange={e => update('check_out_time', e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none" /></div>
            </div>
            {(form.rooms || []).map((room: any, idx: number) => (
              <div key={idx} className="border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between"><h3 className="font-semibold">Room Type {idx + 1}</h3>{(form.rooms || []).length > 1 && <button onClick={() => removeRoom(idx)} className="text-xs text-red-500">Remove</button>}</div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-medium mb-1">Name *</label><input value={room.name} onChange={e => updateRoom(idx, 'name', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
                  <div><label className="block text-xs font-medium mb-1">Bed Type</label><select value={room.bed_type} onChange={e => updateRoom(idx, 'bed_type', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"><option>Single</option><option>Double</option><option>Queen</option><option>King</option><option>Twin</option><option>Bunk</option></select></div>
                </div>
                <div><label className="block text-xs font-medium mb-1">Description</label><textarea value={room.description || ''} onChange={e => updateRoom(idx, 'description', e.target.value)} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none resize-none" /></div>
                <div className="grid grid-cols-4 gap-3">
                  <div><label className="block text-xs font-medium mb-1">Size</label><input value={room.room_size || ''} onChange={e => updateRoom(idx, 'room_size', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
                  <div><label className="block text-xs font-medium mb-1">Max Adults</label><input type="number" value={room.max_adults} onChange={e => updateRoom(idx, 'max_adults', +e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
                  <div><label className="block text-xs font-medium mb-1">Max Children</label><input type="number" value={room.max_children} onChange={e => updateRoom(idx, 'max_children', +e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
                  <div><label className="block text-xs font-medium mb-1">Inventory</label><input type="number" value={room.total_inventory} onChange={e => updateRoom(idx, 'total_inventory', +e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="block text-xs font-medium mb-1">Base Price *</label><input type="number" value={room.base_price || ''} onChange={e => updateRoom(idx, 'base_price', +e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
                  <div><label className="block text-xs font-medium mb-1">Weekend Price</label><input type="number" value={room.weekend_price || ''} onChange={e => updateRoom(idx, 'weekend_price', +e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
                  <div><label className="block text-xs font-medium mb-1">Peak Price</label><input type="number" value={room.peak_price || ''} onChange={e => updateRoom(idx, 'peak_price', +e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
                </div>
                <div><label className="block text-xs font-medium mb-1">Meal Plan</label><select value={room.meal_plan} onChange={e => updateRoom(idx, 'meal_plan', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"><option value="ep">Room Only (EP)</option><option value="cp">Breakfast (CP)</option><option value="map">Breakfast + Dinner (MAP)</option><option value="ap">All Meals (AP)</option></select></div>
              </div>
            ))}
            <button onClick={addRoom} className="w-full border-2 border-dashed border-slate-300 rounded-xl py-3 text-sm font-medium text-slate-600 hover:border-brand-400 hover:text-brand-600">+ Add Room Type</button>
          </div>
        )}

        {/* STEP 3: Amenities */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-heading font-bold">Amenities</h2>
            <div><h3 className="text-sm font-semibold text-slate-700 mb-3">Property</h3><div className="flex flex-wrap gap-2">{PROPERTY_AMENITIES.map(a => <Checkbox key={a} label={a} checked={(form.amenities || []).includes(a)} onChange={() => toggleArray('amenities', a)} />)}</div></div>
            <div><h3 className="text-sm font-semibold text-slate-700 mb-3">Room</h3><div className="flex flex-wrap gap-2">{ROOM_AMENITIES.map(a => <Checkbox key={a} label={a} checked={(form.room_amenities || []).includes(a)} onChange={() => toggleArray('room_amenities', a)} />)}</div></div>
            <div><h3 className="text-sm font-semibold text-slate-700 mb-3">Bathroom</h3><div className="flex flex-wrap gap-2">{BATHROOM_AMENITIES.map(a => <Checkbox key={a} label={a} checked={(form.bathroom_amenities || []).includes(a)} onChange={() => toggleArray('bathroom_amenities', a)} />)}</div></div>
            <div><h3 className="text-sm font-semibold text-slate-700 mb-3">Food</h3><div className="flex flex-wrap gap-2">{FOOD_OPTIONS.map(a => <Checkbox key={a} label={a} checked={(form.food_amenities || []).includes(a)} onChange={() => toggleArray('food_amenities', a)} />)}</div></div>
          </div>
        )}

        {/* STEP 4: Photos */}
        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-lg font-heading font-bold mb-4">Photos</h2>
            {(form.images || []).map((img: any, idx: number) => (
              <div key={idx} className="border border-slate-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between"><span className="text-sm font-medium">Photo {idx + 1}</span><button onClick={() => update('images', (form.images || []).filter((_: any, i: number) => i !== idx))} className="text-xs text-red-500">Remove</button></div>
                <input value={img.url || ''} onChange={e => { const imgs = [...(form.images || [])]; imgs[idx] = { ...imgs[idx], url: e.target.value }; update('images', imgs); }} placeholder="Photo URL" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" />
                <div className="grid grid-cols-3 gap-3">
                  <input value={img.alt || ''} onChange={e => { const imgs = [...(form.images || [])]; imgs[idx] = { ...imgs[idx], alt: e.target.value }; update('images', imgs); }} placeholder="Alt text" className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" />
                  <select value={img.category || 'exterior'} onChange={e => { const imgs = [...(form.images || [])]; imgs[idx] = { ...imgs[idx], category: e.target.value }; update('images', imgs); }} className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"><option value="exterior">Exterior</option><option value="room">Room</option><option value="bathroom">Bathroom</option><option value="restaurant">Restaurant</option><option value="view">View</option><option value="other">Other</option></select>
                  <Checkbox label="Primary" checked={img.is_primary || false} onChange={() => { const imgs = (form.images || []).map((im: any, i: number) => ({ ...im, is_primary: i === idx })); update('images', imgs); }} />
                </div>
                {img.url && <img src={img.url} alt={img.alt || ''} className="h-24 w-36 object-cover rounded-lg" />}
              </div>
            ))}
            <button onClick={() => update('images', [...(form.images || []), { url: '', alt: '', category: 'exterior', is_primary: !(form.images || []).length, sort_order: (form.images || []).length }])} className="w-full border-2 border-dashed border-slate-300 rounded-xl py-3 text-sm font-medium text-slate-600 hover:border-brand-400 hover:text-brand-600">+ Add Photo</button>
          </div>
        )}

        {/* STEP 5: Policies */}
        {step === 5 && (
          <div className="space-y-5">
            <h2 className="text-lg font-heading font-bold mb-4">Policies</h2>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Cancellation Policy</label><textarea value={form.cancellation_policy || ''} onChange={e => update('cancellation_policy', e.target.value)} rows={3} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none resize-none" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">Pet Policy</label><select value={form.pet_policy || 'No pets allowed'} onChange={e => update('pet_policy', e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm outline-none"><option>No pets allowed</option><option>Pets allowed</option><option>Pets allowed with restrictions</option></select></div>
              <div><label className="block text-sm font-medium mb-1">Smoking Policy</label><select value={form.smoking_policy || 'Non-smoking'} onChange={e => update('smoking_policy', e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm outline-none"><option>Non-smoking</option><option>Smoking allowed in designated areas</option><option>Smoking allowed</option></select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Alcohol Policy" name="alcohol_policy" />
              <Input label="Extra Bed Charge (₹)" name="extra_bed_charge" type="number" />
            </div>
            <Checkbox label="Couple Friendly" checked={form.couple_friendly !== false} onChange={() => update('couple_friendly', !form.couple_friendly)} />
            <Input label="Child Policy" name="child_policy" />
            <div><h3 className="text-sm font-semibold text-slate-700 mb-3">Accepted IDs</h3><div className="flex flex-wrap gap-2">{ID_TYPES.map(id => <Checkbox key={id} label={id} checked={(form.id_required || []).includes(id)} onChange={() => toggleArray('id_required', id)} />)}</div></div>
          </div>
        )}

        {/* Navigation */}
        {canEdit && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
            <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /> Previous</button>
            <div className="flex gap-3">
              <button onClick={() => handleSave(false)} disabled={saving} className="flex items-center gap-1.5 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Save className="h-4 w-4" /> Save</button>
              {step < STEPS.length - 1 ? (
                <button onClick={() => setStep(step + 1)} className="flex items-center gap-1.5 bg-brand-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-700">Next <ChevronRight className="h-4 w-4" /></button>
              ) : (
                <button onClick={() => handleSave(true)} disabled={saving} className="flex items-center gap-1.5 bg-orange-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-50"><Send className="h-4 w-4" /> {form.status === 'changes_requested' ? 'Resubmit for Review' : 'Submit for Review'}</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

