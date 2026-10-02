'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import { useT } from '@/lib/i18n/client';

export interface GuideSummary { slug: string; title: string; excerpt: string; category: string; tags: string[] }

/** Instant search over all guides (titles, excerpts, tags). */
export default function GuideSearch({ guides }: { guides: GuideSummary[] }) {
  const { t, href } = useT();
  const [q, setQ] = useState('');
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);

  const results = useMemo(() => {
    if (!words.length) return [];
    return guides
      .map((g) => {
        const title = g.title.toLowerCase();
        const text = (g.title + ' ' + g.excerpt + ' ' + g.tags.join(' ') + ' ' + g.category).toLowerCase();
        if (!words.every((w) => text.includes(w))) return null;
        return { g, score: words.filter((w) => title.includes(w)).length };
      })
      .filter((x): x is { g: GuideSummary; score: number } => !!x)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((x) => x.g);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guides, q]);

  return (
    <div className="relative max-w-2xl">
      <Search className="h-5 w-5 text-slate-400 absolute left-4 top-[1.6rem] -translate-y-1/2" />
      <input value={q} onChange={(e) => setQ(e.target.value)} aria-label={t.blog.searchLabel}
        placeholder={t.blog.searchPlaceholder}
        className="w-full pl-12 pr-10 py-3.5 rounded-xl text-slate-900 text-base outline-none focus:ring-2 focus:ring-orange-400 shadow" />
      {q && (
        <button onClick={() => setQ('')} aria-label={t.blog.clear} className="absolute right-3 top-[1.6rem] -translate-y-1/2 text-slate-400 hover:text-slate-700">
          <X className="h-5 w-5" />
        </button>
      )}
      {words.length > 0 && (
        <div className="mt-2 bg-white rounded-xl shadow-lg border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-600">{t.blog.noMatch} <Link href={href('/faq')} className="text-brand-600 underline">{t.common.qa}</Link></p>
          ) : results.map((g) => (
            <Link key={g.slug} href={href('/blog/' + g.slug)} className="block px-4 py-3 hover:bg-slate-50">
              <p className="font-medium text-slate-900">{g.title}</p>
              <p className="text-xs text-slate-500 line-clamp-1">{g.category} &middot; {g.excerpt}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
