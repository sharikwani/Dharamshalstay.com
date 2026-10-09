import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'node:crypto';

let fixtures: Record<string, any> = {};
let dbError: any = null;
const updates: any[] = [];
const dbCalls: string[] = [];
const eqs: { table: string; col: string; val: unknown }[] = [];
const sendEmail = vi.fn(async (..._a: unknown[]) => {});

function builder(table: string) {
  dbCalls.push(table);
  const b: any = {
    select: () => b, eq: (col: string, val: unknown) => { eqs.push({ table, col, val }); return b; },
    update: (row: any) => { updates.push({ table, row }); return { eq: async (col: string, val: unknown) => { eqs.push({ table, col, val }); return { error: dbError }; } }; },
    maybeSingle: async () => ({ data: fixtures[table] ?? null, error: null }),
  };
  return b;
}
vi.mock('@/lib/server-auth', async (orig) => ({
  ...(await orig<typeof import('@/lib/server-auth')>()),
  serviceClient: () => ({ from: (t: string) => builder(t) }),
}));
vi.mock('@/lib/email', () => ({
  sendEmail: (...a: unknown[]) => sendEmail(...a),
  adminEmail: () => 'admin@x.com',
}));

import { GET, POST } from '@/app/api/whatsapp/webhook/route';
import { parseWebhook, replyAction } from '@/lib/whatsapp-webhook';

const SECRET = 'appsecret';
const send = (payload: unknown, sig?: string | null) => {
  const raw = JSON.stringify(payload);
  const header = sig === undefined ? 'sha256=' + createHmac('sha256', SECRET).update(raw).digest('hex') : sig;
  return POST(new Request('http://x', { method: 'POST', body: raw, headers: header ? { 'x-hub-signature-256': header } : {} }));
};
const wrap = (value: any) => ({ entry: [{ changes: [{ value }] }] });
const statusPayload = (status: string, extra: any = {}) => wrap({ statuses: [{ id: 'wamid.1', status, ...extra }] });
const replyPayload = (title: string, from = '919876543210', ctx = 'wamid.1') =>
  wrap({ messages: [{ from, type: 'button', button: { text: title }, context: { id: ctx } }] });

beforeEach(() => {
  process.env.WHATSAPP_APP_SECRET = SECRET;
  process.env.WHATSAPP_VERIFY_TOKEN = 'verify-me';
  fixtures = {}; dbError = null; updates.length = 0; dbCalls.length = 0; eqs.length = 0; sendEmail.mockClear();
});

describe('GET verification', () => {
  const get = (q: string) => GET(new Request('http://x/api/whatsapp/webhook?' + q));
  it('echoes the challenge', async () => {
    const res = await get('hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=123');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('123');
  });
  it('403 on wrong token', async () => {
    expect((await get('hub.mode=subscribe&hub.verify_token=nope&hub.challenge=1')).status).toBe(403);
  });
  it('403 when no verify token is configured', async () => {
    process.env.WHATSAPP_VERIFY_TOKEN = '';
    expect((await get('hub.mode=subscribe&hub.verify_token=&hub.challenge=1')).status).toBe(403);
  });
});

describe('parse helpers', () => {
  it('parses statuses and button / interactive replies', () => {
    const p = parseWebhook(wrap({
      statuses: [{ id: 'a', status: 'failed', errors: [{ title: 'Bad number' }] }, { id: 'b', status: 'read' }, { id: 'c', status: 'weird' }],
      messages: [
        { from: '1', type: 'button', button: { text: 'Accept' }, context: { id: 'x' } },
        { from: '2', type: 'interactive', interactive: { button_reply: { title: "Can't do it" } }, context: { id: 'y' } },
        { from: '3', type: 'text', text: { body: 'hi' } },
      ],
    }));
    expect(p.statuses).toEqual([{ id: 'a', status: 'failed', error: 'Bad number' }, { id: 'b', status: 'read' }]);
    expect(p.replies).toEqual([{ contextId: 'x', from: '1', text: 'Accept' }, { contextId: 'y', from: '2', text: "Can't do it" }]);
  });
  it('maps reply text', () => {
    expect(replyAction('ACCEPT')).toBe('accepted');
    expect(replyAction("Can't do it")).toBe('declined');
    expect(replyAction('cant do it')).toBe('declined');
    expect(replyAction('Cannot')).toBe('declined');
    expect(replyAction("Accept? can't do it")).toBe('declined');
    expect(replyAction('hello')).toBeNull();
  });
  it('collapses whitespace before matching', () => {
    expect(replyAction("  Can't \t\n  do   it  ")).toBe('declined');
    expect(replyAction('cant   do it!')).toBe('declined');
    expect(replyAction('  Accept\n')).toBe('accepted');
  });
  it('tolerates garbage', () => {
    expect(parseWebhook(null)).toEqual({ statuses: [], replies: [] });
  });
});

