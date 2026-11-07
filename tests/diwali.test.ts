import { describe, it, expect } from 'vitest';
import { DIWALI_END, DIWALI_START, EMPTY, LIGHTS, TOTAL, diwaliActive, pageKey, parseState, visit } from '@/lib/diwali';
import { sceneSvg } from '@/components/diwali/scene';

const ist = (d: string) => Date.parse(d + '+05:30');

describe('Diwali lights: when and where', () => {
  it('runs from 6 Nov to the end of 11 Nov 2026, India time', () => {
    expect(DIWALI_START).toBe(ist('2026-11-06T00:00:00'));
    expect(DIWALI_END).toBe(ist('2026-11-12T00:00:00'));
    expect(diwaliActive(ist('2026-11-05T23:59:00'), '/')).toBe(false);
    expect(diwaliActive(ist('2026-11-08T20:00:00'), '/')).toBe(true);
    expect(diwaliActive(ist('2026-11-11T23:59:00'), '/hi/treks')).toBe(true);
    expect(diwaliActive(ist('2026-11-12T00:00:00'), '/')).toBe(false);
  });

  it('stays off dashboards, checkout, tickets, games and TV', () => {
    const day = ist('2026-11-08T12:00:00');
    for (const p of ['/admin', '/admin/treks', '/partner', '/account', '/booking/ABC', '/tickets/X1', '/play', '/play/certificate/1', '/tv', '/hi/admin', '/stories/me/tok'])
      expect(diwaliActive(day, p)).toBe(false);
    for (const p of ['/', '/hotels', '/blog/triund-trek-complete-guide', '/stories', '/players-guide'])
      expect(diwaliActive(day, p)).toBe(true);
  });

  it('preview and opt-out switches', () => {
    expect(diwaliActive(ist('2026-12-01T00:00:00'), '/', '?diwali=1')).toBe(true);
    expect(diwaliActive(ist('2026-11-08T00:00:00'), '/', '?diwali=0')).toBe(false);
    expect(diwaliActive(ist('2026-12-01T00:00:00'), '/admin', '?diwali=1')).toBe(false);
  });
});

describe('Diwali lights: one home per new page', () => {
  it('lights in order, ignores repeats and English/Hindi twins, stops at twelve', () => {
    let s = EMPTY;
    const first = visit(s, '/');
    expect(first.lit?.key).toBe(LIGHTS[0].key);
    s = first.state;
    expect(visit(s, '/').lit).toBeNull();
    expect(visit(s, '/hi').lit).toBeNull();
    expect(pageKey('/hi/treks/')).toBe('/treks');
    for (let i = 1; i < TOTAL; i++) s = visit(s, '/p' + i).state;
    expect(s.pages).toHaveLength(TOTAL);
    expect(visit(s, '/one-more').lit).toBeNull();
    expect(LIGHTS[TOTAL - 1].key).toBe('temple');
  });

  it('reads stored state safely', () => {
    expect(parseState(null)).toEqual(EMPTY);
    expect(parseState('not json')).toEqual(EMPTY);
    expect(parseState(JSON.stringify({ pages: ['/', 3, '/a'], done: true, min: 'yes', name: 'Asha' })))
      .toEqual({ pages: ['/', '/a'], done: true, min: false, name: 'Asha' });
  });
});

describe('Diwali scene', () => {
  it('lights exactly the homes visited', () => {
    expect(sceneSvg(0, { live: false })).not.toMatch(/class="on/);
    const three = sceneSvg(3, { live: true, fresh: 'h3' });
    expect(three.match(/class="on/g)).toHaveLength(3);
    expect(three).toContain('dw-new');
    expect(sceneSvg(TOTAL, { live: false }).match(/class="on/g)).toHaveLength(TOTAL);
  });

  it('fits the strip shape and the card crop', () => {
    expect(sceneSvg(1, { live: true, aspect: 16 })).toContain('viewBox="-500 0 2400 150"');
    expect(sceneSvg(1, { live: true, aspect: 40 })).toContain('viewBox="-1200 0 3600 150"');
    expect(sceneSvg(1, { live: false, view: [520, 0, 400, 150] })).toContain('viewBox="520 0 400 150"');
  });
});
