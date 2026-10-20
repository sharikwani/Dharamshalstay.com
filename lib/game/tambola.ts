/**
 * Tambola (housie) rules: tickets, claims, prizes. Pure functions, no I/O, so the server is the only judge.
 *
 * A ticket is 3 rows x 9 columns. Each row has exactly 5 numbers; column c holds numbers from its decade
 * (1-9, 10-19, ... 80-90), 1 to 3 per column, sorted top to bottom. 0 = blank cell.
 */

export type Ticket = number[][];
export type Prize = 'full_house' | 'first_line' | 'early_five';

/** Place on the certificate, prize name, and the discount code value (owner to confirm the amounts). */
export const PRIZES: Record<Prize, { place: 1 | 2 | 3; label: string; rule: string; amount: number }> = {
  full_house: { place: 1, label: 'Full House', rule: 'All 15 numbers on the ticket', amount: 300 },
  first_line: { place: 2, label: 'First Line', rule: 'Any one full row of 5 numbers', amount: 200 },
  early_five: { place: 3, label: 'Early Five', rule: 'Any 5 numbers on the ticket', amount: 100 },
};
export const PRIZE_ORDER: Prize[] = ['early_five', 'first_line', 'full_house'];
/** Discount codes: off a stay, trek, taxi or activity booked with us of at least this much, valid this long. */
export const CODE_MIN_BOOKING = 3000;
export const CODE_VALID_DAYS = 180;

export const PARTY_TYPES = {
  birthday: 'Birthday Party', anniversary: 'Anniversary Party', kitty: 'Kitty Party', office: 'Office Party',
  family: 'Family Get-together', festival: 'Festival Party', other: 'Party',
} as const;
export type PartyType = keyof typeof PARTY_TYPES;

export const MAX_NUMBER = 90;

const colRange = (c: number): [number, number] => (c === 0 ? [1, 9] : c === 8 ? [80, 90] : [c * 10, c * 10 + 9]);

/** A valid random ticket. `rand` returns [0, 1). */
export function generateTicket(rand: () => number = Math.random): Ticket {
  const pick = <T,>(arr: T[], n: number): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a.slice(0, n);
  };
  const cols = Array.from({ length: 9 }, (_, i) => i);
  for (;;) {
    // Each row picks 5 columns; retry until every column is used (each column then has 1-3 numbers).
    const rows = [0, 1, 2].map(() => new Set(pick(cols, 5)));
    if (!cols.every((c) => rows.some((r) => r.has(c)))) continue;
    const t: Ticket = [0, 1, 2].map(() => Array(9).fill(0));
    for (const c of cols) {
      const at = [0, 1, 2].filter((r) => rows[r].has(c));
      const [lo, hi] = colRange(c);
      const nums = pick(Array.from({ length: hi - lo + 1 }, (_, i) => lo + i), at.length).sort((a, b) => a - b);
      at.forEach((r, i) => { t[r][c] = nums[i]; });
    }
    return t;
  }
}

export const ticketNumbers = (t: Ticket): number[] => t.flat().filter((n) => n > 0);
/** Same numbers = same ticket: used to give every player in a room a different ticket. */
export const ticketKey = (t: Ticket): string => ticketNumbers(t).sort((a, b) => a - b).join('.');

export function isValidTicket(t: unknown): t is Ticket {
  if (!Array.isArray(t) || t.length !== 3) return false;
  for (const row of t) if (!Array.isArray(row) || row.length !== 9 || row.filter((n) => n > 0).length !== 5) return false;
  for (let c = 0; c < 9; c++) {
    const [lo, hi] = colRange(c);
    const col = (t as number[][]).map((r) => r[c]).filter((n) => n > 0);
    if (col.length < 1 || col.some((n) => n < lo || n > hi)) return false;
    if (col.some((n, i) => i > 0 && n <= col[i - 1])) return false;
  }
  return true;
}

