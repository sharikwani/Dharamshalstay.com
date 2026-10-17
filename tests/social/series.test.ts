import { describe, it, expect, vi } from 'vitest';
vi.mock('@/lib/server-auth', () => ({ serviceClient: () => { throw new Error('no db'); } }));

import { sanitize, seriesIdeas, unsupportedNumbers, MAX_HASHTAGS } from '@/lib/social/writer';
import { placeSource, placeTerms, SERIES } from '@/lib/social/series';
import { pickSeries } from '@/lib/social/autopilot';

describe('curiosity series', () => {
  it('has a post idea for every series and many places, with a photo and real text behind each', () => {
    const ideas = seriesIdeas();
    for (const s of SERIES) expect(ideas.filter((i) => i.series === s.id).length).toBeGreaterThan(10);
    for (const i of ideas.slice(0, 20)) expect(placeSource(i.placeKey!).text.length).toBeGreaterThan(200);
  });

  it('finds our own text about a place', () => {
    expect(placeTerms('bhagsu-waterfall')).toEqual(['bhagsu']);
    const src = placeSource('kareri-lake');
    expect(src.text).toMatch(/Kareri/);
    expect(src.guideSlug).toBeTruthy();
  });

  it('keeps the story order of a guessing game and caps hashtags at Instagram\'s 5', () => {
    const d = sanitize({
      slides: [
        { style: 'cover', image: 'kareri-lake', kicker: 'Guess the place', title: 'Guess where this is', body: '' },
        { style: 'question', image: 'kareri-lake', kicker: '', title: 'Comment your guess', body: '' },
        { style: 'fact', image: 'kareri-lake', kicker: 'The answer', title: 'Kareri Lake', body: '' },
        { style: 'tip', image: 'gaddi-shepherds', kicker: '', title: 'Go in season', body: '' },
        { style: 'cta', image: '', kicker: '', title: 'Stay close', body: '' },
      ],
      caption: 'A lake that mirrors the Dhauladhar. Where is it? Comment your guess before you swipe.',
      hashtags: ['himachal', 'dharamshala', 'mcleodganj', 'karerilake', 'dhauladhar', 'trekking', 'india'],
      alt_text: 'A lake below rocky peaks',
    }, { theme: 'series:guess:kareri-lake', topic: 'Guess', series: 'guess', placeKey: 'kareri-lake' });
    expect(d.slides.map((s) => s.style)).toEqual(['cover', 'question', 'fact', 'tip', 'cta']);
    expect(d.hashtags).toHaveLength(MAX_HASHTAGS);
  });

  it('flags numbers that are not in our sources', () => {
    const post = { caption: 'Indrahar Pass is 4,342 m high and 3 days away.', slides: [{ style: 'fact' as const, title: 'Over 5000 m of climbing', body: 'Since 1905' }] };
    expect(unsupportedNumbers(post, 'Indrahar Pass (4342 m). The 1905 earthquake.')).toEqual(['5000']);
    expect(unsupportedNumbers({ caption: 'Tip 1 of 5', slides: [] }, '')).toEqual([]);
  });

  it('rotates the series and avoids the places of the last posts', () => {
    const ideas = seriesIdeas();
    const first = pickSeries(ideas, new Set(), 0, () => 0)!;
    const second = pickSeries(ideas, new Set([first.theme]), 1, () => 0)!;
    expect(second.series).not.toBe(first.series);
    expect(second.placeKey).not.toBe(first.placeKey);
  });
});
