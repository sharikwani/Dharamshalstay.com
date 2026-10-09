import { NextResponse } from 'next/server';
import { jsonError, requireCaller, serviceClient } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await requireCaller(req, ['admin']);
    const status = new URL(req.url).searchParams.get('status');
    let q = serviceClient().from('profiles')
      .select('id, email, full_name, legal_name, business_name, phone, partner_type, partner_status, commission_pct, submitted_at, verified_at, created_at')
      .in('partner_type', ['paragliding', 'taxi', 'trek'])
      .order('submitted_at', { ascending: false, nullsFirst: false });
    if (status && status !== 'all') q = q.eq('partner_status', status);
    const { data, error } = await q;
    if (error) throw error;
    return NextResponse.json({ partners: data || [] });
  } catch (e) { return jsonError(e); }
}