/** Does the ticket win this prize with the numbers called so far? */
export function wins(t: Ticket, called: Iterable<number>, prize: Prize): boolean {
  const done = new Set(called);
  const hit = (n: number) => done.has(n);
  if (prize === 'early_five') return ticketNumbers(t).filter(hit).length >= 5;
  if (prize === 'first_line') return t.some((row) => row.filter((n) => n > 0).every(hit));
  return ticketNumbers(t).every(hit);
}

/** A random number not called yet, or null when all 90 are out. */
export function nextNumber(called: number[], rand: () => number = Math.random): number | null {
  const done = new Set(called);
  const left = Array.from({ length: MAX_NUMBER }, (_, i) => i + 1).filter((n) => !done.has(n));
  return left.length ? left[Math.floor(rand() * left.length)] : null;
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
/** Prize code like WIN-7K3QX. */
export function makePrizeCode(randomIndex: (n: number) => number): string {
  let s = '';
  for (let i = 0; i < 5; i++) s += CODE_ALPHABET[randomIndex(CODE_ALPHABET.length)];
  return 'WIN-' + s;
}

/** 6-digit room code that does not start with 0 (easier to read out). */
export function makeRoomCode(randomIndex: (n: number) => number): string {
  let s = String(1 + randomIndex(9));
  for (let i = 0; i < 5; i++) s += String(randomIndex(10));
  return s;
}

const ORD = ['', '1st', '2nd', '3rd'];
export const placeLabel = (p: number) => ORD[p] || p + 'th';

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
/** 1-90 in words (voices read words more naturally than digits). */
export function numberWords(n: number): string {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');
}

/** Traditional tambola nicknames for some numbers. */
const NICKNAMES: Record<number, string> = {
  1: 'Kelly’s eye', 2: 'One little duck', 3: 'Cup of tea', 4: 'Knock at the door', 7: 'Lucky seven', 8: 'One fat lady',
  9: 'Doctor’s orders', 10: 'Country’s leader', 11: 'Legs eleven', 13: 'Unlucky for some', 16: 'Sweet sixteen',
  21: 'Key of the door', 22: 'Two little ducks', 26: 'Republic Day', 30: 'Dirty Gertie', 44: 'All the fours', 45: 'Halfway there',
  50: 'Half century', 55: 'All the fives', 66: 'Clickety click', 77: 'Two little crutches', 88: 'Two fat ladies', 90: 'Top of the house',
};

/** What the screen shows under the number. */
export const callText = (n: number) => (NICKNAMES[n] ? `${NICKNAMES[n]}, ${n}` : `Number ${n}`);

/** What the anchor says: "Two little ducks... two and two, twenty-two!" */
export function callSpeech(n: number): string {
  const digits = n < 10 ? 'single number, ' : n % 10 === 0 ? `${ONES[n / 10]} zero, ` : `${ONES[Math.floor(n / 10)]} and ${ONES[n % 10]}, `;
  return NICKNAMES[n] ? `${NICKNAMES[n]}! ${digits}${numberWords(n)}.` : `${digits}${numberWords(n)}.`;
}

/** The anchor's recorded lines (public/audio/tambola/<voice>/<key>.mp3); only the winner's name is made live. */
export const ANCHOR_LINES: Record<string, string> = {
  start: 'Welcome everyone! Eyes down, and let’s play tambola!',
  winner: 'We have a winner! Congratulations',
  early_five: 'for Early Five!',
  first_line: 'for the First Line!',
  full_house: 'for Full House! What a game!',
  over: 'That’s the end of the game. Thank you for playing tambola with Dharamshala Stay!',
};
for (let n = 1; n <= MAX_NUMBER; n++) ANCHOR_LINES['n' + n] = callSpeech(n);

/** The whole winner announcement as text (for the device voice). */
export const winnerSpeech = (name: string, prize: Prize) => `${ANCHOR_LINES.winner} ${name}, ${ANCHOR_LINES[prize]}`;
