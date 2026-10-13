import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'node:crypto';
import { cleanParam, downloadMedia, isWhatsAppConfigured, markReadTyping, sendTemplate, sendText, verifySignature } from '@/lib/whatsapp-cloud';

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
    // The request may have reached Meta before the connection broke, so delivery is unknown (not a rejection).
    expect(await sendTemplate({ to: '919816000005', template: 'x', params: [] })).toEqual({ ok: false, unknown: true, error: 'offline' });
  });
  it('a connection that never opened is a plain failure (nothing was sent)', async () => {
    vi.stubEnv('WHATSAPP_TOKEN', 'tok'); vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '123');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(Object.assign(new TypeError('fetch failed'), { cause: { code: 'ENOTFOUND' } }));
    expect(await sendTemplate({ to: '919816000005', template: 'x', params: [] })).toEqual({ ok: false, error: 'fetch failed', notSent: true });
  });
  it('an HTTP 5xx may still have been accepted: unknown, not failed', async () => {
    vi.stubEnv('WHATSAPP_TOKEN', 'tok'); vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '123');
    for (const status of [500, 503, 504]) {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: { message: 'Service unavailable' } }), { status }));
      expect(await sendTemplate({ to: '919816000005', template: 'x', params: [] })).toEqual({ ok: false, unknown: true, error: 'Service unavailable' });
    }
  });
  it('a rejection from Meta is not unknown', async () => {
    vi.stubEnv('WHATSAPP_TOKEN', 'tok'); vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '123');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: { message: 'Bad number' } }), { status: 400 }));
    expect(await sendTemplate({ to: '919816000005', template: 'x', params: [] })).not.toHaveProperty('unknown');
  });
  it('sends with a 5 second timeout signal and returns an error when it times out', async () => {
    vi.stubEnv('WHATSAPP_TOKEN', 'tok'); vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '123');
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new DOMException('The operation was aborted due to timeout', 'TimeoutError'));
    const r = await sendTemplate({ to: '919816000005', template: 'x', params: [] });
    expect(r.ok).toBe(false);
    expect((r as { error?: string }).error).toMatch(/timeout/i);
    expect(r).toMatchObject({ unknown: true });
    expect((fetchMock.mock.calls[0][1] as RequestInit).signal).toBeInstanceOf(AbortSignal);
    expect(timeoutSpy).toHaveBeenCalledWith(5000);
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

describe('chat helpers', () => {
  beforeEach(() => { vi.stubEnv('WHATSAPP_TOKEN', 't'); vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', 'p'); });
  it('sendText posts a text message', async () => {
    const f = vi.fn(async (..._a: any[]) => new Response(JSON.stringify({ messages: [{ id: 'wamid.9' }] })));
    vi.stubGlobal('fetch', f);
    expect(await sendText('919800000001', 'Hello')).toEqual({ ok: true, id: 'wamid.9' });
    expect(JSON.parse(f.mock.calls[0][1].body)).toMatchObject({ to: '919800000001', type: 'text', text: { body: 'Hello' } });
  });
  it('sendText: a timeout or an accepted request without a message id is unknown, a rejection is not', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new DOMException('The operation was aborted due to timeout', 'TimeoutError'); }));
    expect(await sendText('919800000001', 'Hello')).toMatchObject({ ok: false, unknown: true });
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not json', { status: 200 })));
    expect(await sendText('919800000001', 'Hello')).toMatchObject({ ok: false, unknown: true });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { message: 'Re-engagement message' } }), { status: 400 })));
    expect(await sendText('919800000001', 'Hello')).toEqual({ ok: false, error: 'Re-engagement message' });
  });
  it('markReadTyping never throws', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down'); }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(markReadTyping('wamid.1')).resolves.toBeUndefined();
  });
  it('downloadMedia follows the media url', async () => {
    const f = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ url: 'https://cdn/x', mime_type: 'audio/ogg' })))
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3])));
    vi.stubGlobal('fetch', f);
    const r = await downloadMedia('m1');
    expect(r?.mimeType).toBe('audio/ogg');
    expect(new Uint8Array(r!.data)).toEqual(new Uint8Array([1, 2, 3]));
  });
});
