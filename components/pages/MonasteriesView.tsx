import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { ArrowRight, MapPin, ExternalLink, Clock, MessageCircle, BedDouble, CalendarDays } from 'lucide-react';
import { Breadcrumb, FAQSection } from '@/components/ui/Cards';
import JsonLd from '@/components/seo/JsonLd';
import { generateSEO, breadcrumbSchema, faqSchema } from '@/lib/seo';
import { siteConfig } from '@/lib/config';
import { getWhatsAppLink } from '@/lib/utils';
import { monasteries, moreMonasteries, monasteryDay, meditation, etiquette, festivals, monasteryFaqs, monasterySources, type Monastery } from '@/data/monasteries';
import { monasteryPhotos } from '@/data/monastery-photos';

const PATH = '/monasteries-meditation';
const HERO = 'gyuto-monastery-dhauladhar';

const photo = (file: string) => {
  const p = monasteryPhotos.find((x) => x.file === file)!;
  return { src: `/images/monasteries/${file}.jpg`, alt: p.alt, credit: p };
};

const mapUrl = (m: Monastery) => 'https://www.google.com/maps/search/?api=1&query='
  + encodeURIComponent(m.lat !== undefined ? `${m.lat},${m.lng}` : `${m.name}, ${m.area}`);

function Credit({ file }: { file: string }) {
  const { credit: c } = photo(file);
  return (
    <span className="text-[11px] text-slate-500">
      Photo: <a href={c.source} target="_blank" rel="noopener noreferrer" className="underline">{c.author}</a>,{' '}
      <a href={c.license_url} target="_blank" rel="noopener noreferrer license" className="underline">{c.license}</a>
    </span>
  );
}

export function monasteriesMetadata(): Metadata {
  return generateSEO({
    title: 'Monasteries & Meditation in Dharamshala and McLeod Ganj',
    description: 'The Dalai Lama Temple, Namgyal debates, Gyuto, Norbulingka and the kora, plus Tushita and Vipassana courses: timings, how to book and temple etiquette, checked October 2026.',
    path: PATH,
    image: photo(HERO).src,
    keywords: [
      'monasteries in dharamshala', 'mcleod ganj monastery', 'dalai lama temple timings', 'namgyal monastery debate',
      'gyuto monastery', 'norbulingka institute', 'tushita meditation centre', 'vipassana dharamshala',
      'meditation in mcleod ganj', 'buddhist courses dharamshala', 'kora mcleod ganj',
    ],
  });
}

/** Places of worship as structured data, with their map pins. */
function placesSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Monasteries and temples in Dharamshala and McLeod Ganj',
    itemListElement: [...monasteries, ...moreMonasteries].map((m, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': m.id === 'tibet-museum' ? 'Museum' : 'BuddhistTemple',
        name: m.name,
        ...(m.aka && { alternateName: m.aka }),
        description: m.about,
        address: { '@type': 'PostalAddress', streetAddress: m.area, addressRegion: 'Himachal Pradesh', addressCountry: 'IN' },
        ...(m.lat !== undefined && { geo: { '@type': 'GeoCoordinates', latitude: m.lat, longitude: m.lng } }),
        ...(m.photo && { image: siteConfig.url + photo(m.photo).src }),
        ...(m.official && { sameAs: m.official }),
      },
    })),
  };
}

const JUMP = [
  ['day', 'A day in the monasteries'], ['monasteries', 'Monasteries'], ['debate', 'Chanting, debate & kora'],
  ['meditation', 'Meditation & courses'], ['etiquette', 'Etiquette'], ['festivals', 'Festivals & teachings'], ['faq', 'FAQ'],
] as const;

