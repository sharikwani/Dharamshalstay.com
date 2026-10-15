import { describe, it, expect } from 'vitest';
import { istHour, skyPhase, ownPhotos, pickFeaturedStays } from '@/lib/home-helpers';

describe('istHour', () => {
  it('converts UTC to India time (UTC+5:30)', () => {
    expect(istHour(new Date('2026-10-14T00:00:00Z'))).toBe(5.5);
    expect(istHour(new Date('2026-10-14T20:30:00Z'))).toBe(2);
  });
});

describe('skyPhase', () => {
  it('follows the day in Dharamshala', () => {
    expect(skyPhase(6)).toBe('dawn');
    expect(skyPhase(12)).toBe('day');
    expect(skyPhase(17.5)).toBe('golden');
    expect(skyPhase(22)).toBe('night');
    expect(skyPhase(3)).toBe('night');
  });
});

const prop = (name: string, urls: string[], extra: Record<string, unknown> = {}) =>
  ({ name, slug: name, images: urls.map((url) => ({ url, alt: name })), ...extra }) as any;

describe('ownPhotos', () => {
  it('keeps only the property\'s own photos, never stock or place photos', () => {
    const p = prop('A', ['https://x.supabase.co/a.jpg', 'https://images.unsplash.com/b', '/images/places/naddi.jpg', '']);
    expect(ownPhotos(p).map((i) => i.url)).toEqual(['https://x.supabase.co/a.jpg']);
  });
  it('accepts plain string images', () => {
    expect(ownPhotos({ name: 'B', images: ['https://cdn.example.com/b.jpg'] } as any)).toEqual([{ url: 'https://cdn.example.com/b.jpg', alt: 'B' }]);
  });
});

describe('pickFeaturedStays', () => {
  it('only shows stays with their own photos, up to the limit, in listing order', () => {
    const list = [prop('stock', ['https://images.unsplash.com/x']), prop('a', ['https://h/a.jpg']), prop('b', ['https://h/b.jpg']), prop('c', ['https://h/c.jpg'])];
    expect(pickFeaturedStays(list, 2).map((p) => p.name)).toEqual(['a', 'b']);
  });
  it('caps each stay at 5 photos', () => {
    const many = prop('m', Array.from({ length: 9 }, (_, i) => `https://h/${i}.jpg`));
    expect(pickFeaturedStays([many], 5)[0].photos).toHaveLength(5);
  });
});
