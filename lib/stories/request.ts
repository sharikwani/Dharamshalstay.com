/** Small helpers for the public story API routes. */
import { createHash } from 'crypto';
import { z } from 'zod';
import { HttpError, clientIp } from '@/lib/server-auth';

export const HOUR_MS = 3600e3;

export function ipHashOf(req: Request): string {
  return createHash('sha256').update('story-ip:' + (process.env.REVIEW_IP_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || '') + ':' + clientIp(req)).digest('hex');
}

/** The reader's city and country from Vercel's IP location headers (empty when unknown). */
export function geoOf(req: Request): { city: string; country: string } {
  let city = req.headers.get('x-vercel-ip-city') || '';
  try { city = decodeURIComponent(city); } catch { /* keep as is */ }
  const country = (req.headers.get('x-vercel-ip-country') || '').toUpperCase();
  return { city: city.trim().slice(0, 60), country: /^[A-Z]{2}$/.test(country) ? country : '' };
}

const uuid = z.string().uuid();
export function requireUuid(v: unknown, what = 'id'): string {
  const r = uuid.safeParse(v);
  if (!r.success) throw new HttpError(400, 'Invalid ' + what);
  return r.data;
}

/** Crawlers and link previews do not count as readers. */
export const isBot = (req: Request) => /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|headless|lighthouse/i.test(req.headers.get('user-agent') || '');

export async function jsonBody(req: Request): Promise<Record<string, unknown>> {
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== 'object') throw new HttpError(400, 'Invalid request');
  return b as Record<string, unknown>;
}
