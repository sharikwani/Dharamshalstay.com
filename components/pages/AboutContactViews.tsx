import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { MapPin, Shield, Heart, Users, MessageCircle, Phone, Mail, BookOpen, Camera, Building, Clock } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/Cards';
import InquiryForm from '@/components/forms/InquiryForm';
import JsonLd from '@/components/seo/JsonLd';
import { generateSEO, breadcrumbSchema } from '@/lib/seo';
import { getWhatsAppLink } from '@/lib/utils';
import { siteConfig } from '@/lib/config';
import { placeImage } from '@/lib/place-images';
import { serverT } from '@/lib/i18n/server';
import type { Lang } from '@/lib/i18n/core';

export function aboutMetadata(lang: Lang): Metadata {
  const a = serverT(lang).t.about;
  return generateSEO({ title: a.metaTitle, description: a.metaDescription, path: '/about', lang });
}

export function AboutView({ lang }: { lang: Lang }) {
  const { t, href } = serverT(lang);
  const a = t.about;
  const valueIcons = [MapPin, Shield, Heart, Users];

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([{ name: t.common.home, href: '/' }, { name: t.common.about, href: '/about' }], lang),
        {
          '@context': 'https://schema.org',
          '@type': 'AboutPage',
          name: a.h1,
          url: siteConfig.url + href('/about'),
          inLanguage: lang === 'hi' ? 'hi-IN' : 'en-IN',
          mainEntity: {
            '@type': 'TravelAgency',
            name: siteConfig.name, url: siteConfig.url, telephone: siteConfig.phone, email: siteConfig.email,
            address: { '@type': 'PostalAddress', addressLocality: 'Dharamshala', addressRegion: 'Himachal Pradesh', postalCode: '176215', addressCountry: 'IN' },
            areaServed: ['Dharamshala', 'McLeod Ganj', 'Bhagsu', 'Dharamkot', 'Naddi', 'Kangra', 'Palampur', 'Bir Billing'],
          },
        },
      ]} />

      <section className="relative">
        <div className="absolute inset-0">
          <Image src={placeImage('dharamshala-town')} alt={a.heroAlt} fill className="object-cover" priority sizes="100vw" />
          <div className="absolute inset-0 bg-brand-950/75" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-14 text-white">
          <Breadcrumb lang={lang} items={[{ label: t.common.home, href: '/' }, { label: t.common.about }]} />
          <h1 className="text-3xl sm:text-4xl font-heading font-bold mt-2">{a.h1}</h1>
          <p className="text-blue-100 mt-3 max-w-2xl">{a.intro}</p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-12">
        <section>
          <h2 className="text-2xl font-heading font-bold text-slate-900 mb-3">{a.whatTitle}</h2>
          <div className="text-slate-600 leading-relaxed space-y-3">
            <p>{a.what1}</p>
            <p>{a.what2}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {a.values.map((v, i) => {
              const Icon = valueIcons[i];
              return (
                <div key={v.title} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <Icon className="h-5 w-5 text-brand-600 mb-2" />
                  <h3 className="font-semibold text-slate-900">{v.title}</h3>
                  <p className="text-sm text-slate-600">{v.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-heading font-bold text-slate-900 mb-3 flex items-center gap-2"><Building className="h-6 w-6 text-brand-600" />{a.listTitle}</h2>
          <div className="text-slate-600 leading-relaxed space-y-3">
            <p><strong className="text-slate-800">{a.partnerLabel}</strong> {a.partnerText}</p>
            <p><strong className="text-slate-800">{a.directoryLabel}</strong> {a.directoryText}</p>
            <p>{a.sponsored}</p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-heading font-bold text-slate-900 mb-3 flex items-center gap-2"><BookOpen className="h-6 w-6 text-brand-600" />{a.guidesTitle}</h2>
          <ul className="list-disc pl-6 space-y-2 text-slate-600 leading-relaxed">
            <li>{a.guides1} <Link href={href('/blog')} className="text-brand-600 underline">{t.common.guides}</Link> · <Link href={href('/faq')} className="text-brand-600 underline">{t.common.qa}</Link></li>
            <li>{a.guides2}</li>
            <li>{a.guides3}</li>
            <li>{a.guides4} <a href={getWhatsAppLink(a.outdatedMsg)} target="_blank" rel="noopener noreferrer" className="text-brand-600 underline">{a.tellUs}</a></li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-heading font-bold text-slate-900 mb-3 flex items-center gap-2"><Camera className="h-6 w-6 text-brand-600" />{a.photosTitle}</h2>
          <p className="text-slate-600 leading-relaxed">
            {a.photosText} <Link href="/photo-credits" className="text-brand-600 underline">{t.footer.photoCredits}</Link>
          </p>
        </section>

        <section className="bg-blue-50 rounded-2xl p-6">
          <h2 className="text-xl font-heading font-bold text-slate-900 mb-4">{a.contactTitle}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <a href={'tel:' + siteConfig.phone} className="flex items-center gap-2 text-slate-700 hover:text-brand-700"><Phone className="h-4 w-4 text-brand-600" />{siteConfig.phone}</a>
            <a href={'mailto:' + siteConfig.email} className="flex items-center gap-2 text-slate-700 hover:text-brand-700"><Mail className="h-4 w-4 text-brand-600" />{siteConfig.email}</a>
            <p className="flex items-start gap-2 text-slate-700 sm:col-span-2"><MapPin className="h-4 w-4 text-brand-600 mt-0.5" />{t.footer.address}</p>
          </div>
          <div className="flex flex-wrap gap-3 mt-5">
            <Link href={href('/contact')} className="bg-brand-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-brand-700">{a.contactForm}</Link>
            <a href={getWhatsAppLink()} target="_blank" rel="noopener noreferrer" className="bg-green-500 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-green-600 flex items-center gap-1"><MessageCircle className="h-4 w-4" /> {t.common.whatsapp}</a>
            <Link href="/partner/register" className="bg-white border border-slate-300 text-slate-800 px-5 py-2.5 rounded-lg font-medium hover:bg-slate-50">{t.nav.listProperty}</Link>
          </div>
        </section>
      </div>
    </>
  );
}

export function contactMetadata(lang: Lang): Metadata {
  const c = serverT(lang).t.contact;
  return generateSEO({ title: c.metaTitle, description: c.metaDescription, path: '/contact', lang });
}

export function ContactView({ lang }: { lang: Lang }) {
  const { t } = serverT(lang);
  const c = t.contact;
  return (
    <>
      <section className="bg-brand-900 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Breadcrumb lang={lang} items={[{ label: t.common.home, href: '/' }, { label: t.common.contact }]} />
          <h1 className="text-3xl font-heading font-bold mt-2">{c.h1}</h1>
          <p className="text-blue-200">{c.intro}</p>
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-4">
            <a href={getWhatsAppLink(c.whatsappMsg)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100"><MessageCircle className="h-5 w-5 text-green-600" /><div><p className="font-medium text-slate-900">{c.whatsappFastest}</p><p className="text-sm text-slate-600">{siteConfig.phone}</p></div></a>
            <a href={`tel:${siteConfig.phone}`} className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"><Phone className="h-5 w-5 text-brand-600" /><div><p className="font-medium">{c.phone}</p><p className="text-sm text-slate-600">{siteConfig.phone}</p></div></a>
            <a href={`mailto:${siteConfig.email}`} className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"><Mail className="h-5 w-5 text-brand-600" /><div><p className="font-medium">{c.email}</p><p className="text-sm text-slate-600">{siteConfig.email}</p></div></a>
            <div className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-xl"><MapPin className="h-5 w-5 text-brand-600 mt-0.5" /><div><p className="font-medium">{c.office}</p><p className="text-sm text-slate-600">{t.footer.address}</p></div></div>
            <div className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-xl"><Clock className="h-5 w-5 text-brand-600 mt-0.5" /><div><p className="font-medium">{c.responseTime}</p><p className="text-sm text-slate-600">{c.responseText}</p></div></div>
          </div>
          <div className="lg:col-span-2"><InquiryForm type="general" title={c.formTitle} subtitle={c.formSubtitle} /></div>
        </div>
      </section>
    </>
  );
}
