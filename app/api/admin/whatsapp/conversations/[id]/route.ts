import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCaller, serviceClient, jsonError, HttpError } from '@/lib/server-auth';
import { setStatus } from '@/lib/wa-chat/store';
import { signedMediaUrls } from '@/lib/wa-chat/media';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store'; // Next 14 caches GET fetches (Supabase reads) in route handlers otherwise
const uuid = z.string().uuid();

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireCaller(req, ['admin']);
    if (!uuid.safeParse(params.id).success) throw new HttpError(404, 'Not found');
    const sb = serviceClient();
    const { data: conversation, error } = await sb.from('whatsapp_conversations').select('*').eq('id', params.id).maybeSingle();
    if (error) throw error;
    if (!conversation) throw new HttpError(404, 'Not found');
    const [{ data: msgs }, { data: enquiries }] = await Promise.all([
      sb.from('whatsapp_chat_messages').select('*').eq('conversation_id', params.id).order('created_at', { ascending: false }).limit(200),
      sb.from('inquiries').select('id, type, status, created_at').eq('whatsapp_conversation_id', params.id).order('created_at', { ascending: false }),
    ]);
    if (conversation.unread_admin) await sb.from('whatsapp_conversations').update({ unread_admin: 0 }).eq('id', params.id);
    const messages = (msgs || []).reverse();
    const urls = await signedMediaUrls(messages);
    return NextResponse.json({
      conversation, enquiries: enquiries || [],
      messages: messages.map((m: any) => (urls[m.id] ? { ...m, media_url: urls[m.id] } : m)),
    });
  } catch (e) { return jsonError(e); }
}

const patchSchema = z.object({ status: z.enum(['ai', 'human', 'closed']) });

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireCaller(req, ['admin']);
    if (!uuid.safeParse(params.id).success) throw new HttpError(404, 'Not found');
    const body = patchSchema.safeParse(await req.json().catch(() => null));
    if (!body.success) throw new HttpError(400, 'Invalid status');
    await setStatus(params.id, body.data.status, null);
    return NextResponse.json({ ok: true });
  } catch (e) { return jsonError(e); }
}
