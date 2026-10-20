import { describe, expect, it } from 'vitest';
import { EVENTS, upcomingEvents } from '@/data/events';

describe('events', () => {
  it('has real dates, a source and a package for every event', () => {
    for (const e of EVENTS) {
      expect(e.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (e.end) expect(e.end >= e.start).toBe(true);
      expect(e.sources.length).toBeGreaterThan(0);
      expect(e.pack.includes.length).toBeGreaterThan(1);
    }
    expect(new Set(EVENTS.map((e) => e.id)).size).toBe(EVENTS.length);
  });
  it('drops events once they are over and keeps date order', () => {
    expect(upcomingEvents('2026-11-01').map((e) => e.id)).toContain('diff-2026');
    expect(upcomingEvents('2026-11-02').map((e) => e.id)).not.toContain('diff-2026');
    const starts = upcomingEvents('2026-10-20').map((e) => e.start);
    expect(starts).toEqual([...starts].sort());
  });
});
