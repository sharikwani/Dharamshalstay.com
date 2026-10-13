// tests/api/availability-public.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const PID = '11111111-1111-4111-8111-111111111111';
const h = vi.hoisted(() => ({ result: {} as any, calls: [] as any[], fail: false }));
vi.mock('@/lib/availability/store', () => ({
  availabilityFor: async (...a: any[]) => { h.calls.push(a); if (h.fail) throw new Error('db'); return h.result; },
}));

import { GET } from '@/app/api/availability/route';
const get = (q: string) => GET(new Request(`http://x/api/availability?${q}`));

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  Object.assign(h, { calls: [], fail: false, result: { Standard: { tracked: true, left: -1 }, Deluxe: { tracked: true, left: 5 }, Dorm: { tracked: false, left: null } } });
});

describe('GET /api/availability', () => {
  it('returns only counts per room type, never below zero', async () => {
    const res = await get(`property_id=${PID}&check_in=2099-10-21&check_out=2099-10-23`);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.json()).toEqual({ rooms: { Standard: { tracked: true, left: 0 }, Deluxe: { tracked: true, left: 5 }, Dorm: { tracked: false, left: null } } });
    expect(h.calls).toEqual([[PID, '2099-10-21', '2099-10-23']]);
  });
  it('rejects bad input with 400 and does not query', async () => {
    for (const q of [
      'check_in=2099-10-21&check_out=2099-10-23',
      `property_id=nope&check_in=2099-10-21&check_out=2099-10-23`,
      `property_id=${PID}&check_in=2099-10-32&check_out=2099-11-02`,
      `property_id=${PID}&check_in=2099-10-23&check_out=2099-10-23`,
      `property_id=${PID}&check_in=2099-10-01&check_out=2099-12-31`,
    ]) expect((await get(q)).status).toBe(400);
    expect(h.calls).toEqual([]);
  });
  it('returns 500 when the lookup fails', async () => {
    h.fail = true;
    expect((await get(`property_id=${PID}&check_in=2099-10-21&check_out=2099-10-23`)).status).toBe(500);
  });
});
