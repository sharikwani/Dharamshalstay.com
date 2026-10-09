import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, jsonError, serviceClient } from '@/lib/server-auth';
import { requireActivityPartner } from '@/lib/partners/load';
import { normalizeVehicleReg } from '@/lib/partners/validate';

const schema = z.object({
  vehicle_type: z.enum(['sedan', 'suv', 'innova', 'tempo', 'bus']),
  make_model: z.string().trim().min(2).max(100),
  registration_no: z.string(),
  seats: z.number().int().min(1).max(60),
});

export async function POST(req: Request) {
  try {
    const { profile } = await requireActivityPartner(req, { editable: true });
    if (profile.partner_type !== 'taxi') throw new HttpError(403, 'Only taxi partners add vehicles.');
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new HttpError(400, 'Fill in vehicle type, model, number and seats.');
    const reg = normalizeVehicleReg(parsed.data.registration_no);
    if (!reg) throw new HttpError(400, 'Vehicle number should look like HP39A1234.');
    const { data, error } = await serviceClient().from('vehicles')
      .insert({ ...parsed.data, registration_no: reg, partner_id: profile.id }).select('id').single();
    if (error?.code === '23505') throw new HttpError(409, 'This vehicle number is already registered with us.');
    if (error) throw error;
    return NextResponse.json({ ok: true, id: data.id });
  } catch (e) { return jsonError(e); }
}
