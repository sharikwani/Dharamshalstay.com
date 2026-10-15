/**
 * "Your property is listed: claim it or have it removed" WhatsApp messages to
 * directory hotels, sent from the business number with the approved template
 * listing_claim_invite (scripts/create-listing-outreach-template.mjs).
 * Each hotel is messaged once; a failed send can be retried.
 */
import { serviceClient } from '@/lib/server-auth';
import { siteConfig } from '@/lib/config';
import { isWhatsAppConfigured, sendTemplate } from '@/lib/whatsapp-cloud';
import { normalizeIndianPhone } from '@/lib/whatsapp';
import { listingLinkSuffix } from './links';

export const OUTREACH_TEMPLATE = 'listing_claim_invite';
/** Sends per request, so one call stays well inside the function time limit. */
export const OUTREACH_BATCH = 8;

export type OutreachRow = {
  id: string; name: string; slug: string; phone: string | null;
  /** Why it can't be messaged, or null when it can. */
  blocked: string | null;
  last: { status: string; error: string | null; at: string } | null;
};

/** Template params: hotel name, listing page. Buttons: claim / remove (same keyed suffix). */
export function outreachMessage(p: { id: string; name: string; slug: string }) {
  const suffix = listingLinkSuffix(p);
  return { params: [p.name, siteConfig.url + '/hotels/' + p.slug], urlButtons: [suffix, suffix] };
}

export async function outreachList(): Promise<OutreachRow[]> {
  const sb = serviceClient();
  const { data: props, error } = await sb.from('properties')
    .select('id, name, slug, contact_phone, owner_email, status')
    .eq('listing_type', 'directory').eq('status', 'published').order('name');
  if (error) throw new Error(error.message);
  const ids = (props || []).map((p) => p.id);
  const { data: msgs, error: mErr } = ids.length
    ? await sb.from('whatsapp_messages').select('property_id, status, error, created_at')
      .eq('template', OUTREACH_TEMPLATE).in('property_id', ids).order('created_at', { ascending: false })
    : { data: [], error: null };
  if (mErr) throw new Error(mErr.message);
  const last = new Map<string, any>();
  for (const m of msgs || []) if (!last.has(m.property_id)) last.set(m.property_id, m);

  return (props || []).map((p) => {
    const l = last.get(p.id);
    const mobile = normalizeIndianPhone(p.contact_phone);
    const blocked = p.owner_email ? 'Already claimed'
      : !p.contact_phone ? 'No phone number'
      : !mobile ? 'Landline: no WhatsApp'
      : l && l.status !== 'failed' ? 'Already messaged'
      : null;
    return { id: p.id, name: p.name, slug: p.slug, phone: p.contact_phone, blocked, last: l ? { status: l.status, error: l.error, at: l.created_at } : null };
  });
}

export type OutreachResult = { id: string; name: string; ok: boolean; error?: string };

/** Message up to OUTREACH_BATCH hotels that can be messaged (all of them, or only `onlyIds`). */
export async function sendOutreach(onlyIds?: string[]): Promise<{ results: OutreachResult[]; remaining: number }> {
  if (!isWhatsAppConfigured()) throw new Error('WhatsApp is not configured on this server');
  const sb = serviceClient();
  const ready = (await outreachList()).filter((r) => !r.blocked && (!onlyIds || onlyIds.includes(r.id)));
  const batch = ready.slice(0, OUTREACH_BATCH);
  const results: OutreachResult[] = [];

  for (const p of batch) {
    const to = normalizeIndianPhone(p.phone)!;
    const { data: logRow, error: logErr } = await sb.from('whatsapp_messages')
      .insert({ booking_id: null, property_id: p.id, recipient_kind: 'hotel', to_phone: to, template: OUTREACH_TEMPLATE, status: 'queued' })
      .select('id').single();
    if (logErr) { results.push({ id: p.id, name: p.name, ok: false, error: 'Could not log: ' + logErr.message }); continue; }

    const msg = outreachMessage(p);
    const r = await sendTemplate({ to, template: OUTREACH_TEMPLATE, params: msg.params, urlButtons: msg.urlButtons });
    // An unknown result may have been delivered: keep it out of 'failed' so it is never sent twice automatically.
    const update = r.ok ? { status: 'sent', wa_message_id: r.id }
      : r.unknown ? { status: 'sent', error: 'Delivery unknown: ' + (r.error || '') }
      : { status: 'failed', error: r.error || 'Not sent' };
    await sb.from('whatsapp_messages').update({ ...update, updated_at: new Date().toISOString() }).eq('id', logRow.id);
    results.push({ id: p.id, name: p.name, ok: r.ok, error: r.ok ? undefined : update.error });
  }
  return { results, remaining: ready.length - batch.length };
}
