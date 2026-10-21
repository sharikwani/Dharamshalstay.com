import { NextResponse } from 'next/server';
import { partnerServices } from '@/lib/partners/types';
import { z } from 'zod';
import { HttpError, jsonError, serviceClient } from '@/lib/server-auth';
import { requireActivityPartner } from '@/lib/partners/load';
import { normalizeIndianPhone } from '@/lib/whatsapp';

export const fetchCache = 'force-no-store';

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
    const phone = normalizeIndianPhone(parsed.data.phone);
    if (!phone) throw new HttpError(400, 'Enter a valid 10-digit Indian mobile number for this person.');
    if (!partnerServices(profile).some((t) => ALLOWED[t].includes(parsed.data.role))) throw new HttpError(400, 'This kind of team member does not fit the services on your account.');
    // WhatsApp alerts stay off until the person themselves agrees to them.
    const { data, error } = await serviceClient().from('partner_staff')
      .insert({ ...parsed.data, phone, licence_no: parsed.data.licence_no || null, partner_id: profile.id, whatsapp_alerts: false }).select('id').single();
    // A double submit (or re-adding someone) hits the unique (partner_id, role, phone) index.
    if (error?.code === '23505') throw new HttpError(409, 'This person is already on your team');
    if (error) throw error;
    return NextResponse.json({ ok: true, id: data.id });
  } catch (e) { return jsonError(e); }
}
