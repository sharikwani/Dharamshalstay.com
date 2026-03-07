'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building,
  MapPin,
  Bed,
  Camera,
  Shield,
  ChevronRight,
  ChevronLeft,
  Save,
  Send,
  Check,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  PROPERTY_AMENITIES,
  ROOM_AMENITIES,
  BATHROOM_AMENITIES,
  FOOD_OPTIONS,
  ID_TYPES,
} from '@/types';
import { slugify } from '@/lib/utils';

const STEPS = [
  { id: 'basic', label: 'Basic Info', icon: Building },
  { id: 'location', label: 'Location', icon: MapPin },
  { id: 'rooms', label: 'Rooms & Pricing', icon: Bed },
  { id: 'amenities', label: 'Amenities', icon: Check },
  { id: 'photos', label: 'Photos', icon: Camera },
  { id: 'policies', label: 'Policies', icon: Shield },
];

function Input({
  label,
  name,
  type = 'text',
  required = false,
  placeholder = '',
  value,
  onValueChange,
  ...rest
}: any) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) =>
          onValueChange(type === 'number' ? Number(e.target.value) : e.target.value)
        }
        required={required}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
        {...rest}
      />
    </div>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
        checked
          ? 'bg-brand-50 border-brand-300 text-brand-700'
          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
      }`}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <div
        className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
          checked ? 'bg-brand-600 border-brand-600' : 'border-slate-300'
        }`}
      >
        {checked && <Check className="h-3 w-3 text-white" />}
      </div>
      {label}
    </label>
  );
}

