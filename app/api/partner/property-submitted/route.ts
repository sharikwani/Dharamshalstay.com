import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPropertySubmittedNotification } from '@/lib/email';

/**
 * POST /api/partner/property-submitted { id }
 * Called by the partner form right after it submits a listing for review, so
 * the admin gets an email instead of having to check /admin/approvals.
 * Only the listing's owner can trigger it, only while it is pending review,
 * and only once per submission.
 */
const notified = new Set<string>();

export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const authHeader = req.headers.get('authorization');
  if (!url || !serviceKey || !anonKey) return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json().catch(() => ({ id: null }));
  if (typeof id !== 'string' || !id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const sbAuth = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
  const { data: { user } } = await sbAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: p } = await sb.from('properties')
    .select('id, name, type, destination_slug, city, contact_name, contact_phone, contact_email, owner_id, status, submitted_at, reviewed_at')
    .eq('id', id).single();
  if (!p || p.owner_id !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (p.status !== 'pending_review') return NextResponse.json({ ok: true, skipped: 'not pending' });

  const key = p.id + ':' + (p.submitted_at || '');
  if (notified.has(key)) return NextResponse.json({ ok: true, skipped: 'already notified' });
  notified.add(key);

  await sendPropertySubmittedNotification({ ...p, resubmitted: !!p.reviewed_at });
  return NextResponse.json({ ok: true });
}
