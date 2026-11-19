import { afterEach, describe, expect, it, vi } from 'vitest';
import { isBlockedPhone } from '@/lib/blocked-phones';
import { sendTemplate, sendText } from '@/lib/whatsapp-cloud';

describe('blocked phone numbers', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it('matches a blocked number in any format', () => {
    expect(isBlockedPhone('918350950090')).toBe(true);
    expect(isBlockedPhone('+91 83509 50090')).toBe(true);
    expect(isBlockedPhone('8350950090')).toBe(true);
  });

  it('does not match other numbers or empty values', () => {
    expect(isBlockedPhone('919805700665')).toBe(false);
    expect(isBlockedPhone('')).toBe(false);
    expect(isBlockedPhone(null)).toBe(false);
    expect(isBlockedPhone('50090')).toBe(false);
  });

  it('never sends a template or a text to a blocked number', async () => {
    vi.stubEnv('WHATSAPP_TOKEN', 'x');
    vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '1');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const t = await sendTemplate({ to: '918350950090', template: 'listing_enquiry_alert', params: ['a'] });
    const s = await sendText('918350950090', 'hello');
    expect(t).toMatchObject({ ok: false, skipped: true });
    expect(s).toMatchObject({ ok: false, skipped: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
