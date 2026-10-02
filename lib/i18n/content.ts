/**
 * Language-aware content: overlays Hindi translations on the English source
 * data. Missing translations fall back to English, flagged so pages can tell
 * readers (and point canonical/hreflang at the English page).
 */
import type { BlogPost } from '@/types';
import type { Lang } from './core';
import { hiPosts, hiFaqCategories, hiHomepageFAQsData, hiDestinationsData, hiHotelsData, hiTreksData } from '@/data/hi';
import { allFaqCategories } from '@/data/faq-all';
import { homepageFAQs } from '@/data/testimonials';
import type { FAQCategory } from '@/data/faqs';
import { localizeUnits } from './units';

export function hasHindiPost(slug: string): boolean {
  return !!hiPosts[slug];
}

export function localizePost(post: BlogPost, lang: Lang): BlogPost & { translated: boolean } {
  if (lang === 'en') return { ...post, translated: true };
  const h = hiPosts[post.slug];
  if (!h) return { ...post, translated: false };
  return {
    ...post,
    title: h.title, excerpt: h.excerpt, content: h.content,
    meta_title: h.meta_title, meta_description: h.meta_description,
    image_alt: h.image_alt || post.image_alt,
    faqs: h.faqs?.length ? h.faqs : post.faqs,
    translated: true,
  };
}

/** Merge category lists by id, keeping first-seen order (same as data/faq-all.ts). */
function mergeCategories(groups: FAQCategory[][]): FAQCategory[] {
  const byId = new Map<string, FAQCategory>();
  for (const c of groups.flat()) {
    const ex = byId.get(c.id);
    if (!ex) { byId.set(c.id, { ...c, faqs: [...c.faqs] }); continue; }
    const seen = new Set(ex.faqs.map((f) => f.question.trim()));
    ex.faqs.push(...c.faqs.filter((f) => !seen.has(f.question.trim())));
  }
  return Array.from(byId.values());
}

export function getFaqCategories(lang: Lang): FAQCategory[] {
  if (lang === 'en' || !hiFaqCategories.length) return allFaqCategories;
  return mergeCategories(hiFaqCategories);
}

export function getHomepageFAQs(lang: Lang) {
  return lang === 'hi' && hiHomepageFAQsData.length ? hiHomepageFAQsData : homepageFAQs;
}

export function localizeDestination<T extends { slug: string }>(d: T, lang: Lang): T {
  if (lang === 'en') return d;
  const h = hiDestinationsData[d.slug];
  const base: any = h ? { ...d, ...h } : { ...d };
  if (base.altitude) base.altitude = localizeUnits(base.altitude, lang);
  return base;
}

export function localizeHotel<T extends { slug: string; rooms?: any[] }>(p: T, lang: Lang): T {
  if (lang === 'en') return p;
  const h = hiHotelsData[p.slug];
  if (!h) return p;
  // Room translations are listed in the same order as the property's rooms.
  const rooms = (p.rooms || []).map((r: any, i: number) => {
    const tr = h.room_types?.[i];
    return tr?.name ? { ...r, name: tr.name, description: tr.description ?? r.description } : r;
  });
  return {
    ...p,
    short_description: h.short_description,
    description: h.description,
    ...(h.highlights && { highlights: h.highlights }),
    ...(h.good_for && { good_for: h.good_for }),
    ...(h.nearby && { nearby: h.nearby }),
    ...(h.faqs && { faqs: h.faqs }),
    rooms,
  };
}

export function localizeTrek<T extends { slug: string }>(t: T, lang: Lang): T {
  if (lang === 'en') return t;
  const h = hiTreksData[t.slug];
  const base: any = h ? { ...t, ...h } : { ...t };
  // Short measurement fields come from the database in English.
  for (const k of ['max_altitude', 'distance', 'duration']) if (base[k]) base[k] = localizeUnits(base[k], lang);
  return base;
}
