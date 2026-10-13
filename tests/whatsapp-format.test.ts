import { describe, it, expect } from 'vitest';
import { tidyWhatsApp as t } from '@/lib/whatsapp-format';

describe('tidyWhatsApp', () => {
  it('bold markdown → WhatsApp bold', () => expect(t('Total **Rs.6,000**')).toBe('Total *Rs.6,000*'));
  it('headings → bold line', () => expect(t('## Your options\nA')).toBe('*Your options*\nA'));
  it('bullets → •', () => expect(t('- one\n* two\n• three')).toBe('• one\n• two\n• three'));
  it('collapses blank lines and trims', () => expect(t('  Hi  \n\n\n\nThere \n')).toBe('Hi\n\nThere'));
  it('is idempotent on good text', () => {
    const s = 'Hi Priya 👋\n\n🏨 *Hotel Snow View*\n📅 12-14 Oct\n\nShall I book it?';
    expect(t(s)).toBe(s);
    expect(t(t(s))).toBe(s);
  });
  it('leaves urls alone', () => expect(t('Pay here: https://x.com/a_b*c__d')).toBe('Pay here: https://x.com/a_b*c__d'));
  it('drops markdown links to "text: url"', () => expect(t('[Pay now](https://x.com/p)')).toBe('Pay now: https://x.com/p'));
  it('leaves ordinary text alone', () => {
    for (const x of ['3 * 2 = 6', 'Pickup at 10:30', '📅 12 Oct', 'Rs.5 * 2 nights', 'Aap ka *booking* confirm hai, kal milte hain 🙏']) expect(t(x)).toBe(x);
  });
  it('strips ** inside headings, idempotently', () => {
    expect(t('## **Options**')).toBe('*Options*');
    expect(t(t('## **Options**'))).toBe('*Options*');
  });
  it('headings keep urls and lone asterisks', () => {
    expect(t('## Pay https://x.com/a*b')).toBe('Pay https://x.com/a*b');
    expect(t('## Total 3 * 2')).toBe('*Total 3 * 2*');
  });
  it('keeps a bold heading and Hindi text intact', () => {
    expect(t('# *Options*')).toBe('*Options*');
    expect(t('नमस्ते 🙏\n\n**कुल** Rs.5,000')).toBe('नमस्ते 🙏\n\n*कुल* Rs.5,000');
  });
});
