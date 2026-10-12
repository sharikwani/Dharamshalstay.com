const IST_MS = 5.5 * 3600e3;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export type Timed = { category: string; check_in?: string | null; activity_date?: string | null; pickup_time?: string | null };

/** Today in India as YYYY-MM-DD. */
export function todayIST(now = new Date()): string {
  return new Date(now.getTime() + IST_MS).toISOString().slice(0, 10);
}

/** When the stay or activity begins: hotel check-in day, or the activity day at its pickup time (IST). */
export function startsAt(b: Timed): Date | null {
  const date = b.category === 'hotel' ? b.check_in : b.activity_date || b.check_in;
  if (!date || !DATE.test(date)) return null;
  const m = b.category !== 'hotel' ? /^(\d{1,2}):(\d{2})/.exec(b.pickup_time || '') : null;
  const time = m ? `${m[1].padStart(2, '0')}:${m[2]}` : '00:00';
  const t = Date.parse(`${date}T${time}:00+05:30`);
  return Number.isFinite(t) ? new Date(t) : null;
}

export function hoursUntilStart(b: Timed, now = new Date()): number | null {
  const s = startsAt(b);
  return s ? (s.getTime() - now.getTime()) / 3600e3 : null;
}
