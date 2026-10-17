import { describe, expect, it } from 'vitest';
import { slugify } from '@/lib/utils';

describe('slugify', () => {
  it('ignores stray spaces and dashes at the edges', () => {
    expect(slugify('Panchvati Cottages ')).toBe('panchvati-cottages');
    expect(slugify('  -Hotel  Tibet- ')).toBe('hotel-tibet');
  });
  it('drops symbols and collapses dashes', () => {
    expect(slugify('A & B -- Stay!')).toBe('a-b-stay');
  });
  it('never returns an empty slug', () => {
    expect(slugify('हिमालय होटल')).toBe('listing');
    expect(slugify('', 'property')).toBe('property');
  });
});
