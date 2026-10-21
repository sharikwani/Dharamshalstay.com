import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, jsonError, requireCaller, serviceClient } from '@/lib/server-auth';
import { createPartnerAccount } from '@/lib/partners/accounts';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store'; // Next 14 caches GET fetches (Supabase reads) in route handlers otherwise

export async function GET(req: Request) {
  try {
    await requireCaller(req, ['admin']);
    const status = new URL(req.url).searchParams.get('status');
    let q = serviceClient().from('profiles')
      .select('id, email, full_name, legal_name, business_name, phone, partner_type, partner_services, partner_status, commission_pct, submitted_at, verified_at, created_at')
      .in('partner_type', ['paragliding', 'taxi', 'trek'])
      .order('submitted_at', { ascending: false, nullsFirst: false });
    if (status && status !== 'all') q = q.eq('partner_status', status);
    const { data, error } = await q;
    if (error) throw error;
    return NextResponse.json({ partners: data || [] });
  } catch (e) { return jsonError(e); }
}

const create = z.object({
  email: z.string().trim().email(), full_name: z.string().trim().min(2).max(100), phone: z.string().trim().min(10).max(20),
  business_name: z.string().trim().max(120).optional(), services: z.array(z.enum(['paragliding', 'taxi', 'trek'])).min(1).max(3),
});

/** Admin: create a partner account (one or more services) and email them a link to choose their password. */
export async function POST(req: Request) {
  try {
    await requireCaller(req, ['admin']);
    const parsed = create.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new HttpError(400, 'Fill in email, name, phone and at least one service.');
    return NextResponse.json(await createPartnerAccount(parsed.data));
  } catch (e) { return jsonError(e); }
}
