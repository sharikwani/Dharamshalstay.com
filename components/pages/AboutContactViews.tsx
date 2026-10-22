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
            address: { '@type': 'PostalAddress', streetAddress: 'VPO Khaniyara', addressLocality: 'Dharamshala', addressRegion: 'Himachal Pradesh', postalCode: '176218', addressCountry: 'IN' },
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
          <p className="text-brand-100 mt-3 max-w-2xl">{a.intro}</p>
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

        <section className="bg-brand-50 rounded-2xl p-6">
          <h2 className="text-xl font-heading font-bold text-slate-900 mb-4">{a.contactTitle}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <a href={'tel:' + siteConfig.phone} className="flex items-center gap-2 text-slate-700 hover:text-brand-700"><Phone className="h-4 w-4 text-brand-600" />{siteConfig.phone}</a>
            <a href={'mailto:' + siteConfig.email} className="flex items-center gap-2 text-slate-700 hover:text-brand-700"><Mail className="h-4 w-4 text-brand-600" />{siteConfig.email}</a>
            <p className="flex items-start gap-2 text-slate-700 sm:col-span-2"><MapPin className="h-4 w-4 text-brand-600 mt-0.5" />{t.footer.address}</p>
          </div>
          <div className="flex flex-wrap gap-3 mt-5">
            <Link href={href('/contact')} className="bg-brand-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-brand-700">{a.contactForm}</Link>
            <a href={getWhatsAppLink()} target="_blank" rel="noopener noreferrer" className="bg-green-700 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-green-800 flex items-center gap-1"><MessageCircle className="h-4 w-4" /> {t.common.whatsapp}</a>
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
  const { t, href } = serverT(lang);
  const c = t.contact;
  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([{ name: t.common.home, href: '/' }, { name: t.common.contact, href: '/contact' }], lang),
        {
          '@context': 'https://schema.org',
          '@type': 'ContactPage',
          name: c.h1,
          url: siteConfig.url + href('/contact'),
          inLanguage: lang === 'hi' ? 'hi-IN' : 'en-IN',
          about: { '@id': siteConfig.url + '/#organization' },
        },
      ]} />
      <section className="bg-brand-900 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Breadcrumb lang={lang} items={[{ label: t.common.home, href: '/' }, { label: t.common.contact }]} />
          <h1 className="text-3xl font-heading font-bold mt-2">{c.h1}</h1>
          <p className="text-brand-200">{c.intro}</p>
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <h2 className="sr-only">{c.formTitle}</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-4">
            <a href={getWhatsAppLink(c.whatsappMsg)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100"><MessageCircle className="h-5 w-5 text-green-600" /><div><p className="font-medium text-slate-900">{c.whatsappFastest}</p><p className="text-sm text-slate-600">{siteConfig.whatsappDisplay}</p></div></a>
            <a href={`tel:${siteConfig.phone}`} className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"><Phone className="h-5 w-5 text-brand-600" /><div><p className="font-medium">{c.phone}</p><p className="text-sm text-slate-600">{siteConfig.phone}</p></div></a>
            <a href={`mailto:${siteConfig.email}`} className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"><Mail className="h-5 w-5 text-brand-600" /><div><p className="font-medium">{c.email}</p><p className="text-sm text-slate-600">{siteConfig.email}</p></div></a>
            <div className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-xl"><MapPin className="h-5 w-5 text-brand-600 mt-0.5" /><div><p className="font-medium">{c.office}</p><p className="text-sm text-slate-600">{t.footer.address}</p></div></div>
            <div className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-xl"><Clock className="h-5 w-5 text-brand-600 mt-0.5" /><div><p className="font-medium">{c.responseTime}</p><p className="text-sm text-slate-600">{c.responseText}</p></div></div>
          </div>
          <div className="lg:col-span-2"><InquiryForm type="general" title={c.formTitle} subtitle={c.formSubtitle} /></div>
        </div>
      </section>

      <section className="bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <h2 className="text-2xl font-heading font-bold text-slate-900 mb-6">{c.helpTitle}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {c.help.map((x) => (
              <div key={x.href} className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col">
                <h3 className="font-heading font-semibold text-slate-900 mb-2">{x.title}</h3>
                <p className="text-sm text-slate-600 flex-1">{x.text}</p>
                <Link href={href(x.href)} className="text-sm text-brand-600 font-medium mt-3 hover:underline">{x.link} →</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div>
          <h2 className="text-2xl font-heading font-bold text-slate-900 mb-4">{c.howTitle}</h2>
          <ol className="space-y-3">
            {c.how.map((step, i) => (
              <li key={i} className="flex gap-3 text-slate-700">
                <span className="shrink-0 h-7 w-7 rounded-full bg-brand-600 text-white text-sm font-bold flex items-center justify-center">{i + 1}</span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
          <Link href="/cancellation-policy" className="inline-block text-sm text-brand-600 font-medium mt-4 hover:underline">{c.cancellation} →</Link>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 self-start">
          <h2 className="text-xl font-heading font-bold text-slate-900 mb-3">{c.tipsTitle}</h2>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-700">{c.tips.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
      </section>
    </>
  );
}
