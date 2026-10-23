import { describe, expect, it } from 'vitest';
import {
  countryFlag, excerptOf, featureState, hasContactInfo, istDayStart, normalizeInstagram, normalizePhone, parseShort, parseStory,
  pickStoryOfTheDay, storySlug, timeLeft,
} from '@/lib/stories/rules';
import { parseScreening } from '@/lib/stories/ai';
import { reachSummary } from '@/lib/stories/store';

const good = {
  title: 'Chai with a monk at sunrise', body: 'x'.repeat(10) + ' ' + 'A long morning walk around the kora path, where an old monk offered me butter tea and a story about his village in Tibet. '.repeat(2),
  place: 'McLeod Ganj', visited: 'March 2026', author_name: 'Asha', author_kind: 'traveller', author_from: 'Pune', instagram: '@Asha.Travels', email: '', consent: 'yes',
};

describe('story form', () => {
  it('accepts a good story and cleans the Instagram handle', () => {
    const r = parseStory(good);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.data.instagram).toBe('asha.travels'); expect(r.data.email).toBeNull(); }
  });
  it('asks for enough story, a place, a kind and consent', () => {
    expect(parseStory({ ...good, body: 'Too short' })).toMatchObject({ ok: false, error: expect.stringContaining('150') });
    expect(parseStory({ ...good, place: 'Goa' })).toMatchObject({ ok: false });
    expect(parseStory({ ...good, author_kind: 'hotel' })).toMatchObject({ ok: false });
    expect(parseStory({ ...good, consent: '' })).toMatchObject({ ok: false, error: expect.stringContaining('tick') });
    expect(parseStory({ ...good, email: 'not-an-email' })).toMatchObject({ ok: false });
  });
  it('reads Instagram handles in the shapes people paste', () => {
    expect(normalizeInstagram('https://www.instagram.com/some_one/?hl=en')).toBe('some_one');
    expect(normalizeInstagram('')).toBeNull();
    expect(normalizeInstagram('two words')).toBe(false);
    expect(normalizeInstagram('bad..dots')).toBe(false);
  });
  it('reads WhatsApp numbers in the shapes people type, with India as the default country', () => {
    expect(normalizePhone('98056 00665')).toBe('919805600665');
    expect(normalizePhone('+91-98056-00665')).toBe('919805600665');
    expect(normalizePhone('09805600665')).toBe('919805600665');
    expect(normalizePhone('+44 7700 900123')).toBe('447700900123');
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone('12345')).toBe(false);
    expect(parseStory({ ...good, phone: '98056 00665' })).toMatchObject({ ok: true, data: { phone: '919805600665' } });
    expect(parseStory({ ...good, phone: 'call me' })).toMatchObject({ ok: false, error: expect.stringContaining('WhatsApp') });
  });
  it('slugs stay unique and readable', () => {
    expect(storySlug('Chai with a Monk!', '1234abcd-0000-0000-0000-000000000000')).toBe('chai-with-a-monk-1234ab');
    expect(storySlug('धर्मकोट', 'abcdef12-0000-0000-0000-000000000000')).toBe('story-abcdef');
  });
});

describe('comments and prayer flags', () => {
  it('hold links, phone numbers and handles for the owner', () => {
    expect(hasContactInfo('call me on +91 98765 43210')).toBe(true);
    expect(hasContactInfo('best cafe www.example.com')).toBe(true);
    expect(hasContactInfo('dm @cheaptaxi')).toBe(true);
    expect(hasContactInfo('May the mountains call you back')).toBe(false);
  });
  it('a flag holds one short line', () => {
    expect(parseShort('flag', { name: 'Ravi', text: 'Safe travels\nand more' })).toEqual({ ok: true, name: 'Ravi', text: 'Safe travels and more' });
    expect(parseShort('flag', { name: 'Ravi', text: 'x'.repeat(61) })).toMatchObject({ ok: false });
    expect(parseShort('comment', { name: '', text: 'Lovely' })).toMatchObject({ ok: false });
  });
});

