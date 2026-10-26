import { NextResponse } from 'next/server';
import { HttpError, clientIp, jsonError } from '@/lib/server-auth';
import { checkReviewPhoto, hashIp } from '@/lib/reviews/validate';
import { guidePortrait, guideSignupSchema, submitGuide } from '@/lib/guides/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LISTS = ['languages', 'specializations', 'areas'];

/** POST (multipart): a local guide signs up with a profile photo; shown after the owner approves it. */
export async function POST(req: Request) {
  try {
    const form = await req.formData().catch(() => null);
    if (!form) throw new HttpError(400, 'Please fill in the form.');
    if (String(form.get('website') ?? '').trim()) return NextResponse.json({ ok: true }); // honeypot

    const fields: Record<string, unknown> = {};
    form.forEach((v, k) => { if (typeof v === 'string') fields[k] = LISTS.includes(k) ? form.getAll(k).map(String) : v; });
    fields.consent = fields.consent === 'true';
    const parsed = guideSignupSchema.safeParse(fields);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message || 'Please check the form');

    const file = form.get('photo');
    if (!(file instanceof File) || !file.size) throw new HttpError(400, 'Please add a clear photo of yourself.');
    const bytes = Buffer.from(await file.arrayBuffer());
    const problem = checkReviewPhoto({ type: file.type, size: bytes.length, head: bytes.subarray(0, 12) });
    if (problem) throw new HttpError(400, problem.replace(/Photos must/, 'Your photo must').replace(/Each photo/, 'Your photo').replace(/One of the photos/, 'Your photo'));
    let photo: Buffer;
    try { photo = await guidePortrait(bytes); }
    catch { throw new HttpError(400, 'Your photo could not be read. Please choose a JPG or PNG photo.'); }

    await submitGuide(parsed.data, hashIp(clientIp(req)), photo);
    return NextResponse.json({ ok: true });
  } catch (e) { return jsonError(e); }
}
