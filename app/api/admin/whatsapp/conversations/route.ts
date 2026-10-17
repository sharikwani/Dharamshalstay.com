import { NextResponse } from 'next/server';
import { requireCaller, serviceClient, jsonError } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store'; // Next 14 caches GET fetches (Supabase reads) in route handlers otherwise

export async function GET(req: Request) {
  try {
    await requireCaller(req, ['admin']);
    const sb = serviceClient();
    let q = sb.from('whatsapp_conversations').select('*').order('last_message_at', { ascending: false }).limit(100);
    if (new URL(req.url).searchParams.get('filter') === 'needs') q = q.eq('status', 'needs_human');
    const { data: convs, error } = await q;
    if (error) throw error;
    const ids = (convs || []).map((c: any) => c.id);
    const last = new Map<string, string>();
    if (ids.length) {
      const { data: msgs } = await sb.from('whatsapp_chat_messages').select('conversation_id, body, created_at')
        .in('conversation_id', ids).order('created_at', { ascending: false }).limit(500);
      for (const m of msgs || []) if (!last.has(m.conversation_id)) last.set(m.conversation_id, m.body);
    }
    const { count } = await sb.from('whatsapp_conversations').select('id', { count: 'exact', head: true }).eq('status', 'needs_human');
    return NextResponse.json({ conversations: (convs || []).map((c: any) => ({ ...c, last_body: last.get(c.id) ?? '' })), needsYou: count || 0 });
  } catch (e) { return jsonError(e); }
}
