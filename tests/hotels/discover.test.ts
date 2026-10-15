import { describe, expect, it } from 'vitest';
import { km, stayFacts, matchScore, LANDMARKS } from '@/lib/hotels/discover';

const stay = (over: any = {}) => ({ name: 'X', type: 'hotel', destination_slug: 'mcleod-ganj', listing_type: 'directory', price_min: 0, amenities: [], highlights: [], good_for: [], images: [], ...over });

describe('km', () => {
  it('measures straight-line distance', () => {
    expect(km(LANDMARKS.square, LANDMARKS.square)).toBe(0);
    // Main Square to the Dalai Lama Temple is about 700 m.
    expect(km(LANDMARKS.square, LANDMARKS.temple)).toBeGreaterThan(0.6);
    expect(km(LANDMARKS.square, LANDMARKS.temple)).toBeLessThan(0.8);
  });
});

describe('stayFacts', () => {
  it('reads view and parking from amenities and highlights', () => {
    const f = stayFacts(stay({ amenities: ['Free parking', 'Mountain views'] }));
    expect(f.view).toBe(true);
    expect(f.parking).toBe(true);
    expect(f.moods).toContain('view');
  });
  it('uses the map pin for near-cafés and near-Triund', () => {
    const near = stayFacts(stay({ latitude: 32.2388, longitude: 76.3238 }));
    expect(near.moods).toContain('cafes');
    expect(near.kmSquare).toBeLessThan(0.1);
    const trail = stayFacts(stay({ destination_slug: 'dharamkot', latitude: 32.2465, longitude: 76.3225 }));
    expect(trail.moods).toContain('triund');
    expect(trail.moods).not.toContain('cafes');
  });
  it('falls back to the area when there is no pin', () => {
    const f = stayFacts(stay({ destination_slug: 'bhagsu' }));
    expect(f.kmSquare).toBeNull();
    expect(f.moods).toContain('triund');
  });
  it('marks hostels social and only partners with a price live', () => {
    expect(stayFacts(stay({ type: 'hostel' })).moods).toContain('social');
    expect(stayFacts(stay({ price_min: 4000 })).live).toBe(false);
    expect(stayFacts(stay({ listing_type: 'partner', price_min: 4000 })).live).toBe(true);
  });
});

describe('matchScore', () => {
  it('prefers the right budget and what matters most', () => {
    const view = stay({ price_band: 'budget', amenities: ['Mountain view'] });
    const plain = stay({ price_band: 'upscale' });
    const a = { who: null, budget: 'budget' as const, matters: 'view' as const };
    expect(matchScore(view, stayFacts(view), a)).toBeGreaterThan(matchScore(plain, stayFacts(plain), a));
  });
  it('keeps families away from hostels', () => {
    const hostel = stay({ type: 'hostel', good_for: ['Families'] });
    const hotel = stay({ good_for: ['Families'], amenities: ['Parking'] });
    const a = { who: 'family' as const, budget: null, matters: null };
    expect(matchScore(hotel, stayFacts(hotel), a)).toBeGreaterThan(matchScore(hostel, stayFacts(hostel), a));
  });
});
