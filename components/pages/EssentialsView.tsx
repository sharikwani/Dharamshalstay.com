import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import {
  Banknote, ShoppingBasket, UtensilsCrossed, HeartPulse, Bus, CloudSun, Landmark,
  ArrowRight, MessageCircle,
} from 'lucide-react';
import { Breadcrumb } from '@/components/ui/Cards';
import JsonLd from '@/components/seo/JsonLd';
import { generateSEO, breadcrumbSchema, faqSchema } from '@/lib/seo';
import { getWhatsAppLink } from '@/lib/utils';
import { placeImage } from '@/lib/place-images';
import { serverT } from '@/lib/i18n/server';
import { fmt } from '@/lib/i18n/dict';
import type { Lang } from '@/lib/i18n/core';
import { essentialGroups, essentialFaqs, essentialItems, type EssentialIcon } from '@/data/essentials';

const ICONS: Record<EssentialIcon, typeof Banknote> = {
  money: Banknote,
  daily: ShoppingBasket,
  food: UtensilsCrossed,
  health: HeartPulse,
  around: Bus,
  weather: CloudSun,
  rules: Landmark,
};

export function essentialsMetadata(lang: Lang): Metadata {
  const e = serverT(lang).t.essentials;
  return generateSEO({
    title: e.metaTitle,
    description: e.metaDescription,
    path: '/essentials',
    image: placeImage('mcleod-ganj'),
    lang,
    keywords: [
      'things to know before visiting dharamshala',
      'dharamshala practical information',
      'mcleod ganj travel tips',
      'is tap water safe dharamshala',
      'atm mcleod ganj',
      'laundry mcleod ganj',
      'groceries mcleod ganj',
    ],
  });
}

export default function EssentialsView({ lang }: { lang: Lang }) {
  const { t, href } = serverT(lang);
  const e = t.essentials;

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([{ name: t.common.home, href: '/' }, { name: e.breadcrumb, href: '/essentials' }], lang),
        faqSchema(essentialFaqs),
      ]} />

      <section className="relative">
        <div className="absolute inset-0">
          <Image src={placeImage('mcleod-ganj')} alt={e.heroAlt} fill className="object-cover" priority sizes="100vw" />
          <div className="absolute inset-0 bg-brand-950/75" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-12 text-white">
          <Breadcrumb lang={lang} items={[{ label: t.common.home, href: '/' }, { label: e.breadcrumb }]} />
          <h1 className="text-3xl sm:text-4xl font-heading font-bold mt-2">{e.h1}</h1>
          <p className="text-blue-100 max-w-3xl mt-3">{fmt(e.intro, { n: essentialItems.length })}</p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Jump links -- the list is long and people arrive with one specific worry. */}
        <nav aria-label={e.jumpLabel} className="flex flex-wrap gap-2 mb-10">
          {essentialGroups.map((g) => (
            <a key={g.id} href={'#' + g.id}
              className="text-sm font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-100 px-3 py-1.5 rounded-full transition-colors">
              {g.title}
            </a>
          ))}
        </nav>

        <div className="space-y-12">
          {essentialGroups.map((g) => {
            const Icon = ICONS[g.icon];
            return (
              <section key={g.id} id={g.id} className="scroll-mt-20">
                <div className="flex items-start gap-3 mb-5">
                  <span className="shrink-0 bg-orange-500/10 text-orange-600 rounded-xl p-2.5">
                    <Icon className="h-6 w-6" />
                  </span>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-heading font-bold text-slate-900">{g.title}</h2>
                    <p className="text-slate-500 text-sm mt-0.5">{g.blurb}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {g.items.map((item) => (
                    <div key={item.q} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-brand-300 transition-colors">
                      <h3 className="font-semibold text-slate-900">{item.q}</h3>
                      <p className="text-slate-600 mt-2 leading-relaxed">{item.a}</p>
                      <Link href={href(item.href)}
                        className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 mt-3">
                        {e.fullGuide} <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <div className="mt-14 bg-gradient-to-br from-brand-50 to-blue-50 rounded-2xl p-8 text-center">
          <h2 className="font-heading font-bold text-xl text-slate-900 mb-2">{e.ctaTitle}</h2>
          <p className="text-slate-600 mb-5 max-w-2xl mx-auto">{e.ctaIntro}</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <a href={getWhatsAppLink(e.whatsappMsg)} target="_blank" rel="noopener noreferrer"
              className="bg-green-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-green-600 flex items-center justify-center gap-1.5">
              <MessageCircle className="h-4 w-4" /> {t.common.askWhatsApp}
            </a>
            <Link href={href('/faq')} className="bg-white border border-slate-300 text-slate-800 px-6 py-2.5 rounded-xl font-semibold hover:bg-slate-50">
              {e.allQuestions}
            </Link>
            <Link href={href('/blog')} className="bg-white border border-slate-300 text-slate-800 px-6 py-2.5 rounded-xl font-semibold hover:bg-slate-50">
              {t.common.readGuides}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
