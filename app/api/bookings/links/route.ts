import { NextRequest, NextResponse } from 'next/server';
import { getCaller, serviceClient } from '@/lib/server-auth';
import { bookingPagePath } from '@/lib/bookings/stay-details';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store'; // Next 14 caches GET fetches (Supabase reads) in route handlers otherwise

/** The logged-in guest's private booking-page links, keyed by booking id (account page). */
export async function GET(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ error: 'Please log in again' }, { status: 401 });
  const { data, error } = await serviceClient().from('bookings')
    .select('id, booking_ref').eq('user_id', caller.user.id).not('booking_ref', 'is', null)
    .order('created_at', { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: 'Could not load bookings' }, { status: 500 });
  const links: Record<string, string> = {};
  for (const b of data || []) links[b.id] = bookingPagePath(b as { id: string; booking_ref: string });
  return NextResponse.json({ links });
}
