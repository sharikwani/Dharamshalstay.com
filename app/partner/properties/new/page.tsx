'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building, MapPin, Bed, Camera, Shield, ChevronRight, ChevronLeft, Save, Send, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PROPERTY_AMENITIES, ROOM_AMENITIES, BATHROOM_AMENITIES, FOOD_OPTIONS, ID_TYPES } from '@/types';
import { slugify } from '@/lib/utils';
import { PropertyInput, PropertyCheckbox } from '@/components/forms/PropertyFormFields';
import ImageUploader, { ImageEntry } from '@/components/forms/ImageUploader';

const STEPS = [
  { id: 'basic', label: 'Basic Info', icon: Building },
  { id: 'location', label: 'Location', icon: MapPin },
  { id: 'rooms', label: 'Rooms & Pricing', icon: Bed },
  { id: 'amenities', label: 'Amenities', icon: Check },
  { id: 'photos', label: 'Photos', icon: Camera },
  { id: 'policies', label: 'Policies', icon: Shield },
];

export default function NewPropertyPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [form, setForm] = useState<Record<string, any>>({
    type: 'hotel', star_rating: 3, couple_friendly: true, tax_included: false, accepts_online_payment: false,
    amenities: [], room_amenities: [], bathroom_amenities: [], food_amenities: [], id_required: ['Aadhaar Card'],
    rooms: [{ name: 'Standard Room', description: '', bed_type: 'Double', room_size: '', max_adults: 2, max_children: 1, max_occupancy: 3, base_price: 0, weekend_price: 0, peak_price: 0, meal_plan: 'ep', amenities: [], total_inventory: 1, is_active: true }],
    images: [], languages_spoken: ['English', 'Hindi'], check_in_time: '14:00', check_out_time: '11:00',
    state: 'Himachal Pradesh',
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/partner/login'); return; }
      setUserId(user.id);
    });
  }, [router]);

  const update = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));
  const toggleArray = (key: string, val: string) => {
    const arr = form[key] || [];
    update(key, arr.includes(val) ? arr.filter((v: string) => v !== val) : [...arr, val]);
  };

  const addRoom = () => update('rooms', [...form.rooms, { name: '', description: '', bed_type: 'Double', room_size: '', max_adults: 2, max_children: 1, max_occupancy: 3, base_price: 0, weekend_price: 0, peak_price: 0, meal_plan: 'ep', amenities: [], total_inventory: 1, is_active: true }]);
  const updateRoom = (idx: number, key: string, val: any) => {
    const rooms = [...form.rooms];
    rooms[idx] = { ...rooms[idx], [key]: val };
    update('rooms', rooms);
  };
  const removeRoom = (idx: number) => update('rooms', form.rooms.filter((_: any, i: number) => i !== idx));

  async function handleSaveDraft() {
    setLoading(true);
    const slug = slugify(form.name || 'untitled-property');
    const payload = { ...form, owner_id: userId, status: 'draft', slug, price_min: Math.min(...form.rooms.map((r: any) => r.base_price || 0)), price_max: Math.max(...form.rooms.map((r: any) => r.base_price || 0)) };
    const { error } = await supabase.from('properties').insert(payload);
    setLoading(false);
    if (!error) router.push('/partner/dashboard');
    else alert('Error saving: ' + error.message);
  }

  async function handleSubmitForReview() {
    setLoading(true);
    const slug = slugify(form.name || 'untitled-property');
    const payload = { ...form, owner_id: userId, status: 'pending_review', slug, submitted_at: new Date().toISOString(), price_min: Math.min(...form.rooms.map((r: any) => r.base_price || 0)), price_max: Math.max(...form.rooms.map((r: any) => r.base_price || 0)) };
    const { error } = await supabase.from('properties').insert(payload);
    setLoading(false);
    if (!error) router.push('/partner/dashboard');
    else alert('Error submitting: ' + error.message);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-heading font-bold text-slate-900 mb-6">Add New Property</h1>

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
            <h2 className="text-lg font-heading font-bold text-slate-900 mb-4">Property Basic Information</h2>
            <PropertyInput label="Property Name" name="name" required placeholder="e.g. Mountain View Homestay" value={form.name} onChange={v => update('name', v)} />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Property Type *</label>
                <select value={form.type} onChange={e => update('type', e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none">
                  <option value="hotel">Hotel</option><option value="homestay">Homestay</option><option value="hostel">Hostel</option>
                  <option value="guesthouse">Guesthouse</option><option value="resort">Resort</option><option value="villa">Villa</option><option value="camp">Camp</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Star Rating</label>
                <select value={form.star_rating || ''} onChange={e => update('star_rating', Number(e.target.value))} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none">
                  <option value="">N/A</option><option value="1">1 Star</option><option value="2">2 Star</option><option value="3">3 Star</option><option value="4">4 Star</option><option value="5">5 Star</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Short Description *</label>
              <textarea value={form.short_description || ''} onChange={e => update('short_description', e.target.value)} rows={2} placeholder="One line summary (shown in listings)" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Description *</label>
              <textarea value={form.description || ''} onChange={e => update('description', e.target.value)} rows={5} placeholder="Detailed description of your property..." className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <PropertyInput label="Total Rooms" name="total_rooms" type="number" placeholder="e.g. 10" value={form.total_rooms} onChange={v => update('total_rooms', v)} />
              <PropertyInput label="Year Established" name="year_established" type="number" placeholder="e.g. 2015" value={form.year_established} onChange={v => update('year_established', v)} />
            </div>
            <h3 className="text-md font-semibold text-slate-800 pt-4">Contact Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <PropertyInput label="Contact Person Name" name="contact_name" required value={form.contact_name} onChange={v => update('contact_name', v)} />
              <PropertyInput label="Contact Phone" name="contact_phone" required placeholder="+91..." value={form.contact_phone} onChange={v => update('contact_phone', v)} />
              <PropertyInput label="Contact Email" name="contact_email" type="email" value={form.contact_email} onChange={v => update('contact_email', v)} />
              <PropertyInput label="WhatsApp Number" name="contact_whatsapp" placeholder="+91..." value={form.contact_whatsapp} onChange={v => update('contact_whatsapp', v)} />
            </div>
          </div>
        )}

        {/* STEP 1: Location */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-heading font-bold text-slate-900 mb-4">Location Details</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Area / Destination *</label>
              <select value={form.destination_slug || ''} onChange={e => update('destination_slug', e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none">
                <option value="">Select area</option><option value="dharamshala">Dharamshala</option><option value="mcleod-ganj">McLeod Ganj</option>
                <option value="bhagsu">Bhagsu</option><option value="dharamkot">Dharamkot</option><option value="naddi">Naddi</option>
              </select>
            </div>
            <PropertyInput label="Address Line 1" name="address_line1" required placeholder="Street, building name" value={form.address_line1} onChange={v => update('address_line1', v)} />
            <PropertyInput label="Address Line 2" name="address_line2" placeholder="Locality, area" value={form.address_line2} onChange={v => update('address_line2', v)} />
            <div className="grid grid-cols-3 gap-4">
              <PropertyInput label="City" name="city" required value={form.city} onChange={v => update('city', v)} />
              <PropertyInput label="State" name="state" value={form.state} onChange={v => update('state', v)} />
              <PropertyInput label="Pincode" name="pincode" placeholder="e.g. 176219" value={form.pincode} onChange={v => update('pincode', v)} />
            </div>
            <PropertyInput label="Nearest Landmark" name="landmark" placeholder="e.g. Near Dalai Lama Temple" value={form.landmark} onChange={v => update('landmark', v)} />
            <div className="grid grid-cols-2 gap-4">
              <PropertyInput label="Distance from Bus Stand" name="distance_from_bus_stand" placeholder="e.g. 2 km" value={form.distance_from_bus_stand} onChange={v => update('distance_from_bus_stand', v)} />
              <PropertyInput label="Distance from Airport" name="distance_from_airport" placeholder="e.g. 18 km" value={form.distance_from_airport} onChange={v => update('distance_from_airport', v)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <PropertyInput label="Latitude" name="latitude" type="number" step="0.000001" placeholder="e.g. 32.2426" value={form.latitude} onChange={v => update('latitude', v)} />
              <PropertyInput label="Longitude" name="longitude" type="number" step="0.000001" placeholder="e.g. 76.3213" value={form.longitude} onChange={v => update('longitude', v)} />
            </div>
            <p className="text-xs text-slate-500">Tip: Right-click your location on Google Maps to copy coordinates.</p>
          </div>
        )}

        {/* STEP 2: Rooms & Pricing */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-heading font-bold text-slate-900 mb-4">Rooms & Pricing</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Check-in Time</label>
                <input type="time" value={form.check_in_time} onChange={e => update('check_in_time', e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Check-out Time</label>
                <input type="time" value={form.check_out_time} onChange={e => update('check_out_time', e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none" />
              </div>
            </div>

            {form.rooms.map((room: any, idx: number) => (
              <div key={idx} className="border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">Room Type {idx + 1}</h3>
                  {form.rooms.length > 1 && <button onClick={() => removeRoom(idx)} className="text-xs text-red-500 hover:text-red-700">Remove</button>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-medium text-slate-700 mb-1">Room Name *</label><input value={room.name} onChange={e => updateRoom(idx, 'name', e.target.value)} placeholder="e.g. Deluxe Mountain View" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
                  <div><label className="block text-xs font-medium text-slate-700 mb-1">Bed Type</label>
                    <select value={room.bed_type} onChange={e => updateRoom(idx, 'bed_type', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none">
                      <option>Single</option><option>Double</option><option>Queen</option><option>King</option><option>Twin</option><option>Bunk</option>
                    </select>
                  </div>
                </div>
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Description</label><textarea value={room.description} onChange={e => updateRoom(idx, 'description', e.target.value)} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none resize-none" /></div>
                <div className="grid grid-cols-4 gap-3">
                  <div><label className="block text-xs font-medium text-slate-700 mb-1">Room Size</label><input value={room.room_size} onChange={e => updateRoom(idx, 'room_size', e.target.value)} placeholder="250 sq ft" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
                  <div><label className="block text-xs font-medium text-slate-700 mb-1">Max Adults</label><input type="number" value={room.max_adults} onChange={e => updateRoom(idx, 'max_adults', +e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
                  <div><label className="block text-xs font-medium text-slate-700 mb-1">Max Children</label><input type="number" value={room.max_children} onChange={e => updateRoom(idx, 'max_children', +e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
                  <div><label className="block text-xs font-medium text-slate-700 mb-1">Inventory</label><input type="number" value={room.total_inventory} onChange={e => updateRoom(idx, 'total_inventory', +e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="block text-xs font-medium text-slate-700 mb-1">Base Price (₹/night) *</label><input type="number" value={room.base_price || ''} onChange={e => updateRoom(idx, 'base_price', +e.target.value)} placeholder="3000" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
                  <div><label className="block text-xs font-medium text-slate-700 mb-1">Weekend Price</label><input type="number" value={room.weekend_price || ''} onChange={e => updateRoom(idx, 'weekend_price', +e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
                  <div><label className="block text-xs font-medium text-slate-700 mb-1">Peak Season Price</label><input type="number" value={room.peak_price || ''} onChange={e => updateRoom(idx, 'peak_price', +e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
                </div>
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Meal Plan</label>
                  <select value={room.meal_plan} onChange={e => updateRoom(idx, 'meal_plan', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none">
                    <option value="ep">Room Only (EP)</option><option value="cp">Breakfast Included (CP)</option><option value="map">Breakfast + Dinner (MAP)</option><option value="ap">All Meals (AP)</option>
                  </select>
                </div>
              </div>
            ))}
            <button onClick={addRoom} className="w-full border-2 border-dashed border-slate-300 rounded-xl py-3 text-sm font-medium text-slate-600 hover:border-brand-400 hover:text-brand-600 transition-colors">+ Add Another Room Type</button>
            <div className="flex items-center gap-4 pt-2">
              <PropertyCheckbox label="Tax Included in Price" checked={form.tax_included} onChange={() => update('tax_included', !form.tax_included)} />
              <PropertyCheckbox label="Accepts Online Payment" checked={form.accepts_online_payment} onChange={() => update('accepts_online_payment', !form.accepts_online_payment)} />
            </div>
          </div>
        )}

        {/* STEP 3: Amenities */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-heading font-bold text-slate-900">Amenities & Facilities</h2>
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Property Amenities</h3>
              <div className="flex flex-wrap gap-2">{PROPERTY_AMENITIES.map(a => <PropertyCheckbox key={a} label={a} checked={form.amenities.includes(a)} onChange={() => toggleArray('amenities', a)} />)}</div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Room Amenities</h3>
              <div className="flex flex-wrap gap-2">{ROOM_AMENITIES.map(a => <PropertyCheckbox key={a} label={a} checked={form.room_amenities.includes(a)} onChange={() => toggleArray('room_amenities', a)} />)}</div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Bathroom</h3>
              <div className="flex flex-wrap gap-2">{BATHROOM_AMENITIES.map(a => <PropertyCheckbox key={a} label={a} checked={form.bathroom_amenities.includes(a)} onChange={() => toggleArray('bathroom_amenities', a)} />)}</div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Food & Dining</h3>
              <div className="flex flex-wrap gap-2">{FOOD_OPTIONS.map(a => <PropertyCheckbox key={a} label={a} checked={form.food_amenities.includes(a)} onChange={() => toggleArray('food_amenities', a)} />)}</div>
            </div>
          </div>
        )}

        {/* STEP 4: Photos — now uses Supabase Storage upload */}
        {step === 4 && (
          <ImageUploader
            images={form.images || []}
            onChange={(imgs) => update('images', imgs)}
            userId={userId}
            propertySlug={slugify(form.name || 'temp')}
          />
        )}

        {/* STEP 5: Policies */}
        {step === 5 && (
          <div className="space-y-5">
            <h2 className="text-lg font-heading font-bold text-slate-900 mb-4">Policies & Rules</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cancellation Policy *</label>
              <textarea value={form.cancellation_policy || ''} onChange={e => update('cancellation_policy', e.target.value)} rows={3} placeholder="Describe your cancellation and refund policy..." className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Pet Policy</label><select value={form.pet_policy} onChange={e => update('pet_policy', e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none"><option>No pets allowed</option><option>Pets allowed</option><option>Pets allowed with restrictions</option></select></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Smoking Policy</label><select value={form.smoking_policy} onChange={e => update('smoking_policy', e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none"><option>Non-smoking</option><option>Smoking allowed in designated areas</option><option>Smoking allowed</option></select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <PropertyInput label="Alcohol Policy" name="alcohol_policy" placeholder="e.g. Bar available / BYO / Not allowed" value={form.alcohol_policy} onChange={v => update('alcohol_policy', v)} />
              <PropertyInput label="Extra Bed Charge (₹)" name="extra_bed_charge" type="number" value={form.extra_bed_charge} onChange={v => update('extra_bed_charge', v)} />
            </div>
            <PropertyCheckbox label="Couple Friendly (unmarried couples welcome)" checked={form.couple_friendly} onChange={() => update('couple_friendly', !form.couple_friendly)} />
            <PropertyInput label="Child Policy" name="child_policy" placeholder="e.g. Children under 5 stay free" value={form.child_policy} onChange={v => update('child_policy', v)} />
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Accepted ID Types</h3>
              <div className="flex flex-wrap gap-2">{ID_TYPES.map(id => <PropertyCheckbox key={id} label={id} checked={form.id_required.includes(id)} onChange={() => toggleArray('id_required', id)} />)}</div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
          <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <div className="flex gap-3">
            <button onClick={handleSaveDraft} disabled={loading} className="flex items-center gap-1.5 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              <Save className="h-4 w-4" /> Save Draft
            </button>
            {step < STEPS.length - 1 ? (
              <button onClick={() => setStep(step + 1)} className="flex items-center gap-1.5 bg-brand-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-700">
                Next <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={handleSubmitForReview} disabled={loading} className="flex items-center gap-1.5 bg-orange-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-50">
                <Send className="h-4 w-4" /> Submit for Review
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
