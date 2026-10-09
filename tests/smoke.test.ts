import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('test harness', () => {
  it('resolves the @ alias', () => {
    expect(typeof cn).toBe('function');
  });
});
