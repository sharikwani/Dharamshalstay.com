// lib/wa-chat/cancellations.ts
import { cancelBooking } from '@/lib/bookings/cancel';
import { hoursUntilStart } from '@/lib/bookings/timing';
import { downloadMedia, sendText } from '@/lib/whatsapp-cloud';
import { sendEmail, adminEmail } from '@/lib/email';
import { serviceClient } from '@/lib/server-auth';
import { siteConfig } from '@/lib/config';
import { claimCancellation, findOwnBooking, ownBookings, saveCancellation, updateCancellation, type Cancellation, type OwnBooking } from './booking-store';
import { checkProof } from './proof';
import { saveOutbound, setMessageBody, setStatus } from './store';
import type { ToolCtx } from './tools';
import type { Conversation, Inbound } from './types';

type Handover = (a: any, ctx: ToolCtx) => Promise<unknown>;

export const REASON_CODES = ['medical', 'travel_disruption', 'family_emergency', 'weather_road', 'duplicate_or_mistake', 'other'] as const;
const LABEL: Record<string, string> = {
  medical: 'Illness or medical emergency', travel_disruption: 'Travel cancelled or delayed', family_emergency: 'Family emergency',
  weather_road: 'Weather or road closure', duplicate_or_mistake: 'Booked twice or by mistake', other: 'Other reason',
};
const PROOF_BUCKET = 'whatsapp-proofs';
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };
export const PROOF_REVIEW_REPLY = 'Thank you, we have received your document. A team member will review your cancellation request and reply here shortly. 🙏';
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export const CANCEL_TOOL_DEF = {
  type: 'function', function: {
    name: 'request_cancellation',
    description: 'Start cancelling one of this customer\'s bookings. Ask for the booking reference and the reason first. Follow the result exactly.',
    parameters: { type: 'object', additionalProperties: false, required: ['booking_ref', 'reason_code', 'reason_text'], properties: {
      booking_ref: { type: 'string', description: 'Booking reference, e.g. TRK-1234' },
      reason_code: { type: 'string', enum: [...REASON_CODES] },
      reason_text: { type: 'string', description: 'The customer\'s reason in their words' },
    } },
  },
};

const entityKey = (b: OwnBooking) => b.property_id || b.trek_id || b.paragliding_id || b.taxi_route_id || '';
const startDay = (b: OwnBooking) => b.check_in || b.activity_date || '';

/** Another live booking for the same thing on the same day, made within 48 hours of this one. */
function hasDuplicate(b: OwnBooking, all: OwnBooking[]) {
  return all.some((o) => o.id !== b.id && o.status !== 'cancelled' && o.category === b.category && entityKey(o) === entityKey(b)
    && !!entityKey(b) && startDay(o) === startDay(b) && Math.abs(Date.parse(o.created_at) - Date.parse(b.created_at)) <= 48 * 3600e3);
}

/** Why the AI may not cancel this booking right now, or null if it may. */
function blocker(b: OwnBooking): 'already_cancelled' | 'paid' | 'within_24h' | 'no_start' | null {
  if (b.status === 'cancelled') return 'already_cancelled';
  if (b.payment_status === 'paid' || b.payment_status === 'partially_paid' || b.stripe_payment_intent) return 'paid';
  const hours = hoursUntilStart(b);
  if (hours === null) return 'no_start';
  return hours < 24 ? 'within_24h' : null;
}

export async function requestCancellation(a: { booking_ref: string; reason_code: string; reason_text?: string }, ctx: ToolCtx, handover: Handover) {
  const b = await findOwnBooking(ctx.phone, a.booking_ref);
  if (!b) return { result: 'not_found' as const, message: 'No booking with that reference for this WhatsApp number.' };
  const code = (REASON_CODES as readonly string[]).includes(a.reason_code) ? a.reason_code : 'other';
  const text = String(a.reason_text || '').slice(0, 500);
  const block = blocker(b);
  if (block === 'already_cancelled') return { result: 'already_cancelled' as const };
  if (block === 'within_24h') return { result: 'not_allowed_within_24h' as const, message: 'Bookings cannot be cancelled or refunded within 24 hours of the start time.' };
  if (block === 'paid' || block === 'no_start' || code === 'other') {
    await handover({ reason: `Cancellation request ${b.booking_ref}: ${block === 'paid' ? 'paid booking' : LABEL[code]} - ${text}` }, ctx);
    return { result: 'handed_over' as const };
  }
  if (code === 'duplicate_or_mistake') {
    if (!hasDuplicate(b, await ownBookings(ctx.phone))) {
      await handover({ reason: `Cancellation request ${b.booking_ref}: booked by mistake, no duplicate found - ${text}` }, ctx);
      return { result: 'handed_over' as const };
    }
    const r = await cancelBooking(b, `WhatsApp: duplicate booking - ${text}`, { notify: true });
    if (!r.ok) { await handover({ reason: `Could not cancel duplicate ${b.booking_ref}` }, ctx); return { result: 'handed_over' as const }; }
    return { result: 'cancelled' as const };
  }
  await saveCancellation({ conversation_id: ctx.conversationId, booking_id: b.id, reason_code: code, reason_text: text, status: 'awaiting_proof' });
  return { result: 'need_proof' as const, message: 'Ask the customer to send a clear photo or PDF of the proof in this chat.' };
}

/** A document arrived while a cancellation waits for proof: check it, then cancel or send it to the owner. */
export async function handleProof(c: Conversation, messageId: string, m: Inbound, open: Cancellation): Promise<'cancelled' | 'review'> {
  try {
    // Only one proof message per request is processed; a concurrent one stops here.
    if (!(await claimCancellation(open.id))) return 'review';
    return await processProof(c, messageId, m, open);
  } catch (e) {
    console.error('WhatsApp proof handling failed:', e);
    return reviewFallback(c, messageId, m, open, e);
  }
}

