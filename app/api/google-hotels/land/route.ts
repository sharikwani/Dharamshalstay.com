import { NextRequest, NextResponse } from 'next/server';
import { serviceClient } from '@/lib/server-auth';
import { siteConfig } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Google Hotels landing: hotel id + dates -> our hotel page with the dates filled in (the page reads ?check_in&check_out). */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const id = p.get('id') || '';
  const ci = p.get('check_in') || '', co = p.get('check_out') || '';
  let slug: string | null = null;
  if (UUID.test(id)) {
    const { data } = await serviceClient().from('properties').select('slug').eq('id', id).eq('status', 'published').maybeSingle();
    slug = data?.slug || null;
  }
  const dates = DATE.test(ci) && DATE.test(co) && co > ci ? `?check_in=${ci}&check_out=${co}` : '';
  const target = slug ? `/hotels/${slug}${dates}` : '/hotels';
  return NextResponse.redirect(new URL(target, siteConfig.url), 302);
}
