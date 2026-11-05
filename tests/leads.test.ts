import { describe, it, expect } from 'vitest';
import { topicForPath, topicForSlug, TRIP_PLAN_PAGES, ALERTS } from '@/lib/leads/topics';
import { splitAtMiddle } from '@/components/pages/BlogViews';
import { blogPosts } from '@/data/blog';

describe('lead topics', () => {
  it.each([
    ['/blog/triund-trek-complete-guide', 'trek'],
    ['/treks', 'trek'],
    ['/blog/dharamshala-skyway-ropeway-guide', 'skyway'],
    ['/blog/rohtang-pass-status', 'manali'],
    ['/blog/dharamshala-in-winter-snowfall', 'snow'],
    ['/blog/amritsar-to-dharamshala', 'taxi'],
    ['/blog/how-to-reach-dharamshala', 'taxi'],
    ['/taxi', 'taxi'],
    ['/blog/best-hotels-in-mcleod-ganj', 'stay'],
    ['/blog/bir-billing-paragliding-guide', 'paragliding'],
    ['/blog/kullu-dussehra-2026', 'events'],
    ['/new-year-parties', 'nye'],
    ['/blog/chamunda-devi-temple-guide', 'culture'],
    ['/hi/blog/triund-trek-complete-guide', 'trek'],
  ])('%s -> %s', (path, key) => {
    expect(topicForPath(path).key).toBe(key);
  });

  it('does not mistake "things to do" or "best time to visit" for taxi pages', () => {
    expect(topicForPath('/blog/things-to-do-in-mcleod-ganj').key).not.toBe('taxi');
    expect(topicForPath('/blog/best-time-to-visit-dharamshala').key).not.toBe('taxi');
    expect(topicForPath('/blog/places-to-visit-in-dharamshala').key).toBe('trip');
  });

  it('every guide gets a topic with a WhatsApp message and pitch', () => {
    for (const p of blogPosts) {
      const t = topicForSlug(p.slug);
      expect(t.wa.length, p.slug).toBeGreaterThan(10);
      expect(t.title.length, p.slug).toBeGreaterThan(10);
    }
  });

  it('alert interests fit the contacts.interests limit (30 chars)', () => {
    for (const a of Object.values(ALERTS)) expect(a.interest.length).toBeLessThanOrEqual(30);
  });

  it('shows the trip plan offer only on reading pages', () => {
    for (const p of ['/', '/blog/triund-trek-complete-guide', '/hi/blog/x', '/destinations/naddi', '/travel-updates', '/faq']) expect(TRIP_PLAN_PAGES.test(p), p).toBe(true);
    for (const p of ['/admin', '/hotels/some-hotel', '/booking/abc', '/play', '/new-year-parties', '/tickets/X', '/taxi/delhi-to-dharamshala', '/partner']) expect(TRIP_PLAN_PAGES.test(p), p).toBe(false);
  });
});

describe('splitAtMiddle', () => {
  it('keeps short guides whole', () => {
    expect(splitAtMiddle('intro\n## One\na\n## Two\nb')).toEqual(['intro\n## One\na\n## Two\nb', '']);
  });

  it('splits at a ## heading, never the first one, and loses nothing', () => {
    const c = 'intro\n## A\n' + 'x'.repeat(50) + '\n## B\n' + 'y'.repeat(50) + '\n## C\nz\n### sub\nw';
    const [a, b] = splitAtMiddle(c);
    expect(a + b).toBe(c);
    expect(b.startsWith('## ')).toBe(true);
    expect(a).toContain('## A');
  });

  it('every real guide reassembles exactly', () => {
    for (const p of blogPosts) {
      const [a, b] = splitAtMiddle(p.content);
      expect(a + b, p.slug).toBe(p.content);
    }
  });
});

describe('lead topic order', () => {
  it('treks win over snow and paragliding words in the slug', () => {
    expect(topicForPath('/blog/snowline-laka-glacier-trek').key).toBe('trek');
    expect(topicForPath('/blog/bir-billing-rajgundha-trek').key).toBe('trek');
    expect(topicForPath('/blog/bir-billing-paragliding-guide').key).toBe('paragliding');
  });
});
