'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, Trash2, Plus, X, LinkIcon, Check, Eye, ShieldCheck, ArrowUp, ArrowDown, Star, CalendarDays, BedDouble } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { slugify } from '@/lib/utils';
import { notifyHotelChanged } from '@/lib/indexnow-client';

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

  function addPropertyImage(url: string) {
    if (!url.trim().startsWith('http')) return;
    u('images', [...(form.images || []), { url: url.trim(), alt: '', category: 'exterior', is_primary: !(form.images?.length), sort_order: form.images?.length || 0 }]);
  }

  function reindex(imgs: any[]) {
    return imgs.map((im: any, n: number) => ({ ...(typeof im === 'string' ? { url: im } : im), is_primary: n === 0, sort_order: n }));
  }

  function moveImage(i: number, dir: -1 | 1) {
    const imgs = [...(form.images || [])];
    const j = i + dir;
    if (j < 0 || j >= imgs.length) return;
    [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
    u('images', reindex(imgs));
  }

  function makePrimary(i: number) {
    const imgs = [...(form.images || [])];
    const [m] = imgs.splice(i, 1);
    u('images', reindex([m, ...imgs]));
  }

  function updateImage(i: number, key: string, val: any) {
    const imgs = [...(form.images || [])];
    imgs[i] = { ...(typeof imgs[i] === 'string' ? { url: imgs[i] } : imgs[i]), [key]: val };
    u('images', imgs);
  }

  function setCompliance(key: string, val: boolean) {
    u('compliance', { ...(form.compliance || {}), [key]: val });
  }

  async function handleSave() {
    setSaving(true); setError(''); setSuccess('');
    // Keep the existing URL unless the admin edits the slug on purpose:
    // silently changing it on rename breaks links and search rankings.
    const slug = slugify(form.slug || form.name || 'property');
    // Rooms, room count and the price range belong to the Rooms page (it saves with a conflict check and
    // keeps bookings and offers in step on rename). Saving them here would overwrite newer room changes.
    const payload = { ...form, slug, updated_at: new Date().toISOString() };
    for (const key of ROOMS_PAGE_FIELDS) delete payload[key];
    delete payload.created_at;
    // Rating and review count are recomputed from approved guest reviews (lib/reviews/store.ts).
    delete payload.rating;
    delete payload.review_count;
    if (form.status === 'published' && !form.published_at) payload.published_at = new Date().toISOString();
    const { error: e } = await supabase.from('properties').update(payload).eq('id', params.id);
    setSaving(false);
    if (e) setError('Error: ' + e.message);
    else {
      setSuccess('Saved successfully!');
      if (form.status === 'published') void notifyHotelChanged(slug);
    }
  }

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="h-8 w-8 text-brand-600 animate-spin" /></div>;

  // A render helper, not a component: a component declared inside render is
  // re-created every keystroke, which made inputs lose focus while typing.
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

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900">Edit: {form.name}</h1>
          <p className="text-sm text-slate-500">Status: <span className="font-medium capitalize">{form.status?.replace(/_/g, ' ')}</span></p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link href={`/admin/properties/${params.id}/availability`} className="flex items-center gap-2 border border-brand-200 text-brand-700 px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-brand-50">
            <CalendarDays className="h-4 w-4" /> Room availability
          </Link>
          <Link href={`/admin/properties/${params.id}/rooms`} className="flex items-center gap-2 border border-brand-200 text-brand-700 px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-brand-50">
            <BedDouble className="h-4 w-4" /> Rooms
          </Link>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-brand-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-brand-700 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg mb-4 flex items-center gap-2"><Check className="h-4 w-4" />{success}</div>}

      <div className="space-y-6">
        {/* Listing & visibility */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold text-lg">Listing &amp; Visibility</h2>
            {form.status === 'published' && form.slug && (
              <Link href={'/hotels/' + form.slug} target="_blank" className="text-sm text-green-700 flex items-center gap-1"><Eye className="h-4 w-4" /> View live</Link>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select value={form.status || 'draft'} onChange={e => u('status', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none">
                <option value="published">Published (live on website)</option>
                <option value="suspended">Suspended (blocked, hidden)</option>
                <option value="pending_review">Pending review</option>
                <option value="changes_requested">Changes requested</option>
                <option value="draft">Draft</option>
                <option value="rejected">Rejected</option>
              </select></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Listing type</label>
              <select value={form.listing_type || 'partner'} onChange={e => u('listing_type', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none">
                <option value="partner">Partner (rooms, prices, bookable)</option>
                <option value="directory">Directory (rates on request)</option>
              </select></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">URL slug (/hotels/...)</label>
              <input value={form.slug || ''} onChange={e => u('slug', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" />
              <p className="text-[11px] text-amber-700 mt-1">Changing this changes the page URL.</p></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.featured} onChange={e => u('featured', e.target.checked)} /> Featured</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.is_sponsored} onChange={e => u('is_sponsored', e.target.checked)} /> Sponsored</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.whatsapp_alerts} onChange={e => u('whatsapp_alerts', e.target.checked)} /> Send booking alerts to this property&apos;s phone on WhatsApp</label>
            {Input({ label: "Priority (higher shows first)", field: "priority_score", type: "number" })}
            {Input({ label: "Commission %", field: "commission_pct", type: "number" })}
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="font-heading font-bold text-lg">Basic Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Input({ label: "Property Name", field: "name" })}
            <div className="grid grid-cols-3 gap-2">
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
                <select value={form.type || 'hotel'} onChange={e => u('type', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none">
                  <option value="hotel">Hotel</option><option value="homestay">Homestay</option><option value="hostel">Hostel</option><option value="resort">Resort</option><option value="guesthouse">Guesthouse</option><option value="villa">Villa</option><option value="camp">Camp</option></select></div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Stars</label>
                <select value={form.star_rating || ''} onChange={e => u('star_rating', Number(e.target.value) || null)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none">
                  <option value="">N/A</option>{[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}</select></div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Area</label>
                <select value={form.destination_slug || ''} onChange={e => u('destination_slug', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none">
                  <option value="dharamshala">Dharamshala</option><option value="mcleod-ganj">McLeod Ganj</option><option value="bhagsu">Bhagsu</option><option value="dharamkot">Dharamkot</option><option value="naddi">Naddi</option></select></div>
            </div>
          </div>
          {Input({ label: "Short Description", field: "short_description" })}
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
            <textarea value={form.description || ''} onChange={e => u('description', e.target.value)} rows={4} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none resize-y" /></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Input({ label: "Address", field: "address_line1" })}
            {Input({ label: "City", field: "city" })}
            {Input({ label: "Pincode", field: "pincode" })}
            {Input({ label: "Landmark", field: "landmark" })}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Input({ label: "Check-in", field: "check_in_time" })}
            {Input({ label: "Check-out", field: "check_out_time" })}
          </div>
        </div>

        {/* SEO */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <h2 className="font-heading font-bold text-lg">SEO</h2>
          {Input({ label: "Meta Title", field: "meta_title", placeholder: "Leave blank for auto-generated" })}
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Meta Description</label>
            <textarea value={form.meta_description || ''} onChange={e => u('meta_description', e.target.value)} rows={2} placeholder="Leave blank for auto-generated" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none resize-none" /></div>
        </div>

        {/* Rooms: read-only here, edited on the Rooms page */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-heading font-bold text-lg">Rooms ({form.rooms?.length || 0})</h2>
              <p className="text-xs text-slate-500">Total rooms in the hotel: {form.total_rooms ?? 'not set'}. Room types, prices and room counts are changed on the Rooms page.</p>
            </div>
            <Link href={`/admin/properties/${params.id}/rooms`} className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-brand-700">
              <BedDouble className="h-4 w-4" /> Edit rooms
            </Link>
          </div>
          {(form.rooms || []).length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="py-2 pr-3 font-medium">Room</th><th className="py-2 pr-3 font-medium">Rooms</th><th className="py-2 pr-3 font-medium">Price / night</th><th className="py-2 font-medium">Status</th>
                </tr></thead>
                <tbody>
                  {(form.rooms || []).map((room: any, idx: number) => (
                    <tr key={room.id || idx} className="border-b border-slate-50 last:border-0">
                      <td className="py-2 pr-3 font-medium text-slate-800">{room.name || 'Unnamed room'}</td>
                      <td className="py-2 pr-3">{room.total_inventory || '-'}</td>
                      <td className="py-2 pr-3">{Number(room.base_price) > 0 ? 'Rs.' + Number(room.base_price).toLocaleString('en-IN') : '-'}</td>
                      <td className="py-2">{room.is_active === false
                        ? <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Off</span>
                        : <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">On</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="max-w-xs">
            {Input({ label: "Default extra bed charge (Rs. per night)", field: "extra_bed_charge", type: "number" })}
          </div>
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
                <div key={i} className="space-y-1">
                  <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-slate-100 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url || img} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => u('images', reindex(form.images.filter((_: any, ii: number) => ii !== i)))} title="Remove photo"
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100">x</button>
                    {i === 0 && <span className="absolute top-1 left-1 bg-brand-600 text-white text-[9px] px-1.5 py-0.5 rounded">Primary</span>}
                    <div className="absolute bottom-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100">
                      {i > 0 && <button onClick={() => moveImage(i, -1)} title="Move earlier" className="bg-white/90 rounded p-0.5"><ArrowUp className="h-3 w-3" /></button>}
                      {i < form.images.length - 1 && <button onClick={() => moveImage(i, 1)} title="Move later" className="bg-white/90 rounded p-0.5"><ArrowDown className="h-3 w-3" /></button>}
                      {i > 0 && <button onClick={() => makePrimary(i)} title="Make primary photo" className="bg-white/90 rounded p-0.5"><Star className="h-3 w-3" /></button>}
                    </div>
                  </div>
                  <input value={img.alt || ''} onChange={e => updateImage(i, 'alt', e.target.value)} placeholder="Alt text"
                    className="w-full px-1.5 py-1 border border-slate-200 rounded text-[11px] outline-none" />
                  <select value={img.category || 'other'} onChange={e => updateImage(i, 'category', e.target.value)}
                    className="w-full px-1.5 py-1 border border-slate-200 rounded text-[11px] outline-none">
                    {['exterior', 'lobby', 'room', 'bathroom', 'restaurant', 'pool', 'view', 'amenity', 'other'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Listing details shown on the public page */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="font-heading font-bold text-lg">Listing Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Input({ label: "Locality (e.g. Jogiwara Road, McLeod Ganj)", field: "locality" })}
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Price band</label>
              <select value={form.price_band || ''} onChange={e => u('price_band', e.target.value || null)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none">
                <option value="">Not set</option><option value="budget">Budget</option><option value="mid-range">Mid-range</option><option value="upscale">Upscale</option></select></div>
            {Input({ label: "Official website", field: "website", placeholder: "https://" })}
            {Input({ label: "Photo source (credited on the page)", field: "photo_source", placeholder: "https://" })}
          </div>
          <ListEditor label="Highlights" items={form.highlights || []} onChange={v => u('highlights', v)} />
          <ListEditor label="Good for (e.g. Couples, Backpackers)" items={form.good_for || []} onChange={v => u('good_for', v)} />
          <ListEditor label="Nearby (e.g. Dalai Lama Temple -- 10 min walk)" items={form.nearby || []} onChange={v => u('nearby', v)} />
        </div>

        {/* Policies */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="font-heading font-bold text-lg">Policies</h2>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Cancellation policy</label>
            <textarea value={form.cancellation_policy || ''} onChange={e => u('cancellation_policy', e.target.value)} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none resize-y" /></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            {Input({ label: "Pet policy", field: "pet_policy" })}
            {Input({ label: "Smoking policy", field: "smoking_policy" })}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.couple_friendly} onChange={e => u('couple_friendly', e.target.checked)} /> Couple friendly</label>
          </div>
        </div>

        {/* FAQs */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-bold text-lg">FAQs ({form.faqs?.length || 0})</h2>
            <button onClick={() => u('faqs', [...(form.faqs || []), { question: '', answer: '' }])} className="text-sm text-brand-600 flex items-center gap-1"><Plus className="h-4 w-4" /> Add FAQ</button>
          </div>
          {(form.faqs || []).map((f: any, i: number) => (
            <div key={i} className="border border-slate-200 rounded-lg p-3 mb-2 space-y-2">
              <div className="flex gap-2">
                <input value={f.question || ''} placeholder="Question" onChange={e => { const fs = [...form.faqs]; fs[i] = { ...fs[i], question: e.target.value }; u('faqs', fs); }}
                  className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-sm outline-none" />
                <button onClick={() => u('faqs', form.faqs.filter((_: any, ii: number) => ii !== i))} className="text-red-500"><Trash2 className="h-4 w-4" /></button>
              </div>
              <textarea value={f.answer || ''} placeholder="Answer" rows={2} onChange={e => { const fs = [...form.faqs]; fs[i] = { ...fs[i], answer: e.target.value }; u('faqs', fs); }}
                className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm outline-none resize-y" />
            </div>
          ))}
        </div>

        {/* Compliance */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-heading font-bold text-lg flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-green-600" />Compliance Check</h2>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-slate-500">Last verified: {form.last_verified_at ? new Date(form.last_verified_at).toLocaleDateString('en-IN') : 'never'}</span>
              <button onClick={() => u('last_verified_at', new Date().toISOString())} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700">Mark verified today</button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {COMPLIANCE_ITEMS.map(([key, label]) => (
              <label key={key} className="flex items-start gap-2 text-sm bg-slate-50 rounded-lg px-3 py-2">
                <input type="checkbox" className="mt-0.5" checked={!!form.compliance?.[key]} onChange={e => setCompliance(key, e.target.checked)} />{label}
              </label>
            ))}
          </div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Admin notes (private, never shown on the website)</label>
            <textarea value={form.admin_notes || ''} onChange={e => u('admin_notes', e.target.value)} rows={3}
              placeholder="Inspection notes, complaints, warnings given, licence numbers..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none resize-y" /></div>
        </div>

        {/* Amenities */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-heading font-bold text-lg mb-3">Amenities</h2>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {(form.amenities || []).map((a: string, i: number) => (
              <span key={i} className="text-xs bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full flex items-center gap-1">
                {a}<button onClick={() => u('amenities', form.amenities.filter((_: any, ii: number) => ii !== i))} className="text-brand-400 hover:text-red-500 ml-0.5">x</button>
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

/** Saved only by the Rooms page, never by this form. */
const ROOMS_PAGE_FIELDS = ['rooms', 'total_rooms', 'price_min', 'price_max'] as const;

const COMPLIANCE_ITEMS: [string, string][] = [
  ['licence', 'Registration / licence seen (HP Tourism)'],
  ['owner_contact', 'Owner or manager contact verified'],
  ['photos_genuine', 'Photos are genuine and current'],
  ['prices_honoured', 'Listed rates match what guests are charged'],
  ['policies_clear', 'Cancellation and house policies clearly stated'],
  ['hygiene', 'Clean rooms, hot water, as described'],
  ['safety', 'Basic fire and guest safety in place'],
  ['no_complaints', 'No unresolved guest complaints'],
];

function ListEditor({ label, items, onChange }: { label: string; items: string[]; onChange: (v: string[]) => void }) {
  const [val, setVal] = useState('');
  const add = () => { if (val.trim()) { onChange([...items, val.trim()]); setVal(''); } };
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <div className="space-y-1 mb-2">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-2 text-sm bg-slate-50 rounded px-2 py-1">
            <span className="flex-1">{it}</span>
            <button onClick={() => onChange(items.filter((_, ii) => ii !== i))} className="text-slate-400 hover:text-red-500"><X className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add(); }} placeholder="Add..."
          className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm outline-none" />
        <button onClick={add} className="px-3 py-1.5 bg-slate-100 rounded-lg text-sm hover:bg-slate-200">Add</button>
      </div>
    </div>
  );
}

// Small helper components
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
