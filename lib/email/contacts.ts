/**
 * The contact list: one row per person, merged by email (then phone) from every place we meet them.
 * Consent is only ever turned ON by an explicit opt-in (tick box, WhatsApp "yes", newsletter confirm),
 * never by a booking or enquiry on its own, and an unsubscribe always wins.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { serviceClient } from '@/lib/server-auth';

export type ContactSource = 'website' | 'whatsapp' | 'booking' | 'review' | 'newsletter' | 'admin';
export type Contact = {
  id: string; email: string | null; phone: string | null; name: string | null; language: string;
  interests: string[]; marketing_consent: boolean; unsubscribed_at: string | null; suppressed_reason: string | null;
  unsubscribe_token: string; double_opt_in_token: string | null; last_marketing_at: string | null;
};

export type ContactInput = {
  email?: string | null; phone?: string | null; name?: string | null; language?: 'en' | 'hi';
  source: ContactSource; interests?: string[];
  /** Only pass when the person actively opted in; the words they saw are stored as proof. */
  consent?: { text: string; source: string };
  event?: 'booking' | 'enquiry';
};

export const normEmail = (e?: string | null) => {
  const v = (e || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? v : null;
};
export const normPhone = (p?: string | null) => {
  const d = (p || '').replace(/\D/g, '');
  if (d.length === 10) return '91' + d;
  if (d.length === 12 && d.startsWith('91')) return d;
  return d.length >= 8 ? d : null;
};

/** Create or update a contact. Never throws; returns null if it could not be saved. */
export async function upsertContact(input: ContactInput, sb: SupabaseClient = serviceClient()): Promise<Contact | null> {
  try {
    const email = normEmail(input.email);
    const phone = normPhone(input.phone);
    if (!email && !phone) return null;

    let existing: any = null;
    if (email) existing = (await sb.from('contacts').select('*').eq('email', email).maybeSingle()).data;
    if (!existing && phone) existing = (await sb.from('contacts').select('*').eq('phone', phone).order('created_at').limit(1).maybeSingle()).data;

    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { updated_at: now };
    if (email && (!existing?.email)) patch.email = email;
    if (phone && !existing?.phone) patch.phone = phone;
    if (input.name && !existing?.name) patch.name = input.name.trim().slice(0, 120);
    if (input.language) patch.language = input.language;
    if (input.interests?.length) patch.interests = Array.from(new Set([...(existing?.interests || []), ...input.interests]));
    if (input.event === 'booking') { patch.last_booking_at = now; patch.booking_count = (existing?.booking_count || 0) + 1; }
    if (input.event === 'enquiry') patch.last_enquiry_at = now;
    // An explicit opt-in re-subscribes someone who unsubscribed earlier: it is their newest choice.
    if (input.consent && !existing?.suppressed_reason) {
      Object.assign(patch, { marketing_consent: true, consent_at: now, consent_source: input.consent.source, consent_text: input.consent.text, unsubscribed_at: null });
    }

    if (existing) {
      const { data } = await sb.from('contacts').update(patch).eq('id', existing.id).select('*').single();
      return (data as Contact) || existing;
    }
    const { data, error } = await sb.from('contacts').insert({ ...patch, source: input.source, created_at: now }).select('*').single();
    if (error?.code === '23505' && email) return (await sb.from('contacts').select('*').eq('email', email).maybeSingle()).data as Contact;
    if (error) { console.error('upsertContact failed:', error.message); return null; }
    return data as Contact;
  } catch (e) {
    console.error('upsertContact error:', e);
    return null;
  }
}

export const CONSENT_TEXT = {
  website: 'Send me travel ideas, festival offers and deals from Dharamshala Stay by email. I can unsubscribe at any time.',
  whatsapp: 'Guest said yes on WhatsApp to receiving travel ideas and offers by email.',
  newsletter: 'Signed up for the Dharamshala Stay newsletter and confirmed by email.',
};