export default function MonasteriesView() {
  const hero = photo(HERO);
  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([{ name: 'Home', href: '/' }, { name: 'Monasteries & Meditation', href: PATH }]),
        faqSchema(monasteryFaqs),
        placesSchema(),
      ]} />

      <section className="relative">
        <div className="absolute inset-0">
          <Image src={hero.src} alt={hero.alt} fill className="object-cover" priority sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#2b0b09]/90 via-[#4a1410]/70 to-[#4a1410]/20" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 text-white">
          <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Monasteries & Meditation' }]} />
          <p className="text-xs font-semibold tracking-[0.14em] uppercase text-amber-300 mt-2">Little Lhasa</p>
          <h1 className="text-3xl sm:text-5xl font-heading font-bold mt-2 max-w-3xl leading-tight">Monasteries &amp; Meditation in Dharamshala and McLeod Ganj</h1>
          <p className="text-orange-50/90 max-w-2xl mt-4 text-lg">
            Home of the Dalai Lama and the Tibetan community in exile: temples you can walk into, monks debating in the courtyard,
            the kora at dawn and some of India&apos;s best-known meditation courses. Here is how to visit with respect, and what to book ahead.
          </p>
          <p className="text-xs text-orange-100/70 mt-4">Checked against official sources in October 2026. · <Credit file={HERO} /></p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <nav aria-label="On this page" className="flex flex-wrap gap-2 mb-12">
          {JUMP.map(([id, label]) => (
            <a key={id} href={'#' + id} className="text-sm font-medium text-[#7a2a1c] bg-orange-50 hover:bg-orange-100 border border-orange-100 px-3 py-1.5 rounded-full transition-colors">{label}</a>
          ))}
        </nav>

        {/* A DAY */}
        <section id="day" className="scroll-mt-24">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900">A day in McLeod Ganj&apos;s monasteries</h2>
          <p className="text-slate-600 mt-2 max-w-3xl">No monastery publishes a prayer timetable, so treat these as the usual rhythm of the day and ask at the temple the evening before.</p>
          <ol className="mt-8 relative border-l-2 border-dashed border-orange-200 ml-3 space-y-8">
            {monasteryDay.map((m) => {
              const p = photo(m.photo);
              return (
                <li key={m.id} className="pl-6 sm:pl-8 relative">
                  <span className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-white border-4 border-orange-500" aria-hidden="true" />
                  <div className="grid sm:grid-cols-[220px_1fr] gap-4 sm:gap-6 items-start">
                    <figure className="m-0">
                      <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-100">
                        <Image src={p.src} alt={p.alt} fill className="object-cover" sizes="(max-width:640px) 90vw, 220px" />
                      </div>
                      <figcaption className="mt-1"><Credit file={m.photo} /></figcaption>
                    </figure>
                    <div>
                      <p className="inline-flex items-center gap-1.5 text-sm font-mono text-orange-700"><Clock className="h-3.5 w-3.5" />{m.time}</p>
                      <h3 className="text-xl font-heading font-semibold text-slate-900 mt-1">{m.title}</h3>
                      <p className="text-slate-600 mt-1.5 leading-relaxed max-w-2xl">{m.desc}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* MONASTERIES */}
        <section id="monasteries" className="scroll-mt-24 mt-16">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900">Monasteries and temples to visit</h2>
          <p className="text-slate-600 mt-2 max-w-3xl">From the Dalai Lama&apos;s own temple in McLeod Ganj to the chanting halls of Gyuto and the artists of Norbulingka down the valley.</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {monasteries.map((m, i) => {
              const p = m.photo ? photo(m.photo) : null;
              return (
                <article key={m.id} className={'bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col' + (i === 0 ? ' md:col-span-2' : '')}>
                  {p && (
                    <div className="relative aspect-[16/9] bg-slate-100">
                      <Image src={p.src} alt={p.alt} fill className="object-cover" sizes={i === 0 ? '(max-width:768px) 100vw, 760px' : '(max-width:768px) 100vw, 380px'} />
                    </div>
                  )}
                  <div className="p-5 flex flex-col gap-3 flex-1">
                    <div>
                      <p className="text-xs font-semibold tracking-wide uppercase text-orange-700">{m.tradition}</p>
                      <h3 className="text-xl font-heading font-bold text-slate-900 mt-1">{m.name}</h3>
                      {m.aka && <p className="text-sm text-slate-500">Also called {m.aka}</p>}
                      <p className="text-sm text-slate-600 mt-1 inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 shrink-0" />{m.area}</p>
                    </div>
                    <p className="text-slate-700 leading-relaxed">{m.about}</p>
                    {m.see.length > 0 && (
                      <ul className="text-sm text-slate-700 space-y-1">
                        {m.see.map((s) => <li key={s} className="flex gap-2"><span className="text-orange-500" aria-hidden="true">◆</span>{s}</li>)}
                      </ul>
                    )}
                    <p className="text-sm text-slate-600 bg-orange-50/60 border border-orange-100 rounded-lg px-3 py-2"><b className="text-slate-800">Visiting: </b>{m.visit}</p>
                    <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium mt-auto pt-1">
                      <a href={mapUrl(m)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700"><MapPin className="h-4 w-4" />Map</a>
                      <Link href={'/destinations/' + m.stay} className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700"><BedDouble className="h-4 w-4" />Stay nearby</Link>
                      {m.official && <a href={m.official} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700"><ExternalLink className="h-4 w-4" />Official site</a>}
                    </div>
                    {m.photo && <Credit file={m.photo} />}
                  </div>
                </article>
              );
            })}
          </div>

          <h3 className="text-lg font-heading font-bold text-slate-900 mt-10">More places nearby</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {moreMonasteries.map((m) => (
              <div key={m.id} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-2">
                <p className="text-xs font-semibold tracking-wide uppercase text-orange-700">{m.tradition}</p>
                <h4 className="font-heading font-bold text-slate-900">{m.name}{m.aka && <span className="font-normal text-slate-500 text-sm"> · {m.aka}</span>}</h4>
                <p className="text-sm text-slate-600 inline-flex items-start gap-1"><MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />{m.area}</p>
                <p className="text-sm text-slate-700">{m.about}</p>
                <p className="text-sm text-slate-500">{m.visit}</p>
                <a href={mapUrl(m)} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand-600 hover:text-brand-700 inline-flex items-center gap-1 mt-auto"><MapPin className="h-4 w-4" />Map</a>
              </div>
            ))}
          </div>
        </section>

        {/* CHANTING, DEBATE, KORA */}
        <section id="debate" className="scroll-mt-24 mt-16 grid lg:grid-cols-[1.1fr_1fr] gap-8 items-start">
          <div>
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900">Chanting, debate and the kora</h2>
            <div className="mt-5 space-y-5 text-slate-700 leading-relaxed">
              <div>
                <h3 className="font-heading font-semibold text-lg text-slate-900">Prayers and chanting</h3>
                <p className="mt-1">Monks and nuns chant at morning and evening prayer sessions, but no monastery here publishes a fixed timetable, and times shift with the ritual calendar. Your best chances are early morning and late afternoon at the main temple and at Gyuto, whose monks are famous for their deep chanting. Ask the evening before.</p>
              </div>
              <div>
                <h3 className="font-heading font-semibold text-lg text-slate-900">Monks&apos; debate at Namgyal</h3>
                <p className="mt-1">In the courtyard, a standing monk fires questions on Buddhist philosophy, clapping and stamping to drive each point home, while a seated monk defends. It usually happens in the early afternoon, but reported times differ and debates pause for holidays, exams and big events. Watch quietly from the side.</p>
              </div>
              <div>
                <h3 className="font-heading font-semibold text-lg text-slate-900">The kora (Lingkhor)</h3>
                <p className="mt-1">A forest footpath loops around the hill of the main temple and the Dalai Lama&apos;s residence, lined with prayer wheels, prayer flags, carved mani stones and memorials. It takes 30–40 minutes, with a few steep, uneven parts. Go early in the morning, when Tibetans walk it with their prayer beads; always walk clockwise and watch out for monkeys.</p>
              </div>
              <div>
                <h3 className="font-heading font-semibold text-lg text-slate-900">Prayer wheels and butter lamps</h3>
                <p className="mt-1">Anyone may turn the prayer wheels, always clockwise; pilgrims recite <i>Om mani padme hum</i> as they go. Butter lamps burn before the altars as offerings; ask at the temple if you would like to offer one.</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {['kora-prayer-flags', 'tsuglagkhang-prayer-wheels', 'kalachakra-mandala', 'prayer-flags-dharamkot'].map((f) => {
              const p = photo(f);
              return (
                <figure key={f} className="m-0">
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-100"><Image src={p.src} alt={p.alt} fill className="object-cover" sizes="(max-width:1024px) 45vw, 260px" /></div>
                  <figcaption className="mt-1 leading-tight"><Credit file={f} /></figcaption>
                </figure>
              );
            })}
          </div>
        </section>

        {/* MEDITATION */}
        <section id="meditation" className="scroll-mt-24 mt-16">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900">Meditation and Buddhist courses</h2>
          <p className="text-slate-600 mt-2 max-w-3xl">Most serious courses fill weeks ahead, so book these before your hotel. Prices and rules are as published in 2026.</p>
          <div className="grid lg:grid-cols-2 gap-5 mt-8">
            {meditation.map((c) => (
              <article key={c.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-3">
                <div>
                  <h3 className="text-lg font-heading font-bold text-slate-900">{c.name}</h3>
                  <p className="text-sm text-slate-500 inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{c.where}</p>
                </div>
                <p className="text-slate-700">{c.what}</p>
                <dl className="text-sm grid gap-2">
                  <div><dt className="font-semibold text-slate-800">How to join</dt><dd className="text-slate-600">{c.how}</dd></div>
                  <div><dt className="font-semibold text-slate-800">Cost</dt><dd className="text-slate-600">{c.cost}</dd></div>
                </dl>
                {c.rules && (
                  <ul className="flex flex-wrap gap-2">
                    {c.rules.map((r) => <li key={r} className="text-xs bg-slate-100 text-slate-700 rounded-full px-2.5 py-1">{r}</li>)}
                  </ul>
                )}
                <a href={c.official} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand-600 hover:text-brand-700 inline-flex items-center gap-1 mt-auto"><ExternalLink className="h-4 w-4" />Official site</a>
              </article>
            ))}
          </div>
        </section>

        {/* ETIQUETTE */}
        <section id="etiquette" className="scroll-mt-24 mt-16">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900">Temple etiquette</h2>
          <p className="text-slate-600 mt-2 max-w-3xl">These are living places of worship and homes for monks and nuns. A little care goes a long way.</p>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
            {etiquette.map((e, i) => (
              <li key={e.title} className="bg-white border border-slate-200 rounded-xl p-4">
                <span className="font-mono text-xs text-orange-700">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="font-semibold text-slate-900 mt-1">{e.title}</h3>
                <p className="text-sm text-slate-600 mt-1">{e.desc}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* FESTIVALS */}
        <section id="festivals" className="scroll-mt-24 mt-16">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900">Festivals and teachings</h2>
          <div className="grid md:grid-cols-2 gap-5 mt-6">
            {festivals.map((f) => (
              <article key={f.name} className="bg-white border border-slate-200 rounded-2xl p-5">
                <p className="text-sm font-mono text-orange-700 inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{f.when}</p>
                <h3 className="text-lg font-heading font-bold text-slate-900 mt-1">{f.name}</h3>
                <p className="text-slate-600 mt-1.5 leading-relaxed">{f.desc}</p>
              </article>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-24 mt-16 grid lg:grid-cols-[0.8fr_1.2fr] gap-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900">Questions travellers ask</h2>
            <p className="text-slate-600 mt-2">Can&apos;t find yours? Ask our local team on WhatsApp.</p>
          </div>
          <FAQSection faqs={monasteryFaqs} />
        </section>

        {/* CTA */}
        <div className="mt-16 rounded-2xl p-8 text-center text-white bg-gradient-to-br from-[#4a1410] to-[#2b0b09]">
          <h2 className="font-heading font-bold text-2xl">Stay within walking distance of the temple</h2>
          <p className="text-orange-50/80 mt-2 mb-6 max-w-2xl mx-auto">McLeod Ganj puts the main temple and the kora at your door; Dharamkot is a short walk from Tushita and Dhamma Sikhara.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link href="/destinations/mcleod-ganj" className="bg-orange-600 hover:bg-orange-700 px-6 py-2.5 rounded-xl font-semibold inline-flex items-center justify-center gap-1.5">Stays in McLeod Ganj <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/destinations/dharamkot" className="bg-white/10 hover:bg-white/20 ring-1 ring-white/30 px-6 py-2.5 rounded-xl font-semibold">Stays in Dharamkot</Link>
            <a href={getWhatsAppLink('Hi! I would like help planning monastery visits / a meditation course in Dharamshala.')} target="_blank" rel="noopener noreferrer"
              className="bg-green-700 hover:bg-green-800 px-6 py-2.5 rounded-xl font-semibold inline-flex items-center justify-center gap-1.5"><MessageCircle className="h-4 w-4" />Ask on WhatsApp</a>
          </div>
        </div>

        {/* SOURCES */}
        <div className="mt-12 text-sm text-slate-500">
          <h2 className="font-semibold text-slate-700">How we checked this</h2>
          <p className="mt-1 max-w-3xl">Facts on this page were checked in October 2026 against the official sources below. Timings change with the ritual calendar and His Holiness&apos;s schedule, so confirm locally before you plan around them.</p>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
            {monasterySources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-700">{s.name}</a></li>)}
          </ul>
        </div>
      </div>
    </>
  );
}
