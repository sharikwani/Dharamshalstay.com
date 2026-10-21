import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, jsonError, serviceClient } from '@/lib/server-auth';
import { requireActivityPartner } from '@/lib/partners/load';
import { normalizeVehicleReg } from '@/lib/partners/validate';
import { FUELS, VEHICLE_TYPES, offers } from '@/lib/partners/types';

export const fetchCache = 'force-no-store';

const schema = z.object({
  vehicle_type: z.enum(VEHICLE_TYPES),
  make_model: z.string().trim().min(2).max(100),
  /** Empty for a new car whose number has not been issued yet ("applied for"). */
  registration_no: z.string().optional().default(''),
  seats: z.number().int().min(1).max(60),
  fuel: z.enum(FUELS).optional(),
  colour: z.string().trim().max(30).optional(),
});

export async function POST(req: Request) {
  try {
    const { profile } = await requireActivityPartner(req, { editable: true });
    if (!offers(profile, 'taxi')) throw new HttpError(403, 'Only taxi partners add vehicles.');
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new HttpError(400, 'Fill in vehicle type, model, number and seats.');
    const applied = !parsed.data.registration_no.trim();
    const reg = applied ? null : normalizeVehicleReg(parsed.data.registration_no);
    if (!applied && !reg) throw new HttpError(400, 'Vehicle number should look like HP39A1234. Leave it empty if the number is still applied for.');
    const sb = serviceClient();
    const { data, error } = await sb.from('vehicles')
      .insert({ ...parsed.data, registration_no: reg, notes: applied ? 'Registration applied for' : null, partner_id: profile.id }).select('id').single();
    if (error?.code === '23505') {
      // A repeated add (double click, lost response) of the caller's own vehicle is a success; someone
      // else's vehicle keeps the refusal and nothing about it is revealed.
      const { data: existing } = await sb.from('vehicles').select('id, partner_id').eq('registration_no', reg).maybeSingle();
      if (existing && existing.partner_id === profile.id) return NextResponse.json({ ok: true, id: existing.id, duplicate: true });
      throw new HttpError(409, 'This vehicle number is already registered with us.');
    }
    if (error) throw error;
    return NextResponse.json({ ok: true, id: data.id });
  } catch (e) { return jsonError(e); }
}
