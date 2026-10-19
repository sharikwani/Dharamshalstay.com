import { describe, it, expect, vi } from 'vitest';
vi.mock('@/lib/server-auth', () => ({ serviceClient: () => { throw new Error('no db'); } }));

import { sanitize, creditsFor, fullCaption, slideUrl, topicIdeas } from '@/lib/social/writer';
import { nextSlot } from '@/lib/social/autopilot';

const raw = {
  slides: [
    { style: 'cover', image: 'triund', kicker: 'Trek guide', title: '5 things to know before Triund', body: '' },
    { style: 'tip', image: 'https://evil.example/x.jpg', kicker: 'Tip 1', title: 'Start early', body: 'Clouds roll in by afternoon.' },
    { style: 'tip', image: 'gallu-devi', kicker: 'Tip 2', title: '<b>Carry water</b>', body: 'Few refills after Gallu Devi.' },
    { style: 'cta', image: '', kicker: '', title: 'Plan your Triund trip', body: 'Stays and guided treks' },
  ],
  caption: 'Most people start Triund too late.\nHere is what locals do. #triund #spam\nSave this for your trip.\nPlan and book through the link in bio.',
  hashtags: ['#Triund', 'mcleod ganj', 'himachal', 'x', 'triund'],
  alt_text: 'Trekkers on a rocky ridge below snowy peaks',
};

describe('social writer', () => {
  it('keeps only our images, strips HTML and inline hashtags, cleans tags', () => {
    const d = sanitize(raw, { theme: 'guide:triund', topic: 'Triund' });
    expect(d.slides.map((s) => s.style)).toEqual(['cover', 'tip', 'tip', 'cta']);
    expect(d.slides[1].image).toBe('dhauladhar-hero');
    expect(d.slides[2].title).toBe('Carry water');
    expect(d.caption).not.toMatch(/#triund/);
    expect(d.hashtags).toEqual(['triund', 'mcleodganj', 'himachal']);
  });
  it('never repeats a photo in a post', () => {
    const slides = [0, 1, 2, 3].map((i) => ({ style: i ? 'tip' : 'cover', image: 'triund', kicker: '', title: 'T' + i, body: '' }));
    const d = sanitize({ ...raw, slides: [...slides, { style: 'cta', image: 'triund', kicker: '', title: 'Book', body: '' }] }, { theme: 'g', topic: 't' });
    const imgs = d.slides.map((s) => s.image).filter(Boolean);
    expect(d.slides[0].image).toBe('triund');
    expect(new Set(imgs).size).toBe(imgs.length);
    expect(d.slides.at(-1)!.image).toBeUndefined();
  });
  it('a single post is just the cover', () => {
    const d = sanitize(raw, { theme: 'place:triund', topic: 'Triund', format: 'single' });
    expect(d.slides).toHaveLength(1);
  });
  it('refuses a post without a cover', () => {
    expect(() => sanitize({ ...raw, slides: raw.slides.slice(1) }, { theme: 't', topic: 't' })).toThrow();
  });
  it('credits every Wikimedia photo used, and puts credits and tags in the caption', () => {
    const slides = sanitize(raw, { theme: 'g', topic: 't' }).slides;
    const credits = creditsFor(slides);
    expect(credits).toMatch(/Wikimedia Commons/);
    expect(credits).toMatch(/CC/);
    const ig = fullCaption({ caption: 'Hello', hashtags: ['triund'], credits, link: '/blog/x' }, 'instagram');
    const fb = fullCaption({ caption: 'Hello', hashtags: ['triund'], credits, link: '/blog/x' }, 'facebook');
    expect(ig).toMatch(/#triund$/);
    expect(ig).not.toMatch(/\/blog\/x/);
    expect(fb).toMatch(/\/blog\/x/);
  });
  it('slide URLs point at our JPEG renderer with numbering', () => {
    const u = slideUrl({ style: 'tip', image: 'triund', title: 'A & B' }, 1, 5);
    expect(u).toMatch(/\/social\/card\.jpg\?/);
    expect(u).toMatch(/n=2&of=5/);
    expect(u).toMatch(/A\+%26\+B|A%20%26%20B/);
  });
  it('has plenty of topics', () => {
    expect(topicIdeas('2026-10-20').length).toBeGreaterThan(50);
  });
});

describe('posting slots', () => {
  const tuesday1900IST = Date.parse('2026-10-20T13:30:00Z'); // Tue 19:00 IST
  it('picks the next chosen weekday at the chosen IST time', () => {
    const at = nextSlot([2, 4], '19:30', [], tuesday1900IST - 2 * 3600e3);
    expect(at.toISOString()).toBe('2026-10-20T14:00:00.000Z');
  });
  it('never doubles up a slot and skips slots too close to now', () => {
    const taken = [Date.parse('2026-10-20T14:00:00Z')];
    expect(nextSlot([2, 4], '19:30', taken, tuesday1900IST - 2 * 3600e3).toISOString()).toBe('2026-10-22T14:00:00.000Z');
    expect(nextSlot([2, 4], '19:30', [], tuesday1900IST + 20 * 60e3).toISOString()).toBe('2026-10-22T14:00:00.000Z');
  });
});
