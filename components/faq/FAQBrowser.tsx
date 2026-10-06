'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Search, X } from 'lucide-react';
import type { FAQCategory } from '@/data/faqs';
import { useT } from '@/lib/i18n/client';
import { fmt } from '@/lib/i18n/dict';

/**
 * Searchable, topic-filtered Q&A list. Rendered on the server first (every
 * question and answer is in the HTML for search engines); search only
 * filters what is shown.
 */
export default function FAQBrowser({ categories }: { categories: FAQCategory[] }) {
  const { t, href } = useT();
  const f = t.faq;
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!query) return categories;
    const words = query.split(/\s+/);
    return categories
      .map((c) => ({ ...c, faqs: c.faqs.filter((f) => {
        const text = (f.question + ' ' + f.answer).toLowerCase();
        return words.every((w) => text.includes(w));
      }) }))
      .filter((c) => c.faqs.length > 0);
  }, [categories, query]);

  const shown = filtered.reduce((n, c) => n + c.faqs.length, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[230px_1fr] gap-10">
      <nav aria-label={f.topics} className="lg:sticky lg:top-24 self-start">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">{f.topics}</p>
        <ul className="flex flex-wrap lg:flex-col gap-2 lg:gap-1 text-sm">
          {categories.map((c) => (
            <li key={c.id}>
              <a href={'#' + c.id} className="flex justify-between gap-2 px-3 py-1.5 rounded-lg bg-slate-100 lg:bg-transparent hover:bg-brand-50 text-slate-700 hover:text-brand-700">
                <span>{c.title}</span><span className="text-slate-400">{c.faqs.length}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div>
        <div className="relative mb-8">
          <Search className="h-5 w-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={f.searchPlaceholder}
            aria-label={f.searchLabel}
            className="w-full pl-12 pr-10 py-3.5 border border-slate-300 rounded-xl text-base outline-none focus:ring-2 focus:ring-brand-500 shadow-sm" />
          {q && (
            <button onClick={() => setQ('')} aria-label={t.blog.clear} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
              <X className="h-5 w-5" />
            </button>
          )}
          {query && <p className="text-sm text-slate-500 mt-2">{fmt(f.matches, { n: shown })}</p>}
        </div>

        {filtered.length === 0 && (
          <p className="text-slate-600">{f.noMatch} <Link href={href('/contact')} className="text-brand-600 underline">{f.askUs}</Link></p>
        )}

        <div className="space-y-12">
          {filtered.map((c) => (
            <section key={c.id} id={c.id} className="scroll-mt-24">
              <h2 className="text-2xl font-heading font-bold text-slate-900 mb-4">{c.title}</h2>
              <div className="space-y-3">
                {c.faqs.map((f) => (
                  <details key={f.question} open={!!query} className="group bg-white border border-slate-200 rounded-xl open:shadow-sm">
                    <summary className="flex items-center justify-between cursor-pointer px-5 py-4 font-medium text-slate-800 hover:text-brand-600">
                      <h3 className="text-base font-medium pr-2">{f.question}</h3>
                      <ChevronRight className="h-4 w-4 text-slate-400 group-open:rotate-90 transition-transform shrink-0" />
                    </summary>
                    <div className="px-5 pb-5 text-slate-600 leading-relaxed">
                      <p>{f.answer}</p>
                      {f.link && (
                        <Link href={href(f.link.href)} className="inline-block mt-2 text-sm font-semibold text-brand-600 hover:text-brand-700">
                          {f.link.label} &rarr;
                        </Link>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