describe('POST /api/whatsapp/webhook', () => {
  it('401 on a bad signature with no DB calls', async () => {
    const res = await send(statusPayload('read'), 'sha256=deadbeef');
    expect(res.status).toBe(401);
    expect(dbCalls).toHaveLength(0);
  });
  it('401 on a missing signature', async () => {
    expect((await send(statusPayload('read'), null)).status).toBe(401);
  });

  it('advances a status', async () => {
    fixtures.whatsapp_messages = { id: 'm1', status: 'sent' };
    const res = await send(statusPayload('delivered'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(updates[0].table).toBe('whatsapp_messages');
    expect(updates[0].row).toMatchObject({ status: 'delivered' });
    expect(updates[0].row.updated_at).toBeTruthy();
    expect(eqs).toContainEqual({ table: 'whatsapp_messages', col: 'wa_message_id', val: 'wamid.1' });
  });
  it('failed is terminal: a later delivered does not overwrite it', async () => {
    fixtures.whatsapp_messages = { id: 'm1', status: 'failed' };
    await send(statusPayload('delivered'));
    expect(updates).toHaveLength(0);
  });
  it('never moves a status backwards', async () => {
    fixtures.whatsapp_messages = { id: 'm1', status: 'read' };
    await send(statusPayload('delivered'));
    expect(updates).toHaveLength(0);
  });
  it('failed always wins and stores the error', async () => {
    fixtures.whatsapp_messages = { id: 'm1', status: 'read' };
    await send(statusPayload('failed', { errors: [{ title: 'Undeliverable' }] }));
    expect(updates[0].row).toMatchObject({ status: 'failed', error: 'Undeliverable' });
  });
  it('ignores a status for an unknown message', async () => {
    const res = await send(statusPayload('read'));
    expect(res.status).toBe(200);
    expect(updates).toHaveLength(0);
  });

  it('Accept reply updates the booking', async () => {
    fixtures.whatsapp_messages = { id: 'm1', booking_id: 'b1', to_phone: '919876543210' };
    const res = await send(replyPayload('Accept', '919876543210'));
    expect(res.status).toBe(200);
    expect(updates[0].table).toBe('bookings');
    expect(updates[0].row).toMatchObject({ partner_response: 'accepted' });
    expect(updates[0].row.partner_responded_at).toBeTruthy();
    expect(eqs).toContainEqual({ table: 'bookings', col: 'id', val: 'b1' });
    expect(eqs).toContainEqual({ table: 'whatsapp_messages', col: 'wa_message_id', val: 'wamid.1' });
    expect(sendEmail).not.toHaveBeenCalled();
  });
  it('declined reply emails the admin with escaped text', async () => {
    fixtures.whatsapp_messages = { id: 'm1', booking_id: 'b1', to_phone: '919876543210' };
    fixtures.bookings = { booking_ref: 'TRK-<1>' };
    await send(replyPayload("Can't do it"));
    expect(updates[0].row).toMatchObject({ partner_response: 'declined' });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const msg: any = sendEmail.mock.calls[0][0];
    expect(msg.to).toBe('admin@x.com');
    expect(msg.subject).toBe("Partner can't do booking TRK-<1>");
    expect(msg.html).toContain('TRK-&lt;1&gt;');
    expect(msg.html).not.toContain('TRK-<1>');
  });
  it('does not re-email when already declined', async () => {
    fixtures.whatsapp_messages = { id: 'm1', booking_id: 'b1', to_phone: '919876543210' };
    fixtures.bookings = { booking_ref: 'TRK-1', partner_response: 'declined' };
    await send(replyPayload("Can't do it"));
    expect(sendEmail).not.toHaveBeenCalled();
  });
  it('handles an interactive button_reply end to end', async () => {
    fixtures.whatsapp_messages = { id: 'm1', booking_id: 'b1', to_phone: '919876543210' };
    const res = await send(wrap({ messages: [{ from: '919876543210', type: 'interactive',
      interactive: { button_reply: { id: 'x', title: 'Accept' } }, context: { id: 'wamid.1' } }] }));
    expect(res.status).toBe(200);
    expect(updates[0].row).toMatchObject({ partner_response: 'accepted' });
  });
  it('ignores an unknown context', async () => {
    const res = await send(replyPayload('Accept'));
    expect(res.status).toBe(200);
    expect(updates).toHaveLength(0);
  });
  it('ignores a message without a booking', async () => {
    fixtures.whatsapp_messages = { id: 'm1', booking_id: null, to_phone: '919876543210' };
    await send(replyPayload('Accept'));
    expect(updates).toHaveLength(0);
  });
  it('ignores a reply from a different number', async () => {
    fixtures.whatsapp_messages = { id: 'm1', booking_id: 'b1', to_phone: '919876543210' };
    await send(replyPayload('Accept', '919111111111'));
    expect(updates).toHaveLength(0);
  });
  it('ignores unrecognised reply text', async () => {
    fixtures.whatsapp_messages = { id: 'm1', booking_id: 'b1', to_phone: '919876543210' };
    await send(replyPayload('Maybe'));
    expect(updates).toHaveLength(0);
  });
  it('still returns 200 and logs when a DB write fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    fixtures.whatsapp_messages = { id: 'm1', status: 'sent' };
    dbError = { message: 'db down' };
    const res = await send(statusPayload('delivered'));
    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
