import { describe, expect, it } from 'vitest';
import { QUIZ_PACKS, MOST_LIKELY_PROMPTS, cleanPrompts, cleanQuestions, prizeLabel, quizPoints, GAMES } from '@/lib/game/party';
import { ANCHOR_LINES, callSpeech, numberWords } from '@/lib/game/tambola';

describe('party games', () => {
  it('scores fast right answers higher, wrong answers zero', () => {
    expect(quizPoints(true, 0)).toBe(1000);
    expect(quizPoints(true, 20000)).toBe(500);
    expect(quizPoints(true, 99999)).toBe(500);
    expect(quizPoints(true, 10000)).toBe(750);
    expect(quizPoints(false, 100)).toBe(0);
  });
  it('ships well-formed quiz packs and prompts', () => {
    for (const p of QUIZ_PACKS) for (const q of p.questions) {
      expect(q.options.length).toBe(4);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(4);
      expect(new Set(q.options).size).toBe(4);
    }
    expect(MOST_LIKELY_PROMPTS.length).toBeGreaterThan(20);
  });
  it('keeps only usable host questions and prompts', () => {
    const qs = cleanQuestions([
      { q: 'Where did they meet?', options: ['Goa', 'Delhi', '', ''], answer: 1 },
      { q: 'Bad answer index', options: ['a', 'b'], answer: 3 },
      { q: 'One option', options: ['only'], answer: 0 },
      { q: '<b>x</b> ok?', options: ['a', 'b', 'c'], answer: 2 },
    ]);
    expect(qs.map((q) => q.q)).toEqual(['Where did they meet?', 'bx/b ok?']);
    expect(qs[0].options).toEqual(['Goa', 'Delhi']);
    expect(cleanPrompts(['Who is most likely to dance first?', 'ab', 'steal the cake'])).toEqual(['dance first', 'steal the cake']);
  });
  it('names every prize', () => {
    expect(prizeLabel('full_house')).toBe('Full House');
    expect(prizeLabel('quiz')).toBe(GAMES.quiz.name);
  });
  it('reads numbers the way a tambola anchor does', () => {
    expect(numberWords(73)).toBe('seventy-three');
    expect(callSpeech(22)).toBe('Two little ducks! two and two, twenty-two.');
    expect(callSpeech(40)).toBe('four zero, forty.');
    expect(callSpeech(5)).toBe('single number, five.');
    expect(Object.keys(ANCHOR_LINES).filter((k) => /^n\d+$/.test(k))).toHaveLength(90);
  });
});

import { existsSync } from 'fs';
import { ANCHOR_VOICES } from '@/components/game/anchor';
describe('anchor voice clips', () => {
  it('has every recorded line for every voice', () => {
    const missing = ANCHOR_VOICES.flatMap((v) => Object.keys(ANCHOR_LINES).filter((k) => !existsSync(`public/audio/tambola/${v.id}/${k}.mp3`)).map((k) => v.id + '/' + k));
    expect(missing).toEqual([]);
  });
});
