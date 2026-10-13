import { describe, it, expect } from 'vitest';
import { fitWithin } from '@/lib/client-image';

describe('fitWithin', () => {
  it('shrinks a wide photo to the max width', () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
  });
  it('shrinks a tall photo to the max height', () => {
    expect(fitWithin(1000, 3000, 1600)).toEqual({ width: 533, height: 1600 });
  });
  it('leaves a small photo alone', () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });
});
