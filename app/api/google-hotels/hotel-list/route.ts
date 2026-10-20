import { NextResponse } from 'next/server';
import { feedHotels, hotelListXml } from '@/lib/google-hotels/feed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

/** Google Hotel Center: hotel list feed (the hotels we can sell, with live rates). */
export async function GET() {
  try {
    return new NextResponse(hotelListXml(await feedHotels()), { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, s-maxage=3600' } });
  } catch (e) {
    console.error('Google Hotels list feed failed:', e);
    return new NextResponse('Feed unavailable', { status: 503 });
  }
}
