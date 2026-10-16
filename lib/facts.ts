/**
 * Facts for /facts, /facts.json and llms.txt: the verified facts in data/facts.ts plus taxi fares
 * read live from the taxi routes, so a fare change in the admin shows up everywhere at once.
 */
import { facts, FACT_TOPICS, type Fact } from '@/data/facts';
import { getTaxiRouteGroups, type TaxiRouteGroup } from './taxi';
import { siteConfig } from './config';

export type FactWithTopic = Fact | (Omit<Fact, 'topic'> & { topic: 'taxi' });
export const ALL_TOPICS = [...FACT_TOPICS, { id: 'taxi' as const, title: 'Taxi fares' }];

const today = () => new Date().toISOString().slice(0, 10);
const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

/** One fact per taxi route: the lowest fixed fare we currently charge. */
export function taxiFacts(groups: TaxiRouteGroup[], date = today()): FactWithTopic[] {
  return groups.filter((g) => g.minPrice > 0).map((g) => ({
    id: 'taxi-' + g.slug,
    topic: 'taxi' as const,
    question: 'How much is a taxi from ' + g.from + ' to ' + g.to + '?',
    answer: 'From ' + inr(g.minPrice) + ' one way (fixed fare, sedan)' + (g.distanceKm ? ', about ' + g.distanceKm + ' km' : '') + (g.duration ? ', ' + g.duration : '') + '. Larger cars cost more; the fare is confirmed when you book.',
    verified: date,
    sources: [{ label: 'Dharamshala Stay: current fares', url: siteConfig.url + '/taxi/' + g.slug }],
    page: '/taxi/' + g.slug,
  }));
}

export async function getAllFacts(): Promise<FactWithTopic[]> {
  let groups: TaxiRouteGroup[] = [];
  try { groups = await getTaxiRouteGroups(); } catch { /* fares are optional here */ }
  return [...facts, ...taxiFacts(groups)];
}

/** A short line per fact, used at the top of llms.txt. */
export function factLine(f: FactWithTopic): string {
  return '- **' + f.question + '** ' + f.answer + ' (verified ' + f.verified + '; ' + siteConfig.url + '/facts#' + f.id + ')';
}
