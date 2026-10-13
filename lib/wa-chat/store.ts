import { serviceClient } from '@/lib/server-auth';
import { STATUS_RANK } from '@/lib/whatsapp-webhook';
import type { ChatMessage, ChatSettings, Conversation, ConversationStatus, Inbound } from './types';

const now = () => new Date().toISOString();

/**
 * Store a customer message and upsert its conversation. Returns null when Meta re-delivers a message we
 * already have (and then leaves the conversation untouched). Messages are ordered by server receive time.
 */
export async function saveInbound(m: Inbound, body: string, kind: 'text' | 'voice' | 'media') {
  const sb = serviceClient();
  const at = m.timestamp ? new Date(m.timestamp * 1000).toISOString() : now();
  const byPhone = () => sb.from('whatsapp_conversations').select('*').eq('phone', m.from).maybeSingle();
  const { data: found, error: fErr } = await byPhone();
  if (fErr) throw fErr;
  let conv: Conversation | null = found;
  let isNewConversation = false;
  if (!conv) {
    const { data, error } = await sb.from('whatsapp_conversations').insert({
      phone: m.from, profile_name: m.profileName, last_customer_at: at, last_message_at: at, unread_admin: 0,
    }).select('*').single();
    if (error?.code === '23505') {
      // Another webhook call created it a moment ago.
      const again = await byPhone();
      if (again.error || !again.data) throw again.error || new Error('Conversation vanished');
      conv = again.data;
    } else if (error) throw error;
    else { conv = data; isNewConversation = true; }
  }
  const c = conv as Conversation;
  const { data: message, error: mErr } = await sb.from('whatsapp_chat_messages').insert({
    conversation_id: c.id, direction: 'in', author: 'customer', body, kind, wa_message_id: m.waId, status: 'received',
  }).select('*').single();
  if (mErr?.code === '23505') return null;
  if (mErr) throw mErr;
  const { data: conversation, error: uErr } = await sb.from('whatsapp_conversations').update({
    profile_name: m.profileName ?? c.profile_name, last_customer_at: at, last_message_at: now(),
    unread_admin: (c.unread_admin || 0) + 1, status: c.status === 'closed' ? 'ai' : c.status, updated_at: now(),
  }).eq('id', c.id).select('*').single();
  if (uErr) throw uErr;
  return { conversation: conversation as Conversation, message: message as ChatMessage, isNewConversation };
}

/** Replace a stored customer message's text (voice notes are transcribed after the webhook answers). */
export async function setMessageBody(id: string, body: string) {
  const { error } = await serviceClient().from('whatsapp_chat_messages').update({ body }).eq('id', id);
  if (error) console.error('WhatsApp chat: could not update message text:', error);
}

/**
 * Log a message we sent (or tried to). Status is 'sent' with an id, else 'failed'; pass status 'unknown' when the
 * send may have gone through (see SendResult.unknown).
 */
export async function saveOutbound(conversationId: string, author: 'ai' | 'admin', body: string, waMessageId: string | null, error?: string, adminId?: string, status?: 'unknown') {
  const sb = serviceClient();
  const { error: e1 } = await sb.from('whatsapp_chat_messages').insert({
    conversation_id: conversationId, direction: 'out', author, body, kind: 'text', wa_message_id: waMessageId,
    status: status ?? (waMessageId ? 'sent' : 'failed'), error: waMessageId ? null : error || 'Send failed', admin_id: adminId ?? null,
  });
  if (e1) console.error('WhatsApp chat: could not log outbound message:', e1);
  const patch: Record<string, unknown> = { last_message_at: now(), updated_at: now() };
  if (author === 'admin') patch.unread_admin = 0;
  const { error: e2 } = await sb.from('whatsapp_conversations').update(patch).eq('id', conversationId);
  if (e2) console.error('WhatsApp chat: could not update conversation:', e2);
}

/** The latest messages, oldest first. */
export async function history(conversationId: string, limit = 20): Promise<ChatMessage[]> {
  const { data, error } = await serviceClient().from('whatsapp_chat_messages').select('*')
    .eq('conversation_id', conversationId).order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return ((data as ChatMessage[]) || []).reverse();
}

export async function latestInboundId(conversationId: string): Promise<string | null> {
  const { data, error } = await serviceClient().from('whatsapp_chat_messages').select('id')
    .eq('conversation_id', conversationId).eq('direction', 'in').order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const { data, error } = await serviceClient().from('whatsapp_conversations').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as Conversation) ?? null;
}

export async function setStatus(id: string, status: ConversationStatus, reason: string | null = null) {
  const { error } = await serviceClient().from('whatsapp_conversations')
    .update({ status, handover_reason: reason, updated_at: now() }).eq('id', id);
  if (error) console.error('WhatsApp chat: could not set status:', error);
}

export async function getSettings(): Promise<ChatSettings> {
  const { data, error } = await serviceClient().from('whatsapp_settings').select('ai_mode, test_numbers').eq('id', 1).maybeSingle();
  if (error || !data) return { ai_mode: 'off', test_numbers: [] };
  return { ai_mode: data.ai_mode, test_numbers: data.test_numbers || [] };
}

export async function aiRepliesSince(sinceIso: string, conversationId?: string): Promise<number> {
  let q = serviceClient().from('whatsapp_chat_messages').select('id', { count: 'exact', head: true })
    .eq('author', 'ai').gte('created_at', sinceIso);
  if (conversationId) q = q.eq('conversation_id', conversationId);
  const { count, error } = await q;
  if (error) throw error;
  return count || 0;
}

/** Delivery status from Meta for a chat message; same forward-only rule as the template log. */
export async function updateChatStatus(waMessageId: string, status: string, error?: string) {
  const sb = serviceClient();
  const { data: row, error: e } = await sb.from('whatsapp_chat_messages').select('id, status').eq('wa_message_id', waMessageId).maybeSingle();
  if (e || !row) return;
  if (row.status === 'failed' && status !== 'failed') return;
  if (status !== 'failed' && (STATUS_RANK[status] ?? -1) <= (STATUS_RANK[row.status] ?? -1)) return;
  const { error: uErr } = await sb.from('whatsapp_chat_messages')
    .update({ status, error: status === 'failed' ? error || 'Delivery failed' : null }).eq('id', row.id);
  if (uErr) console.error('WhatsApp chat: status update failed', uErr);
}
