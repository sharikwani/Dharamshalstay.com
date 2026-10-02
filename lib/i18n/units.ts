import type { Lang } from './core';

/**
 * Short measurement strings stored in English in the database
 * ("Approx. 4,342 m", "about 2,000 m", "30 Minutes", "7-8 hrs", "2 Days")
 * rendered naturally on Hindi pages. Anything unrecognised is left as is.
 */
const RULES: [RegExp, string][] = [
  [/\(sources vary\)/gi, '(स्रोत अलग-अलग)'],
  [/\bapprox\.?\s*/gi, 'लगभग '],
  [/\babout\s+/gi, 'लगभग '],
  [/\bround trip\b/gi, 'आना-जाना'],
  [/\bone way\b/gi, 'एक तरफ़'],
  [/\bminutes?\b|\bmins?\b/gi, 'मिनट'],
  [/\bhours?\b|\bhrs?\b/gi, 'घंटे'],
  [/\bdays?\b/gi, 'दिन'],
  [/\bnights?\b/gi, 'रात'],
  [/\bhalf day\b/gi, 'आधा दिन'],
  [/\bfull day\b/gi, 'पूरा दिन'],
];

export function localizeUnits(value: string | undefined | null, lang: Lang): string {
  if (!value || lang === 'en') return value || '';
  return RULES.reduce((s, [re, to]) => s.replace(re, to), value).replace(/\s{2,}/g, ' ').trim();
}
