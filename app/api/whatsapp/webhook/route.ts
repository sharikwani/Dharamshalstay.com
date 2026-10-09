import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/server-auth';
import { verifySignature } from '@/lib/whatsapp-cloud';
import { parseWebhook, replyAction, STATUS_RANK } from '@/lib/whatsapp-webhook';
import { sendEmail, adminEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const digits = (s: string) => String(s || '').replace(/\D/g, '');
// Compare the last 10 digits so "91XXXXXXXXXX" and "XXXXXXXXXX" forms match.
const samePhone = (a: string, b: string) => {
  const x = digits(a), y = digits(b);
  return x.length >= 10 && y.length >= 10 && x.slice(-10) === y.slice(-10);
};

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  if (token && q.get('hub.mode') === 'subscribe' && q.get('hub.verify_token') === token) {
    return new Response(q.get('hub.challenge') ?? '', { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
  return new Response('Forbidden', { status: 403 });
}

type Sb = ReturnType<typeof serviceClient>;

async function handleStatus(sb: Sb, s: { id: string; status: string; error?: string }) {
  const { data: row, error } = await sb.from('whatsapp_messages').select('id, status').eq('wa_message_id', s.id).maybeSingle();
  if (error) { console.error('WhatsApp webhook: status lookup failed', error); return; }
  if (!row) return;
  if (row.status === 'failed' && s.status !== 'failed') return; // failed is terminal
  if (s.status !== 'failed' && (STATUS_RANK[s.status] ?? -1) <= (STATUS_RANK[row.status] ?? -1)) return;
  const patch: Record<string, unknown> = { status: s.status, updated_at: new Date().toISOString() };
  if (s.status === 'failed') patch.error = s.error || 'Delivery failed';
  const { error: upErr } = await sb.from('whatsapp_messages').update(patch).eq('wa_message_id', s.id);
  if (upErr) console.error('WhatsApp webhook: status update failed', upErr);
}

async function handleReply(sb: Sb, r: { contextId: string; from: string; text: string }) {
  const action = replyAction(r.text);
  if (!action) return;
  const { data: msg, error } = await sb.from('whatsapp_messages')
    .select('id, booking_id, to_phone, created_at').eq('wa_message_id', r.contextId).maybeSingle();
  if (error) { console.error('WhatsApp webhook: reply lookup failed', error); return; }
  if (!msg?.booking_id || !samePhone(r.from, msg.to_phone)) return;

  const { data: booking, error: bErr } = await sb.from('bookings')
    .select('booking_ref, partner_response, status').eq('id', msg.booking_id).maybeSingle();
  if (bErr) { console.error('WhatsApp webhook: booking lookup failed', bErr); return; }
  if (!booking || booking.status === 'cancelled') return; // nothing to accept or reassign

  // A later cancellation notice to this number means the booking was taken away from them
  // (reassigned or cancelled); their reply to the older alert no longer counts.
  const { data: later, error: lErr } = await sb.from('whatsapp_messages')
    .select('id').eq('booking_id', msg.booking_id).eq('to_phone', msg.to_phone)
    .eq('template', 'booking_cancelled_partner').gt('created_at', msg.created_at)
    .limit(1).maybeSingle();
  if (lErr) { console.error('WhatsApp webhook: reassignment check failed', lErr); return; }
  if (later) return;

  const { error: upErr } = await sb.from('bookings')
    .update({ partner_response: action, partner_responded_at: new Date().toISOString() })
    .eq('id', msg.booking_id);
  if (upErr) { console.error('WhatsApp webhook: booking update failed', upErr); return; }
  if (action !== 'declined' || booking.partner_response === 'declined') return;
  const ref = booking.booking_ref || msg.booking_id;
  await sendEmail({
    to: adminEmail(),
    subject: `Partner can't do booking ${ref}`,
    html: `<p>The partner replied "Can't do it" on WhatsApp for booking <strong>${esc(ref)}</strong>.</p><p>Please reassign or contact them.</p>`,
  });
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get('x-hub-signature-256'))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  let payload: unknown = null;
  try { payload = JSON.parse(raw); } catch { /* acknowledge anyway */ }
  const { statuses, replies } = parseWebhook(payload);
  const sb = serviceClient();
  for (const s of statuses) {
    try { await handleStatus(sb, s); } catch (e) { console.error('WhatsApp webhook: status error', e); }
  }
  for (const r of replies) {
    try { await handleReply(sb, r); } catch (e) { console.error('WhatsApp webhook: reply error', e); }
  }
  return NextResponse.json({ ok: true });
}
