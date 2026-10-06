import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Calendar, Clock, ArrowLeft, MessageCircle, Tag, User, RefreshCw, Languages } from 'lucide-react';
import { BlogCard, Breadcrumb, FAQSection } from '@/components/ui/Cards';
import MarkdownContent, { extractHeadings } from '@/components/blog/MarkdownContent';
import GuideSearch from '@/components/blog/GuideSearch';
import JsonLd from '@/components/seo/JsonLd';
import PreferredSourceButton from '@/components/seo/PreferredSourceButton';
import { blogPosts, getBlogBySlug, getBlogCategories, getRelatedPosts } from '@/data/blog';
import { generateSEO, articleSchema, breadcrumbSchema, faqSchema, itemListSchema } from '@/lib/seo';
import { placeImage } from '@/lib/place-images';
import { formatDate, getWhatsAppLink } from '@/lib/utils';
import { serverT } from '@/lib/i18n/server';
import { fmt } from '@/lib/i18n/dict';
import { hasHindiPost, localizePost } from '@/lib/i18n/content';
import type { Lang } from '@/lib/i18n/core';

const START_HERE = ['dharamshala-complete-travel-guide', 'mcleod-ganj-complete-guide', 'how-to-reach-dharamshala', 'best-time-to-visit-dharamshala', 'places-to-visit-in-dharamshala', 'dharamshala-trip-cost-budget'];
// Every other guide links here with descriptive anchors: these pages target the money keywords.
const HOTEL_GUIDES = ['best-hotels-in-dharamshala', 'best-hotels-in-mcleod-ganj'];
const catId = (c: string) => c.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export function blogIndexMetadata(lang: Lang): Metadata {
  const b = serverT(lang).t.blog;
  return generateSEO({
    title: b.metaTitle, description: b.metaDescription, path: '/blog', lang, image: placeImage('mcleod-ganj'),
    keywords: lang === 'hi'
      ? ['धर्मशाला यात्रा गाइड', 'धर्मशाला घूमने की जगह', 'मैक्लोडगंज घूमने की जगह', 'हिमाचल यात्रा']
      : ['dharamshala travel guide', 'mcleod ganj travel guide', 'places to visit in dharamshala', 'kangra travel', 'palampur travel guide', 'himachal itinerary'],
  });
}

export function BlogIndexView({ lang }: { lang: Lang }) {
  const { t, href } = serverT(lang);
  const b = t.blog;
  const posts = blogPosts.map((p) => localizePost(p, lang));
  const categories = getBlogCategories();
  const [latest, ...rest] = posts;
  const startHere = START_HERE.map((s) => posts.find((p) => p.slug === s)).filter((p): p is (typeof posts)[number] => !!p);
  const summaries = posts.map((p) => ({ slug: p.slug, title: p.title, excerpt: p.excerpt, category: b.categories[p.category] || p.category, tags: p.tags }));

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([{ name: t.common.home, href: '/' }, { name: t.common.guides, href: '/blog' }], lang),
        itemListSchema(posts.map((p) => ({ name: p.title, href: '/blog/' + p.slug })), lang),
      ]} />
      <section className="bg-brand-900 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Breadcrumb lang={lang} items={[{ label: t.common.home, href: '/' }, { label: t.common.guides }]} />
          <h1 className="text-3xl sm:text-4xl font-heading font-bold mt-2">{b.h1}</h1>
          <p className="text-brand-200 max-w-3xl mt-2">{b.intro}</p>
          <p className="text-sm text-brand-200 mt-3">{fmt(b.count, { n: posts.length })}</p>
          <div className="mt-5"><GuideSearch guides={summaries} /></div>
          <div className="flex flex-wrap gap-2 mt-5">
            {categories.map((c) => (
              <a key={c} href={'#' + catId(c)} className="text-xs font-medium bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full">{b.categories[c] || c}</a>
            ))}
            <Link href={href('/faq')} className="text-xs font-semibold bg-orange-600 hover:bg-orange-700 px-3 py-1.5 rounded-full">{t.common.qa}</Link>
          </div>
        </div>
      </section>

      {startHere.length > 0 && (
        <section className="pt-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl font-heading font-bold text-slate-900 mb-2">{b.startHere}</h2>
            <p className="text-slate-600 mb-5">{b.startHereIntro}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {startHere.map((p) => <BlogCard key={p.id} post={p} lang={lang} />)}
            </div>
          </div>
        </section>
      )}

      {latest && (
        <section className="pt-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl font-heading font-bold text-slate-900 mb-5">{b.latest}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[latest, ...rest.slice(0, 5)].map((p) => <BlogCard key={p.id} post={p} lang={lang} />)}
            </div>
          </div>
        </section>
      )}

      {categories.map((c) => {
        const inCat = posts.filter((p) => p.category === c);
        return (
          <section key={c} id={catId(c)} className="py-8 scroll-mt-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
              <h2 className="text-2xl font-heading font-bold text-slate-900 mb-5">{b.categories[c] || c}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {inCat.map((p) => <BlogCard key={p.id} post={p} lang={lang} />)}
              </div>
            </div>
          </section>
        );
      })}

      <section className="py-10">
        <div className="max-w-3xl mx-auto px-4 text-center flex flex-col items-center gap-2">
          <p className="text-sm text-slate-600">{t.home.preferredIntro}</p>
          <PreferredSourceButton lang={lang} />
        </div>
      </section>
    </>
  );
}

