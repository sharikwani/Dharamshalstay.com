import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, jsonError, serviceClient } from '@/lib/server-auth';
import { requireActivityPartner } from '@/lib/partners/load';

const schema = z.object({
  role: z.enum(['driver', 'pilot', 'guide']),
  full_name: z.string().trim().min(2).max(200),
  phone: z.string().trim().min(10).max(20),
  licence_no: z.string().trim().max(100).optional().default(''),
});
const ALLOWED: Record<string, string[]> = { taxi: ['driver'], paragliding: ['pilot'], trek: ['guide'] };

export async function POST(req: Request) {
  try {
    const { profile } = await requireActivityPartner(req, { editable: true });
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new HttpError(400, 'Name and a 10-digit phone number are required.');
    if (!ALLOWED[profile.partner_type].includes(parsed.data.role)) throw new HttpError(400, 'This kind of team member does not fit your account type.');
    const { data, error } = await serviceClient().from('partner_staff')
      .insert({ ...parsed.data, licence_no: parsed.data.licence_no || null, partner_id: profile.id }).select('id').single();
    if (error) throw error;
    return NextResponse.json({ ok: true, id: data.id });
  } catch (e) { return jsonError(e); }
}
