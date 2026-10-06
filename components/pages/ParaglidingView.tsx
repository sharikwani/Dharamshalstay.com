import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Wind, MapPin, Clock, Star, Shield, ArrowRight, MessageCircle } from 'lucide-react';
import { Breadcrumb, SectionHeading, FAQSection } from '@/components/ui/Cards';
import BookingForm from '@/components/forms/BookingForm';
import JsonLd from '@/components/seo/JsonLd';
import { generateSEO, faqSchema, breadcrumbSchema } from '@/lib/seo';
import { formatPrice, getWhatsAppLink } from '@/lib/utils';
import { placeImage } from '@/lib/place-images';
import { getParaglidingPackages, type ParaglidingPackage } from '@/lib/db';
import { serverT } from '@/lib/i18n/server';
import { fmt } from '@/lib/i18n/dict';
import type { Lang } from '@/lib/i18n/core';

/** Shown until packages are published in /admin/paragliding. */
export const DEFAULT_PARAGLIDING: ParaglidingPackage[] = [
  { slug: 'tandem-bir-billing', name: 'Tandem Paragliding - Bir Billing', destination: 'Bir Billing', duration: '15-25 min flight', altitude: 'Launch at 2,400m', price_per_person: 3500,
    description: 'Fly tandem with a certified pilot from the world-famous Bir Billing launch site. Soar over tea gardens and the Kangra Valley with Dhauladhar views.',
    includes: ['Certified pilot', 'All safety equipment', 'GoPro video & photos', 'Transport to launch site', 'Landing field pickup'], featured: true, image: placeImage('bir-paragliding') },
  { slug: 'tandem-dharamshala', name: 'Tandem Paragliding - Dharamshala', destination: 'Dharamshala', duration: '10-15 min flight', altitude: 'Launch at about 1,600 m (Indrunag)', price_per_person: 2500,
    description: 'A shorter but equally thrilling flight from the hills above Dharamshala. Perfect for first-timers wanting a taste of the skies.',
    includes: ['Certified pilot', 'Safety equipment', 'GoPro video', 'Transport'], featured: true, image: placeImage('dhauladhar-hero') },
  { slug: 'scenic-long-bir', name: 'Scenic Long Flight - Bir Billing', destination: 'Bir Billing', duration: '30-45 min flight', altitude: 'Launch at 2,400m, thermal soaring', price_per_person: 5500,
    description: 'An extended flight for those who want more airtime. Ride thermals higher, cover more distance, and get panoramic shots of the entire valley.',
    includes: ['Certified pilot', 'Extended flight time', 'GoPro HD video', 'Transport', 'Snacks'], featured: false, image: placeImage('kangra-valley') },
];

export function paraglidingMetadata(lang: Lang): Metadata {
  const p = serverT(lang).t.paragliding;
  return generateSEO({ title: p.metaTitle, description: p.metaDescription, path: '/paragliding', image: placeImage('bir-paragliding'), lang });
}

export default async function ParaglidingView({ lang }: { lang: Lang }) {
  const { t, href } = serverT(lang);
  const p = t.paragliding;
  const fromDb = await getParaglidingPackages();
  const packages = (fromDb.length ? fromDb : DEFAULT_PARAGLIDING).map((pkg) => {
    const tr = lang === 'hi' ? p.packages[pkg.slug as keyof typeof p.packages] : undefined;
    return tr ? { ...pkg, ...tr } : pkg;
  });
  const highlightIcons = [Shield, Wind, Clock, Star];

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([{ name: t.common.home, href: '/' }, { name: t.common.paragliding, href: '/paragliding' }], lang),
        faqSchema(p.faqs),
      ]} />

      <section className="relative h-[350px]">
        <Image src={placeImage('bir-paragliding')} alt={p.heroAlt} fill className="object-cover" priority sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-950/60 to-brand-950/80" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 h-full flex flex-col justify-end pb-10 text-white">
          <Breadcrumb lang={lang} items={[{ label: t.common.home, href: '/' }, { label: t.common.paragliding }]} />
          <h1 className="text-3xl sm:text-4xl font-heading font-bold mt-2">{p.h1}</h1>
          <p className="text-brand-200 mt-2 max-w-2xl">{p.intro}</p>
        </div>
      </section>

      <section className="py-8 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {p.highlights.map((h, i) => {
              const Icon = highlightIcons[i];
              return (
                <div key={h.label} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <Icon className="h-5 w-5 text-brand-600 shrink-0" />
                  <div><p className="font-semibold text-sm text-slate-800">{h.label}</p><p className="text-xs text-slate-500">{h.desc}</p></div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionHeading title={p.packagesTitle} subtitle={p.packagesSubtitle} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map(pkg => (
              <div key={pkg.slug} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow group">
                <div className="relative aspect-[16/9]">
                  <Image src={pkg.image} alt={pkg.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width:768px) 100vw, 33vw" />
                  {pkg.featured && <span className="absolute top-3 left-3 bg-orange-600 text-white text-xs font-bold px-2.5 py-1 rounded">{t.treks.popular}</span>}
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-3.5 w-3.5 text-brand-500" />
                    <span className="text-xs font-medium text-slate-500">{pkg.destination}</span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-500">{pkg.duration}</span>
                  </div>
                  <h3 className="text-lg font-heading font-semibold text-slate-900 mb-2">{pkg.name}</h3>
                  <p className="text-sm text-slate-600 line-clamp-3 mb-3">{pkg.description}</p>
                  <div className="flex flex-wrap gap-1 mb-4">
                    {pkg.includes.slice(0, 3).map(inc => <span key={inc} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">✓ {inc}</span>)}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div>
                      <span className="text-xl font-bold text-slate-900">{formatPrice(pkg.price_per_person)}</span>
                      <span className="text-xs text-slate-500 ml-1">{t.common.perPerson}</span>
                    </div>
                    <a href={getWhatsAppLink(fmt(p.whatsappPkg, { name: pkg.name }))} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
                      {p.bookNow} <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-heading font-bold mb-4">{p.aboutTitle}</h2>
              <div className="space-y-3 text-slate-600 leading-relaxed mb-8">
                <p>{p.about1}</p>
                <p>{p.about2} <Link href={href('/blog/bir-billing-paragliding-guide')} className="text-brand-600 underline">{p.guideLink}</Link>.</p>
              </div>
              <h2 className="text-2xl font-heading font-bold mb-4">{t.common.faqs}</h2>
              <FAQSection faqs={p.faqs} />
            </div>
            <div>
              <div id="book" className="sticky top-20 space-y-4">
                <BookingForm category="paragliding" entityName="Paragliding Flight" defaultAmount={packages[0]?.price_per_person || 3500} commissionPct={15} />
                <a href={getWhatsAppLink(p.whatsappGeneral)} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-green-700 text-white py-3 rounded-xl font-medium hover:bg-green-800 w-full">
                  <MessageCircle className="h-4 w-4" /> {t.home.ctaWhatsApp}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
