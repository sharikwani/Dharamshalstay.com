// components/availability/AvailabilityCalendar.tsx
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { authFetch } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { todayIST } from '@/lib/bookings/timing';
import { monthDates, shiftMonth, weekdayOffset, type DayCell, type RoomSummary } from '@/lib/availability/calc';
import { MAX_UNITS, parseUnits } from '@/lib/availability/validate';

type Props = { apiUrl: string; propertyId: string; rooms: RoomSummary[]; untrackedNote: string };
type Grid = { room_key: string; tracked: boolean; total: number; days: DayCell[] };

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const monthLabel = (month: string) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** Month grid of rooms open / booked / left for one room type; pick a range, set rooms open, save. */
export default function AvailabilityCalendar({ apiUrl, propertyId, rooms, untrackedNote }: Props) {
  const today = todayIST();
  const [roomKey, setRoomKey] = useState(rooms[0]?.key ?? '');
  const [month, setMonth] = useState(today.slice(0, 7));
  const [grid, setGrid] = useState<Grid | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [units, setUnits] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const room = rooms.find((r) => r.key === roomKey);
  const reqId = useRef(0);

  useEffect(() => { setRoomKey(rooms[0]?.key ?? ''); setFrom(''); setTo(''); setMsg(null); }, [propertyId, rooms]);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    if (!roomKey || !room?.tracked) { setGrid(null); setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const q = new URLSearchParams({ property_id: propertyId, room_key: roomKey, month });
      const res = await authFetch(`${apiUrl}?${q}`);
      const d = await res.json().catch(() => ({}));
      if (id !== reqId.current) return;
      if (!res.ok) { setError(d.error || 'Could not load the calendar'); setGrid(null); }
      else setGrid(d.grid);
    } catch { if (id !== reqId.current) return; setError('Could not load the calendar'); }
    setLoading(false);
  }, [apiUrl, propertyId, roomKey, month, room?.tracked]);
  useEffect(() => { load(); }, [load]);

  function pick(date: string) {
    if (date < today) return;
    setMsg(null);
    if (!from || to) { setFrom(date); setTo(''); return; }
    if (date < from) { setTo(from); setFrom(date); } else setTo(date);
  }

  async function save() {
    if (!from) return;
    const n = parseUnits(units);
    if (n === null) { setMsg({ ok: false, text: `Enter rooms open as a whole number from 0 to ${MAX_UNITS}.` }); return; }
    setSaving(true); setMsg(null);
    try {
      const res = await authFetch(apiUrl, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_id: propertyId, room_key: roomKey, from, to: to || from, units: n }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setMsg({ ok: false, text: d.error || 'Could not save' });
      else {
        setMsg({ ok: true, text: `Saved: ${n} room${n === 1 ? '' : 's'} open on ${d.days} day${d.days === 1 ? '' : 's'}.` });
        setFrom(''); setTo('');
        await load();
      }
    } catch { setMsg({ ok: false, text: 'Could not save. Please check your connection.' }); }
    setSaving(false);
  }

  if (!rooms.length) return <p className="text-sm text-slate-600">This property has no room types yet.</p>;

  const dates = monthDates(month);
  const byDate: Record<string, DayCell> = {};
  for (const c of grid?.days || []) byDate[c.date] = c;
  const end = to || from;
  const inRange = (d: string) => !!from && d >= from && d <= end;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-slate-700">
          Room type
          <select value={roomKey} onChange={(e) => { setRoomKey(e.target.value); setFrom(''); setTo(''); setMsg(null); }}
            className="ml-2 px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none">
            {rooms.map((r) => <option key={r.key} value={r.key}>{r.key}{r.tracked ? ` (${r.total} rooms)` : ' (no room count)'}</option>)}
          </select>
        </label>
        <div className="flex items-center gap-1 sm:ml-auto">
          <button type="button" aria-label="Previous month" disabled={month <= today.slice(0, 7)} onClick={() => setMonth(shiftMonth(month, -1))}
            className="p-2 rounded-lg border border-slate-200 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
          <span className="w-36 text-center text-sm font-semibold text-slate-900">{monthLabel(month)}</span>
          <button type="button" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}
            className="p-2 rounded-lg border border-slate-200"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      {room && !room.tracked ? (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{untrackedNote}</p>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((w) => <div key={w} className="text-[11px] font-semibold text-slate-500 py-1">{w}</div>)}
            {Array.from({ length: weekdayOffset(month) }, (_, i) => <div key={`blank-${i}`} />)}
            {dates.map((date) => {
              const c = byDate[date];
              const past = date < today;
              return (
                <button key={date} type="button" disabled={past || loading} onClick={() => pick(date)}
                  aria-pressed={inRange(date)}
                  aria-label={c && !past ? `${Number(date.slice(8))} ${monthLabel(date.slice(0, 7)).split(' ')[0].slice(0, 3)}: ${c.open} open, ${c.booked} booked, ${Math.max(0, c.left)} left` : date}
                  className={cn('rounded-lg border p-1 sm:p-2 text-left min-h-[64px] transition-colors',
                    past ? 'bg-slate-50 text-slate-300 border-slate-100'
                      : inRange(date) ? 'border-brand-500 ring-1 ring-brand-500 bg-brand-50'
                      : c && c.left <= 0 ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white hover:border-slate-300')}>
                  <span className="block text-xs font-semibold">{Number(date.slice(8))}</span>
                  {c && !past && (
                    <span className="block text-[10px] leading-tight text-slate-600">
                      <span className={c.override ? 'font-semibold text-slate-900' : ''}>{c.open} open</span><br />
                      {c.booked} booked<br />
                      <span className={c.left <= 0 ? 'font-semibold text-red-700' : 'text-green-700'}>{Math.max(0, c.left)} left</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
            <p className="text-sm text-slate-700 w-full">
              {from ? `Selected ${from}${end !== from ? ` to ${end}` : ''}` : 'Tap a day, then another day, to choose dates.'}
            </p>
            <label className="text-sm text-slate-700">
              Rooms open
              <input type="number" inputMode="numeric" min={0} max={MAX_UNITS} value={units} onChange={(e) => setUnits(e.target.value)}
                className="block w-28 mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" />
            </label>
            <button type="button" onClick={save} disabled={!from || saving}
              className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
            {room && (
              <button type="button" onClick={() => setUnits(String(room.total))} className="text-sm text-brand-700 underline py-2">
                Use full count ({room.total})
              </button>
            )}
          </div>
        </>
      )}
      {msg && <p className={cn('text-sm', msg.ok ? 'text-green-700' : 'text-red-600')}>{msg.text}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
