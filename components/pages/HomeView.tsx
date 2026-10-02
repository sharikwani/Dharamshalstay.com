import Link from 'next/link';
import Image from 'next/image';
import { Shield, HeadphonesIcon, Mountain, Car, ArrowRight, Star, MessageCircle, Building, Wind, Heart, Sparkles, IndianRupee, Compass, Palette, Coffee } from 'lucide-react';
import { DestinationCard, SectionHeading, FAQSection, BlogCard } from '@/components/ui/Cards';
import HeroSearch from '@/components/sections/HeroSearch';
import JsonLd from '@/components/seo/JsonLd';
import PreferredSourceButton from '@/components/seo/PreferredSourceButton';
import { getDestinations } from '@/lib/db';
import { getFeaturedBlogPosts } from '@/data/blog';
import { faqSchema } from '@/lib/seo';
import { getWhatsAppLink } from '@/lib/utils';
import { UNSPLASH_IMAGES } from '@/types';
import { serverT } from '@/lib/i18n/server';
import { fmt } from '@/lib/i18n/dict';
import { getHomepageFAQs, localizeDestination, localizePost } from '@/lib/i18n/content';
import type { Lang } from '@/lib/i18n/core';

const TRUST_ICONS = [IndianRupee, Shield, HeadphonesIcon, Heart];
const WHY_ICONS = [Building, Compass, IndianRupee];
const EXP = [
  { icon: Mountain, href: '/treks', image: UNSPLASH_IMAGES.trek1 },
  { icon: Wind, href: '/paragliding', image: UNSPLASH_IMAGES.paragliding },
  { icon: Car, href: '/taxi', image: UNSPLASH_IMAGES.taxi },
];
const SEASON_ICONS = {
  spring: [Mountain, Wind, Coffee, Palette],
  monsoon: [Wind, IndianRupee, Coffee, Mountain],
  autumn: [Mountain, Wind, Palette, Coffee],
  winter: [Mountain, Palette, Coffee, IndianRupee],
};

