import { describe, expect, it } from 'vitest';
import { alertParts, shouldAlert } from '@/lib/owner-alerts';

describe('owner WhatsApp alerts', () => {
  it('pings for bookings, enquiries and money in important mode, not for routine notes', () => {
    expect(shouldAlert('important', 'admin_new_booking', 'New booking HTL-1')).toBe(true);
    expect(shouldAlert('important', 'admin_new_enquiry', 'New enquiry from Asha')).toBe(true);
    expect(shouldAlert('important', 'admin_alert', 'Payment received for DS-12')).toBe(true);
    expect(shouldAlert('important', 'admin_alert', 'WhatsApp chat handed over to you')).toBe(true);
    expect(shouldAlert('important', 'admin_alert', 'New story waiting for review')).toBe(false);
    expect(shouldAlert('all', 'admin_alert', 'New story waiting for review')).toBe(true);
    expect(shouldAlert('off', 'admin_new_booking', 'New booking')).toBe(false);
    expect(shouldAlert('all', 'campaign_test', 'Test')).toBe(false);
  });
  it('builds a short title, summary and admin link from the email', () => {
    const p = alertParts('New booking HTL-1', {
      heading: 'New booking', footer: { kind: 'admin' }, signoff: false,
      blocks: [{ type: 'p', text: 'Panchvati Cottages, 1 to 3 Dec, 4 guests.' }, { type: 'button', label: 'Open booking', href: '/admin/bookings/abc' }],
    } as any);
    expect(p.title).toBe('New booking HTL-1');
    expect(p.detail).toContain('Panchvati Cottages, 1 to 3 Dec, 4 guests.');
    expect(p.detail).not.toMatch(/https?:/);
    expect(p.link).toMatch(/\/admin\/bookings\/abc$/);
  });
});
