import { NextRequest, NextResponse } from 'next/server';
import { parseQuery, priceTransaction } from '@/lib/google-hotels/feed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const maxDuration = 30;

const xml = (body: string, status = 200) => new NextResponse(body, { status, headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'no-store' } });

/**
 * Google Hotels live pricing: Google POSTs a <Query> (check-in, nights, hotel ids) and we answer with a
 * <Transaction> of our current bookable prices. Prices are public (the same as on our hotel pages).
 */
export async function POST(req: NextRequest) {
  const body = (await req.text().catch(() => '')).slice(0, 200_000);
  const q = parseQuery(body);
  if (!q) return xml('<?xml version="1.0" encoding="UTF-8"?>\n<Error>Query needs Checkin (YYYY-MM-DD) and Nights</Error>\n', 400);
  try {
    return xml(await priceTransaction(q));
  } catch (e) {
    console.error('Google Hotels query failed:', e);
    return xml('<?xml version="1.0" encoding="UTF-8"?>\n<Error>Temporarily unavailable</Error>\n', 503);
  }
}
