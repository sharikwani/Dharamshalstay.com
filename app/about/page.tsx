import Link from 'next/link';
import Image from 'next/image';
import { Metadata } from 'next';
import { MapPin, Shield, Heart, Users, MessageCircle, Phone, Mail, BookOpen, Camera, Building } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/Cards';
import JsonLd from '@/components/seo/JsonLd';
import { generateSEO, breadcrumbSchema } from '@/lib/seo';
import { getWhatsAppLink } from '@/lib/utils';
import { siteConfig } from '@/lib/config';
import { placeImage } from '@/lib/place-images';

export const metadata: Metadata = generateSEO({
  title: 'About Dharamshala Stay - Local Travel Team in Dharamshala',
  description: 'Who we are, how we list hotels, how our Dharamshala travel guides are researched and fact-checked, and how to reach our local team in the Kangra Valley.',
  path: '/about',
});

export default function AboutPage() {
  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([{ name: 'Home', href: '/' }, { name: 'About', href: '/about' }]),
        {
          '@context': 'https://schema.org',
          '@type': 'AboutPage',
          name: 'About Dharamshala Stay',
          url: siteConfig.url + '/about',
          mainEntity: {
            '@type': 'TravelAgency',
            name: siteConfig.name,
            url: siteConfig.url,
            telephone: siteConfig.phone,
            email: siteConfig.email,
            address: { '@type': 'PostalAddress', addressLocality: 'Dharamshala', addressRegion: 'Himachal Pradesh', postalCode: '176215', addressCountry: 'IN' },
            areaServed: ['Dharamshala', 'McLeod Ganj', 'Bhagsu', 'Dharamkot', 'Naddi', 'Kangra', 'Palampur', 'Bir Billing'],
          },
        },
      ]} />

      <section className="relative">
        <div className="absolute inset-0">
          <Image src={placeImage('dharamshala-town')} alt="Dharamshala town below the Dhauladhar range" fill className="object-cover" priority sizes="100vw" />
          <div className="absolute inset-0 bg-brand-950/75" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-14 text-white">
          <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'About' }]} />
          <h1 className="text-3xl sm:text-4xl font-heading font-bold mt-2">A Local Travel Team in Dharamshala</h1>
          <p className="text-blue-100 mt-3 max-w-2xl">
            Dharamshala Stay helps travellers plan trips to Dharamshala, McLeod Ganj and the Kangra Valley -- where to stay, how to
            get here, what to do, and who to book with -- with the kind of advice you&apos;d get from a friend who lives here.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-12">
        <section>
          <h2 className="text-2xl font-heading font-bold text-slate-900 mb-3">What we do</h2>
          <div className="text-slate-600 leading-relaxed space-y-3">
            <p>
              We are based in Dharamshala and work with hotels, homestays, trek guides, paragliding operators and taxi drivers across
              the Kangra Valley. Travellers send us their dates and plans, and we put together the stay, transfers and activities --
              then stay reachable on WhatsApp during the trip.
            </p>
            <p>
              Our service is free for travellers: there is no booking fee. We earn a commission from the properties and operators we book.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {[
              { icon: MapPin, t: 'Local first', d: 'We live and work here.' },
              { icon: Shield, t: 'Transparent', d: 'No booking fee, no hidden charges.' },
              { icon: Heart, t: 'Honest advice', d: 'We tell you what to skip, too.' },
              { icon: Users, t: 'Community', d: 'Supporting local families and guides.' },
            ].map((v) => (
              <div key={v.t} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <v.icon className="h-5 w-5 text-brand-600 mb-2" />
                <h3 className="font-semibold text-slate-900">{v.t}</h3>
                <p className="text-sm text-slate-600">{v.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-heading font-bold text-slate-900 mb-3 flex items-center gap-2"><Building className="h-6 w-6 text-brand-600" />How we list hotels</h2>
          <div className="text-slate-600 leading-relaxed space-y-3">
            <p>
              <strong className="text-slate-800">Partner properties</strong> work with us directly. They show rooms and rates, and we
              can confirm bookings with them.
            </p>
            <p>
              <strong className="text-slate-800">Directory listings</strong> are well-known stays we describe so you can compare areas,
              but that are not partners yet. We write those descriptions ourselves, don&apos;t show prices, ratings or photos we don&apos;t
              own, and label them clearly. If you enquire, we check availability for you or suggest a similar partner stay. Owners can
              claim their listing at any time.
            </p>
            <p>Sponsored placements, where they exist, are always labelled.</p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-heading font-bold text-slate-900 mb-3 flex items-center gap-2"><BookOpen className="h-6 w-6 text-brand-600" />How we write our guides</h2>
          <ul className="list-disc pl-6 space-y-2 text-slate-600 leading-relaxed">
            <li>Our <Link href="/blog" className="text-brand-600 underline">travel guides</Link> and <Link href="/faq" className="text-brand-600 underline">Q&amp;A page</Link> are written from local experience and checked against official and news sources -- district administration orders, Forest Department fees, airline and railway schedules.</li>
            <li>Things that change often (trek fees, ropeway and toy-train status, flight routes, entry tickets) are marked approximate with the year, and we tell you to check locally when we can&apos;t confirm them.</li>
            <li>Every guide shows when it was published and last updated. We review seasonal guides before each season.</li>
            <li>Spotted something out of date? <a href={getWhatsAppLink('Hi! I noticed something out of date on your website:')} target="_blank" rel="noopener noreferrer" className="text-brand-600 underline">Tell us on WhatsApp</a> and we&apos;ll fix it.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-heading font-bold text-slate-900 mb-3 flex items-center gap-2"><Camera className="h-6 w-6 text-brand-600" />About our photos</h2>
          <p className="text-slate-600 leading-relaxed">
            Every place photo on this site is a real photograph of that place -- not stock imagery -- credited to its photographer on
            our <Link href="/photo-credits" className="text-brand-600 underline">photo credits</Link> page. Hotel photos come from the
            properties themselves.
          </p>
        </section>

        <section className="bg-blue-50 rounded-2xl p-6">
          <h2 className="text-xl font-heading font-bold text-slate-900 mb-4">Contact us</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <a href={'tel:' + siteConfig.phone} className="flex items-center gap-2 text-slate-700 hover:text-brand-700"><Phone className="h-4 w-4 text-brand-600" />{siteConfig.phone}</a>
            <a href={'mailto:' + siteConfig.email} className="flex items-center gap-2 text-slate-700 hover:text-brand-700"><Mail className="h-4 w-4 text-brand-600" />{siteConfig.email}</a>
            <p className="flex items-start gap-2 text-slate-700 sm:col-span-2"><MapPin className="h-4 w-4 text-brand-600 mt-0.5" />{siteConfig.address}</p>
          </div>
          <div className="flex flex-wrap gap-3 mt-5">
            <Link href="/contact" className="bg-brand-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-brand-700">Contact form</Link>
            <a href={getWhatsAppLink()} target="_blank" rel="noopener noreferrer" className="bg-green-500 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-green-600 flex items-center gap-1"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
            <Link href="/partner/register" className="bg-white border border-slate-300 text-slate-800 px-5 py-2.5 rounded-lg font-medium hover:bg-slate-50">List your property</Link>
          </div>
        </section>
      </div>
    </>
  );
}