/** Last resort when proof handling threw: hand the request to the owner and answer the customer. */
async function reviewFallback(c: Conversation, messageId: string, m: Inbound, open: Cancellation, e: unknown): Promise<'review'> {
  const note = `error: ${e instanceof Error ? e.message : String(e)}`.slice(0, 500);
  await updateCancellation(open.id, { status: 'needs_review', verdict: 'unclear', verdict_notes: note }).catch(() => {});
  await setMessageBody(messageId, `${m.mediaLabel || '[document]'} [proof received: sent to the team for review]`).catch(() => {});
  await setStatus(c.id, 'needs_human', `Cancellation proof to review: ${open.booking_id}`).catch(() => {});
  try {
    const r = await sendText(c.phone, PROOF_REVIEW_REPLY);
    await saveOutbound(c.id, 'ai', PROOF_REVIEW_REPLY, r.ok ? r.id : null, r.ok ? undefined : r.error);
  } catch (err) { console.error('Proof review reply failed:', err); }
  const who = c.profile_name || `+${c.phone}`;
  await sendEmail({
    to: adminEmail(), subject: `Cancellation to review: ${open.booking_id} (${who})`,
    html: `<p>${esc(who)} sent a cancellation proof but processing failed.</p><ul><li>Reason: ${esc(LABEL[open.reason_code])} - ${esc(open.reason_text)}</li><li>${esc(note)}</li></ul>`
      + `<p>No proof link available.</p><p><a href="${siteConfig.url}/admin/whatsapp?c=${c.id}">Open the chat</a></p>`,
  }).catch((err) => console.error('Proof review email failed:', err));
  return 'review';
}

async function processProof(c: Conversation, messageId: string, m: Inbound, open: Cancellation): Promise<'cancelled' | 'review'> {
  let cancelFailed = false;
  const b = (await ownBookings(c.phone)).find((x) => x.id === open.booking_id) ?? null;
  const media = m.mediaId ? await downloadMedia(m.mediaId) : null;
  let proof_path: string | null = null;
  if (media) {
    const mime = media.mimeType.split(';')[0].trim().toLowerCase();
    const path = `${c.id}/${open.id}.${EXT[mime] || 'bin'}`;
    const { error } = await serviceClient().storage.from(PROOF_BUCKET).upload(path, Buffer.from(media.data), { contentType: mime, upsert: true });
    if (error) console.error('WhatsApp proof upload failed:', error); else proof_path = path;
  }
  const verdict = !b ? { verdict: 'unclear' as const, notes: 'Booking not found' }
    : !media ? { verdict: 'unclear' as const, notes: 'Could not download the file' }
    : await checkProof({ data: media.data, mimeType: media.mimeType, guestName: b.guest_name || c.profile_name || '', startDate: startDay(b), reasonCode: open.reason_code, reasonText: open.reason_text });

  if (b && verdict.verdict === 'matches' && blocker(b) === null) {
    const r = await cancelBooking(b, `WhatsApp: ${LABEL[open.reason_code]} - ${open.reason_text} (proof checked)`, { notify: true });
    if (r.ok) {
      await updateCancellation(open.id, { status: 'cancelled', verdict: verdict.verdict, verdict_notes: verdict.notes, proof_path });
      await setMessageBody(messageId, `${m.mediaLabel || '[document]'} [proof for ${b.booking_ref}: checked, booking cancelled]`);
      return 'cancelled';
    }
    cancelFailed = true;
  }

  const why = cancelFailed ? 'proof matches but cancelling failed' : !b ? 'booking not found' : blocker(b) ? `booking is now ${blocker(b)}` : `proof ${verdict.verdict}`;
  await updateCancellation(open.id, { status: 'needs_review', verdict: verdict.verdict, verdict_notes: `${verdict.notes} (${why})`.slice(0, 500), proof_path });
  await setMessageBody(messageId, `${m.mediaLabel || '[document]'} [proof for ${b?.booking_ref || 'booking'}: sent to the team for review]`);
  await setStatus(c.id, 'needs_human', `Cancellation proof to review: ${b?.booking_ref || open.booking_id}`);
  const r = await sendText(c.phone, PROOF_REVIEW_REPLY);
  await saveOutbound(c.id, 'ai', PROOF_REVIEW_REPLY, r.ok ? r.id : null, r.ok ? undefined : r.error).catch((e) => console.error('Proof reply save failed:', e));
  const signed = proof_path ? (await serviceClient().storage.from(PROOF_BUCKET).createSignedUrl(proof_path, 7 * 24 * 3600).catch(() => null))?.data?.signedUrl : null;
  const who = c.profile_name || `+${c.phone}`;
  await sendEmail({
    to: adminEmail(), subject: `Cancellation to review: ${b?.booking_ref || ''} (${who})`,
    html: `<p>${esc(who)} asked to cancel <strong>${esc(b?.booking_ref || open.booking_id)}</strong>.</p><ul>`
      + `<li>Reason: ${esc(LABEL[open.reason_code])} - ${esc(open.reason_text)}</li><li>AI check: <strong>${esc(verdict.verdict)}</strong> - ${esc(verdict.notes)}</li><li>Why it needs you: ${esc(why)}</li></ul>`
      + `${signed ? `<p><a href="${signed}">View the proof</a> (link valid 7 days)</p>` : '<p>No proof file could be saved.</p>'}`
      + `<p><a href="${siteConfig.url}/admin/whatsapp?c=${c.id}">Open the chat</a></p>`,
  }).catch((e) => console.error('Proof review email failed:', e));
  return 'review';
}
