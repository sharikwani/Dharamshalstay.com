import { describe, expect, it } from 'vitest';
import { generateTicket, isValidTicket, ticketKey, ticketNumbers, wins, nextNumber, makePrizeCode, makeRoomCode, placeLabel, PRIZES } from '@/lib/game/tambola';

describe('tambola', () => {
  it('makes valid tickets: 3 rows of 5, every column used, numbers in their decade and sorted', () => {
    for (let i = 0; i < 500; i++) {
      const t = generateTicket();
      expect(isValidTicket(t)).toBe(true);
      expect(ticketNumbers(t)).toHaveLength(15);
      expect(new Set(ticketNumbers(t)).size).toBe(15);
    }
  });
  it('spots a broken ticket', () => {
    const t = generateTicket();
    const bad = t.map((r) => [...r]);
    bad[0][bad[0].findIndex((n) => n === 0)] = 5;
    expect(isValidTicket(bad)).toBe(false);
    expect(isValidTicket([[1]])).toBe(false);
  });
  it('gives different tickets different keys', () => {
    const keys = new Set(Array.from({ length: 200 }, () => ticketKey(generateTicket())));
    expect(keys.size).toBeGreaterThan(195);
  });
  it('judges claims only on numbers actually called', () => {
    const t = generateTicket();
    const nums = ticketNumbers(t);
    const row = t[1].filter((n) => n > 0);
    expect(wins(t, nums.slice(0, 4), 'early_five')).toBe(false);
    expect(wins(t, nums.slice(0, 5), 'early_five')).toBe(true);
    expect(wins(t, row, 'first_line')).toBe(true);
    expect(wins(t, row.slice(0, 4), 'first_line')).toBe(false);
    expect(wins(t, nums.slice(0, 14), 'full_house')).toBe(false);
    expect(wins(t, nums, 'full_house')).toBe(true);
  });
  it('never calls a number twice and stops after 90', () => {
    const called: number[] = [];
    for (let i = 0; i < 90; i++) called.push(nextNumber(called)!);
    expect(new Set(called).size).toBe(90);
    expect(nextNumber(called)).toBeNull();
  });
  it('makes readable codes and places', () => {
    expect(makePrizeCode((n) => n - 1)).toMatch(/^WIN-[A-Z2-9]{5}$/);
    expect(makeRoomCode(() => 0)).toBe('100000');
    expect(makeRoomCode((n) => n - 1)).toMatch(/^[1-9]\d{5}$/);
    expect(placeLabel(PRIZES.full_house.place)).toBe('1st');
    expect(placeLabel(PRIZES.early_five.place)).toBe('3rd');
  });
});
