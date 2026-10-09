import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'node:crypto';
import { cleanParam, isWhatsAppConfigured, sendTemplate, verifySignature } from '@/lib/whatsapp-cloud';

beforeEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('cleanParam', () => {
  it('removes newlines, tabs and long space runs, trims, caps length, fills empty', () => {
    expect(cleanParam('Room 4\nnear lift\t ok    please')).toBe('Room 4 near lift ok please');
    expect(cleanParam('   ')).toBe('-');
    expect(cleanParam('x'.repeat(400))).toHaveLength(300);
  });
});

describe('sendTemplate', () => {
  it('is a no-op when not configured', async () => {
    vi.stubEnv('WHATSAPP_TOKEN', ''); vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '');
    expect(isWhatsAppConfigured()).toBe(false);
    expect(await sendTemplate({ to: '919816000005', template: 't', params: [] })).toEqual({ ok: false, skipped: true });
  });
  it('posts the template and returns the message id', async () => {
    vi.stubEnv('WHATSAPP_TOKEN', 'tok'); vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '123');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ messages: [{ id: 'wamid.1' }] }), { status: 200 }));
    const r = await sendTemplate({ to: '919816000005', template: 'booking_new_partner', params: ['A', 'B\nC'] });
    expect(r).toEqual({ ok: true, id: 'wamid.1' });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://graph.facebook.com/v21.0/123/messages');
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({ messaging_product: 'whatsapp', to: '919816000005', type: 'template', template: { name: 'booking_new_partner', language: { code: 'en' } } });
    expect(body.template.components[0]).toEqual({ type: 'body', parameters: [{ type: 'text', text: 'A' }, { type: 'text', text: 'B C' }] });
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });
  it('returns Meta error text on failure', async () => {
    vi.stubEnv('WHATSAPP_TOKEN', 'tok'); vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '123');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: { message: 'Template not found' } }), { status: 400 }));
    expect(await sendTemplate({ to: '919816000005', template: 'x', params: [] })).toEqual({ ok: false, error: 'Template not found' });
  });
  it('never throws on network errors', async () => {
    vi.stubEnv('WHATSAPP_TOKEN', 'tok'); vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '123');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    expect(await sendTemplate({ to: '919816000005', template: 'x', params: [] })).toEqual({ ok: false, error: 'offline' });
  });
});

describe('verifySignature', () => {
  it('accepts a correct sha256 signature and rejects others', () => {
    vi.stubEnv('WHATSAPP_APP_SECRET', 'secret');
    const body = '{"a":1}';
    const sig = 'sha256=' + createHmac('sha256', 'secret').update(body).digest('hex');
    expect(verifySignature(body, sig)).toBe(true);
    expect(verifySignature(body, 'sha256=00')).toBe(false);
    expect(verifySignature(body, null)).toBe(false);
  });
  it('rejects everything when no app secret is set', () => {
    vi.stubEnv('WHATSAPP_APP_SECRET', '');
    expect(verifySignature('{}', 'sha256=abc')).toBe(false);
  });
});
