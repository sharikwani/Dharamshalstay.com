// components/rooms/RoomsEditor.tsx
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BedDouble, Loader2, Plus, RotateCw, Save, Trash2, X } from 'lucide-react';
import { authFetch } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { LIMITS } from '@/lib/rooms/validate';
import RoomPhotos from './RoomPhotos';

type Props = { apiUrl: string; propertyId: string; userId: string };
type Plan = { name: string; meal_plan: string; price: number | string; cancellation: string };
/** The stored room (every field kept) with the edited fields possibly held as input strings. */
type Room = Record<string, any> & { rate_plans: Plan[]; images: string[]; is_active: boolean };
type Draft = { key: string; room: Room };
type Loaded = { id: string; name: string; extra_bed_charge: number | null; updated_at: string };

const STALE = 'Someone else changed these rooms. Reload to see the latest.';
const BED_TYPES = ['Single', 'Double', 'Queen', 'King', 'Twin', 'Bunk', 'Other'];
const MEAL_PLANS = [
  { value: 'ep', label: 'Room only' },
  { value: 'cp', label: 'Breakfast' },
  { value: 'map', label: 'Breakfast + dinner' },
  { value: 'ap', label: 'All meals' },
];
const INPUT = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500';
const LABEL = 'block text-sm text-slate-700';

const num = (v: unknown): number | null => (v === '' || v == null ? null : Number(v));
const imageUrl = (i: unknown): string => (typeof i === 'string' ? i : (i as { url?: string })?.url || '');

let keySeq = 0;
const nextKey = () => `room-${++keySeq}`;

function toDrafts(rooms: unknown): Draft[] {
  return (Array.isArray(rooms) ? rooms : []).map((r: any) => ({
    key: nextKey(),
    room: {
      ...r,
      rate_plans: Array.isArray(r?.rate_plans) ? r.rate_plans : [],
      images: (Array.isArray(r?.images) ? r.images : []).map(imageUrl).filter(Boolean),
      is_active: r?.is_active !== false,
      total_inventory: r?.total_inventory ?? '',
      extra_beds_max: r?.extra_beds_max ?? 0,
    },
  }));
}

function payloadRooms(drafts: Draft[]) {
  return drafts.map(({ room }) => ({
    ...room,
    name: String(room.name ?? '').trim(),
    total_inventory: num(room.total_inventory),
    max_adults: num(room.max_adults),
    max_children: num(room.max_children) ?? 0,
    base_price: num(room.base_price),
    extra_beds_max: num(room.extra_beds_max) ?? 0,
    extra_bed_price: num(room.extra_bed_price),
    rate_plans: room.rate_plans.map((p) => ({ ...p, name: p.name.trim(), price: num(p.price), cancellation: (p.cancellation || '').trim() })),
  }));
}

function blankRoom(): Room {
  return {
    name: '', description: '', bed_type: 'Double', meal_plan: 'ep', amenities: [], images: [], rate_plans: [],
    is_active: true, total_inventory: 1, max_adults: 2, max_children: 0, base_price: '', extra_beds_max: 0,
  };
}

/** Client-side mirror of the server's most common refusals, so mistakes show before saving. */
function problemWith(total: number | null, rooms: ReturnType<typeof payloadRooms>): string | null {
  if (total == null || !Number.isInteger(total) || total < LIMITS.totalRooms[0] || total > LIMITS.totalRooms[1]) return 'Total rooms must be 1-500.';
  const seen = new Set<string>();
  for (const r of rooms) {
    if (r.name.length < 2 || r.name.length > 60) return 'Each room type needs a name of 2-60 characters.';
    const k = r.name.toLowerCase();
    if (seen.has(k)) return `Two rooms are called "${k}". Each room type needs its own name.`;
    seen.add(k);
    if (r.total_inventory == null) return `${r.name}: enter how many rooms of this type you have.`;
  }
  const assigned = rooms.filter((r) => r.is_active).reduce((s, r) => s + (r.total_inventory ?? 0), 0);
  if (assigned > total) return `Rooms assigned (${assigned}) exceed the hotel total (${total})`;
  return null;
}

