import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { MessageCircle } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/Cards';
import JsonLd from '@/components/seo/JsonLd';
import FAQBrowser from '@/components/faq/FAQBrowser';
import { generateSEO, breadcrumbSchema, faqSchema } from '@/lib/seo';
import { getWhatsAppLink } from '@/lib/utils';
import { placeImage } from '@/lib/place-images';
import { serverT } from '@/lib/i18n/server';
import { fmt } from '@/lib/i18n/dict';
import { getFaqCategories } from '@/lib/i18n/content';
import type { Lang } from '@/lib/i18n/core';

export function faqMetadata(lang: Lang): Metadata {
  const f = serverT(lang).t.faq;
  return generateSEO({
    title: f.metaTitle, description: f.metaDescription, path: '/faq', image: placeImage('dhauladhar-hero'), lang,
    keywords: lang === 'hi'
      ? ['धर्मशाला सवाल जवाब', 'धर्मशाला कब जाएं', 'त्रिउंड ट्रेक', 'धर्मशाला कैसे पहुंचे']
      : ['dharamshala faq', 'mcleod ganj questions', 'is dharamshala safe', 'best time to visit dharamshala', 'triund trek questions', 'how to reach dharamshala'],
  });
}

export default function FaqView({ lang }: { lang: Lang }) {
  const { t, href } = serverT(lang);
  const f = t.faq;
  const categories = getFaqCategories(lang);
  const all = categories.flatMap((c) => c.faqs);

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([{ name: t.common.home, href: '/' }, { name: t.common.qa, href: '/faq' }], lang),
        faqSchema(all),
      ]} />

      <section className="relative">
        <div className="absolute inset-0">
          <Image src={placeImage('dhauladhar-hero')} alt={t.home.heroAlt} fill className="object-cover" priority sizes="100vw" />
          <div className="absolute inset-0 bg-brand-950/75" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-12 text-white">
          <Breadcrumb lang={lang} items={[{ label: t.common.home, href: '/' }, { label: t.common.qa }]} />
          <h1 className="text-3xl sm:text-4xl font-heading font-bold mt-2">{f.h1}</h1>
          <p className="text-brand-100 max-w-3xl mt-3">{fmt(f.intro, { n: all.length })}</p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <FAQBrowser categories={categories} />
        <div className="mt-12">
          <div className="bg-brand-50 rounded-2xl p-8 text-center">
            <h2 className="font-heading font-bold text-xl text-slate-900 mb-2">{f.stillTitle}</h2>
            <p className="text-slate-600 mb-5">{f.stillIntro}</p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <a href={getWhatsAppLink(f.whatsappMsg)} target="_blank" rel="noopener noreferrer"
                className="bg-green-700 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-green-800 flex items-center justify-center gap-1.5">
                <MessageCircle className="h-4 w-4" /> {t.common.askWhatsApp}
              </a>
              <Link href={href('/blog')} className="bg-white border border-slate-300 text-slate-800 px-6 py-2.5 rounded-xl font-semibold hover:bg-slate-50">
                {t.common.readGuides}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
