import { en, type Dict } from './en';
import { hi } from './hi';
import type { Lang } from './core';

export type { Dict };

const DICTS: Record<Lang, Dict> = { en, hi };

export function getDict(lang: Lang): Dict {
  return DICTS[lang] || en;
}

/** fmt('Hotels in {place}', { place: 'Naddi' }) */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : '{' + k + '}'));
}
