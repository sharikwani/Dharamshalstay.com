export type ConversationStatus = 'ai' | 'human' | 'needs_human' | 'closed';
export type Author = 'customer' | 'ai' | 'admin';
export type AiMode = 'off' | 'test' | 'on';

export type Conversation = {
  id: string; phone: string; profile_name: string | null; status: ConversationStatus;
  handover_reason: string | null; last_customer_at: string | null; last_message_at: string;
  unread_admin: number; created_at: string;
};
export type ChatMessage = {
  id: string; conversation_id: string; direction: 'in' | 'out'; author: Author; body: string;
  kind: 'text' | 'voice' | 'media' | 'system'; wa_message_id: string | null; status: string;
  error: string | null; created_at: string;
};
export type ChatSettings = { ai_mode: AiMode; test_numbers: string[] };

/** A customer message as parsed from Meta's webhook. */
export type Inbound = {
  waId: string; from: string; profileName: string | null; timestamp: number;
  kind: 'text' | 'voice' | 'media'; text: string; mediaId?: string; mediaLabel?: string;
};
