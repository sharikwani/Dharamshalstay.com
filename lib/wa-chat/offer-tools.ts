// lib/wa-chat/offer-tools.ts
import { activeOffers, findCode, getOffer, issueCode, offerFor, settle } from '@/lib/offers/store';
import { formatIST, isExpired, normalizeCode, planPercent, rulesLine, upToText } from '@/lib/offers/rules';
import { samePhone } from './booking-store';
import { findHotel } from './find';
import type { ToolCtx } from './tools';

export type OfferOk = { ok: true; codeId: string; code: string; percent: number; expiresAt: string };
export type OfferCheck = OfferOk | { error: string };

export const OFFER_TOOL_DEF = {
  type: 'function',
  function: {
    name: 'get_offer_code',
    description: 'Give this customer their WhatsApp-only offer code for a hotel whose search_hotels or get_hotel result shows an offer. Returns the code, when it expires (India time), the maximum percent and the rules in one line. Asking again returns the same code until it expires.',
    parameters: {
      type: 'object',
      properties: { hotel_name: { type: 'string', description: 'Hotel name or page slug' } },
      required: ['hotel_name'],
      additionalProperties: false,
    },
  },
};

export async function getOfferCode(a: any, ctx: ToolCtx) {
  const p: any = await findHotel(String(a.hotel_name || ''));
  if (!p) return { error: 'Hotel not found. Use search_hotels first.' };
  const offer = await offerFor(p.id);
  if (!offer) return { error: 'This hotel has no WhatsApp offer right now.' };
  // The phone is always the chat's own number, never a tool argument.
  const r = await issueCode(offer.id, ctx.phone, ctx.conversationId);
  if (!r.ok) return { error: r.error };
  return {
    hotel: p.name, code: r.code.code, expires_at_india_time: formatIST(r.code.expires_at), up_to_percent: r.code.percent,
    rules: rulesLine(r.code, !!process.env.STRIPE_SECRET_KEY),
  };
}

/** "Up to X% off, only through this WhatsApp chat" per property with an active offer. Never throws. */
export async function offerNotes(propertyIds: string[]): Promise<Record<string, string>> {
  if (!propertyIds.length) return {};
  try {
    const want = new Set(propertyIds);
    return Object.fromEntries((await activeOffers()).filter((o) => want.has(o.property_id)).map((o) => [o.property_id, upToText(o)]));
  } catch (e) {
    console.error('Offer lookup failed:', e);
    return {};
  }
}

/** Can this chat's customer book this hotel room/plan with this code right now, and at what percent? */
export async function offerForBooking(i: { code: unknown; phone: string; propertyId: string | null | undefined; room?: string | null; plan?: string | null }): Promise<OfferCheck> {
  const found = await findCode(normalizeCode(i.code));
  if (!found || !samePhone(found.phone, i.phone)) return { error: 'That offer code was not found for this WhatsApp number. Use get_offer_code to get one.' };
  const { code: c } = await settle(found);
  if (c.status === 'booked') return { error: 'This offer code is already used for another booking.' };
  if (c.status !== 'issued') return { error: 'This offer code can no longer be used.' };
  if (isExpired(c)) return { error: 'This offer code has expired. Use get_offer_code to get a new one if the offer is still on.' };
  const offer = await getOffer(c.offer_id);
  if (!offer || !i.propertyId || offer.property_id !== i.propertyId) return { error: 'This offer code is for a different hotel.' };
  return { ok: true, codeId: c.id, code: c.code, percent: Math.min(planPercent(offer, i.room, i.plan), c.percent), expiresAt: c.expires_at };
}
