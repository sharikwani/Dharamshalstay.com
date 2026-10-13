import { serviceClient } from '@/lib/server-auth';
import { STATUS_RANK } from '@/lib/whatsapp-webhook';
import { VOICE_PLACEHOLDER, type ChatMessage, type ChatSettings, type Conversation, type ConversationStatus, type Inbound } from './types';

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
  // A closed chat opens again for the AI; the conditional update never reverts a status set meanwhile (for
  // example the owner taking over), and the status read above is never written back.
  if (c.status === 'closed') {
    const { error: rErr } = await sb.from('whatsapp_conversations').update({ status: 'ai', updated_at: now() })
      .eq('id', c.id).eq('status', 'closed').select('id');
    if (rErr) console.error('WhatsApp chat: could not reopen conversation:', rErr);
  }
  // unread_admin is read-then-incremented: two messages at the same instant may count once (badge only).
  const { data: conversation, error: uErr } = await sb.from('whatsapp_conversations').update({
    profile_name: m.profileName ?? c.profile_name, last_customer_at: at, last_message_at: now(),
    unread_admin: (c.unread_admin || 0) + 1, updated_at: now(),
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

/**
 * Take the turn lock: one AI turn per conversation at a time. It is free when processing_until is empty or in the
 * past, so the lock of a crashed invocation is taken over once it expires. Returns the lock token (its expiry) or
 * null when another turn holds it. Times come from this server's clock (PostgREST filters cannot use now()).
 */
export async function acquireTurnLock(conversationId: string, ms = 55_000): Promise<string | null> {
  const t = Date.now();
  const until = new Date(t + ms).toISOString();
  const { data, error } = await serviceClient().from('whatsapp_conversations').update({ processing_until: until })
    .eq('id', conversationId).or(`processing_until.is.null,processing_until.lt.${new Date(t).toISOString()}`).select('id');
  if (error) throw error;
  return (data || []).length ? until : null;
}

/** Free the turn lock, unless it expired and another turn has taken it since. */
export async function releaseTurnLock(conversationId: string, token: string): Promise<void> {
  const { error } = await serviceClient().from('whatsapp_conversations').update({ processing_until: null })
    .eq('id', conversationId).eq('processing_until', token);
  if (error) console.error('WhatsApp chat: could not release the turn lock:', error);
}

/** A voice note in this chat is still being transcribed (its text is the placeholder). */
export async function pendingVoice(conversationId: string, withinMs = 60_000): Promise<boolean> {
  const { data, error } = await serviceClient().from('whatsapp_chat_messages').select('id')
    .eq('conversation_id', conversationId).eq('kind', 'voice').eq('body', VOICE_PLACEHOLDER)
    .gte('created_at', new Date(Date.now() - withinMs).toISOString()).limit(1);
  if (error) { console.error('WhatsApp chat: pending voice check failed:', error); return false; }
  return (data || []).length > 0;
}

/** A note for the owner in the inbox (never sent to the customer, never shown to the AI). */
export async function saveSystemNote(conversationId: string, body: string): Promise<void> {
  const { error } = await serviceClient().from('whatsapp_chat_messages').insert({
    conversation_id: conversationId, direction: 'out', author: 'ai', body, kind: 'system', wa_message_id: null, status: 'sent',
  });
  if (error) console.error('WhatsApp chat: could not save a system note:', error);
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

/** Change the status only if it is still `from`. True when this call changed it (so only one caller acts on it). */
export async function setStatusIf(id: string, from: ConversationStatus, to: ConversationStatus, reason: string | null = null): Promise<boolean> {
  const { data, error } = await serviceClient().from('whatsapp_conversations')
    .update({ status: to, handover_reason: reason, updated_at: now() }).eq('id', id).eq('status', from).select('id');
  if (error) { console.error('WhatsApp chat: could not set status:', error); return false; }
  return (data || []).length > 0;
}

export async function getSettings(): Promise<ChatSettings> {
  const { data, error } = await serviceClient().from('whatsapp_settings').select('ai_mode, test_numbers').eq('id', 1).maybeSingle();
  if (error || !data) return { ai_mode: 'off', test_numbers: [] };
  return { ai_mode: data.ai_mode, test_numbers: data.test_numbers || [] };
}

export async function aiRepliesSince(sinceIso: string, conversationId?: string): Promise<number> {
  let q = serviceClient().from('whatsapp_chat_messages').select('id', { count: 'exact', head: true })
    .eq('author', 'ai').neq('kind', 'system').gte('created_at', sinceIso);
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
