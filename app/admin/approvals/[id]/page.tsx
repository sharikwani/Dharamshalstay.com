'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { CheckCircle, XCircle, MessageSquare, ArrowLeft, Building, MapPin, Bed, Camera, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';

export default function AdminApprovalDetail() {
  const router = useRouter();
  const params = useParams();
  const [property, setProperty] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<'approve' | 'request_changes' | 'reject' | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/admin/login'); return; }
      const { data } = await supabase.from('properties').select('*').eq('id', params.id).single();
      if (!data) { router.push('/admin/approvals'); return; }
      setProperty(data);
      setLoading(false);
    }
    load();
  }, [params.id, router]);

  async function handleApprove() {
    setAction('approve');
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('properties').update({
      status: 'published', published_at: new Date().toISOString(),
      reviewed_by: user?.id, reviewed_at: new Date().toISOString(),
      admin_notes: notes || null,
    }).eq('id', params.id);
    router.push('/admin/approvals');
  }

  async function handleRequestChanges() {
    setAction('request_changes');
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('properties').update({
      status: 'changes_requested',
      reviewed_by: user?.id, reviewed_at: new Date().toISOString(),
      admin_notes: notes,
    }).eq('id', params.id);
    router.push('/admin/approvals');
  }

  async function handleReject() {
    setAction('reject');
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('properties').update({
      status: 'rejected',
      reviewed_by: user?.id, reviewed_at: new Date().toISOString(),
      rejection_reason: reason, admin_notes: notes || null,
    }).eq('id', params.id);
    router.push('/admin/approvals');
  }

  // Admin can edit any field inline
  async function updateField(field: string, value: any) {
    setProperty((prev: any) => ({ ...prev, [field]: value }));
    await supabase.from('properties').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', params.id);
  }

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><p>Loading...</p></div>;
  if (!property) return null;

  const p = property;
  const EditableField = ({ label, field, type = 'text', multiline = false }: { label: string; field: string; type?: string; multiline?: boolean }) => (
    <div className="mb-3">
      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{label}</label>
      {multiline ? (
        <textarea value={p[field] || ''} onChange={e => updateField(field, e.target.value)} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none" />
      ) : (
        <input type={type} value={p[field] || ''} onChange={e => updateField(field, type === 'number' ? Number(e.target.value) : e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
      )}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-800 mb-6"><ArrowLeft className="h-4 w-4" /> Back to Approvals</button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <span className="text-xs font-medium px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full uppercase">{p.status?.replace(/_/g, ' ')}</span>
          <h1 className="text-2xl font-heading font-bold text-slate-900 mt-2">{p.name || 'Untitled Property'}</h1>
          <p className="text-slate-500 text-sm capitalize">{p.type} · {p.destination_slug?.replace(/-/g, ' ')} · {p.city}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Property details -- editable by admin */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-lg font-heading font-bold text-slate-900 mb-4 flex items-center gap-2"><Building className="h-5 w-5 text-brand-500" /> Basic Info</h2>
            <EditableField label="Property Name" field="name" />
            <div className="grid grid-cols-2 gap-3">
              <EditableField label="Type" field="type" />
              <EditableField label="Star Rating" field="star_rating" type="number" />
            </div>
            <EditableField label="Short Description" field="short_description" multiline />
            <EditableField label="Full Description" field="description" multiline />
            <div className="grid grid-cols-2 gap-3">
              <EditableField label="Total Rooms" field="total_rooms" type="number" />
              <EditableField label="Year Established" field="year_established" type="number" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-lg font-heading font-bold text-slate-900 mb-4 flex items-center gap-2"><MapPin className="h-5 w-5 text-brand-500" /> Location</h2>
            <EditableField label="Address" field="address_line1" />
            <div className="grid grid-cols-3 gap-3">
              <EditableField label="City" field="city" />
              <EditableField label="Pincode" field="pincode" />
              <EditableField label="Destination" field="destination_slug" />
            </div>
            <EditableField label="Landmark" field="landmark" />
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-lg font-heading font-bold text-slate-900 mb-4 flex items-center gap-2"><Bed className="h-5 w-5 text-brand-500" /> Rooms & Pricing</h2>
            {(p.rooms || []).map((room: any, i: number) => (
              <div key={i} className="border border-slate-200 rounded-lg p-4 mb-3">
                <p className="font-semibold text-slate-900">{room.name}</p>
                <p className="text-sm text-slate-600">{room.description}</p>
                <p className="text-sm text-slate-500">{room.bed_type} · Max {room.max_occupancy} guests · {formatPrice(room.base_price)}/night</p>
                {room.weekend_price > 0 && <p className="text-xs text-slate-500">Weekend: {formatPrice(room.weekend_price)} · Peak: {formatPrice(room.peak_price || 0)}</p>}
              </div>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-lg font-heading font-bold text-slate-900 mb-4">Amenities</h2>
            <div className="space-y-3">
              <div><span className="text-xs font-semibold text-slate-500">Property:</span><div className="flex flex-wrap gap-1 mt-1">{(p.amenities || []).map((a: string) => <span key={a} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{a}</span>)}</div></div>
              <div><span className="text-xs font-semibold text-slate-500">Room:</span><div className="flex flex-wrap gap-1 mt-1">{(p.room_amenities || []).map((a: string) => <span key={a} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">{a}</span>)}</div></div>
              <div><span className="text-xs font-semibold text-slate-500">Food:</span><div className="flex flex-wrap gap-1 mt-1">{(p.food_amenities || []).map((a: string) => <span key={a} className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded">{a}</span>)}</div></div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-lg font-heading font-bold text-slate-900 mb-4 flex items-center gap-2"><Camera className="h-5 w-5 text-brand-500" /> Photos ({(p.images || []).length})</h2>
            <div className="grid grid-cols-3 gap-3">
              {(p.images || []).map((img: any, i: number) => (
                <div key={i} className="aspect-[4/3] bg-slate-100 rounded-lg overflow-hidden relative">
                  {img.url ? <img src={img.url} alt={img.alt} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-slate-400 text-xs">No URL</div>}
                  {img.is_primary && <span className="absolute top-1 left-1 bg-brand-600 text-white text-[10px] px-1.5 py-0.5 rounded">Primary</span>}
                  <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">{img.category}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-lg font-heading font-bold text-slate-900 mb-4 flex items-center gap-2"><Shield className="h-5 w-5 text-brand-500" /> Policies</h2>
            <div className="space-y-2 text-sm text-slate-600">
              <p><strong>Cancellation:</strong> {p.cancellation_policy || 'Not specified'}</p>
              <p><strong>Pets:</strong> {p.pet_policy}</p><p><strong>Smoking:</strong> {p.smoking_policy}</p>
              <p><strong>Couple Friendly:</strong> {p.couple_friendly ? 'Yes' : 'No'}</p>
              <p><strong>Check-in:</strong> {p.check_in_time} · <strong>Check-out:</strong> {p.check_out_time}</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-lg font-heading font-bold text-slate-900 mb-4">Contact Details</h2>
            <div className="text-sm text-slate-600 space-y-1">
              <p><strong>Name:</strong> {p.contact_name}</p>
              <p><strong>Phone:</strong> {p.contact_phone}</p>
              <p><strong>Email:</strong> {p.contact_email}</p>
              {p.contact_whatsapp && <p><strong>WhatsApp:</strong> {p.contact_whatsapp}</p>}
            </div>
          </div>
        </div>

        {/* Admin actions sidebar */}
        <div>
          <div className="sticky top-24 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-heading font-bold text-slate-900 mb-4">Admin Actions</h3>

              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Admin Notes (visible to partner)</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Notes or corrections needed..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none resize-none" />
                </div>
              </div>

              <div className="space-y-2">
                <button onClick={handleApprove} disabled={action !== null} className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 text-sm">
                  <CheckCircle className="h-4 w-4" /> Approve & Publish
                </button>

                <button onClick={handleRequestChanges} disabled={action !== null || !notes} className="w-full flex items-center justify-center gap-2 bg-amber-500 text-white py-2.5 rounded-lg font-semibold hover:bg-amber-600 disabled:opacity-50 text-sm">
                  <MessageSquare className="h-4 w-4" /> Request Changes
                </button>

                <div className="pt-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Rejection Reason</label>
                  <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Why is this being rejected?" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none mb-2" />
                  <button onClick={handleReject} disabled={action !== null || !reason} className="w-full flex items-center justify-center gap-2 bg-red-600 text-white py-2.5 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 text-sm">
                    <XCircle className="h-4 w-4" /> Reject
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-500">
              <p><strong>Submitted:</strong> {p.submitted_at ? new Date(p.submitted_at).toLocaleString() : 'N/A'}</p>
              <p><strong>Owner ID:</strong> {p.owner_id}</p>
              <p><strong>Property ID:</strong> {p.id}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