export default function NewPropertyPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [form, setForm] = useState<Record<string, any>>({
    type: 'hotel',
    star_rating: 3,
    couple_friendly: true,
    tax_included: false,
    accepts_online_payment: false,
    amenities: [],
    room_amenities: [],
    bathroom_amenities: [],
    food_amenities: [],
    id_required: ['Aadhaar Card'],
    rooms: [
      {
        name: 'Standard Room',
        description: '',
        bed_type: 'Double',
        room_size: '',
        max_adults: 2,
        max_children: 1,
        max_occupancy: 3,
        base_price: 0,
        weekend_price: 0,
        peak_price: 0,
        meal_plan: 'ep',
        amenities: [],
        total_inventory: 1,
        is_active: true,
      },
    ],
    images: [],
    languages_spoken: ['English', 'Hindi'],
    check_in_time: '14:00',
    check_out_time: '11:00',
    state: 'Himachal Pradesh',
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/partner/login');
        return;
      }
      setUserId(user.id);
    });
  }, [router]);

  const update = (key: string, val: any) => setForm((prev) => ({ ...prev, [key]: val }));

  const toggleArray = (key: string, val: string) => {
    const arr = form[key] || [];
    update(
      key,
      arr.includes(val) ? arr.filter((v: string) => v !== val) : [...arr, val],
    );
  };

  const addRoom = () =>
    update('rooms', [
      ...form.rooms,
      {
        name: '',
        description: '',
        bed_type: 'Double',
        room_size: '',
        max_adults: 2,
        max_children: 1,
        max_occupancy: 3,
        base_price: 0,
        weekend_price: 0,
        peak_price: 0,
        meal_plan: 'ep',
        amenities: [],
        total_inventory: 1,
        is_active: true,
      },
    ]);

  const updateRoom = (idx: number, key: string, val: any) => {
    const rooms = [...form.rooms];
    rooms[idx] = { ...rooms[idx], [key]: val };
    update('rooms', rooms);
  };

  const removeRoom = (idx: number) =>
    update(
      'rooms',
      form.rooms.filter((_: any, i: number) => i !== idx),
    );

  async function handleSaveDraft() {
    setLoading(true);
    const slug = slugify(form.name || 'untitled-property');
    const payload = {
      ...form,
      owner_id: userId,
      status: 'draft',
      slug,
      price_min: Math.min(...form.rooms.map((r: any) => r.base_price || 0)),
      price_max: Math.max(...form.rooms.map((r: any) => r.base_price || 0)),
    };
    const { error } = await supabase.from('properties').insert(payload);
    setLoading(false);
    if (!error) router.push('/partner/dashboard');
    else alert('Error saving: ' + error.message);
  }

  async function handleSubmitForReview() {
    setLoading(true);
    const slug = slugify(form.name || 'untitled-property');
    const payload = {
      ...form,
      owner_id: userId,
      status: 'pending_review',
      slug,
      submitted_at: new Date().toISOString(),
      price_min: Math.min(...form.rooms.map((r: any) => r.base_price || 0)),
      price_max: Math.max(...form.rooms.map((r: any) => r.base_price || 0)),
    };
    const { error } = await supabase.from('properties').insert(payload);
    setLoading(false);
    if (!error) router.push('/partner/dashboard');
    else alert('Error submitting: ' + error.message);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-heading font-bold text-slate-900 mb-6">
        Add New Property
      </h1>

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto scrollbar-hide">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setStep(i)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              i === step
                ? 'bg-brand-600 text-white'
                : i < step
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <s.icon className="h-4 w-4" />
            {s.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        {/* STEP 0: Basic Info */}
        {step === 0 && (
          <div className="space-y-5">
            <h2 className="text-lg font-heading font-bold text-slate-900 mb-4">
              Property Basic Information
            </h2>
            <Input
              label="Property Name"
              name="name"
              required
              placeholder="e.g. Mountain View Homestay"
              value={form.name}
              onValueChange={(val: any) => update('name', val)}
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Property Type *
                </label>
                <select
                  value={form.type}
                  onChange={(e) => update('type', e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                >
                  <option value="hotel">Hotel</option>
                  <option value="homestay">Homestay</option>
                  <option value="hostel">Hostel</option>
                  <option value="guesthouse">Guesthouse</option>
                  <option value="resort">Resort</option>
                  <option value="villa">Villa</option>
                  <option value="camp">Camp</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Star Rating
                </label>
                <select
                  value={form.star_rating || ''}
                  onChange={(e) => update('star_rating', Number(e.target.value))}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                >
                  <option value="">N/A</option>
                  <option value="1">1 Star</option>
                  <option value="2">2 Star</option>
                  <option value="3">3 Star</option>
                  <option value="4">4 Star</option>
                  <option value="5">5 Star</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Short Description *
              </label>
              <textarea
                value={form.short_description || ''}
                onChange={(e) => update('short_description', e.target.value)}
                rows={2}
                placeholder="One line summary (shown in listings)"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Full Description *
              </label>
              <textarea
                value={form.description || ''}
                onChange={(e) => update('description', e.target.value)}
                rows={5}
                placeholder="Detailed description of your property, rooms, surroundings, USPs..."
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Total Rooms"
                name="total_rooms"
                type="number"
                placeholder="e.g. 10"
                value={form.total_rooms}
                onValueChange={(val: any) => update('total_rooms', val)}
              />
              <Input
                label="Year Established"
                name="year_established"
                type="number"
                placeholder="e.g. 2015"
                value={form.year_established}
                onValueChange={(val: any) => update('year_established', val)}
              />
            </div>
            <h3 className="text-md font-semibold text-slate-800 pt-4">
              Contact Details (for this property)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Contact Person Name"
                name="contact_name"
                required
                value={form.contact_name}
                onValueChange={(val: any) => update('contact_name', val)}
              />
              <Input
                label="Contact Phone"
                name="contact_phone"
                required
                placeholder="+91..."
                value={form.contact_phone}
                onValueChange={(val: any) => update('contact_phone', val)}
              />
              <Input
                label="Contact Email"
                name="contact_email"
                type="email"
                value={form.contact_email}
                onValueChange={(val: any) => update('contact_email', val)}
              />
              <Input
                label="WhatsApp Number"
                name="contact_whatsapp"
                placeholder="+91..."
                value={form.contact_whatsapp}
                onValueChange={(val: any) => update('contact_whatsapp', val)}
              />
            </div>
          </div>
        )}

        {/* STEP 1: Location */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-heading font-bold text-slate-900 mb-4">
              Location Details
            </h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Area / Destination *
              </label>
              <select
                value={form.destination_slug || ''}
                onChange={(e) => update('destination_slug', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              >
                <option value="">Select area</option>
                <option value="dharamshala">Dharamshala</option>
                <option value="mcleod-ganj">McLeod Ganj</option>
                <option value="bhagsu">Bhagsu</option>
                <option value="dharamkot">Dharamkot</option>
                <option value="naddi">Naddi</option>
              </select>
            </div>
            <Input
              label="Address Line 1"
              name="address_line1"
              required
              placeholder="Street, building name"
              value={form.address_line1}
              onValueChange={(val: any) => update('address_line1', val)}
            />
            <Input
              label="Address Line 2"
              name="address_line2"
              placeholder="Locality, area"
              value={form.address_line2}
              onValueChange={(val: any) => update('address_line2', val)}
            />
            <div className="grid grid-cols-3 gap-4">
              <Input
                label="City"
                name="city"
                required
                value={form.city}
                onValueChange={(val: any) => update('city', val)}
              />
              <Input
                label="State"
                name="state"
                value={form.state}
                onValueChange={(val: any) => update('state', val)}
              />
              <Input
                label="Pincode"
                name="pincode"
                placeholder="e.g. 176219"
                value={form.pincode}
                onValueChange={(val: any) => update('pincode', val)}
              />
            </div>
            <Input
              label="Nearest Landmark"
              name="landmark"
              placeholder="e.g. Near Dalai Lama Temple"
              value={form.landmark}
              onValueChange={(val: any) => update('landmark', val)}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Distance from Bus Stand"
                name="distance_from_bus_stand"
                placeholder="e.g. 2 km"
                value={form.distance_from_bus_stand}
                onValueChange={(val: any) => update('distance_from_bus_stand', val)}
              />
              <Input
                label="Distance from Airport"
                name="distance_from_airport"
                placeholder="e.g. 18 km"
                value={form.distance_from_airport}
                onValueChange={(val: any) => update('distance_from_airport', val)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Latitude"
                name="latitude"
                type="number"
                step="0.000001"
                placeholder="e.g. 32.2426"
                value={form.latitude}
                onValueChange={(val: any) => update('latitude', val)}
              />
              <Input
                label="Longitude"
                name="longitude"
                type="number"
                step="0.000001"
                placeholder="e.g. 76.3213"
                value={form.longitude}
                onValueChange={(val: any) => update('longitude', val)}
              />
            </div>
            <p className="text-xs text-slate-500">
              Tip: You can find coordinates by right-clicking your location on Google Maps.
            </p>
          </div>
        )}

        {/* STEP 2: Rooms & Pricing */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-heading font-bold text-slate-900 mb-4">
              Rooms & Pricing
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Check-in Time
                </label>
                <input
                  type="time"
                  value={form.check_in_time}
                  onChange={(e) => update('check_in_time', e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Check-out Time
                </label>
                <input
                  type="time"
                  value={form.check_out_time}
                  onChange={(e) => update('check_out_time', e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none"
                />
              </div>
            </div>

            {form.rooms.map((room: any, idx: number) => (
              <div key={idx} className="border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">Room Type {idx + 1}</h3>
                  {form.rooms.length > 1 && (
                    <button
                      onClick={() => removeRoom(idx)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Room Name *
                    </label>
                    <input
                      value={room.name}
                      onChange={(e) => updateRoom(idx, 'name', e.target.value)}
                      placeholder="e.g. Deluxe Mountain View"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Bed Type
                    </label>
                    <select
                      value={room.bed_type}
                      onChange={(e) => updateRoom(idx, 'bed_type', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
                    >
                      <option>Single</option>
                      <option>Double</option>
                      <option>Queen</option>
                      <option>King</option>
                      <option>Twin</option>
                      <option>Bunk</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={room.description}
                    onChange={(e) => updateRoom(idx, 'description', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none resize-none"
                  />
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Room Size
                    </label>
                    <input
                      value={room.room_size}
                      onChange={(e) => updateRoom(idx, 'room_size', e.target.value)}
                      placeholder="250 sq ft"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Max Adults
                    </label>
                    <input
                      type="number"
                      value={room.max_adults}
                      onChange={(e) => updateRoom(idx, 'max_adults', +e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Max Children
                    </label>
                    <input
                      type="number"
                      value={room.max_children}
                      onChange={(e) => updateRoom(idx, 'max_children', +e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Inventory
                    </label>
                    <input
                      type="number"
                      value={room.total_inventory}
                      onChange={(e) => updateRoom(idx, 'total_inventory', +e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Base Price (₹/night) *
                    </label>
                    <input
                      type="number"
                      value={room.base_price || ''}
                      onChange={(e) => updateRoom(idx, 'base_price', +e.target.value)}
                      placeholder="3000"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Weekend Price
                    </label>
                    <input
                      type="number"
                      value={room.weekend_price || ''}
                      onChange={(e) => updateRoom(idx, 'weekend_price', +e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Peak Season Price
                    </label>
                    <input
                      type="number"
                      value={room.peak_price || ''}
                      onChange={(e) => updateRoom(idx, 'peak_price', +e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Meal Plan
                  </label>
                  <select
                    value={room.meal_plan}
                    onChange={(e) => updateRoom(idx, 'meal_plan', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
                  >
                    <option value="ep">Room Only (EP)</option>
                    <option value="cp">Breakfast Included (CP)</option>
                    <option value="map">Breakfast + Dinner (MAP)</option>
                    <option value="ap">All Meals (AP)</option>
                  </select>
                </div>
              </div>
            ))}
            <button
              onClick={addRoom}
              className="w-full border-2 border-dashed border-slate-300 rounded-xl py-3 text-sm font-medium text-slate-600 hover:border-brand-400 hover:text-brand-600 transition-colors"
            >
              + Add Another Room Type
            </button>
            <div className="flex items-center gap-4 pt-2">
              <Checkbox
                label="Tax Included in Price"
                checked={form.tax_included}
                onChange={() => update('tax_included', !form.tax_included)}
              />
              <Checkbox
                label="Accepts Online Payment"
                checked={form.accepts_online_payment}
                onChange={() =>
                  update('accepts_online_payment', !form.accepts_online_payment)
                }
              />
            </div>
          </div>
        )}

        {/* STEP 3: Amenities */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-heading font-bold text-slate-900">
              Amenities & Facilities
            </h2>
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                Property Amenities
              </h3>
              <div className="flex flex-wrap gap-2">
                {PROPERTY_AMENITIES.map((a) => (
                  <Checkbox
                    key={a}
                    label={a}
                    checked={form.amenities.includes(a)}
                    onChange={() => toggleArray('amenities', a)}
                  />
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                Room Amenities
              </h3>
              <div className="flex flex-wrap gap-2">
                {ROOM_AMENITIES.map((a) => (
                  <Checkbox
                    key={a}
                    label={a}
                    checked={form.room_amenities.includes(a)}
                    onChange={() => toggleArray('room_amenities', a)}
                  />
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Bathroom</h3>
              <div className="flex flex-wrap gap-2">
                {BATHROOM_AMENITIES.map((a) => (
                  <Checkbox
                    key={a}
                    label={a}
                    checked={form.bathroom_amenities.includes(a)}
                    onChange={() => toggleArray('bathroom_amenities', a)}
                  />
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                Food & Dining
              </h3>
              <div className="flex flex-wrap gap-2">
                {FOOD_OPTIONS.map((a) => (
                  <Checkbox
                    key={a}
                    label={a}
                    checked={form.food_amenities.includes(a)}
                    onChange={() => toggleArray('food_amenities', a)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Photos */}
        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-lg font-heading font-bold text-slate-900 mb-4">
              Property Photos
            </h2>
            <p className="text-sm text-slate-600 mb-4">
              Add photo URLs for your property. You can upload photos to Supabase
              Storage or use external URLs. Minimum 3 photos recommended.
            </p>
            <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
              Tip: For best results, use landscape photos (16:9 ratio) at least 1200px
              wide. Show rooms, exterior, views, bathroom, restaurant/café.
            </p>
            {(form.images || []).map((img: any, idx: number) => (
              <div key={idx} className="border border-slate-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">
                    Photo {idx + 1}
                  </span>
                  <button
                    onClick={() =>
                      update(
                        'images',
                        form.images.filter((_: any, i: number) => i !== idx),
                      )
                    }
                    className="text-xs text-red-500"
                  >
                    Remove
                  </button>
                </div>
                <input
                  value={img.url}
                  onChange={(e) => {
                    const imgs = [...form.images];
                    imgs[idx] = { ...imgs[idx], url: e.target.value };
                    update('images', imgs);
                  }}
                  placeholder="https://... photo URL"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
                />
                <div className="grid grid-cols-3 gap-3">
                  <input
                    value={img.alt}
                    onChange={(e) => {
                      const imgs = [...form.images];
                      imgs[idx] = { ...imgs[idx], alt: e.target.value };
                      update('images', imgs);
                    }}
                    placeholder="Alt text"
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
                  />
                  <select
                    value={img.category}
                    onChange={(e) => {
                      const imgs = [...form.images];
                      imgs[idx] = { ...imgs[idx], category: e.target.value };
                      update('images', imgs);
                    }}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
                  >
                    <option value="exterior">Exterior</option>
                    <option value="room">Room</option>
                    <option value="bathroom">Bathroom</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="view">View</option>
                    <option value="lobby">Lobby</option>
                    <option value="pool">Pool</option>
                    <option value="other">Other</option>
                  </select>
                  <Checkbox
                    label="Primary Photo"
                    checked={img.is_primary}
                    onChange={() => {
                      const imgs = form.images.map((im: any, i: number) => ({
                        ...im,
                        is_primary: i === idx,
                      }));
                      update('images', imgs);
                    }}
                  />
                </div>
              </div>
            ))}
            <button
              onClick={() =>
                update('images', [
                  ...(form.images || []),
                  {
                    url: '',
                    alt: '',
                    category: 'exterior',
                    is_primary: form.images.length === 0,
                    sort_order: form.images.length,
                  },
                ])
              }
              className="w-full border-2 border-dashed border-slate-300 rounded-xl py-3 text-sm font-medium text-slate-600 hover:border-brand-400 hover:text-brand-600"
            >
              + Add Photo
            </button>
          </div>
        )}

        {/* STEP 5: Policies */}
        {step === 5 && (
          <div className="space-y-5">
            <h2 className="text-lg font-heading font-bold text-slate-900 mb-4">
              Policies & Rules
            </h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Cancellation Policy *
              </label>
              <textarea
                value={form.cancellation_policy || ''}
                onChange={(e) => update('cancellation_policy', e.target.value)}
                rows={3}
                placeholder="Describe your cancellation and refund policy..."
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Pet Policy
                </label>
                <select
                  value={form.pet_policy}
                  onChange={(e) => update('pet_policy', e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none"
                >
                  <option>No pets allowed</option>
                  <option>Pets allowed</option>
                  <option>Pets allowed with restrictions</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Smoking Policy
                </label>
                <select
                  value={form.smoking_policy}
                  onChange={(e) => update('smoking_policy', e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none"
                >
                  <option>Non-smoking</option>
                  <option>Smoking allowed in designated areas</option>
                  <option>Smoking allowed</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Alcohol Policy
                </label>
                <input
                  value={form.alcohol_policy || ''}
                  onChange={(e) => update('alcohol_policy', e.target.value)}
                  placeholder="e.g. Bar available / BYO / Not allowed"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Extra Bed Charge (₹)
                </label>
                <input
                  type="number"
                  value={form.extra_bed_charge || ''}
                  onChange={(e) => update('extra_bed_charge', +e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none"
                />
              </div>
            </div>
            <Checkbox
              label="Couple Friendly (unmarried couples welcome)"
              checked={form.couple_friendly}
              onChange={() => update('couple_friendly', !form.couple_friendly)}
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Child Policy
              </label>
              <input
                value={form.child_policy || ''}
                onChange={(e) => update('child_policy', e.target.value)}
                placeholder="e.g. Children under 5 stay free"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none"
              />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                Accepted ID Types
              </h3>
              <div className="flex flex-wrap gap-2">
                {ID_TYPES.map((id) => (
                  <Checkbox
                    key={id}
                    label={id}
                    checked={form.id_required.includes(id)}
                    onChange={() => toggleArray('id_required', id)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleSaveDraft}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Save className="h-4 w-4" /> Save Draft
            </button>
            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="flex items-center gap-1.5 bg-brand-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-700"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmitForReview}
                disabled={loading}
                className="flex items-center gap-1.5 bg-orange-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-50"
              >
                <Send className="h-4 w-4" /> Submit for Review
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}