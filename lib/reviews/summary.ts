// lib/reviews/summary.ts
import { CATEGORIES, emptySummary, type RatingRow, type ReviewSummary } from './types';

export const round1 = (n: number) => Math.round(n * 10) / 10;
const isStar = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 5;
const mean = (xs: number[]): number | null => (xs.length ? round1(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

/** Count, average, per-category averages and star distribution of (approved) reviews. */
export function summarize(rows: RatingRow[]): ReviewSummary {
  const s = emptySummary();
  const overall = rows.map((r) => r.rating).filter(isStar);
  if (!overall.length) return s;
  s.count = overall.length;
  s.average = mean(overall) ?? 0;
  for (const n of overall) s.distribution[n - 1]++;
  for (const c of CATEGORIES) {
    s.categories[c] = mean(rows.map((r) => r[('rating_' + c) as keyof RatingRow]).filter(isStar));
  }
  return s;
}

export type StayRow = { guest_phone: string | null; status: string | null; check_out: string | null };
const STAYED = ['confirmed', 'completed'];

/** A booking proves the stay: same last 10 digits, confirmed or completed, checked out today or earlier (IST date). */
export function isVerifiedStay(phone10: string, bookings: StayRow[], today: string): boolean {
  return bookings.some((b) => {
    const d = String(b.guest_phone ?? '').replace(/\D/g, '');
    return d.length >= 10 && d.slice(-10) === phone10
      && STAYED.includes(String(b.status))
      && !!b.check_out && b.check_out.slice(0, 10) <= today;
  });
}

const MONTHS: Record<'en' | 'hi', string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  hi: ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'],
};

/** '2026-09' -> 'Sep 2026' (fixed names, so server and browser render the same text). */
export function monthLabel(ym: string, lang: 'en' | 'hi' = 'en'): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ym || '');
  const name = m ? MONTHS[lang][Number(m[2]) - 1] : undefined;
  return m && name ? name + ' ' + m[1] : ym;
}

export function initialName(name: string): string {
  // Array.from splits by code point, so an emoji or other astral character is not cut in half.
  const first = (Array.from(name.trim())[0] ?? '').toUpperCase();
  return first ? first + '.' : 'Guest';
}

/** Whitespace-collapsed text, cut at a word boundary with '…' when longer than `max`. */
export function shortQuote(text: string, max = 200): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return (space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd() + '…';
}
