import { NextResponse } from 'next/server';
import { posXml } from '@/lib/google-hotels/feed';

/** Google Hotel Center: point-of-sale file (the landing link for our prices). */
export async function GET() {
  return new NextResponse(posXml(), { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, s-maxage=86400' } });
}
