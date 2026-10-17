import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { serviceClient } from '@/lib/server-auth';

export const fetchCache = 'force-no-store';

export const runtime = 'nodejs';

/**
 * Resend delivery events (Resend → Webhooks → https://www.dharamshalastay.com/api/webhooks/resend,
 * events: email.sent, delivered, opened, clicked, bounced, complained, delivery_delayed).
 * Signed with Svix: HMAC-SHA256 of "id.timestamp.body" using RESEND_WEBHOOK_SECRET (whsec_...).
 * Bounces and spam complaints suppress the address so we never email it again.
 */
function verify(req: NextRequest, body: string): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return false;
  const id = req.headers.get('svix-id'), ts = req.headers.get('svix-timestamp'), sigs = req.headers.get('svix-signature');
  if (!id || !ts || !sigs) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const want = Buffer.from(createHmac('sha256', key).update(`${id}.${ts}.${body}`).digest('base64'));
  return sigs.split(' ').some((s) => {
    const got = Buffer.from(s.split(',')[1] || '');
    return got.length === want.length && timingSafeEqual(got, want);
  });
}

const RANK: Record<string, number> = { queued: 0, sent: 1, delivered: 2, opened: 3, clicked: 4, bounced: 5, complained: 6 };

export async function POST(req: NextRequest) {
  const body = await req.text();
  if (!verify(req, body)) return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  let ev: any;
  try { ev = JSON.parse(body); } catch { return NextResponse.json({ error: 'Bad body' }, { status: 400 }); }

  const type = String(ev?.type || '').replace(/^email\./, '');
  const resendId = ev?.data?.email_id;
  if (!resendId) return NextResponse.json({ received: true });
  const sb = serviceClient();
  const at = ev?.created_at || new Date().toISOString();

  const { data: msg } = await sb.from('email_messages').select('id,status,to_email,contact_id').eq('resend_id', resendId).maybeSingle();
  if (msg) {
    const patch: Record<string, unknown> = {};
    if (type === 'delivered') patch.delivered_at = at;
    if (type === 'opened') patch.opened_at = at;
    if (type === 'clicked') patch.clicked_at = at;
    if (type === 'bounced') patch.bounced_at = at;
    if (type in RANK && RANK[type] > (RANK[msg.status] ?? 0)) patch.status = type;
    if (type === 'delivery_delayed' && msg.status === 'sent') patch.error = 'delivery delayed';
    if (Object.keys(patch).length) await sb.from('email_messages').update(patch).eq('id', msg.id);
  }

  // Hard bounces and complaints: stop all email to this address (protects the domain's reputation).
  const hard = type === 'bounced' && (ev?.data?.bounce?.type || 'Permanent') !== 'Transient';
  if (hard || type === 'complained') {
    const to = String(msg?.to_email || (Array.isArray(ev?.data?.to) ? ev.data.to[0] : ev?.data?.to) || '').toLowerCase();
    if (to) {
      const reason = type === 'complained' ? 'complained' : 'bounced';
      const { data: c } = await sb.from('contacts').update({ suppressed_reason: reason, marketing_consent: false, updated_at: new Date().toISOString() }).eq('email', to).select('id');
      if (!c?.length) await sb.from('contacts').insert({ email: to, source: 'admin', suppressed_reason: reason });
    }
  }
  return NextResponse.json({ received: true });
}
