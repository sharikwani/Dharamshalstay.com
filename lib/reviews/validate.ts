// lib/reviews/validate.ts
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { todayIST } from '@/lib/bookings/timing';
import { MAX_PHOTOS, MAX_PHOTO_BYTES, PHOTO_TYPES, TRIP_TYPES, type ReviewInput } from './types';

/** Last 10 digits of a phone number; null unless it has 10-15 digits. */
export function normalizeReviewPhone(raw: unknown): string | null {
  const d = String(raw ?? '').replace(/\D/g, '');
  return d.length >= 10 && d.length <= 15 ? d.slice(-10) : null;
}

/** This month in India as YYYY-MM. */
export const currentMonthIST = (now = new Date()) => todayIST(now).slice(0, 7);

const stars = (msg: string) => z.coerce.number({ invalid_type_error: msg }).int(msg).min(1, msg).max(5, msg);
const optionalStars = (msg: string) =>
  z.preprocess((v) => (v === '' || v === null || v === undefined ? null : v), stars(msg).nullable());

function schema(now: Date) {
  return z.object({
    property_id: z.string().uuid('Unknown property.'),
    name: z.string({ required_error: 'Please enter your name.' }).trim().min(2, 'Please enter your name.').max(60, 'Please keep your name under 60 characters.'),
    phone: z.string({ required_error: 'Please enter a valid mobile number.' })
      .refine((s) => normalizeReviewPhone(s) !== null, 'Please enter a valid mobile number.')
      .transform((s) => normalizeReviewPhone(s)!),
    rating: stars('Please choose an overall rating from 1 to 5.'),
    rating_cleanliness: optionalStars('Ratings must be from 1 to 5.'),
    rating_location: optionalStars('Ratings must be from 1 to 5.'),
    rating_staff: optionalStars('Ratings must be from 1 to 5.'),
    rating_value: optionalStars('Ratings must be from 1 to 5.'),
    title: z.string({ required_error: 'The title needs at least 5 characters.' }).trim().min(5, 'The title needs at least 5 characters.').max(100, 'Please keep the title under 100 characters.'),
    body: z.string({ required_error: 'Please write at least 30 characters.' }).trim().min(30, 'Please write at least 30 characters.').max(2000, 'Please keep your review under 2000 characters.'),
    stay_month: z.string({ required_error: 'Please choose the month you stayed.' })
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Please choose the month you stayed.')
      .refine((m) => m >= '2000-01' && m <= currentMonthIST(now), 'The month of your stay cannot be in the future.'),
    trip_type: z.enum(TRIP_TYPES, { errorMap: () => ({ message: 'Please choose a trip type.' }) }),
  });
}

export type ParseResult = { ok: true; data: ReviewInput } | { ok: false; error: string };

/** Validate the review form fields (all strings from FormData). Returns the first problem in field order. */
export function parseReview(fields: Record<string, unknown>, now = new Date()): ParseResult {
  const r = schema(now).safeParse(fields);
  return r.success ? { ok: true, data: r.data } : { ok: false, error: r.error.issues[0]?.message || 'Please check the form.' };
}

const isWebp = (b: Uint8Array) =>
  b.length >= 12 && String.fromCharCode(b[0], b[1], b[2], b[3]) === 'RIFF' && String.fromCharCode(b[8], b[9], b[10], b[11]) === 'WEBP';
const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);
const MAGIC: Record<string, (b: Uint8Array) => boolean> = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  'image/webp': isWebp,
};

export function checkPhotoCount(n: number): string | null {
  return n > MAX_PHOTOS ? 'You can add up to 3 photos.' : null;
}

/** Pass the file's first 12 bytes as `head` so a renamed file cannot pass as a photo. */
export function checkReviewPhoto(f: { type: string; size: number; head: Uint8Array }): string | null {
  if (!has(PHOTO_TYPES, f.type)) return 'Photos must be JPG, PNG or WebP.';
  if (f.size <= 0) return 'One of the photos is empty.';
  if (f.size > MAX_PHOTO_BYTES) return 'Each photo must be 5 MB or smaller.';
  if (!has(MAGIC, f.type) || !MAGIC[f.type](f.head)) return 'One of the photos does not look like a real image. Please choose the original photo.';
  return null;
}

/** One-way hash of the client IP for the rate limit; the IP itself is never stored. */
export function hashIp(ip: string): string {
  return createHash('sha256').update('review-ip:' + (process.env.REVIEW_IP_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || '') + ':' + ip).digest('hex');
}
