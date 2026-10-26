import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/server-auth', () => ({ serviceClient: () => ({}), HttpError: class extends Error {} }));
vi.mock('@/lib/email', () => ({ adminEmail: () => 'a@b.in', escHtml: (s: string) => s, sendEmail: async () => ({}) }));
import { guideSignupSchema } from '@/lib/guides/store';
import { GUIDE_COMMISSION_PCT } from '@/lib/guides/options';
import { commissionRateFor } from '@/lib/manual-booking';

const valid = {
  name: 'Tenzin Dorjee', phone: '98160 12345', experience_years: '8', price_per_day: '2000', consent: true,
  languages: ['Hindi', 'English', 'Tibetan'], specializations: ['Monasteries and Tibetan culture'], areas: ['McLeod Ganj'],
  bio: 'Born in McLeod Ganj, I have guided monastery walks and the kora around the Tsuglagkhang for eight years.',
};

describe('local guide sign-up', () => {
  it('accepts a complete sign-up and normalises the phone to 91XXXXXXXXXX', () => {
    const r = guideSignupSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) { expect(r.data.phone).toBe('919816012345'); expect(r.data.experience_years).toBe(8); }
  });

  it('drops choices that are not on the form and needs at least one of each', () => {
    const r = guideSignupSchema.safeParse({ ...valid, areas: ['Goa'] });
    expect(r.success).toBe(false);
    const ok = guideSignupSchema.safeParse({ ...valid, languages: ['English', 'Klingon'] });
    expect(ok.success && ok.data.languages).toEqual(['English']);
  });

  it('needs consent, a real bio and a day rate', () => {
    expect(guideSignupSchema.safeParse({ ...valid, consent: false }).success).toBe(false);
    expect(guideSignupSchema.safeParse({ ...valid, bio: 'I guide.' }).success).toBe(false);
    expect(guideSignupSchema.safeParse({ ...valid, price_per_day: '0' }).success).toBe(false);
  });

  it('charges the commission the sign-up form promises', () => {
    expect(commissionRateFor('guide', {})).toBe(GUIDE_COMMISSION_PCT);
  });
});
