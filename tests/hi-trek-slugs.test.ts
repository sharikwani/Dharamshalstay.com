import { describe, expect, it } from 'vitest';
import { HI_TREK_SLUGS } from '@/data/hi/trek-slugs';
import { hiTreksData } from '@/data/hi';
import { hasHindiVersion } from '@/lib/i18n/core';

describe('Hindi trek slugs', () => {
  it('matches the translated treks', () => {
    expect([...HI_TREK_SLUGS].sort()).toEqual(Object.keys(hiTreksData).sort());
  });
  it('offers Hindi only for translated treks', () => {
    expect(hasHindiVersion('/treks/triund-trek')).toBe(true);
    expect(hasHindiVersion('/treks/tosh-valley-trek')).toBe(false);
    expect(hasHindiVersion('/treks')).toBe(true);
  });
});
