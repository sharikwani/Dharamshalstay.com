// app/api/availability/route.ts
import { NextResponse } from 'next/server';
import { availabilityFor } from '@/lib/availability/store';
import { dayCount, isDate } from '@/lib/availability/calc';
import { isUuid } from '@/lib/availability/validate';

export const dynamic = 'force-dynamic';

const MAX_PUBLIC_NIGHTS = 60;
const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

/** Rooms left per room type for a stay. Counts only; no booking details. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const id = q.get('property_id');
  const checkIn = q.get('check_in');
  const checkOut = q.get('check_out');
  if (!isUuid(id)) return bad('property_id is required');
  if (!isDate(checkIn) || !isDate(checkOut) || checkOut <= checkIn) return bad('check_in and check_out must be YYYY-MM-DD, check_out after check_in');
  if (dayCount(checkIn, checkOut) - 1 > MAX_PUBLIC_NIGHTS) return bad(`At most ${MAX_PUBLIC_NIGHTS} nights`);
  try {
    const avail = await availabilityFor(id, checkIn, checkOut);
    const rooms: Record<string, { tracked: boolean; left: number | null }> = {};
    for (const key of Object.keys(avail)) {
      const v = avail[key];
      rooms[key] = v.tracked ? { tracked: true, left: Math.max(0, v.left) } : { tracked: false, left: null };
    }
    return NextResponse.json({ rooms }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('Availability lookup failed:', e);
    return NextResponse.json({ error: 'Could not check availability' }, { status: 500 });
  }
}