describe('Story of the day', () => {
  const s = (id: string, o: Record<string, unknown> = {}) => ({ id, status: 'approved', ai_score: 60, featured_at: null, created_at: '2026-10-01', author_kind: 'traveller', ...o });
  it('picks the best approved story that was never featured', () => {
    const pick = pickStoryOfTheDay([s('a', { ai_score: 70 }), s('b', { ai_score: 90, featured_at: '2026-10-10' }), s('c', { ai_score: 95, status: 'pending' }), s('d', { ai_score: 80 })]);
    expect(pick?.id).toBe('d');
  });
  it('prefers the other kind of storyteller when scores are close', () => {
    expect(pickStoryOfTheDay([s('t', { ai_score: 80 }), s('l', { ai_score: 75, author_kind: 'local' })], 'traveller')?.id).toBe('l');
    expect(pickStoryOfTheDay([s('t', { ai_score: 90 }), s('l', { ai_score: 60, author_kind: 'local' })], 'traveller')?.id).toBe('t');
    expect(pickStoryOfTheDay([])).toBeNull();
  });
  it('lasts 24 hours and counts down', () => {
    const now = Date.parse('2026-10-17T10:00:00Z');
    expect(featureState({ featured_at: '2026-10-17T00:00:00Z', featured_until: '2026-10-18T00:00:00Z' }, now)).toBe('live');
    expect(featureState({ featured_at: '2026-10-15T00:00:00Z', featured_until: '2026-10-16T00:00:00Z' }, now)).toBe('past');
    expect(featureState({ featured_at: null, featured_until: null }, now)).toBeNull();
    expect(timeLeft('2026-10-18T00:22:00Z', now)).toBe('14h 22m');
  });
  it('a day starts at midnight in India', () => {
    expect(istDayStart(Date.parse('2026-10-17T20:00:00Z'))).toBe('2026-10-17T18:30:00.000Z');
    expect(istDayStart(Date.parse('2026-10-17T10:00:00Z'))).toBe('2026-10-16T18:30:00.000Z');
  });
});

describe('display helpers', () => {
  it('cuts excerpts at a word and shows country flags', () => {
    expect(excerptOf('One two three four five six seven', 15)).toBe('One two three…');
    expect(excerptOf('Short.\nSecond paragraph')).toBe('Short.');
    expect(countryFlag('IN')).toBe('🇮🇳');
    expect(countryFlag('')).toBe('🌏');
  });
  it('sums up where readers are', () => {
    const r = reachSummary([
      { city: 'Pune', country: 'IN', readers: 5, last_at: '2026-10-17T09:00:00Z' },
      { city: 'Berlin', country: 'DE', readers: 2, last_at: '2026-10-17T10:00:00Z' },
      { city: '', country: '', readers: 3, last_at: '2026-10-17T11:00:00Z' },
    ]);
    expect(r).toMatchObject({ cities: 2, countries: 2, latest: { city: 'Berlin' } });
  });
  it('reads the AI screening and drops unknown flags', () => {
    expect(parseScreening('{"score": 87.4, "notes": "Warm and specific.", "flags": ["advertising", "made_up"], "caption": "A sunrise to remember #triund"}'))
      .toEqual({ score: 87, notes: 'Warm and specific.', flags: ['advertising'], caption: 'A sunrise to remember' });
    expect(parseScreening('not json')).toBeNull();
  });
});

describe('pinned order', () => {
  it('pin puts a story first, arrows swap neighbours, unpin closes the gap', async () => {
    const { movePin } = await import('@/lib/stories/store');
    expect(movePin(['a', 'b'], 'c', 'pin')).toEqual(['c', 'a', 'b']);
    expect(movePin(['a', 'b', 'c'], 'c', 'pin')).toEqual(['c', 'a', 'b']);
    expect(movePin(['a', 'b', 'c'], 'b', 'up')).toEqual(['b', 'a', 'c']);
    expect(movePin(['a', 'b', 'c'], 'b', 'down')).toEqual(['a', 'c', 'b']);
    expect(movePin(['a', 'b', 'c'], 'a', 'up')).toEqual(['a', 'b', 'c']);
    expect(movePin(['a', 'b', 'c'], 'c', 'down')).toEqual(['a', 'b', 'c']);
    expect(movePin(['a', 'b', 'c'], 'b', 'unpin')).toEqual(['a', 'c']);
  });
});
