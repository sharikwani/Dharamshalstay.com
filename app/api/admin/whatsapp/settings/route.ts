import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCaller, serviceClient, jsonError, HttpError } from '@/lib/server-auth';
import { normalizeIndianPhone } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store'; // Next 14 caches GET fetches (Supabase reads) in route handlers otherwise

export async function GET(req: Request) {
  try {
    await requireCaller(req, ['admin']);
    const { data, error } = await serviceClient().from('whatsapp_settings').select('ai_mode, test_numbers').eq('id', 1).maybeSingle();
    if (error) throw error;
    return NextResponse.json({ ai_mode: data?.ai_mode ?? 'off', test_numbers: data?.test_numbers ?? [] });
  } catch (e) { return jsonError(e); }
}

const schema = z.object({ ai_mode: z.enum(['off', 'test', 'on']), test_numbers: z.array(z.string()).max(20) });

export async function PATCH(req: Request) {
  try {
    await requireCaller(req, ['admin']);
    const body = schema.safeParse(await req.json().catch(() => null));
    if (!body.success) throw new HttpError(400, 'Invalid settings');
    const numbers = body.data.test_numbers.map((n) => normalizeIndianPhone(n));
    if (numbers.some((n) => !n)) throw new HttpError(400, 'Test numbers must be valid Indian mobile numbers');
    const { error } = await serviceClient().from('whatsapp_settings')
      .update({ ai_mode: body.data.ai_mode, test_numbers: Array.from(new Set(numbers)), updated_at: new Date().toISOString() }).eq('id', 1);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) { return jsonError(e); }
}
