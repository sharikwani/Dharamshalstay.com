import { describe, expect, it } from 'vitest';
import { prefersHindi } from '@/middleware';

describe('prefersHindi', () => {
  it('is true only when Hindi is the main language', () => {
    expect(prefersHindi('hi-IN,hi;q=0.9,en;q=0.8')).toBe(true);
    expect(prefersHindi('hi')).toBe(true);
    expect(prefersHindi('en-US,en;q=0.9,hi;q=0.8')).toBe(false);
    expect(prefersHindi('en-IN,hi-IN;q=0.9')).toBe(false);
    expect(prefersHindi('en;q=0.5,hi;q=0.9')).toBe(true);
    expect(prefersHindi(null)).toBe(false);
    expect(prefersHindi('')).toBe(false);
  });
});
