import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({ send: vi.fn(), contact: null as any, inserts: [] as any[] }));
vi.mock('resend', () => ({ Resend: class { emails = { send: h.send }; } }));
vi.mock('@/lib/server-auth', () => {
  const chain: any = {
    select: () => chain, eq: () => chain, maybeSingle: async () => ({ data: h.contact }),
    insert: async (row: any) => { h.inserts.push(row); return { error: null }; },
  };
  return { serviceClient: () => ({ from: () => chain }) };
});

import { renderEmail, renderText, inline } from '@/lib/email/layout';
import { deliver } from '@/lib/email/send';
import { sanitizeDraft } from '@/lib/email/marketing';
import { themeFor } from '@/lib/email/autopilot';
import { normEmail, normPhone } from '@/lib/email/contacts';
import { enquiryReceived, reviewRequest, seasonNote } from '@/lib/email/templates';

beforeEach(() => {
  process.env.RESEND_API_KEY = 'test';
  h.send.mockReset().mockResolvedValue({ data: { id: 're_1' }, error: null });
  h.contact = null; h.inserts = [];
});

const doc = { heading: 'Hi <x>', blocks: [{ type: 'p' as const, text: 'Go **now** to [hotels](/hotels) <script>' }], footer: { kind: 'transactional' as const } };

describe('layout', () => {
  it('escapes text, allows bold and site links, makes links absolute', () => {
    const html = renderEmail(doc);
    expect(html).toContain('Hi &lt;x&gt;');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
    expect(html).toMatch(/<strong[^>]*>now<\/strong>/);
    expect(html).toMatch(/href="https?:\/\/[^"]+\/hotels"/);
  });
  it('drops javascript: links', () => {
    expect(inline('[x](javascript:alert(1))')).not.toContain('href');
  });
  it('builds a plain-text version', () => {
    expect(renderText(doc)).toContain('hotels (');
  });
});

describe('deliver', () => {
  it('never sends marketing without consent, and logs the skip', async () => {
    h.contact = { id: 'c1', marketing_consent: false, unsubscribed_at: null, suppressed_reason: null, unsubscribe_token: 't' };
    const r = await deliver({ to: 'a@b.com', subject: 's', doc, kind: 'marketing', template: 'campaign' });
    expect(r.status).toBe('skipped');
    expect(h.send).not.toHaveBeenCalled();
    expect(h.inserts[0]).toMatchObject({ status: 'skipped', kind: 'marketing' });
  });
  it('never emails a bounced address', async () => {
    h.contact = { id: 'c1', marketing_consent: true, suppressed_reason: 'bounced', unsubscribe_token: 't' };
    expect((await deliver({ to: 'a@b.com', subject: 's', doc, kind: 'transactional', template: 'x' })).status).toBe('skipped');
    expect(h.send).not.toHaveBeenCalled();
  });
  it('marketing to a subscriber carries one-click unsubscribe headers and link', async () => {
    h.contact = { id: 'c1', marketing_consent: true, unsubscribed_at: null, suppressed_reason: null, unsubscribe_token: '11111111-1111-1111-1111-111111111111' };
    const r = await deliver({ to: 'A@B.com', subject: 's', doc, kind: 'marketing', template: 'campaign' });
    expect(r.ok).toBe(true);
    const m = h.send.mock.calls[0][0];
    expect(m.to).toBe('a@b.com');
    expect(m.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    expect(m.headers['List-Unsubscribe']).toContain('11111111-1111-1111-1111-111111111111');
    expect(m.html).toContain('/email/unsubscribe?t=11111111');
    expect(h.inserts[0]).toMatchObject({ status: 'sent', resend_id: 're_1' });
  });
  it('booking emails go out without marketing consent', async () => {
    expect((await deliver({ to: 'a@b.com', subject: 's', doc, kind: 'transactional', template: 'booking_confirmed' })).ok).toBe(true);
  });
  it('rejects invalid addresses', async () => {
    expect((await deliver({ to: 'nope', subject: 's', doc, kind: 'transactional', template: 'x' })).status).toBe('skipped');
  });
});

describe('AI draft sanitising', () => {
  const ok = { subject: 'Snow is here', preheader: 'p', kicker: 'k', heading: 'h', intro: 'i', hero: 'place:triund', ps: '',
    cta: { label: 'Book', link: '/evil' },
    sections: [
      { title: 'A', text: 'a', image: 'place:triund', link: '/hotels', cta: 'Go' },
      { title: 'B', text: 'b', image: 'https://evil.example/x.jpg', link: '/hotels', cta: 'Go' },
      { title: 'C', text: '<img src=x>c', image: 'place:mcleod-ganj', link: '/treks', cta: 'Go' },
      { title: 'D', text: 'd', image: 'place:mcleod-ganj', link: 'https://evil.example', cta: 'Go' },
    ] };
  it('keeps only catalog images and links, strips HTML, falls back the CTA', () => {
    const d = sanitizeDraft(ok, ['place:triund', 'place:mcleod-ganj'], ['/hotels', '/treks']);
    expect(d.content.sections.map((s) => s.title)).toEqual(['A', 'C']);
    expect(d.content.sections[1].text).toBe('c');
    expect(d.content.cta.link).toBe('/hotels');
  });
  it('refuses a draft with fewer than two usable sections', () => {
    expect(() => sanitizeDraft({ ...ok, sections: ok.sections.slice(1, 2) }, ['place:triund'], ['/hotels'])).toThrow();
  });
});

describe('autopilot themes', () => {
  it('Diwali first during the Diwali window, then the season', () => {
    const t = themeFor('2026-10-20');
    expect(t[0].id).toBe('diwali-2026');
    expect(t.some((x) => x.id === 'clear-skies-2026')).toBe(true);
  });
  it('snow season spans the new year with one id', () => {
    expect(themeFor('2026-12-20').some((x) => x.id === 'snow-season-2026')).toBe(true);
    expect(themeFor('2027-02-10').some((x) => x.id === 'snow-season-2026')).toBe(true);
  });
});

describe('contacts and templates', () => {
  it('normalises email and Indian phones', () => {
    expect(normEmail(' Asha@Mail.COM ')).toBe('asha@mail.com');
    expect(normEmail('bad@')).toBeNull();
    expect(normPhone('98057 00665')).toBe('919805700665');
    expect(normPhone('+91 98057-00665')).toBe('919805700665');
  });
  it('enquiry email names the hotel and the dates', () => {
    const b = enquiryReceived({ id: 'e', name: 'Asha Rao', type: 'hotel', check_in: '2026-12-10', check_out: '2026-12-13', guests: 4, property: { name: 'Pine View', slug: 'pine-view' } });
    expect(b.subject).toContain('Pine View');
    expect(renderEmail(b.doc)).toContain('3 nights');
    expect(b.doc.heading).toContain('Asha');
  });
  it('hotel review requests open the review form', () => {
    const b = reviewRequest({ id: 'b', booking_ref: 'R1', guest_name: 'Asha', category: 'hotel', amount: 1, property: { name: 'Pine View', slug: 'pine-view' }, property_name: 'Pine View' });
    expect(renderEmail(b.doc)).toContain('/hotels/pine-view?review=1#reviews');
  });
  it('winter packing advice in December', () => {
    expect(seasonNote('2026-12-24').title).toMatch(/Winter/);
  });
});