export function blogPostMetadata(slug: string, lang: Lang): Metadata {
  const raw = getBlogBySlug(slug);
  if (!raw) return {};
  const p = localizePost(raw, lang);
  return generateSEO({
    title: p.meta_title,
    description: p.meta_description,
    path: '/blog/' + p.slug,
    type: 'article',
    publishedTime: p.published_at,
    modifiedTime: p.updated_at,
    image: p.image,
    keywords: p.tags,
    lang,
    ogTag: p.category,
    markdown: true,
    // Only claim a Hindi alternate when a real translation exists.
    hindi: hasHindiPost(p.slug),
  });
}

export function BlogPostView({ slug, lang }: { slug: string; lang: Lang }) {
  const raw = getBlogBySlug(slug);
  if (!raw) notFound();
  const post = localizePost(raw, lang);
  const { t, href } = serverT(lang);
  const b = t.blog;
  const related = getRelatedPosts(raw, 4).map((p) => localizePost(p, lang));
  const headings = extractHeadings(post.content);

  return (
    <>
      <JsonLd data={[
        articleSchema(post, post.translated ? lang : 'en'),
        breadcrumbSchema([
          { name: t.common.home, href: '/' },
          { name: t.common.guides, href: '/blog' },
          { name: post.title, href: '/blog/' + post.slug },
        ], lang),
        ...(post.faqs?.length ? [faqSchema(post.faqs)] : []),
      ]} />

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-8" lang={post.translated ? undefined : 'en'}>
        <Breadcrumb lang={lang} items={[
          { label: t.common.home, href: '/' },
          { label: t.common.guides, href: '/blog' },
          { label: post.title },
        ]} />

        {lang === 'hi' && !post.translated && (
          <p className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded-xl px-4 py-3 mb-4" lang="hi">
            <Languages className="h-4 w-4 shrink-0" /> {b.notTranslated}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 mb-4 mt-3">
          <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full flex items-center gap-1">
            <Tag className="h-3 w-3" />{b.categories[post.category] || post.category}
          </span>
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />{b.published} <time dateTime={post.published_at}>{formatDate(post.published_at, lang)}</time>
          </span>
          {post.updated_at && post.updated_at !== post.published_at && (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <RefreshCw className="h-3.5 w-3.5" />{b.updated} <time dateTime={post.updated_at}>{formatDate(post.updated_at, lang)}</time>
            </span>
          )}
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />{post.read_time} {t.common.minRead}
          </span>
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <User className="h-3.5 w-3.5" />{b.author}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-slate-900 mb-4 leading-tight">{post.title}</h1>
        <p className="text-lg text-slate-600 mb-6 leading-relaxed">{post.excerpt}</p>

        <figure className="mb-10">
          <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-slate-100">
            <Image src={post.image} alt={post.image_alt} fill className="object-cover" priority sizes="(max-width:768px) 100vw, 768px" />
          </div>
          <figcaption className="text-xs text-slate-400 mt-2">
            {post.image_alt}. {t.common.photoCredit} (<Link href="/photo-credits" className="underline hover:text-slate-600">{t.common.credits}</Link>).
          </figcaption>
        </figure>

        {headings.length >= 4 && (
          <nav aria-label={b.toc} className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8">
            <p className="font-heading font-semibold text-slate-900 mb-2">{b.toc}</p>
            <ol className="list-decimal pl-5 space-y-1 text-sm">
              {headings.map(h => (
                <li key={h.id}><a href={'#' + h.id} className="text-brand-600 hover:text-brand-700 hover:underline">{h.text}</a></li>
              ))}
            </ol>
          </nav>
        )}

        <div className="prose-custom">
          <MarkdownContent content={post.content} lang={lang} />
        </div>

        {post.faqs && post.faqs.length > 0 && (
          <section className="mt-10">
            <h2 className="text-2xl font-heading font-bold text-slate-900 mb-4">{t.common.faqs}</h2>
            <FAQSection faqs={post.faqs} />
            <p className="text-sm text-slate-500 mt-4">
              {t.common.moreAnswers} <Link href={href('/faq')} className="text-brand-600 underline">{t.common.qaPage}</Link>.
            </p>
          </section>
        )}

        {lang === 'en' && post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-slate-200">
            {post.tags.map(tag => <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full">#{tag}</span>)}
          </div>
        )}

        {lang === 'en' && !HOTEL_GUIDES.includes(post.slug) && (
          <p className="mt-10 text-slate-700">
            <span className="font-semibold text-slate-900">Where to stay:</span> see our picks of the{' '}
            <Link href="/blog/best-hotels-in-dharamshala" className="text-brand-600 underline">best hotels in Dharamshala</Link> and the{' '}
            <Link href="/blog/best-hotels-in-mcleod-ganj" className="text-brand-600 underline">best hotels in McLeod Ganj</Link>, or{' '}
            <Link href="/hotels" className="text-brand-600 underline">compare all hotels and homestays</Link> with direct rates.
          </p>
        )}

        <div className="bg-brand-50 rounded-2xl p-8 text-center mt-10 mb-10">
          <h2 className="font-heading font-bold text-xl text-slate-900 mb-2">{b.ctaTitle}</h2>
          <p className="text-slate-600 mb-5">{b.ctaIntro}</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link href={href('/hotels')} className="bg-brand-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-brand-700 transition-colors">{t.common.browseHotels}</Link>
            <a href={getWhatsAppLink(fmt(b.whatsappMsg, { title: raw.title }))} target="_blank" rel="noopener noreferrer"
              className="bg-green-700 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-green-800 transition-colors flex items-center justify-center gap-1.5">
              <MessageCircle className="h-4 w-4" /> {t.common.whatsapp}
            </a>
          </div>
          <div className="mt-6 flex justify-center"><PreferredSourceButton lang={lang} /></div>
        </div>

        {related.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-heading font-bold text-slate-900 mb-4">{b.related}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {related.map(r => <BlogCard key={r.id} post={r} lang={lang} />)}
            </div>
          </div>
        )}

        <Link href={href('/blog')} className="inline-flex items-center gap-1.5 text-brand-600 font-medium mt-4 hover:text-brand-700">
          <ArrowLeft className="h-4 w-4" /> {b.allGuides}
        </Link>
      </article>
    </>
  );
}