/** "What's special right now" follows the real calendar. */
function seasonFor(month: number): keyof typeof SEASON_ICONS {
  if (month >= 2 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'monsoon';
  if (month >= 9 && month <= 10) return 'autumn';
  return 'winter';
}

export default async function HomeView({ lang }: { lang: Lang }) {
  const { t, href } = serverT(lang);
  const h = t.home;
  const destinations = (await getDestinations()).map((d: any) => localizeDestination(d, lang));
  const featuredBlogs = getFeaturedBlogPosts(6).map((p) => localizePost(p, lang));
  const faqs = getHomepageFAQs(lang);
  const seasonKey = seasonFor(new Date().getMonth());
  const season = h.seasons[seasonKey];

  return (
    <>
      <JsonLd data={faqSchema(faqs)} />

      {/* HERO */}
      <section className="relative min-h-[600px] lg:min-h-[680px] flex items-center overflow-hidden">
        <Image src={UNSPLASH_IMAGES.hero} alt={h.heroAlt} fill className="object-cover scale-105" priority quality={85} sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-br from-brand-950/80 via-brand-950/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 w-full py-20 lg:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md text-white text-xs font-medium px-3 py-1.5 rounded-full mb-6 border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />{h.badge}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold text-white leading-[1.15] mb-5">
              {h.h1a}
              <br />
              <span className="bg-gradient-to-r from-amber-200 to-orange-200 bg-clip-text text-transparent">{h.h1b}</span>
            </h1>
            <p className="text-lg lg:text-xl text-blue-100/90 mb-10 max-w-2xl leading-relaxed">{h.intro}</p>
          </div>
          <HeroSearch />
        </div>
      </section>

      {/* WHY BOOK WITH US */}
      <section className="py-10 bg-white relative -mt-6 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
            {h.trust.map((item, i) => {
              const Icon = TRUST_ICONS[i];
              return (
                <div key={item.label} className="flex items-start gap-3 group">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0 group-hover:bg-brand-100 transition-colors">
                    <Icon className="h-5 w-5 text-brand-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{item.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* WHAT MAKES US DIFFERENT */}
      <section className="py-16 lg:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-heading font-bold text-slate-900 mb-3">{h.whyTitle}</h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">{h.whyIntro}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {h.why.map((item, i) => {
              const Icon = WHY_ICONS[i];
              return (
                <div key={item.title} className="bg-white rounded-2xl p-7 border border-slate-100 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center"><Icon className="h-5 w-5 text-brand-600" /></div>
                    <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-full">{item.highlight}</span>
                  </div>
                  <h3 className="font-heading font-bold text-lg text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* BEST AREAS TO STAY */}
      <section className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionHeading title={h.areasTitle} subtitle={h.areasSubtitle} />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {destinations.map((d: any) => <DestinationCard key={d.id} destination={d} lang={lang} />)}
          </div>
          <div className="text-center mt-8">
            <Link href={href('/hotels')} className="inline-flex items-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-brand-700 transition-colors">
              {h.browseAllHotels} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* EXPERIENCES */}
      <section className="py-16 lg:py-20 bg-brand-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-heading font-bold mb-3">{h.expTitle}</h2>
            <p className="text-blue-200 text-lg max-w-2xl mx-auto">{h.expIntro}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {h.experiences.map((exp, i) => {
              const meta = EXP[i];
              return (
                <Link key={exp.title} href={href(meta.href)} className="group relative rounded-2xl overflow-hidden aspect-[4/5] flex items-end">
                  <Image src={meta.image} alt={exp.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width:768px) 100vw, 33vw" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="relative p-6 w-full">
                    <div className="flex items-center gap-2 mb-2">
                      <meta.icon className="h-5 w-5 text-orange-300" />
                      <span className="text-xs font-semibold text-orange-300">{exp.price}</span>
                    </div>
                    <h3 className="text-xl font-heading font-bold text-white mb-1">{exp.title}</h3>
                    <p className="text-sm text-white/70 line-clamp-2">{exp.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* COMBO PACKAGES */}
      <section className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-heading font-bold text-slate-900 mb-3">{h.pkgTitle}</h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">{h.pkgIntro}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {h.packages.map((pkg) => (
              <div key={pkg.title} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-shadow relative overflow-hidden">
                <span className="absolute top-4 right-4 text-xs font-bold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full">{pkg.tag}</span>
                <h3 className="font-heading font-bold text-xl text-slate-900 mb-1">{pkg.title}</h3>
                <p className="text-sm text-slate-500 mb-3">{pkg.duration}</p>
                <p className="text-slate-700 text-sm mb-4">{pkg.desc}</p>
                <div className="flex items-end justify-between">
                  <div>
                    <span className="text-2xl font-bold text-slate-900">{pkg.price}</span>
                    <span className="text-xs text-slate-500 ml-1">{t.common.perPerson}</span>
                  </div>
                  <a href={getWhatsAppLink(fmt(h.pkgWhatsApp, { name: pkg.title }))} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
                    {h.enquire} <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-slate-500 mt-6">
            {h.customizable}{' '}
            <a href={getWhatsAppLink(h.customMsg)} target="_blank" rel="noopener noreferrer" className="text-brand-600 font-medium">{h.customQuote}</a>
          </p>
        </div>
      </section>

      {/* SEASONAL HIGHLIGHTS */}
      <section className="py-16 lg:py-20 bg-gradient-to-br from-blue-50 via-white to-amber-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-heading font-bold text-slate-900 mb-3">{h.nowTitle}</h2>
            <p className="text-slate-600 text-lg max-w-3xl mx-auto">
              {season.intro}{' '}
              <Link href={href('/blog/best-time-to-visit-dharamshala')} className="text-brand-600 font-medium underline">{h.monthGuide}</Link>
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {season.items.map((s, i) => {
              const Icon = SEASON_ICONS[seasonKey][i];
              return (
                <div key={s.title} className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-slate-100">
                  <Icon className="h-6 w-6 text-brand-600 mb-3" />
                  <h3 className="font-heading font-semibold text-slate-900 mb-1">{s.title}</h3>
                  <p className="text-sm text-slate-600">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* TRAVEL GUIDES */}
      {featuredBlogs.length > 0 && (
        <section className="py-16 lg:py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <SectionHeading title={h.guidesTitle} subtitle={h.guidesSubtitle} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredBlogs.map((p) => <BlogCard key={p.id} post={p} lang={lang} />)}
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <Link href={href('/blog')} className="inline-flex items-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-brand-700 transition-colors">
                {h.allGuides} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href={href('/faq')} className="inline-flex items-center gap-2 border border-slate-300 text-slate-800 px-6 py-3 rounded-xl font-semibold hover:bg-slate-50 transition-colors">
                {t.common.qa}
              </Link>
            </div>
            <div className="mt-10 flex flex-col items-center text-center gap-2">
              <p className="text-sm text-slate-600 max-w-md">{h.preferredIntro}</p>
              <PreferredSourceButton lang={lang} />
            </div>
          </div>
        </section>
      )}

      {/* REVIEWS -- only real Google reviews; set NEXT_PUBLIC_GOOGLE_REVIEW_URL to show this */}
      {process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL && (
        <section className="py-14 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900 mb-3">{h.reviewTitle}</h2>
            <p className="text-slate-600 mb-6">{h.reviewIntro}</p>
            <a href={process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-brand-700">
              <Star className="h-4 w-4" /> {h.reviewCta}
            </a>
          </div>
        </section>
      )}

      {/* LIST YOUR PROPERTY CTA */}
      <section className="py-16 bg-brand-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <Building className="h-10 w-10 text-orange-400 mx-auto mb-4" />
          <h2 className="text-2xl sm:text-3xl font-heading font-bold mb-3">{h.ownerTitle}</h2>
          <p className="text-blue-200 mb-6 max-w-xl mx-auto">{h.ownerIntro}</p>
          <Link href="/partner/register" className="inline-flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors">
            {h.ownerCta} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 lg:py-20 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <SectionHeading title={h.faqTitle} />
          <FAQSection faqs={faqs} />
          <p className="text-center mt-6">
            <Link href={href('/faq')} className="text-brand-600 font-semibold hover:text-brand-700">{h.allQa} &rarr;</Link>
          </p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-16 bg-brand-600 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold mb-4">{h.ctaTitle}</h2>
          <p className="text-blue-100 text-lg mb-8">{h.ctaIntro}</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link href={href('/hotels')} className="inline-flex items-center justify-center gap-2 bg-white text-brand-700 px-6 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-colors">
              {t.common.browseHotels}
            </Link>
            <a href={getWhatsAppLink(h.ctaMsg)} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-green-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-600 transition-colors">
              <MessageCircle className="h-4 w-4" /> {h.ctaWhatsApp}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
