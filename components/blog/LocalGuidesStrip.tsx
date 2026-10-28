import Link from 'next/link';
import { BadgeCheck, Languages } from 'lucide-react';
import { publishedGuides } from '@/lib/guides/store';
import { formatPrice } from '@/lib/utils';
import type { Lang } from '@/lib/i18n/core';

/** Guides where a local guide is the obvious next step: they show our approved guides (max 3). */
export const GUIDE_STRIP_POSTS = [
  'mcleod-ganj-complete-guide', 'things-to-do-in-mcleod-ganj', 'dalai-lama-temple-guide',
  'triund-trek-complete-guide', 'places-to-visit-in-dharamshala', 'dharamshala-3-day-itinerary',
];

export default async function LocalGuidesStrip({ slug, lang }: { slug: string; lang: Lang }) {
  if (!GUIDE_STRIP_POSTS.includes(slug)) return null;
  const guides = (await publishedGuides()).slice(0, 3);
  if (!guides.length) return null;
  const hi = lang === 'hi';
  return (
    <section className="mt-10 rounded-2xl border border-slate-200 p-5 sm:p-6" aria-labelledby="local-guides-title">
      <h2 id="local-guides-title" className="font-heading font-bold text-xl text-slate-900 mb-1">
        {hi ? 'लोकल गाइड के साथ घूमें' : 'Explore with a local guide'}
      </h2>
      <p className="text-sm text-slate-600 mb-4">
        {hi
          ? 'हमारे जाँचे हुए लोकल गाइड, जिन्हें आप Dharamshala Stay से बुक कर सकते हैं।'
          : 'Local guides approved by our team. Book them through Dharamshala Stay; we confirm the day with the guide for you.'}
      </p>
      <ul className="grid gap-4 sm:grid-cols-3">
        {guides.map((g) => (
          <li key={g.id}>
            <Link href={'/local-guides/' + g.slug} className="flex gap-3 rounded-xl border border-slate-200 p-3 hover:border-brand-400">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.photo!} alt={`${g.name}, local guide in ${g.areas[0] || 'McLeod Ganj'}`} className="h-16 w-16 shrink-0 rounded-lg object-cover" loading="lazy" />
              <span className="min-w-0 text-sm">
                <span className="block font-semibold text-slate-900">{g.name}</span>
                {g.verified && <span className="flex items-center gap-1 text-xs text-green-700"><BadgeCheck className="h-3.5 w-3.5" aria-hidden />{hi ? 'सत्यापित' : 'Verified'}</span>}
                <span className="flex items-center gap-1 text-xs text-slate-600"><Languages className="h-3.5 w-3.5" aria-hidden />{g.languages.slice(0, 3).join(', ')}</span>
                {g.price_per_day ? <span className="block text-xs text-slate-600">{hi ? 'प्रति दिन' : 'From'} {formatPrice(g.price_per_day)}{hi ? ' से' : ' a day'}</span> : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm">
        <Link href="/local-guides" className="text-brand-600 underline">{hi ? 'सभी लोकल गाइड देखें' : 'See all local guides in Dharamshala and McLeod Ganj'}</Link>
      </p>
    </section>
  );
}
