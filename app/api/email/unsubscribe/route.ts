import { NextRequest, NextResponse } from 'next/server';
import { serviceClient } from '@/lib/server-auth';

export const runtime = 'nodejs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST ?t=<token>            one-click unsubscribe (Gmail/Yahoo List-Unsubscribe-Post, and our page's button)
 * POST ?t=<token>&resubscribe=1  undo from the same page
 */
export async function POST(req: NextRequest) {
  const t = req.nextUrl.searchParams.get('t') || '';
  if (!UUID.test(t)) return NextResponse.json({ error: 'Invalid link' }, { status: 400 });
  const resub = req.nextUrl.searchParams.get('resubscribe') === '1';
  const now = new Date().toISOString();
  const patch = resub
    ? { marketing_consent: true, unsubscribed_at: null, consent_at: now, consent_source: 'unsubscribe-page-undo', consent_text: 'Clicked "Keep me subscribed" on the unsubscribe page.', updated_at: now }
    : { unsubscribed_at: now, marketing_consent: false, updated_at: now };
  const { data, error } = await serviceClient().from('contacts').update(patch).eq('unsubscribe_token', t).select('id');
  if (error) return NextResponse.json({ error: 'Please try again' }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: 'Link not found' }, { status: 404 });
  return NextResponse.json({ ok: true, subscribed: resub });
}

export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL('/email/unsubscribe?t=' + encodeURIComponent(req.nextUrl.searchParams.get('t') || ''), req.url));
}
