import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({ sent: [] as any[], throws: false }));
vi.mock('@/lib/email', () => ({
  adminEmail: () => 'admin@x.test',
  sendEmail: async (m: any) => { if (h.throws) throw new Error('smtp down'); h.sent.push(m); },
}));

import { roomChangeEmail, sendRoomChangeEmail } from '@/lib/rooms/notify';

const diff = (lines: string[]) => ({ added: [], removed: [], renamed: [], switchedOff: [], switchedOn: [], lines });

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  h.sent = []; h.throws = false;
});

describe('roomChangeEmail', () => {
  it('has the hotel in the subject and lists the total change then each line', () => {
    const { subject, html } = roomChangeEmail({ hotel: 'Hill View', who: 'Asha (partner)', totalBefore: 20, totalAfter: 21, diff: diff(['Added "Suite"', 'Deluxe: price Rs.2,000 → Rs.2,500']) });
    expect(subject).toBe('Rooms updated: Hill View');
    const i = html.indexOf('Total rooms 20 → 21');
    expect(i).toBeGreaterThan(-1);
    expect(html.indexOf('Added &quot;Suite&quot;')).toBeGreaterThan(i);
    expect(html).toContain('Deluxe: price Rs.2,000 → Rs.2,500');
    expect(html).toContain('Asha (partner)');
  });
  it('omits the total line when unchanged', () => {
    const { html } = roomChangeEmail({ hotel: 'H', who: 'Admin', totalBefore: 5, totalAfter: 5, diff: diff(['x']) });
    expect(html).not.toContain('Total rooms');
  });
  it('escapes markup in hotel and room names', () => {
    const { html } = roomChangeEmail({ hotel: '<b>Evil</b>', who: 'Admin', totalBefore: 1, totalAfter: 1, diff: diff(['Added "<script>"']) });
    expect(html).not.toContain('<b>Evil');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;b&gt;Evil');
  });
});

describe('sendRoomChangeEmail', () => {
  it('sends to the admin address', async () => {
    await sendRoomChangeEmail({ hotel: 'H', who: 'Admin', totalBefore: 1, totalAfter: 2, diff: diff([]) });
    expect(h.sent).toHaveLength(1);
    expect(h.sent[0].to).toBe('admin@x.test');
  });
  it('swallows a throwing sendEmail', async () => {
    h.throws = true;
    await expect(sendRoomChangeEmail({ hotel: 'H', who: 'Admin', totalBefore: 1, totalAfter: 2, diff: diff([]) })).resolves.toBeUndefined();
  });
});
