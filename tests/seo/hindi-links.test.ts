import { describe, expect, it } from 'vitest';
import { getAllBlogSlugs } from '@/data/blog';
import { hasHindiPost } from '@/lib/i18n/content';
import { EN_ONLY_POSTS, localizePath, switchLangPath } from '@/lib/i18n/core';

describe('Hindi links', () => {
  it('EN_ONLY_POSTS lists exactly the guides without a Hindi translation', () => {
    expect([...EN_ONLY_POSTS].sort()).toEqual(getAllBlogSlugs().filter((s) => !hasHindiPost(s)).sort());
  });

  it('never links to an untranslated guide under /hi', () => {
    for (const s of EN_ONLY_POSTS) expect(localizePath('/blog/' + s, 'hi')).toBe('/blog/' + s);
    expect(localizePath('/blog/triund-trek-complete-guide', 'hi')).toBe('/hi/blog/triund-trek-complete-guide');
  });

  it('switches language on translated pages', () => {
    expect(switchLangPath('/hotels', 'hi')).toBe('/hi/hotels');
    expect(switchLangPath('/hi/treks/triund-trek', 'en')).toBe('/treks/triund-trek');
  });
});
