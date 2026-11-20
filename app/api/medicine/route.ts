import { NextResponse } from 'next/server';
import { HttpError, clientIp, jsonError } from '@/lib/server-auth';
import { hashIp } from '@/lib/reviews/validate';
import { checkPrescriptionFile, medicineRequestSchema } from '@/lib/medicine/validate';
import { submitMedicineRequest } from '@/lib/medicine/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST (multipart): an emergency medicine request with the prescription; screened by the owner before delivery. */
export async function POST(req: Request) {
  try {
    const form = await req.formData().catch(() => null);
    if (!form) throw new HttpError(400, 'Please fill in the form.');
    if (String(form.get('website') ?? '').trim()) return NextResponse.json({ ok: true }); // honeypot

    const fields: Record<string, unknown> = {};
    form.forEach((v, k) => { if (typeof v === 'string') fields[k] = v; });
    fields.consent = fields.consent === 'true';
    const parsed = medicineRequestSchema.safeParse(fields);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message || 'Please check the form');

    const file = form.get('prescription');
    if (!(file instanceof File) || !file.size) throw new HttpError(400, 'Please add a photo or PDF of the doctor prescription.');
    const bytes = Buffer.from(await file.arrayBuffer());
    const checked = checkPrescriptionFile({ type: file.type, size: bytes.length, head: bytes.subarray(0, 12) });
    if ('error' in checked) throw new HttpError(400, checked.error);

    await submitMedicineRequest(parsed.data, hashIp(clientIp(req)), { bytes, ...checked });
    return NextResponse.json({ ok: true });
  } catch (e) { return jsonError(e); }
}
