import { describe, expect, it } from 'vitest';
import { parseWebhook } from '@/lib/whatsapp-webhook';

const wrap = (messages: any[], contacts: any[] = [{ wa_id: '919800000001', profile: { name: 'Asha' } }]) =>
  ({ entry: [{ changes: [{ value: { contacts, messages } }] }] });

describe('parseWebhook inbound', () => {
  it('parses text with profile name and timestamp', () => {
    const r = parseWebhook(wrap([{ id: 'w1', from: '919800000001', timestamp: '1760000000', type: 'text', text: { body: 'Hi, rooms?' } }]));
    expect(r.inbound).toEqual([{ waId: 'w1', from: '919800000001', profileName: 'Asha', timestamp: 1760000000, kind: 'text', text: 'Hi, rooms?' }]);
  });
  it('parses voice notes and media', () => {
    const r = parseWebhook(wrap([
      { id: 'w2', from: '919800000001', timestamp: '1', type: 'audio', audio: { id: 'm1' } },
      { id: 'w3', from: '919800000001', timestamp: '2', type: 'image', image: { id: 'm2', caption: 'this one' } },
      { id: 'w4', from: '919800000001', timestamp: '3', type: 'location', location: {} },
    ]));
    expect(r.inbound.map((m) => [m.kind, m.mediaId, m.mediaLabel, m.text])).toEqual([
      ['voice', 'm1', undefined, ''], ['media', 'm2', '[photo]', 'this one'], ['media', undefined, '[location]', ''],
    ]);
  });
  it('keeps button replies out of inbound', () => {
    const r = parseWebhook(wrap([{ id: 'w5', from: '9198', timestamp: '1', type: 'button', button: { text: 'Accept' }, context: { id: 'c1' } }]));
    expect(r.inbound).toEqual([]);
    expect(r.replies).toHaveLength(1);
  });
  it('truncates long text', () => {
    const r = parseWebhook(wrap([{ id: 'w6', from: '9198', timestamp: '1', type: 'text', text: { body: 'x'.repeat(5000) } }]));
    expect(r.inbound[0].text).toHaveLength(2000);
  });
});
