import { describe, it, expect, vi } from 'vitest';
import { bearerFrom, clientIp, HttpError, jsonError } from '@/lib/server-auth';

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

describe('clientIp', () => {
  const req = (h: Record<string, string>) => new Request('http://x', { headers: h });
  it('prefers x-vercel-forwarded-for, then x-real-ip, then last x-forwarded-for', () => {
    expect(clientIp(req({ 'x-vercel-forwarded-for': '1.1.1.1', 'x-real-ip': '2.2.2.2', 'x-forwarded-for': '9.9.9.9, 3.3.3.3' }))).toBe('1.1.1.1');
    expect(clientIp(req({ 'x-real-ip': '2.2.2.2', 'x-forwarded-for': '9.9.9.9, 3.3.3.3' }))).toBe('2.2.2.2');
    expect(clientIp(req({ 'x-forwarded-for': '9.9.9.9, 3.3.3.3' }))).toBe('3.3.3.3');
    expect(clientIp(req({}))).toBe('unknown');
  });
});
