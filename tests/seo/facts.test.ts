import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/taxi', () => ({ getTaxiRouteGroups: async () => [] }));
import { facts, FACT_TOPICS } from '@/data/facts';
import { travelUpdates } from '@/data/travel-updates';
import { getAllBlogSlugs } from '@/data/blog';
import { taxiFacts, factLine } from '@/lib/facts';

const blog = new Set(getAllBlogSlugs());
const DATE = /^\d{4}-\d{2}-\d{2}$/;
// Pages outside the blog that facts may point to.
const PAGES = /^\/(destinations(\/[a-z-]+)?|treks\/[a-z-]+|taxi\/[a-z0-9-]+|hotels\/[a-z-]+|monasteries-meditation|facts|travel-updates)$/;
const pageExists = (p: string) => (p.startsWith('/blog/') ? blog.has(p.slice(6)) : PAGES.test(p));

describe('verified facts', () => {
  it('have unique ids, a known topic, a date and at least one https source', () => {
    const ids = new Set<string>();
    for (const f of facts) {
      expect(ids.has(f.id), f.id).toBe(false);
      ids.add(f.id);
      expect(FACT_TOPICS.map((t) => t.id)).toContain(f.topic);
      expect(f.verified).toMatch(DATE);
      expect(f.sources.length, f.id).toBeGreaterThan(0);
      for (const s of f.sources) expect(s.url, f.id).toMatch(/^https:\/\//);
    }
  });

  it('answer in a quotable length and are phrased as questions', () => {
    for (const f of facts) {
      expect(f.question.endsWith('?'), f.id).toBe(true);
      expect(f.answer.length, f.id).toBeGreaterThan(40);
      expect(f.answer.length, f.id).toBeLessThanOrEqual(420);
    }
  });

  it('link to pages that exist', () => {
    for (const f of facts) if (f.page) expect(pageExists(f.page), f.id + ' -> ' + f.page).toBe(true);
    for (const u of travelUpdates) if (u.page) expect(pageExists(u.page), u.id + ' -> ' + u.page).toBe(true);
  });

  it('never state opening hours for the Dalai Lama Temple', () => {
    const temple = facts.filter((f) => f.topic === 'temple').map((f) => f.answer).join(' ');
    expect(temple).not.toMatch(/\d\s*(am|pm)/i);
  });
});

describe('travel updates', () => {
  it('are dated, checked no earlier than they happened, and sourced', () => {
    for (const u of travelUpdates) {
      expect(u.date).toMatch(DATE);
      expect(u.checked).toMatch(DATE);
      expect(u.checked >= u.date, u.id).toBe(true);
      expect(u.sources.length, u.id).toBeGreaterThan(0);
    }
  });
});

describe('taxi facts', () => {
  it('turn route groups into one fact each with the lowest fare', () => {
    const [f] = taxiFacts([{ slug: 'gaggal-airport-to-mcleod-ganj-taxi', from: 'Gaggal Airport', to: 'McLeod Ganj', routeType: 'airport', distanceKm: 22, duration: '45-60 min', minPrice: 1500, updatedAt: '', vehicles: [] }], '2026-10-16');
    expect(f.question).toBe('How much is a taxi from Gaggal Airport to McLeod Ganj?');
    expect(f.answer).toContain('From ₹1,500 one way');
    expect(f.page).toBe('/taxi/gaggal-airport-to-mcleod-ganj-taxi');
    expect(factLine(f)).toContain('/facts#taxi-gaggal-airport-to-mcleod-ganj-taxi');
  });
});
