import { describe, it, expect, vi } from 'vitest';
import { bearerFrom, HttpError, jsonError } from '@/lib/server-auth';

describe('bearerFrom', () => {
  it('reads a bearer token', () => {
    expect(bearerFrom(new Request('http://x', { headers: { authorization: 'Bearer abc.def' } }))).toBe('abc.def');
  });
  it('returns null without one', () => {
    expect(bearerFrom(new Request('http://x'))).toBeNull();
    expect(bearerFrom(new Request('http://x', { headers: { authorization: 'Basic zz' } }))).toBeNull();
  });
});

describe('jsonError', () => {
  it('uses HttpError status', async () => {
    const res = jsonError(new HttpError(403, 'Admins only'));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Admins only' });
  });
  it('hides unexpected errors behind 500', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = jsonError(new Error('db exploded'));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Server error' });
    expect(logged).toHaveBeenCalled();
    logged.mockRestore();
  });
});
