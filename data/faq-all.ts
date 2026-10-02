/**
 * Every Q&A on /faq: the original set plus the expansion files, merged by
 * category id (an expansion category with an existing id adds to it).
 */
import { faqCategories, type FAQCategory } from './faqs';
import { faqsExtra1 } from './faqs-extra-1';
import { faqsExtra2 } from './faqs-extra-2';

function merge(...groups: FAQCategory[][]): FAQCategory[] {
  const byId = new Map<string, FAQCategory>();
  for (const c of groups.flat()) {
    const existing = byId.get(c.id);
    if (!existing) { byId.set(c.id, { ...c, faqs: [...c.faqs] }); continue; }
    const seen = new Set(existing.faqs.map((f) => f.question.trim().toLowerCase()));
    existing.faqs.push(...c.faqs.filter((f) => !seen.has(f.question.trim().toLowerCase())));
  }
  return Array.from(byId.values());
}

export const allFaqCategories: FAQCategory[] = merge(faqCategories, faqsExtra1, faqsExtra2);
export const allFaqCount = allFaqCategories.reduce((n, c) => n + c.faqs.length, 0);