/** Edit a hotel's room types: counts, prices, rate plans, extra beds, photos. One save for everything. */
export default function RoomsEditor({ apiUrl, propertyId, userId }: Props) {
  const [prop, setProp] = useState<Loaded | null>(null);
  const [total, setTotal] = useState<number | string>('');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [saved, setSaved] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; stale?: boolean } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState('');
  const reqId = useRef(0);

  const snapshot = (t: number | string, d: Draft[]) => JSON.stringify([num(t), payloadRooms(d)]);
  const dirty = !!prop && snapshot(total, drafts) !== saved;

  const apply = useCallback((p: any) => {
    const d = toDrafts(p.rooms);
    const t = p.total_rooms ?? '';
    setProp({ id: p.id, name: p.name, extra_bed_charge: p.extra_bed_charge ?? null, updated_at: p.updated_at });
    setTotal(t);
    setDrafts(d);
    setSaved(JSON.stringify([num(t), payloadRooms(d)]));
    setConfirmDelete('');
  }, []);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true); setLoadError(''); setMsg(null);
    try {
      const res = await authFetch(`${apiUrl}?property_id=${encodeURIComponent(propertyId)}`);
      const d = await res.json().catch(() => ({}));
      if (id !== reqId.current) return;
      if (!res.ok) { setLoadError(d.error || 'Could not load the rooms'); setProp(null); }
      else apply(d.property);
    } catch { if (id !== reqId.current) return; setLoadError('Could not load the rooms'); }
    setLoading(false);
  }, [apiUrl, propertyId, apply]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  function edit(key: string, patch: Partial<Room>) {
    setMsg(null);
    setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, room: { ...d.room, ...patch } } : d)));
  }
  function editPlan(key: string, i: number, patch: Partial<Plan>) {
    setMsg(null);
    setDrafts((ds) => ds.map((d) => (d.key === key
      ? { ...d, room: { ...d.room, rate_plans: d.room.rate_plans.map((p, k) => (k === i ? { ...p, ...patch } : p)) } }
      : d)));
  }

  async function save() {
    if (!prop) return;
    const rooms = payloadRooms(drafts);
    const t = num(total);
    const problem = problemWith(t, rooms);
    if (problem) { setMsg({ ok: false, text: problem }); return; }
    setSaving(true); setMsg(null);
    try {
      const res = await authFetch(apiUrl, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_id: prop.id, total_rooms: t, rooms, expected_updated_at: prop.updated_at }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setMsg({ ok: false, text: d.error || 'Could not save', stale: res.status === 409 && d.error === STALE });
      else { apply(d.property); setMsg({ ok: true, text: 'Saved. Changes are live.' }); }
    } catch { setMsg({ ok: false, text: 'Could not save. Please check your connection.' }); }
    setSaving(false);
  }

  if (loading) return <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 text-brand-600 animate-spin" /></div>;
  if (loadError || !prop) return <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{loadError || 'Could not load the rooms'}</p>;

  const totalNum = num(total) ?? 0;
  const assigned = drafts.filter((d) => d.room.is_active).reduce((s, d) => s + (num(d.room.total_inventory) ?? 0), 0);
  const over = assigned - totalNum;

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap items-end gap-x-6 gap-y-3">
        <h2 className="w-full text-lg font-heading font-bold text-slate-900">{prop.name}</h2>
        <label className={LABEL}>
          Total rooms in the hotel
          <input type="number" inputMode="numeric" min={1} max={500} value={total} onChange={(e) => { setMsg(null); setTotal(e.target.value); }}
            className={cn(INPUT, 'mt-1 w-32')} />
        </label>
        <p className={cn('text-sm py-2', over > 0 ? 'text-red-600 font-semibold' : 'text-slate-700')}>
          Rooms assigned: {assigned} of {totalNum}{over > 0 && ` · Over by ${over}`}
        </p>
      </div>

      {drafts.length === 0 && <p className="text-sm text-slate-600">No room types yet. Add your first one below.</p>}

      {drafts.map(({ key, room }) => {
        const label = String(room.name || '').trim() || 'this room type';
        const beds = Number(room.extra_beds_max) || 0;
        const desc = String(room.description ?? '');
        const bedOptions = room.bed_type && !BED_TYPES.includes(room.bed_type) ? [room.bed_type, ...BED_TYPES] : BED_TYPES;
        return (
          <div key={key} className={cn('bg-white border rounded-xl p-4 sm:p-5 space-y-4', room.is_active ? 'border-slate-200' : 'border-slate-200 opacity-75')}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2"><BedDouble className="h-5 w-5 text-brand-600" />{String(room.name || '').trim() || 'New room type'}</h3>
              <button type="button" role="switch" aria-checked={room.is_active} onClick={() => edit(key, { is_active: !room.is_active })}
                className="flex items-center gap-2 text-sm text-slate-700">
                <span className={cn('relative inline-flex h-5 w-9 rounded-full transition-colors', room.is_active ? 'bg-brand-600' : 'bg-slate-300')}>
                  <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform', room.is_active ? 'translate-x-4' : 'translate-x-0.5')} />
                </span>
                {room.is_active ? 'On sale' : 'Off sale'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <label className={cn(LABEL, 'sm:col-span-2 lg:col-span-1')}>Name
                <input value={room.name ?? ''} maxLength={60} onChange={(e) => edit(key, { name: e.target.value })} placeholder="e.g. Deluxe Valley View" className={cn(INPUT, 'mt-1')} />
              </label>
              <label className={LABEL}>Rooms of this type
                <input type="number" inputMode="numeric" min={1} max={500} value={room.total_inventory ?? ''} onChange={(e) => edit(key, { total_inventory: e.target.value })}
                  className={cn(INPUT, 'mt-1', room.total_inventory === '' && 'border-amber-400')} />
              </label>
              <label className={LABEL}>Bed type
                <select value={room.bed_type || ''} onChange={(e) => edit(key, { bed_type: e.target.value })} className={cn(INPUT, 'mt-1')}>
                  {!room.bed_type && <option value="">Choose…</option>}
                  {bedOptions.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </label>
              <label className={LABEL}>Max adults
                <input type="number" inputMode="numeric" min={1} max={20} value={room.max_adults ?? ''} onChange={(e) => edit(key, { max_adults: e.target.value })} className={cn(INPUT, 'mt-1')} />
              </label>
              <label className={LABEL}>Max children
                <input type="number" inputMode="numeric" min={0} max={20} value={room.max_children ?? ''} onChange={(e) => edit(key, { max_children: e.target.value })} className={cn(INPUT, 'mt-1')} />
              </label>
              <label className={LABEL}>Price per night (Rs.)
                <input type="number" inputMode="numeric" min={100} value={room.base_price ?? ''} onChange={(e) => edit(key, { base_price: e.target.value })} className={cn(INPUT, 'mt-1')} />
              </label>
              <label className={LABEL}>Extra beds allowed
                <select value={beds} onChange={(e) => edit(key, { extra_beds_max: Number(e.target.value) })} className={cn(INPUT, 'mt-1')}>
                  {[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n === 0 ? 'None' : n}</option>)}
                </select>
              </label>
              {beds > 0 && (
                <label className={LABEL}>Extra bed price per night (Rs.)
                  <input type="number" inputMode="numeric" min={0} max={50000} value={room.extra_bed_price ?? prop.extra_bed_charge ?? ''}
                    onChange={(e) => edit(key, { extra_bed_price: e.target.value })} className={cn(INPUT, 'mt-1')} />
                </label>
              )}
            </div>

            <label className={LABEL}>Description
              <textarea value={desc} maxLength={500} rows={3} onChange={(e) => edit(key, { description: e.target.value })} className={cn(INPUT, 'mt-1')} />
              <span className="block text-right text-xs text-slate-500">{desc.length}/500</span>
            </label>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Rate plans</span>
                <span className="text-xs text-slate-500">{room.rate_plans.length} of {LIMITS.plans}</span>
              </div>
              {room.rate_plans.map((p, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_8rem_auto] gap-2 border border-slate-200 rounded-lg p-3">
                  <input value={p.name} maxLength={60} placeholder="Plan name, e.g. With breakfast" onChange={(e) => editPlan(key, i, { name: e.target.value })} className={INPUT} />
                  <select value={p.meal_plan} onChange={(e) => editPlan(key, i, { meal_plan: e.target.value })} className={INPUT} aria-label="Meals">
                    {MEAL_PLANS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  <input type="number" inputMode="numeric" min={100} value={p.price ?? ''} placeholder="Price (Rs.)" aria-label="Price per night"
                    onChange={(e) => editPlan(key, i, { price: e.target.value })} className={INPUT} />
                  <button type="button" aria-label="Remove rate plan" onClick={() => edit(key, { rate_plans: room.rate_plans.filter((_, k) => k !== i) })}
                    className="justify-self-end p-2 text-slate-500 hover:text-red-600"><X className="h-4 w-4" /></button>
                  <input value={p.cancellation ?? ''} maxLength={300} placeholder="Cancellation, e.g. Free cancellation up to 3 days before"
                    onChange={(e) => editPlan(key, i, { cancellation: e.target.value })} className={cn(INPUT, 'sm:col-span-4')} />
                </div>
              ))}
              {room.rate_plans.length < LIMITS.plans && (
                <button type="button" onClick={() => edit(key, { rate_plans: [...room.rate_plans, { name: '', meal_plan: 'ep', price: '', cancellation: '' }] })}
                  className="flex items-center gap-1 text-sm text-brand-700 font-medium hover:text-brand-800"><Plus className="h-4 w-4" /> Add rate plan</button>
              )}
            </div>

            <RoomPhotos images={room.images} onChange={(images) => edit(key, { images })} userId={userId} folder={`${userId}/${propertyId}/rooms`} />

            <div className="flex justify-end">
              {confirmDelete === key ? (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button type="button" onClick={() => { setMsg(null); setConfirmDelete(''); setDrafts((ds) => ds.filter((d) => d.key !== key)); }}
                    className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-red-700">
                    <Trash2 className="h-4 w-4" /> Delete {label}? Click again to confirm
                  </button>
                  <button type="button" onClick={() => setConfirmDelete('')} className="text-sm text-slate-600 hover:text-slate-800 px-2 py-1.5">Cancel</button>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(key)} className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 px-2 py-1.5">
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              )}
            </div>
          </div>
        );
      })}

      <button type="button" onClick={() => { setMsg(null); setDrafts((ds) => [...ds, { key: nextKey(), room: blankRoom() }]); }}
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-xl py-3 text-sm font-medium text-slate-600 hover:border-brand-400 hover:bg-slate-50">
        <Plus className="h-4 w-4" /> Add room type
      </button>

      <div className="sticky bottom-0 -mx-4 sm:mx-0 bg-white/95 backdrop-blur border-t border-slate-200 sm:border sm:rounded-xl px-4 py-3 space-y-2">
        {msg && !msg.ok && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg flex flex-wrap items-center justify-between gap-2">
            <span>{msg.text}</span>
            {msg.stale && (
              <button type="button" onClick={load} className="flex items-center gap-1 font-semibold text-red-800 underline"><RotateCw className="h-4 w-4" /> Reload</button>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-end gap-3">
          {msg?.ok && <span className="text-sm text-green-700">{msg.text}</span>}
          {dirty && !msg && <span className="text-sm text-slate-500">You have unsaved changes.</span>}
          <button type="button" onClick={save} disabled={saving}
            className="flex items-center gap-2 bg-brand-600 text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-brand-700 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
