import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCaller, serviceClient, jsonError, HttpError } from '@/lib/server-auth';
import { sendText } from '@/lib/whatsapp-cloud';
import { saveOutbound, setStatus } from '@/lib/wa-chat/store';
import { UNCONFIRMED } from '@/lib/wa-chat/types';

export const dynamic = 'force-dynamic';
const schema = z.object({ text: z.string().trim().min(1).max(4096) });

/** Owner reply from the inbox; replying takes the chat over from the AI. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const caller = await requireCaller(req, ['admin']);
    if (!z.string().uuid().safeParse(params.id).success) throw new HttpError(404, 'Not found');
    const body = schema.safeParse(await req.json().catch(() => null));
    if (!body.success) throw new HttpError(400, 'Type a message first');
    const { data: conv, error } = await serviceClient().from('whatsapp_conversations').select('id, phone, last_customer_at').eq('id', params.id).maybeSingle();
    if (error) throw error;
    if (!conv) throw new HttpError(404, 'Not found');
    if (!conv.last_customer_at || Date.now() - Date.parse(conv.last_customer_at) > 24 * 3600e3) {
      throw new HttpError(409, "More than 24 hours since the customer's last message. WhatsApp only allows template messages now.");
    }
    const r = await sendText(conv.phone, body.data.text);
    if (!r.ok && r.unknown) {
      // It may have reached the customer: log it as unknown and tell the owner to check before sending it again.
      await saveOutbound(conv.id, 'admin', body.data.text, null, UNCONFIRMED, caller.profile.id, 'unknown');
      await setStatus(conv.id, 'human', null);
      return NextResponse.json({ ok: false, unknown: true, error: UNCONFIRMED }, { status: 202 });
    }
    await saveOutbound(conv.id, 'admin', body.data.text, r.ok ? r.id : null, r.ok ? undefined : r.error, caller.profile.id);
    if (!r.ok) throw new HttpError(502, `WhatsApp did not accept the message: ${r.error || 'unknown error'}`);
    await setStatus(conv.id, 'human', null);
    return NextResponse.json({ ok: true });
  } catch (e) { return jsonError(e); }
}
