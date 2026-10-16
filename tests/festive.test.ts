import { describe, expect, it } from 'vitest';
import { activeCampaign, festiveCampaigns, todayIST } from '@/data/festive';

describe('festive banner campaigns', () => {
  it('switches from Diwali to New Year and then ends', () => {
    expect(activeCampaign('2026-10-20')?.id).toBe('diwali-2026');
    expect(activeCampaign('2026-11-10')?.id).toBe('diwali-2026');
    expect(activeCampaign('2026-11-11')?.id).toBe('new-year-2027');
    expect(activeCampaign('2027-01-02')?.id).toBe('new-year-2027');
    expect(activeCampaign('2027-01-03')).toBeUndefined();
  });

  it('campaign windows never overlap and have text in both languages', () => {
    const sorted = [...festiveCampaigns].sort((a, b) => a.from.localeCompare(b.from));
    sorted.forEach((c, i) => {
      expect(c.from <= c.to).toBe(true);
      if (i > 0) expect(sorted[i - 1].to < c.from).toBe(true);
      expect(c.text.en && c.text.hi && c.guide.label.en && c.guide.label.hi).toBeTruthy();
    });
  });

  it('uses the date in India, not UTC', () => {
    // 20:00 UTC on 10 Nov is already 11 Nov in India.
    expect(todayIST(new Date('2026-11-10T20:00:00Z'))).toBe('2026-11-11');
  });
});
